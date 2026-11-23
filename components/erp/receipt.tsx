import { HEADS, foreign, howPaid, inr, labelOf, rupeesInWords, showDate } from "@/lib/erp/labels";
import type { MoneyIn } from "@/lib/erp/data";
import { SOCIETY } from "@/lib/site";
import styles from "./erp.module.css";

/**
 * The Society's receipt, as it is printed and sent: the same in the office and
 * on a member's own page.
 */

/** Where the giver lives, when not India. */
const livesIn = (m: MoneyIn) => (m.country && m.country !== "India" ? m.country : "");

/** An amount sent in another currency, from before the portal took rupees only. */
const sentAs = (m: MoneyIn) => (m.currency && m.currency !== "INR" ? foreign(m.sent_amount, m.currency) : "");

/** Paid in by a member for one other person: the receipt is in that person's name. */
const paidInBy = (m: MoneyIn) =>
  m.collected_by_name && m.givers?.length === 1 && m.from_name === m.givers[0] ? m.collected_by_name : null;

/** The receipt as a WhatsApp message. */
export function receiptText(m: MoneyIn): string {
  const lives = livesIn(m);
  const sent = sentAs(m);
  const by = paidInBy(m);
  return [
    SOCIETY.name,
    `Receipt ${m.receipt_no} · ${showDate(m.on_date)}`,
    "",
    `Received with thanks ${inr(m.amount_paise)} (${rupeesInWords(m.amount_paise)} rupees) from ${m.from_name}${lives ? ` (${lives})` : ""} towards ${labelOf(HEADS, m.head, m.head_other)}, by ${howPaid(m.method, m.method_other, m.bank_name)}${m.reference ? ` (ref. ${m.reference})` : ""}${sent ? `, sent as ${sent}` : ""}.`,
    ...(by ? ["", `Paid in by: ${by}`] : m.givers?.length ? ["", `Collected from: ${m.givers.join(", ")}`] : []),
    "",
    `Thank you. ${SOCIETY.shortName} office, Pewe`,
  ].join("\n");
}

export function Receipt({ m }: { m: MoneyIn }) {
  const lives = livesIn(m);
  const sent = sentAs(m);
  const by = paidInBy(m);
  return (
    <article className={styles.receipt} aria-label={`Receipt ${m.receipt_no}`}>
      <header className={styles.receiptHead}>
        <p className={styles.receiptName}>{SOCIETY.name}</p>
        <p className={styles.receiptMr}>{SOCIETY.nameMarathi}</p>
        <p className={styles.receiptAddr}>
          {SOCIETY.address.line1}, Tal. Guhagar, Dist. Ratnagiri
          <br />
          Reg. {SOCIETY.societyRegNo} · {SOCIETY.registrationNo}
        </p>
      </header>
      <div className={styles.receiptLine}>
        <span>
          No. <b>{m.receipt_no}</b>
        </span>
        <span>
          Date <b>{showDate(m.on_date)}</b>
        </span>
      </div>
      <p className={styles.receiptField}>
        Received with thanks from
        <span className={styles.receiptFill}>
          {m.from_name}
          {m.from_place ? `, ${m.from_place}` : ""}
          {lives ? ` (${lives})` : ""}
        </span>
      </p>
      <p className={styles.receiptField}>
        the sum of Rupees
        <span className={styles.receiptFill}>{rupeesInWords(m.amount_paise)} only</span>
      </p>
      <p className={styles.receiptField}>
        towards
        <span className={styles.receiptFill}>
          {labelOf(HEADS, m.head, m.head_other)}, by {howPaid(m.method, m.method_other, m.bank_name)}
          {m.reference ? ` (ref. ${m.reference})` : ""}
        </span>
      </p>
      {sent && (
        <p className={styles.receiptField}>
          sent as
          <span className={styles.receiptFill}>{sent}</span>
        </p>
      )}
      {by && (
        <p className={styles.receiptField}>
          paid in by
          <span className={styles.receiptFill}>{by}</span>
        </p>
      )}
      {!by && !!m.givers?.length && (
        <p className={styles.receiptField}>
          collected from
          <span className={styles.receiptFill}>{m.givers.join(", ")}</span>
        </p>
      )}
      {m.note && (
        <p className={styles.receiptField}>
          note
          <span className={styles.receiptFill}>{m.note}</span>
        </p>
      )}
      <footer className={styles.receiptFoot}>
        <span className={styles.receiptBox}>{inr(m.amount_paise)}</span>
        <span className={styles.receiptSign}>
          <b>For {SOCIETY.shortName}</b>
          {m.created_by_name ?? "the office"}
        </span>
      </footer>
      {m.cancelled_at && <span className={styles.stamp}>Deleted</span>}
    </article>
  );
}
