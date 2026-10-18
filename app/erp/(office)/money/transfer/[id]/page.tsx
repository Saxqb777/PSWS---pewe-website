import { notFound } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import { TRANSFER_LABEL, getTransfer, openApproval } from "@/lib/erp/books";
import { inr, rupeesInWords, showDate, showWhen } from "@/lib/erp/labels";
import { toId } from "@/lib/erp/form-state";
import { AskBox } from "@/components/erp/cancel-box";
import { Facts, PageHead, Pending } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";
import { askDelete } from "../../actions";

export const metadata = { title: "Cash and bank" };

export default async function TransferPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const id = toId((await params).id);
  const t = id ? await getTransfer(id) : null;
  if (!t) notFound();
  const pending = t.cancelled_at ? null : await openApproval(`transfer:${t.id}`);
  return (
    <>
      <PageHead title={TRANSFER_LABEL[t.direction]} sub={`${t.transfer_no} · ${showDate(t.on_date)}`} back={{ href: "/erp/money", label: "Money" }} />
      {t.cancelled_at && (
        <p className={`${styles.banner} ${styles.bannerWarn}`}>
          Deleted on {showWhen(t.cancelled_at)}. {t.cancel_reason}
        </p>
      )}
      {pending && <Pending a={pending} />}
      <div className={styles.card}>
        <p className={styles.bigAmount}>{inr(t.amount_paise)}</p>
        <p className={styles.words}>{rupeesInWords(t.amount_paise)} rupees</p>
        <Facts
          items={[
            ["From", t.direction === "to_bank" ? "Cash in hand" : "The bank"],
            ["To", t.direction === "to_bank" ? "The bank" : "Cash in hand"],
            ["Note", t.note],
            ["Entered by", t.created_by_name ?? "Office"],
          ]}
        />
      </div>
      {!t.cancelled_at && !pending && (
        <AskBox
          action={askDelete.bind(null, "transfer", t.id)}
          title="Delete this"
          explain="Deleting needs the approval of all the approvers. It stays on record, crossed out."
          button="Ask to delete"
        />
      )}
    </>
  );
}
