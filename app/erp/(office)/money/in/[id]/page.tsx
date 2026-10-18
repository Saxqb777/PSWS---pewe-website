import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import { getMoneyIn } from "@/lib/erp/data";
import { HEADS, METHODS, canDo, inr, rupeesInWords, showDate, showPhone, showWhen } from "@/lib/erp/labels";
import { toId, waLink } from "@/lib/erp/form-state";
import { SOCIETY } from "@/lib/site";
import { CancelBox } from "@/components/erp/cancel-box";
import { PrintButton } from "@/components/erp/shell";
import { PageHead } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";
import { cancelEntry } from "../../actions";

export const metadata = { title: "Receipt" };

export default async function MoneyInPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string; saved?: string }>;
}) {
  const u = await requireUser();
  const id = toId((await params).id);
  const m = id ? await getMoneyIn(id) : null;
  if (!m) notFound();
  const sp = await searchParams;
  const words = rupeesInWords(m.amount_paise);
  const how = METHODS[m.method].en.split(" (")[0];
  const text = [
    SOCIETY.name,
    `Receipt ${m.receipt_no} · ${showDate(m.on_date)}`,
    "",
    `Received with thanks ${inr(m.amount_paise)} (${words} rupees) from ${m.from_name} towards ${HEADS[m.head].en}, by ${how}${m.reference ? ` (ref. ${m.reference})` : ""}.`,
    "",
    `Thank you. ${SOCIETY.shortName} office, Pewe`,
  ].join("\n");
  const editor = canDo(u.role, "editor");

  return (
    <>
      <PageHead title={`Receipt ${m.receipt_no}`} sub={m.cancelled_at ? "Cancelled" : showDate(m.on_date)} back={{ href: "/erp/money", label: "Money" }}>
        {!m.cancelled_at && (
          <>
            <a className={styles.btn} href={waLink(m.from_phone, text)} target="_blank" rel="noopener noreferrer">
              Send on WhatsApp
            </a>
            <PrintButton />
            {editor && (
              <Link href={`/erp/money/in/${m.id}/edit`} className={styles.btnQuiet}>
                Change
              </Link>
            )}
          </>
        )}
      </PageHead>

      {sp.new && !m.cancelled_at && (
        <p className={`${styles.formDone} ${styles.noPrint}`}>
          Saved as {m.receipt_no}. Send the receipt on WhatsApp{m.from_phone ? ` to ${showPhone(m.from_phone)}` : ""}, or print it.
        </p>
      )}
      {sp.saved && <p className={`${styles.formDone} ${styles.noPrint}`}>Change saved.</p>}

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
          </span>
        </p>
        <p className={styles.receiptField}>
          the sum of Rupees
          <span className={styles.receiptFill}>{words} only</span>
        </p>
        <p className={styles.receiptField}>
          towards
          <span className={styles.receiptFill}>
            {HEADS[m.head].en}, by {how}
            {m.reference ? ` (ref. ${m.reference})` : ""}
          </span>
        </p>
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
        {m.cancelled_at && <span className={styles.stamp}>Cancelled</span>}
      </article>

      {m.cancelled_at ? (
        <p className={`${styles.banner} ${styles.bannerWarn}`} style={{ marginTop: 20 }}>
          Cancelled on {showWhen(m.cancelled_at)}. Reason: {m.cancel_reason}
        </p>
      ) : (
        editor && <CancelBox action={cancelEntry.bind(null, "in", m.id)} what="receipt" />
      )}
    </>
  );
}
