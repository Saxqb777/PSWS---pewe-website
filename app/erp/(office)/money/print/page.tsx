import Link from "next/link";
import { requireUser } from "@/lib/erp/auth";
import { getMoneyIn, receiptsBetween, type MoneyIn } from "@/lib/erp/data";
import { inr, isDate, showDate, todayIST } from "@/lib/erp/labels";
import { PrintButton } from "@/components/erp/shell";
import { Receipt } from "@/components/erp/receipt";
import { TickAll } from "@/components/erp/tick-all";
import { DateInput } from "@/components/erp/date-input";
import { PageHead } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";

export const metadata = { title: { absolute: "PSWS Receipts" } };

type Search = { from?: string; to?: string; r?: string | string[] };

/**
 * Several receipts printed together: show the receipts between two dates,
 * select all or tick the ones wanted, then print them two to a sheet of A4.
 */
export default async function PrintReceipts({ searchParams }: { searchParams: Promise<Search> }) {
  await requireUser();
  const sp = await searchParams;
  const today = todayIST();
  let from = isDate(String(sp.from ?? "")) ? String(sp.from) : `${today.slice(0, 7)}-01`;
  let to = isDate(String(sp.to ?? "")) ? String(sp.to) : today;
  if (from > to) [from, to] = [to, from];
  const range = new URLSearchParams({ from, to });

  const ticked = [sp.r ?? []]
    .flat()
    .map(Number)
    .filter((n) => Number.isSafeInteger(n) && n > 0)
    .slice(0, 60);

  if (ticked.length) {
    const found = (await Promise.all(ticked.map((id) => getMoneyIn(id)))).filter((m): m is MoneyIn => !!m && !m.cancelled_at);
    return (
      <>
        <div className={styles.noPrint}>
          <PageHead
            title={`${found.length} ${found.length === 1 ? "receipt" : "receipts"} to print`}
            sub="Two to a sheet of A4."
            back={{ href: `/erp/money/print?${range}`, label: "Pick again" }}
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

  const rows = await receiptsBetween(from, to);
  const total = rows.reduce((s, r) => s + r.amount_paise, 0);

  return (
    <>
      <PageHead title="Print receipts" sub="Choose the dates, select the receipts, then print them together." back={{ href: "/erp/money", label: "Money" }} />

      <form className={styles.printDates} method="get">
        <label className={styles.field}>
          <span className={styles.label}>From</span>
          <DateInput name="from" defaultValue={from} max={today} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>To</span>
          <DateInput name="to" defaultValue={to} max={today} />
        </label>
        <button type="submit" className={styles.btnQuiet}>
          Show
        </button>
      </form>

      {rows.length ? (
        <form method="get" id="pick">
          <input type="hidden" name="from" value={from} />
          <input type="hidden" name="to" value={to} />
          <p className={styles.note} style={{ margin: "0 0 8px" }}>
            {rows.length} {rows.length === 1 ? "receipt" : "receipts"} from {showDate(from)} to {showDate(to)}, {inr(total)} in all.
          </p>
          <div className={styles.pickBar}>
            <TickAll form="pick" />
            <button type="submit" className={styles.btn}>
              Print selected
            </button>
          </div>
          <ul className={styles.pickList}>
            {rows.map((r) => (
              <li key={r.id}>
                <label>
                  <input type="checkbox" name="r" value={r.id} />
                  <span>
                    <b>{r.from_name}</b>
                    <small>
                      {r.receipt_no} · {showDate(r.on_date)}
                    </small>
                  </span>
                  <span className={styles.pickAmt}>{inr(r.amount_paise)}</span>
                </label>
              </li>
            ))}
          </ul>
        </form>
      ) : (
        <p className={styles.note}>
          No receipts from {showDate(from)} to {showDate(to)}.
        </p>
      )}
      <p className={styles.note} style={{ marginTop: 14 }}>
        <Link href="/erp/money" className={styles.link}>
          Back to Money
        </Link>
      </p>
    </>
  );
}
