import Link from "next/link";
import { requireUser } from "@/lib/erp/auth";
import { knownYears, report } from "@/lib/erp/data";
import { HEADS, METHODS, PURPOSES, fyMonths, fyOf, inr, showMonth, todayIST } from "@/lib/erp/labels";
import { PrintButton } from "@/components/erp/shell";
import { PageHead } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";

export const metadata = { title: "Reports" };

const DOWNLOADS: [string, string, boolean][] = [
  ["money-in", "Money received", true],
  ["money-out", "Money paid", true],
  ["families", "Families", true],
  ["requests", "Requests for help", false],
  ["works", "Village works", false],
  ["members", "Members", false],
  ["meetings", "Meetings and notices", false],
  ["history", "Who changed what", false],
];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ fy?: string; month?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const current = fyOf(todayIST());
  const years = await knownYears(current);
  const fy = years.includes(String(sp.fy)) ? String(sp.fy) : current;
  const months = fyMonths(fy);
  const month = months.includes(String(sp.month)) ? String(sp.month) : null;
  const r = await report(fy, month);
  const tin = r.byHead.reduce((s, h) => s + h.in_paise, 0);
  const tout = r.byHead.reduce((s, h) => s + h.out_paise, 0);
  const peak = Math.max(1, ...r.byMonth.map((x) => Math.max(x.in_paise, x.out_paise)));
  const period = month ? showMonth(month) : `April ${fy.slice(0, 4)} to March 20${fy.slice(5)}`;
  const q = new URLSearchParams({ fy, ...(month ? { month } : {}) });

  return (
    <>
      <PageHead title="Reports" sub={period}>
        <PrintButton label="Print the report" />
      </PageHead>
      <p className={`${styles.printOnly} ${styles.p}`}>Pewe Social Welfare Society · from the office records · {todayIST()}</p>

      <form className={`${styles.filters} ${styles.filtersShort} ${styles.noPrint}`} method="get">
        <label className={styles.field}>
          <span className={styles.srOnly}>Year</span>
          <select name="fy" defaultValue={fy}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.srOnly}>Month</span>
          <select name="month" defaultValue={month ?? ""}>
            <option value="">Whole year</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {showMonth(m)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={styles.btnQuiet}>
          Show
        </button>
      </form>

      <table className={styles.sum}>
        <tbody>
          <tr>
            <td>Received</td>
            <td className={styles.in}>{inr(tin)}</td>
          </tr>
          <tr>
            <td>Paid</td>
            <td className={styles.out}>{inr(tout)}</td>
          </tr>
          <tr>
            <td>Received minus paid</td>
            <td>{inr(tin - tout)}</td>
          </tr>
          <tr>
            <td>Families helped</td>
            <td>
              {r.families}
              {r.stipendFamilies ? `, ${r.stipendFamilies} on monthly help` : ""}
            </td>
          </tr>
        </tbody>
      </table>

      <h2 className={styles.h2}>
        By head
      </h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Head</th>
              <th className={styles.num}>Received</th>
              <th className={styles.num}>Paid</th>
              <th className={styles.num}>Difference</th>
            </tr>
          </thead>
          <tbody>
            {r.byHead.map((h) => (
              <tr key={h.head}>
                <td>{HEADS[h.head].en}</td>
                <td className={styles.num}>{inr(h.in_paise)}</td>
                <td className={styles.num}>{inr(h.out_paise)}</td>
                <td className={styles.num}>{inr(h.in_paise - h.out_paise)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td className={styles.num}>{inr(tin)}</td>
              <td className={styles.num}>{inr(tout)}</td>
              <td className={styles.num}>{inr(tin - tout)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <h2 className={styles.h2}>
        What the money was paid for
      </h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>For</th>
              <th className={styles.num}>Payments</th>
              <th className={styles.num}>Amount</th>
              <th className={styles.num}>Share</th>
            </tr>
          </thead>
          <tbody>
            {r.byPurpose
              .filter((p) => p.count > 0)
              .map((p) => (
                <tr key={p.purpose}>
                  <td>{PURPOSES[p.purpose].en}</td>
                  <td className={styles.num}>{p.count}</td>
                  <td className={styles.num}>{inr(p.out_paise)}</td>
                  <td className={styles.num}>{tout ? `${Math.round((p.out_paise / tout) * 100)}%` : ""}</td>
                </tr>
              ))}
            {r.byPurpose.every((p) => p.count === 0) && (
              <tr>
                <td colSpan={4} className={styles.muted}>
                  No payments in this time.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!month && (
        <>
          <h2 className={styles.h2}>
            Month by month
          </h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Month</th>
                  <th className={styles.num}>Received</th>
                  <th className={styles.num}>Paid</th>
                  <th aria-hidden="true"></th>
                </tr>
              </thead>
              <tbody>
                {r.byMonth.map((x) => (
                  <tr key={x.month}>
                    <td>
                      <Link className={styles.link} href={`/erp/reports?fy=${fy}&month=${x.month}`}>
                        {showMonth(x.month)}
                      </Link>
                    </td>
                    <td className={styles.num}>{inr(x.in_paise)}</td>
                    <td className={styles.num}>{inr(x.out_paise)}</td>
                    <td aria-hidden="true">
                      <span className={styles.bars}>
                        <span className={styles.barIn} style={{ width: `${(x.in_paise / peak) * 100}%` }} />
                        <span className={styles.barOut} style={{ width: `${(x.out_paise / peak) * 100}%` }} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className={styles.h2}>
        How it came and went
      </h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>How</th>
              <th className={styles.num}>Received</th>
              <th className={styles.num}>Paid</th>
            </tr>
          </thead>
          <tbody>
            {r.byMethod.map((x) => (
              <tr key={x.method}>
                <td>{METHODS[x.method].en}</td>
                <td className={styles.num}>{inr(x.in_paise)}</td>
                <td className={styles.num}>{inr(x.out_paise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className={styles.noPrint}>
        <h2 className={styles.h2}>
          Download for Excel
        </h2>
        <ul className={styles.list}>
          {DOWNLOADS.map(([kind, label, forPeriod]) => (
            <li key={kind} className={styles.row}>
              <a className={styles.rowLink} href={`/erp/export/${kind}${forPeriod ? `?${q}` : ""}`}>
                <span className={styles.rowMain}>
                  <span className={styles.rowTitle}>{label}</span>
                  <span className={styles.rowMeta}>{forPeriod ? period : "Everything"} · CSV, opens in Excel</span>
                </span>
                <span className={styles.rowAmt}>↓</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
