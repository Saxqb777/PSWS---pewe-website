import Link from "next/link";
import { requireUser } from "@/lib/erp/auth";
import { getMoneyIn, knownYears, listMoney, type MoneyIn } from "@/lib/erp/data";
import { fyMonths, fyOf, inr, showDate, showMonth, todayIST } from "@/lib/erp/labels";
import { PrintButton } from "@/components/erp/shell";
import { Receipt } from "@/components/erp/receipt";
import { TickAll } from "@/components/erp/tick-all";
import { PageHead } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";

export const metadata = { title: "Print receipts" };

type Search = { fy?: string; month?: string; r?: string | string[] };

/**
 * Several receipts printed together: tick the ones wanted, then print them,
 * two to a sheet of A4.
 */
export default async function PrintReceipts({ searchParams }: { searchParams: Promise<Search> }) {
  await requireUser();
  const sp = await searchParams;
  const ticked = [sp.r ?? []]
    .flat()
    .map(Number)
    .filter((n) => Number.isSafeInteger(n) && n > 0)
    .slice(0, 60);

  if (ticked.length) {
    const found = (await Promise.all(ticked.map((id) => getMoneyIn(id)))).filter((m): m is MoneyIn => !!m && !m.cancelled_at);
    const back = new URLSearchParams();
    if (sp.fy) back.set("fy", sp.fy);
    if (sp.month) back.set("month", sp.month);
    for (const id of ticked) back.append("r", String(id));
    return (
      <>
        <div className={styles.noPrint}>
        <PageHead
          title={`${found.length} ${found.length === 1 ? "receipt" : "receipts"} to print`}
          sub="Two to a sheet of A4."
          back={{ href: `/erp/money/print?${new URLSearchParams({ ...(sp.fy ? { fy: sp.fy } : {}), ...(sp.month ? { month: sp.month } : {}) })}`, label: "Pick again" }}
        >
          <PrintButton label="Print them" />
        </PageHead>
        </div>
        <div className={styles.receiptSheet}>
          {found.map((m) => (
            <Receipt key={m.id} m={m} />
          ))}
        </div>
      </>
    );
  }

  const current = fyOf(todayIST());
  const years = await knownYears(current);
  const fy = years.includes(String(sp.fy)) ? String(sp.fy) : current;
  const months = fyMonths(fy);
  const month = months.includes(String(sp.month)) ? String(sp.month) : null;
  const rows = (await listMoney({ fy, month, dir: "in", q: null })).filter((r) => r.dir === "in" && !r.cancelled);

  return (
    <>
      <PageHead title="Print receipts" sub="Tick the receipts you want, then print them together." back={{ href: "/erp/money", label: "Money" }} />

      <form className={styles.filters} method="get">
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
            <option value="">Every month</option>
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

      {rows.length ? (
        <form method="get" id="pick">
          <input type="hidden" name="fy" value={fy} />
          {month && <input type="hidden" name="month" value={month} />}
          <div className={styles.pickBar}>
            <TickAll form="pick" />
            <button type="submit" className={styles.btn}>
              Print ticked
            </button>
          </div>
          <ul className={styles.pickList}>
            {rows.map((r) => (
              <li key={r.id}>
                <label>
                  <input type="checkbox" name="r" value={r.id} />
                  <span>
                    <b>{r.who}</b>
                    <small>
                      {r.no} · {showDate(r.on_date)}
                    </small>
                  </span>
                  <span className={styles.pickAmt}>{inr(r.amount_paise)}</span>
                </label>
              </li>
            ))}
          </ul>
        </form>
      ) : (
        <p className={styles.note}>No receipts {month ? `in ${showMonth(month)}` : `in ${fy}`} yet.</p>
      )}
      <p className={styles.note} style={{ marginTop: 14 }}>
        <Link href="/erp/money" className={styles.link}>
          Back to Money
        </Link>
      </p>
    </>
  );
}
