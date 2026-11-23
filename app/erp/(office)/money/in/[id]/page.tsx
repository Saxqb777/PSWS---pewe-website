import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import { getMoneyIn } from "@/lib/erp/data";
import { handlesMoney, showDate, showPhone, showWhen } from "@/lib/erp/labels";
import { toId, waLink } from "@/lib/erp/form-state";
import { AskBox } from "@/components/erp/cancel-box";
import { PrintButton } from "@/components/erp/shell";
import { Receipt, receiptText } from "@/components/erp/receipt";
import { PageHead, Pending } from "@/components/erp/ui";
import { openApproval } from "@/lib/erp/books";
import styles from "@/components/erp/erp.module.css";
import { askDelete } from "../../actions";

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
  const pending = m.cancelled_at ? null : await openApproval(`money_in:${m.id}`);
  const text = receiptText(m);
  const editor = handlesMoney(u);

  return (
    <>
      <PageHead title={`Receipt ${m.receipt_no}`} sub={m.cancelled_at ? "Deleted" : showDate(m.on_date)} back={{ href: "/erp/money", label: "Money" }}>
        {!m.cancelled_at && (
          <>
            <a className={styles.btn} href={waLink(m.from_phone, text)} target="_blank" rel="noopener noreferrer">
              Send on WhatsApp
            </a>
            <PrintButton />
            {editor && !pending && (
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
      {pending && <Pending a={pending} />}

      <Receipt m={m} />

      {m.cancelled_at ? (
        <p className={`${styles.banner} ${styles.bannerWarn}`} style={{ marginTop: 20 }}>
          Deleted on {showWhen(m.cancelled_at)}. {m.cancel_reason}
        </p>
      ) : (
        editor &&
        !pending && (
          <AskBox
            action={askDelete.bind(null, "in", m.id)}
            title="Delete this receipt"
            explain="Deleting needs the approval of all the approvers. Once they agree, the receipt is crossed out and leaves every total; it stays on record."
            button="Ask to delete"
          />
        )
      )}
    </>
  );
}
