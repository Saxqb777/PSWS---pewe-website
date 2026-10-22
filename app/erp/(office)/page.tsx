import Link from "next/link";
import { requireUser } from "@/lib/erp/auth";
import { listMoney, listRequests, stipendLines, totals } from "@/lib/erp/data";
import { KINDS, canDo, fyOf, fyRange, inr, showDate, showDay, showMonth, thisMonthIST, todayIST, labelOf } from "@/lib/erp/labels";
import { Empty, MoneyList, Section } from "@/components/erp/ui";
import { ACTION_LABEL, approvalsForMe, fundBalances, getOpening, placeBalances } from "@/lib/erp/books";
import { portalOn } from "@/lib/erp/flags";
import { officeWaiting } from "@/lib/erp/portal";
import styles from "@/components/erp/erp.module.css";

export const metadata = { title: "Home" };

export default async function OfficeHome({ searchParams }: { searchParams: Promise<{ denied?: string; welcome?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const today = todayIST();
  const month = thisMonthIST();
  const monthName = showMonth(month).split(" ")[0];
  const fy = fyOf(today);
  const year = fyRange(fy);
  const [m, y, waiting, stipends, latest, opening, places, funds, forMe, portal] = await Promise.all([
    totals(`${month}-01`, today),
    totals(year.from, year.to),
    listRequests({ open: true }),
    stipendLines(month),
    listMoney({ fy, month: null, dir: "all", q: null }),
    getOpening(),
    placeBalances(),
    fundBalances(),
    approvalsForMe(u.id),
    portalOn() ? officeWaiting(u.id) : Promise.resolve(null),
  ]);
  const zakat = funds.find((f) => f.head === "zakat");
  const editor = canDo(u.role, "editor");
  const paid = stipends.filter((s) => s.paid_voucher).length;
  const toPay = stipends.length - paid;

  return (
    <>
      <p className={styles.today}>
        {showDay(today)} {today.slice(0, 4)}
      </p>

      {sp.welcome && (
        <p className={styles.formDone}>You are in. On your phone, add this page to the home screen so the office is one tap away.</p>
      )}
      {sp.denied && (
        <p className={`${styles.banner} ${styles.bannerWarn}`}>
          You can see everything here but cannot add or change entries. Ask an admin if you need to.
        </p>
      )}

      {portal && portal.pledges + portal.asks + portal.messages > 0 && (
        <p className={styles.banner}>
          <b>Members&apos; portal:</b>{" "}
          {[
            portal.pledges && `${portal.pledges} payment${portal.pledges === 1 ? "" : "s"} to find in the bank`,
            portal.asks && `${portal.asks} ask${portal.asks === 1 ? "" : "s"} for your approval`,
            portal.messages && `${portal.messages} message${portal.messages === 1 ? "" : "s"}`,
          ]
            .filter(Boolean)
            .join(" · ")}
          .{" "}
          <Link href="/erp/portal" className={styles.link}>
            Open
          </Link>
        </p>
      )}

      {editor && (
        <nav aria-label="Add" className={styles.home}>
          <div className={styles.big}>
            <Link href="/erp/money/in/new" className={styles.act}>
              <span className={`${styles.actSign} ${styles.in}`} aria-hidden="true">
                +
              </span>
              <span>
                <span className={styles.actName}>Money received</span>
                <span className={styles.actHi}>Paisa aaya</span>
              </span>
            </Link>
            <Link href="/erp/money/out/new" className={styles.act}>
              <span className={`${styles.actSign} ${styles.out}`} aria-hidden="true">
                −
              </span>
              <span>
                <span className={styles.actName}>Money paid</span>
                <span className={styles.actHi}>Paisa diya</span>
              </span>
            </Link>
          </div>
          <ul className={styles.more}>
            <li>
              <Link href="/erp/money/out/new?for=family">
                <span>
                  Family helped<small>Madad</small>
                </span>
              </Link>
            </li>
            <li>
              <Link href="/erp/works">
                <span>
                  Village work<small>Gaon ka kaam</small>
                </span>
              </Link>
            </li>
            <li>
              <Link href="/erp/meetings/new">
                <span>
                  Meeting or notice<small>Baithak</small>
                </span>
              </Link>
            </li>
          </ul>
        </nav>
      )}

      {forMe.length > 0 && (
        <>
          <Section title="Waiting for your approval" link={{ href: "/erp/approvals", label: "All approvals" }} />
          <ul className={styles.list}>
            {forMe.slice(0, 5).map((a) => {
              return (
                <li key={a.id} className={styles.row}>
                  <Link href={`/erp/approvals/${a.id}`} className={styles.rowLink}>
                    <span className={styles.rowMain}>
                      <span className={styles.rowTitle}>
                        {ACTION_LABEL[a.action]} {a.summary}
                      </span>
                      <span className={styles.rowMeta}>
                        Asked by {a.asked_by_name}: {a.reason}
                      </span>
                    </span>
                    <span className={styles.rowAmt}>
                      {a.yes} of {a.needed}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <div className={styles.split}>
        <section>
          <Section title="Money" link={{ href: "/erp/reports", label: "Reports" }} />
          <table className={styles.sum}>
            <thead>
              <tr>
                <th>
                  <span className={styles.srOnly}>Money</span>
                </th>
                <th scope="col">{monthName}</th>
                <th scope="col">Since 1 April</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Received</td>
                <td className={styles.in}>{inr(m.in_paise)}</td>
                <td className={styles.in}>{inr(y.in_paise)}</td>
              </tr>
              <tr>
                <td>Paid</td>
                <td className={styles.out}>{inr(m.out_paise)}</td>
                <td className={styles.out}>{inr(y.out_paise)}</td>
              </tr>
            </tbody>
          </table>
          {opening && (
            <p className={styles.note} style={{ marginTop: 8 }}>
              Cash in hand <b>{inr(places.cash)}</b> · In the bank <b>{inr(places.bank)}</b>
              {zakat ? (
                <>
                  {" "}
                  · Zakat left <b>{inr(zakat.left)}</b>
                </>
              ) : null}{" "}
              ·{" "}
              <Link href="/erp/accounts" className={styles.link}>
                Accounts
              </Link>
            </p>
          )}
        </section>

        <section>
          <Section title="Monthly help" />
          {stipends.length ? (
            <div className={styles.line}>
              <span>
                {monthName}: <b>{paid} of {stipends.length}</b> paid
              </span>
              <Link href="/erp/stipends" className={toPay && editor ? styles.btn : styles.btnQuiet}>
                {toPay && editor ? `Pay ${toPay}` : "Open"}
              </Link>
            </div>
          ) : (
            <Empty>No family gets monthly help yet.</Empty>
          )}
        </section>
      </div>

      {waiting.length > 0 && (
        <>
          <Section title="Waiting for a decision" />
          <ul className={styles.list}>
            {waiting.slice(0, 6).map((r) => (
              <li key={r.id} className={styles.row}>
                <Link href={`/erp/families/${r.family_id}`} className={styles.rowLink}>
                  <span className={styles.rowMain}>
                    <span className={styles.rowTitle}>{r.family_name}</span>
                    <span className={styles.rowMeta}>
                      {labelOf(KINDS, r.kind, r.kind_other)} · asked {showDate(r.asked_on)}
                      {r.status === "approved" && <span className={`${styles.tag} ${styles.tagIn}`}>approved, to pay</span>}
                    </span>
                  </span>
                  <span className={styles.rowAmt}>
                    {r.approved_paise ? inr(r.approved_paise) : r.asked_paise ? inr(r.asked_paise) : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <Section title="Latest" link={latest.length ? { href: "/erp/money", label: "All money" } : undefined} />
      {latest.length ? (
        <MoneyList rows={latest.slice(0, 8)} />
      ) : (
        <Empty
          action={
            editor ? (
              <Link href="/erp/money/in/new" className={styles.btn}>
                Add the first receipt
              </Link>
            ) : null
          }
        >
          Nothing entered yet. Start with the next receipt or payment; past years can be brought in later.
        </Empty>
      )}
    </>
  );
}
