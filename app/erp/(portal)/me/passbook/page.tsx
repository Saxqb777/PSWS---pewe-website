import Link from "next/link";
import { requireMember } from "@/lib/erp/auth";
import { collections, myPledges, passbook, pledgeAmount } from "@/lib/erp/portal";
import { knownYears } from "@/lib/erp/data";
import { fyOf, inr, oneGiver, showDate, todayIST } from "@/lib/erp/labels";
import { H2, Passbook, PledgeStatus } from "@/components/erp/portal-ui";
import styles from "@/components/erp/erp.module.css";
import p from "@/components/erp/portal.module.css";
import { takeBackPledge } from "../actions";

export const metadata = { title: "My passbook" };

export default async function PassbookPage({ searchParams }: { searchParams: Promise<{ fy?: string; gave?: string }> }) {
  const u = await requireMember();
  const sp = await searchParams;
  const current = fyOf(todayIST());
  const years = await knownYears(current);
  const fy = years.includes(String(sp.fy)) ? String(sp.fy) : current;
  const [lines, pledges, gathered] = await Promise.all([passbook(u.id, fy), myPledges(u.id), collections(u.id, fy)]);
  const collectedTotal = gathered.reduce((s, l) => s + l.amount_paise, 0);
  const open = pledges.filter((x) => x.status === "waiting" || x.status === "not_found");
  const gave = lines.filter((l) => l.dir === "gave").reduce((s, l) => s + l.amount_paise, 0);
  const got = lines.filter((l) => l.dir === "received").reduce((s, l) => s + l.amount_paise, 0);

  return (
    <>
      <div className={p.passHead}>
        <div>
          <h1 className={p.h1}>My passbook</h1>
          <p className={p.lead} style={{ marginBottom: 0 }}>
            {u.member_no} · only you and the office see this
          </p>
        </div>
        <Link href="/erp/me/statement" className={p.passStmt}>
          Statement
        </Link>
      </div>
      {sp.gave && (
        <p className={styles.formDone}>Thank you. Once the PSWS Accountant finds it in the bank, your receipt is made and it shows here.</p>
      )}

      {years.length > 1 && (
        <nav className={styles.tabs} aria-label="Year">
          {years.map((y) => (
            <Link key={y} href={`/erp/me/passbook?fy=${y}`} aria-current={y === fy ? "page" : undefined}>
              {y}
            </Link>
          ))}
        </nav>
      )}

      <div className={p.sums}>
        <div>
          <span>Given in {fy}</span>
          <b>{inr(gave)}</b>
        </div>
        <div>
          <span>Received in {fy}</span>
          <b>{inr(got)}</b>
        </div>
      </div>

      {collectedTotal > 0 && (
        <p className={p.collectedSum}>
          <span>Collected from others in {fy}</span>
          <b>{inr(collectedTotal)}</b>
        </p>
      )}

      {lines.length ? (
        <Passbook lines={lines} />
      ) : (
        <p className={styles.note} style={{ marginTop: 14 }}>
          Nothing in {fy} yet. When you give, the Accountant makes your receipt and it appears here.
        </p>
      )}

      {gathered.length > 0 && (
        <>
          <H2>I collected</H2>
          <p className={styles.note} style={{ margin: "0 0 8px" }}>
            Money you gathered from others, or paid in for someone else. It counts as theirs, not as your own gift.
          </p>
          <ul className={p.items}>
            {gathered.map((c) => (
              <li key={c.id}>
                <Link href={`/erp/me/receipt/${c.id}`} className={p.itemTitle}>
                  {c.what}
                </Link>
                <span className={p.itemAmt}>{inr(c.amount_paise)}</span>
                <span className={p.itemMeta}>
                  {showDate(c.on_date)} · {c.no}
                  {c.for_name ? ` · for ${c.for_name}` : c.people ? ` · from ${c.people} ${c.people === 1 ? "person" : "people"}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {open.length > 0 && (
        <>
          <H2>Being checked</H2>
          <ul className={p.items}>
            {open.map((x) => (
              <li key={x.id}>
                <span className={p.itemTitle}>
                  {x.ask_title ?? "Gift"}
                  {oneGiver(x) ? ` (for ${oneGiver(x)})` : x.collected ? " (collected)" : ""}
                  <PledgeStatus status={x.status} />
                </span>
                <span className={p.itemAmt}>{pledgeAmount(x)}</span>
                <span className={p.itemMeta}>
                  Sent {showDate(x.sent_on)}
                  {x.reference ? ` · ${x.reference}` : ""}
                  {x.check_note ? ` · Accountant: ${x.check_note}` : ""}
                </span>
                {x.status === "waiting" && (
                  <details className={p.takeBack}>
                    <summary>Typed it wrong?</summary>
                    <form action={takeBackPledge.bind(null, x.id)}>
                      <span>
                        This takes it off the Accountant&apos;s list. Then send it again with the right details.
                      </span>
                      <button type="submit" className={styles.btnQuiet}>
                        Yes, take it back
                      </button>
                    </form>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
