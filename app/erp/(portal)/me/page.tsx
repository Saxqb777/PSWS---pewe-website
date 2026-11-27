import Link from "next/link";
import { isDemo, lookingAt, requireMember } from "@/lib/erp/auth";
import { collections, feed, getMe, myPledges, passbook, publicAsks, pledgeAmount } from "@/lib/erp/portal";
import { listMeetings } from "@/lib/erp/data";
import { HEADS, fyOf, inr, labelOf, showDate, showDay, todayIST } from "@/lib/erp/labels";
import { AskCard, Feed, H2, MemberCard } from "@/components/erp/portal-ui";
import { AutoRefresh } from "@/components/erp/portal-client";
import { InstallCard } from "@/components/erp/install";
import { WelcomeTour } from "@/components/erp/welcome-tour";
import styles from "@/components/erp/erp.module.css";
import p from "@/components/erp/portal.module.css";

export const metadata = { title: "Home" };

function greeting() {
  const h = (new Date().getUTCHours() + 5.5) % 24;
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function MyHome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const u = await requireMember();
  const sp = await searchParams;
  const today = todayIST();
  const [me, asks, lines, pledges, mine, meetings, gathered] = await Promise.all([
    getMe(u.id),
    publicAsks("live"),
    feed(8),
    myPledges(u.id),
    passbook(u.id, fyOf(today)),
    listMeetings(),
    collections(u.id, fyOf(today)),
  ]);
  const collected = gathered.reduce((s, l) => s + l.amount_paise, 0);
  const waiting = pledges.filter((x) => x.status === "waiting" || x.status === "not_found");
  const gave = mine.filter((l) => l.dir === "gave").reduce((s, l) => s + l.amount_paise, 0);
  const got = mine.filter((l) => l.dir === "received").reduce((s, l) => s + l.amount_paise, 0);
  const next = meetings.filter((m) => m.kind === "meeting" && m.on_date >= today).at(-1);
  const now = Date.now();

  return (
    <>
      <AutoRefresh every={6000} />
      {sp.welcome && (
        <p className={styles.formDone}>
          You are in. Your PSWS number is <b>{u.member_no}</b>: next time, sign in with it and your password.
        </p>
      )}
      <h1 className={p.hello}>
        {greeting()}, {u.name.split(" ")[0]}
      </h1>
      <MemberCard name={u.name} memberNo={u.member_no} since={me?.member_since ?? null} post={u.post} />
      <InstallCard className={p.install} button={styles.btn} />
      <WelcomeTour name={u.name} off={(await isDemo()) || !!(await lookingAt())} />

      <div className={p.acts}>
        <Link href="/erp/me/give" className={`${p.act} ${p.actMain}`}>
          Give
          <small>Zakat, Donation, Village Work</small>
        </Link>
        <Link href="/erp/me/new" className={p.act}>
          Ask for donations
          <small>Collection, Zakat, help</small>
        </Link>
      </div>

      {waiting.length > 0 && (
        <>
          <H2 link={{ href: "/erp/me/passbook", label: "Passbook" }}>Waiting for the Accountant</H2>
          <ul className={p.items}>
            {waiting.map((x) => (
              <li key={x.id}>
                <span className={p.itemTitle}>
                  {x.ask_title ?? labelOf(HEADS, x.head, x.head_other)}
                  <span className={`${p.status} ${x.status === "waiting" ? p.stWait : p.stNo}`}>
                    {x.status === "waiting" ? "Being checked" : "Not found yet"}
                  </span>
                </span>
                <span className={p.itemAmt}>{pledgeAmount(x)}</span>
                <span className={p.itemMeta}>
                  You sent it on {showDate(x.sent_on)}
                  {x.check_note ? `. Accountant: ${x.check_note}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <H2 link={{ href: "/erp/me/asks", label: "All donations" }}>
        <span className={p.live}>Open now</span>
      </H2>
      {asks.length ? (
        asks.slice(0, 4).map((a) => <AskCard key={a.id} a={a} href={`/erp/me/asks/${a.id}`} />)
      ) : (
        <p className={styles.note}>Nothing is open right now. Anyone can ask for donations; two approvers look at it first.</p>
      )}

      <H2 link={{ href: "/erp/live", label: "Live screen" }}>What is happening</H2>
      {lines.length ? <Feed lines={lines} now={now} /> : <p className={styles.note}>Nothing yet.</p>}

      <H2 link={{ href: "/erp/me/passbook", label: "Passbook" }}>My year</H2>
      <div className={p.sums}>
        <div>
          <span>I gave</span>
          <b>{inr(gave)}</b>
        </div>
        <div>
          <span>I received</span>
          <b>{inr(got)}</b>
        </div>
      </div>
      {waiting.some((x) => x.status === "waiting" && x.amount_paise) && (
        <p className={p.waitingSum}>
          <span>Sent, waiting for the Accountant</span>
          <b>{inr(waiting.filter((x) => x.status === "waiting").reduce((s, x) => s + (x.amount_paise ?? 0), 0))}</b>
        </p>
      )}
      {collected > 0 && (
        <p className={p.collectedSum}>
          <span>I collected from others</span>
          <b>{inr(collected)}</b>
        </p>
      )}

      {next && (
        <>
          <H2 link={{ href: "/erp/me/notices", label: "Notices" }}>Next meeting</H2>
          <div className={p.notice} style={{ paddingTop: 0 }}>
            <span className={p.noticeDate}>{showDay(next.on_date)}</span>
            <h3>{next.title}</h3>
          </div>
        </>
      )}
    </>
  );
}
