import Link from "next/link";
import { ASK_KINDS, ASK_STATUSES, PLEDGE_STATUSES, ago, inr, showDate, showMonth } from "@/lib/erp/labels";
import type { Ask, FeedLine, PassLine } from "@/lib/erp/portal";
import p from "./portal.module.css";

/** A member's card, printed like the first page of a passbook. The number is who they are, not a password. */
export function MemberCard({
  name,
  memberNo,
  since,
  post,
}: {
  name: string;
  memberNo: string;
  since: string | null;
  post: string | null;
}) {
  const [, digits] = memberNo.split("-");
  return (
    <section className={p.card} aria-label="My PSWS card">
      <p className={p.cardSociety}>Pewe Social Welfare Society · Member</p>
      <p className={p.cardNo} aria-label={`PSWS number ${memberNo}`}>
        PSWS {digits}
      </p>
      <p className={p.cardNoLabel}>My PSWS number: sign in with it</p>
      <p className={p.cardName}>{name}</p>
      <p className={p.cardMeta}>
        {[post, since ? `Member since ${showMonth(since.slice(0, 7))}` : null].filter(Boolean).join(" · ")}
      </p>
    </section>
  );
}

/** How far an ask has got: the green is in the bank, the hatched part is waiting for the Treasurer to find it. */
export function Meter({ raised, waiting, target }: { raised: number; waiting: number; target: number | null }) {
  const full = Math.max(target ?? 0, raised + waiting, 1);
  const r = Math.min(100, (raised / full) * 100);
  const w = Math.min(100 - r, (waiting / full) * 100);
  return (
    <div
      className={p.meter}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={target ?? raised}
      aria-valuenow={raised}
      aria-label={target ? `${inr(raised)} of ${inr(target)}` : `${inr(raised)} raised`}
    >
      <span className={p.meterFill} style={{ width: `${r}%` }} />
      {waiting > 0 && <span className={p.meterWait} style={{ left: `${r}%`, width: `${w}%` }} />}
    </div>
  );
}

export function Raised({ a }: { a: Ask }) {
  return (
    <>
      <Meter raised={a.raised_paise} waiting={a.waiting_paise} target={a.target_paise} />
      <p className={p.raised}>
        <span>
          <b>{inr(a.raised_paise)}</b> {a.target_paise ? `of ${inr(a.target_paise)}` : "raised"}
        </span>
        <span>
          {a.givers === 1 ? "1 person" : `${a.givers} people`}
          {a.waiting_paise > 0 && ` · ${inr(a.waiting_paise)} being checked`}
        </span>
      </p>
    </>
  );
}

/** An ask in a list: what it is for, and how far it has got. */
export function AskCard({ a, href }: { a: Ask; href: string }) {
  const ended = a.status === "live" && a.closes_on && a.closes_on < new Date().toISOString().slice(0, 10);
  return (
    <Link href={href} className={p.ask}>
      <p className={`${p.askKind} ${a.kind === "zakat" ? p.zakat : ""}`}>
        <span>{ASK_KINDS[a.kind].en}</span>
        <span>
          {a.status !== "live"
            ? ASK_STATUSES[a.status].en
            : ended
              ? "Ended, closing soon"
              : a.closes_on
                ? `Until ${showDate(a.closes_on)}`
                : ""}
        </span>
      </p>
      <h3 className={p.askTitle}>{a.title}</h3>
      {a.kind !== "help" && (a.status === "live" || a.status === "closed") && <Raised a={a} />}
      {a.status === "closed" && a.closing_note && <p className={p.done}>{a.closing_note}</p>}
    </Link>
  );
}

/** What is happening across PSWS, newest first. Names only where the giver chose to show theirs. */
export function Feed({ lines, now }: { lines: FeedLine[]; now: number }) {
  const cls = { gift: p.feedGift, target: p.feedTarget, live: p.feedLive, closed: "", notice: "" } as const;
  return (
    <ul className={p.feed} aria-live="polite">
      {lines.map((f) => (
        <li key={f.id} className={`${cls[f.kind]} ${now - new Date(f.at).getTime() < 15000 ? p.feedNew : ""}`}>
          <span>{f.line}</span>
          <time dateTime={new Date(f.at).toISOString()}>{ago(f.at, now)}</time>
        </li>
      ))}
    </ul>
  );
}

/** "18 Oct ’26", short enough for a passbook's date column. */
const passDate = (d: string) => showDate(d).replace(/ \d\d(\d\d)$/, " ’$1");

/** Given and received, ruled like the lines of a bank passbook. */
export function Passbook({ lines }: { lines: PassLine[] }) {
  const gave = lines.filter((l) => l.dir === "gave").reduce((s, l) => s + l.amount_paise, 0);
  const got = lines.filter((l) => l.dir === "received").reduce((s, l) => s + l.amount_paise, 0);
  const money = (n: number) => inr(n).replace("₹", "");
  return (
    <table className={p.pass}>
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Particulars</th>
          <th scope="col" className={p.amt}>
            Given
          </th>
          <th scope="col" className={p.amt}>
            Received
          </th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l) => (
          <tr key={`${l.dir}${l.id}`}>
            <td className={p.date}>{passDate(l.on_date)}</td>
            <td>
              {l.what}
              <small>{l.no}</small>
            </td>
            <td className={p.amt}>{l.dir === "gave" ? money(l.amount_paise) : ""}</td>
            <td className={p.amt}>{l.dir === "received" ? money(l.amount_paise) : ""}</td>
          </tr>
        ))}
        <tr className={p.passTotal}>
          <td />
          <td>Total</td>
          <td className={p.amt}>{money(gave)}</td>
          <td className={p.amt}>{got ? money(got) : ""}</td>
        </tr>
      </tbody>
    </table>
  );
}

export function PledgeStatus({ status }: { status: keyof typeof PLEDGE_STATUSES }) {
  const cls = status === "confirmed" ? p.stOk : status === "waiting" ? p.stWait : p.stNo;
  return <span className={`${p.status} ${cls}`}>{PLEDGE_STATUSES[status].en}</span>;
}

export function AskStatus({ a }: { a: Pick<Ask, "status" | "kind"> }) {
  const cls = a.status === "live" || a.status === "closed" ? p.stOk : a.status === "waiting" ? p.stWait : p.stNo;
  const label = a.kind === "help" && a.status === "live" ? "Accepted" : ASK_STATUSES[a.status].en;
  return <span className={`${p.status} ${cls}`}>{label}</span>;
}

export function H2({ children, link }: { children: React.ReactNode; link?: { href: string; label: string } }) {
  return (
    <h2 className={p.h2}>
      <span>{children}</span>
      {link && <Link href={link.href}>{link.label}</Link>}
    </h2>
  );
}
