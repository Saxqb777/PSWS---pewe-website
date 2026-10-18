import Link from "next/link";
import { requireUser } from "@/lib/erp/auth";
import {
  fundBalances,
  getOpening,
  isApprover,
  listMonths,
  openApproval,
  placeBalances,
  type Opening,
} from "@/lib/erp/books";
import { HEADS, fyMonths, fyOf, inr, showDate, showMonth, showWhen, thisMonthIST, todayIST } from "@/lib/erp/labels";
import { AmountInput, Chips, ErpForm, Field, Submit } from "@/components/erp/form";
import { PageHead, Pending, Section } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";
import { moveMoney, saveStarting } from "./actions";

export const metadata = { title: "Accounts" };

function StartingForm({ o, change }: { o: Opening | null; change: boolean }) {
  return (
    <ErpForm action={saveStarting}>
      <div className={styles.grid}>
        <Field label="Balances on" hint="The day you start counting from" name="on_date">
          <input name="on_date" type="date" defaultValue={o?.on_date ?? todayIST()} />
        </Field>
        <span />
        <AmountInput name="cash" label="Cash in hand" hint="Counted cash" defaultPaise={o?.cash_paise || null} />
        <AmountInput name="bank" label="In the bank" hint="From the bank statement" defaultPaise={o?.bank_paise || null} />
      </div>
      <p className={styles.note}>Whose money is it? Split the same total between the funds:</p>
      <div className={styles.grid}>
        <AmountInput name="zakat" label="Zakat fund" hint="Zakat money not yet given" defaultPaise={o?.zakat_paise || null} />
        <AmountInput name="donation" label="Donation fund" defaultPaise={o?.donation_paise || null} />
        <AmountInput name="development" label="Village work fund" defaultPaise={o?.development_paise || null} />
        <AmountInput name="other" label="Other" defaultPaise={o?.other_paise || null} />
      </div>
      {change && (
        <Field label="Why do they need changing?" hint="The approvers read this" name="reason">
          <input name="reason" autoComplete="off" />
        </Field>
      )}
      <div className={styles.actions}>
        <Submit>{change ? "Ask for approval" : "Save the starting balances"}</Submit>
      </div>
    </ErpForm>
  );
}

export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ started?: string; closed?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const [opening, places, funds, months, approver, pendingOpening] = await Promise.all([
    getOpening(),
    placeBalances(),
    fundBalances(),
    listMonths(),
    isApprover(u.id),
    openApproval("opening"),
  ]);
  const fy = fyOf(todayIST());
  const prevFy = `${Number(fy.slice(0, 4)) - 1}-${fy.slice(2, 4)}`;
  const now = thisMonthIST();
  const firstMonth = opening ? opening.on_date.slice(0, 7) : null;
  const monthList = [...fyMonths(prevFy), ...fyMonths(fy)]
    .filter((m) => m < now && (!firstMonth || m >= firstMonth))
    .reverse();

  return (
    <>
      <PageHead title="Accounts" sub="What the Society has: in cash, in the bank, and in each fund." />
      {sp.started && <p className={styles.formDone}>Starting balances saved. Every entry from that day on now counts.</p>}
      {sp.closed && <p className={styles.formDone}>{showMonth(sp.closed)} is closed.</p>}

      {!opening ? (
        <section className={styles.card}>
          <h2 className={styles.h2} style={{ marginTop: 0 }}>
            Starting balances
          </h2>
          <p className={styles.p}>
            Enter what the Society has on the day you start: the cash counted and the bank balance, and how much of it
            belongs to each fund. After that the office keeps every balance by itself.
          </p>
          <StartingForm o={null} change={false} />
        </section>
      ) : (
        <>
          <Section title="Balances" />
          <table className={styles.sum}>
            <tbody>
              <tr>
                <td>Cash in hand</td>
                <td className={places.cash < 0 ? styles.out : undefined}>{inr(places.cash)}</td>
              </tr>
              <tr>
                <td>In the bank</td>
                <td className={places.bank < 0 ? styles.out : undefined}>{inr(places.bank)}</td>
              </tr>
              <tr>
                <td>
                  <strong>Total</strong>
                </td>
                <td>{inr(places.cash + places.bank)}</td>
              </tr>
            </tbody>
          </table>
          <p className={styles.note} style={{ marginTop: 6 }}>
            From the starting balances on {showDate(opening.on_date)}. Cash, GPay/UPI, bank and cheque: everything except
            cash counts as the bank.
          </p>

          <Section title="Funds" />
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fund</th>
                  <th className={styles.num}>Started with</th>
                  <th className={styles.num}>Received</th>
                  <th className={styles.num}>Paid</th>
                  <th className={styles.num}>Left</th>
                </tr>
              </thead>
              <tbody>
                {funds.map((f) => (
                  <tr key={f.head}>
                    <td>{HEADS[f.head].en}</td>
                    <td className={styles.num}>{inr(f.start)}</td>
                    <td className={`${styles.num} ${styles.in}`}>{inr(f.in_paise)}</td>
                    <td className={`${styles.num} ${styles.out}`}>{inr(f.out_paise)}</td>
                    <td className={`${styles.num} ${f.left < 0 ? styles.out : ""}`}>
                      <strong>{inr(f.left)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.note} style={{ marginTop: 6 }}>
            Zakat money is kept apart: it may only be given under the Zakat heads. A payment that would take a fund below
            nothing asks for a tick first.
          </p>

          <Section title="Move money between cash and bank" />
          <ErpForm action={moveMoney} resetOnDone>
            <Chips
              name="direction"
              legend="Which way?"
              options={[
                { value: "to_bank", en: "Cash deposited in bank", hi: "Bank mein jama" },
                { value: "to_cash", en: "Cash taken from bank", hi: "Bank se nikala" },
              ]}
            />
            <div className={styles.grid}>
              <AmountInput name="amount" />
              <Field label="Date" name="on_date">
                <input name="on_date" type="date" defaultValue={todayIST()} />
              </Field>
              <Field label="Note" hint="Optional, e.g. deposit slip number" name="note" wide>
                <input name="note" autoComplete="off" />
              </Field>
            </div>
            <div className={styles.actions}>
              <Submit>Save</Submit>
            </div>
          </ErpForm>
          <p className={styles.note} style={{ marginTop: 6 }}>
            This is not income or spending, so it does not change any fund. It shows in Money.
          </p>

          <Section title="Months" />
          {monthList.length ? (
            <ul className={styles.list}>
              {monthList.map((m) => {
                const row = months.get(m);
                const closed = row?.status === "closed";
                const off = row && (row.cash_counted_paise !== row.cash_book_paise || row.bank_statement_paise !== row.bank_book_paise);
                return (
                  <li key={m} className={styles.row}>
                    <div className={styles.rowStatic}>
                      <span className={styles.rowMain}>
                        <span className={styles.rowTitle}>
                          {showMonth(m)}
                          <span className={`${styles.tag} ${closed ? styles.tagIn : styles.tagWarn}`}>
                            {closed ? "closed" : row ? "reopened" : "open"}
                          </span>
                        </span>
                        <span className={styles.rowMeta}>
                          {closed
                            ? `Closed by ${row!.closed_by_name ?? "Office"}, ${showWhen(row!.closed_at)} · cash ${inr(row!.cash_counted_paise)}, bank ${inr(row!.bank_statement_paise)}${off ? ` · difference noted: ${row!.note}` : ""}`
                            : row?.reopened_at
                              ? `Reopened ${showWhen(row.reopened_at)} with approval`
                              : "Not closed yet"}
                        </span>
                      </span>
                      {(closed || approver) && (
                        <Link href={`/erp/accounts/close/${m}`} className={styles.btnQuiet}>
                          {closed ? "Open" : "Close"}
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={styles.note}>Months can be closed once they have ended.</p>
          )}
          {!approver && (
            <p className={styles.note} style={{ marginTop: 6 }}>
              The approvers close each month after checking it against the bank statement and the cash.
            </p>
          )}
          <Section title="Starting balances" />
          {pendingOpening ? (
            <Pending a={pendingOpening} />
          ) : (
            <details className={styles.fold}>
              <summary>
                On {showDate(opening.on_date)}: cash {inr(opening.cash_paise)}, bank {inr(opening.bank_paise)}
              </summary>
              <div>
                <p className={styles.p}>Changing them needs all the approvers.</p>
                <StartingForm o={opening} change />
              </div>
            </details>
          )}
        </>
      )}
    </>
  );
}
