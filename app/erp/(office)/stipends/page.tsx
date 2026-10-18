import Link from "next/link";
import { requireUser } from "@/lib/erp/auth";
import { stipendLines } from "@/lib/erp/data";
import { canDo, fyMonths, fyOf, inr, showMonth, thisMonthIST, todayIST } from "@/lib/erp/labels";
import { StipendRun } from "@/components/erp/stipend-run";
import { Empty, PageHead } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";
import { runStipends } from "../families/actions";

export const metadata = { title: "Monthly help" };

export default async function StipendsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const now = thisMonthIST();
  const fy = fyOf(todayIST());
  // this year's months up to now, and last year's for anything left behind
  const prevFy = `${Number(fy.slice(0, 4)) - 1}-${fy.slice(2, 4)}`;
  const months = [...fyMonths(prevFy), ...fyMonths(fy)].filter((m) => m <= now).reverse();
  const month = months.includes(String(sp.month)) ? String(sp.month) : now;
  const lines = await stipendLines(month);
  const paid = lines.filter((l) => l.paid_voucher);
  const due = lines.filter((l) => !l.paid_voucher);
  const editor = canDo(u.role, "editor");

  return (
    <>
      <PageHead title="Monthly help" sub="Pay every family on monthly help in one go." />

      <form className={`${styles.filters} ${styles.filtersOne}`} method="get">
        <label className={styles.field}>
          <span className={styles.srOnly}>Month</span>
          <select name="month" defaultValue={month}>
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

      {lines.length > 0 && (
        <table className={styles.sum} style={{ marginBottom: 18 }}>
          <tbody>
            <tr>
              <td>Paid for {showMonth(month)}</td>
              <td>
                {paid.length} of {lines.length}
              </td>
              <td>{inr(paid.reduce((s, l) => s + (l.paid_paise ?? 0), 0))}</td>
            </tr>
            <tr>
              <td>Still to pay</td>
              <td>{due.length}</td>
              <td>{inr(due.reduce((s, l) => s + l.stipend_paise, 0))}</td>
            </tr>
          </tbody>
        </table>
      )}

      {lines.length === 0 ? (
        <Empty
          action={
            <Link href="/erp/families" className={styles.btnQuiet}>
              Go to Families
            </Link>
          }
        >
          No family gets monthly help yet. Open a family, choose Change details, and tick “Gets monthly help”.
        </Empty>
      ) : editor ? (
        <StipendRun key={month} action={runStipends.bind(null, month)} month={month} lines={lines} />
      ) : (
        <ul className={styles.list}>
          {lines.map((l) => (
            <li key={l.family_id} className={styles.row}>
              <Link href={`/erp/families/${l.family_id}`} className={styles.rowLink}>
                <span className={styles.rowMain}>
                  <span className={styles.rowTitle}>
                    {l.name}
                    {l.paid_voucher && <span className={`${styles.tag} ${styles.tagIn}`}>Paid</span>}
                  </span>
                  <span className={styles.rowMeta}>{[l.place, l.paid_voucher].filter(Boolean).join(" · ")}</span>
                </span>
                <span className={styles.rowAmt}>{inr(l.paid_paise ?? l.stipend_paise)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
