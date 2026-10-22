import Link from "next/link";
import { requireMember } from "@/lib/erp/auth";
import { myPledges, passbook } from "@/lib/erp/portal";
import { knownYears } from "@/lib/erp/data";
import { fyOf, inr, showDate, todayIST } from "@/lib/erp/labels";
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
  const [lines, pledges] = await Promise.all([passbook(u.id, fy), myPledges(u.id)]);
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
      </div>
      {sp.gave && (
        <p className={styles.formDone}>Thank you. Once the Treasurer finds it in the bank, your receipt is made and it shows here.</p>
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

      {lines.length ? (
        <Passbook lines={lines} />
      ) : (
        <p className={styles.note} style={{ marginTop: 14 }}>
          Nothing in {fy} yet. When you give, the Treasurer makes your receipt and it appears here.
        </p>
      )}

      {open.length > 0 && (
        <>
          <H2>Being checked</H2>
          <ul className={p.items}>
            {open.map((x) => (
              <li key={x.id}>
                <span className={p.itemTitle}>
                  {x.ask_title ?? "Gift"}
                  <PledgeStatus status={x.status} />
                </span>
                <span className={p.itemAmt}>{inr(x.amount_paise)}</span>
                <span className={p.itemMeta}>
                  Sent {showDate(x.sent_on)}
                  {x.reference ? ` · ${x.reference}` : ""}
                  {x.check_note ? ` · Treasurer: ${x.check_note}` : ""}
                </span>
                {x.status === "waiting" && (
                  <form action={takeBackPledge.bind(null, x.id)} style={{ gridColumn: "1 / -1" }}>
                    <button type="submit" className={styles.btnQuiet} style={{ minHeight: 36, fontSize: 14 }}>
                      I typed it wrong, take it back
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
