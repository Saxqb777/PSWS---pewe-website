import { notFound } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import { isApprover, listMonths, monthFigures, openApproval } from "@/lib/erp/books";
import { inr, showMonth, showWhen, thisMonthIST } from "@/lib/erp/labels";
import { AmountInput, ErpForm, Field, Submit } from "@/components/erp/form";
import { AskBox } from "@/components/erp/cancel-box";
import { Facts, PageHead, Pending } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";
import { askReopen, closeMonthAction } from "../../actions";

export const metadata = { title: "Close a month" };

/** A month: closing it against the bank statement and the cash, or asking to reopen it. */
export default async function MonthPage({ params }: { params: Promise<{ month: string }> }) {
  const u = await requireUser();
  const { month } = await params;
  if (!/^\d{4}-\d{2}$/.test(month) || month >= thisMonthIST()) notFound();
  const [months, approver, books, pending] = await Promise.all([
    listMonths(),
    isApprover(u.id),
    monthFigures(month),
    openApproval(`month:${month}`),
  ]);
  const row = months.get(month);
  const closed = row?.status === "closed";

  return (
    <>
      <PageHead title={showMonth(month)} sub={closed ? "Closed" : "Open"} back={{ href: "/erp/accounts", label: "Accounts" }} />

      {closed ? (
        <>
          <div className={styles.card}>
            <Facts
              items={[
                ["Closed by", `${row!.closed_by_name ?? "Office"}, ${showWhen(row!.closed_at)}`],
                ["Cash by the books", inr(row!.cash_book_paise)],
                ["Cash counted", inr(row!.cash_counted_paise)],
                ["Bank by the books", inr(row!.bank_book_paise)],
                ["Bank statement", inr(row!.bank_statement_paise)],
                ["Note", row!.note],
              ]}
            />
          </div>
          {pending ? (
            <Pending a={pending} />
          ) : (
            <AskBox
              action={askReopen.bind(null, month)}
              title="Reopen this month"
              explain="Nothing new can be added to a closed month. Reopening it needs all the approvers; close it again once the entries are in."
              button="Ask to reopen"
            />
          )}
        </>
      ) : approver ? (
        <>
          <p className={styles.p}>
            Check the month against the bank statement and the cash in hand, then close it. Nothing new can be added to a
            closed month without the approvers.
          </p>
          <table className={styles.sum} style={{ marginBottom: 18 }}>
            <tbody>
              <tr>
                <td>Cash in hand by the books, end of {showMonth(month)}</td>
                <td>{inr(books.cash)}</td>
              </tr>
              <tr>
                <td>In the bank by the books</td>
                <td>{inr(books.bank)}</td>
              </tr>
            </tbody>
          </table>
          <ErpForm action={closeMonthAction.bind(null, month)}>
            <div className={styles.grid}>
              <AmountInput name="cash" label="Cash counted" hint="What is actually in hand" />
              <AmountInput name="bank" label="Bank statement balance" hint="On the last day of the month" />
              <Field label="Note" hint="Needed only if they do not match" name="note" wide>
                <input name="note" autoComplete="off" />
              </Field>
            </div>
            <div className={styles.actions}>
              <Submit>Close {showMonth(month)}</Submit>
            </div>
          </ErpForm>
        </>
      ) : (
        <p className={styles.p}>The approvers close each month.</p>
      )}
    </>
  );
}
