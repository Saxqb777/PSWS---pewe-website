import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import { getMoneyOut, getRequest } from "@/lib/erp/data";
import { HEADS, KINDS, METHODS, PURPOSES, canDo, inr, rupeesInWords, showDate, showMonth, showWhen, labelOf } from "@/lib/erp/labels";
import { toId } from "@/lib/erp/form-state";
import { AskBox } from "@/components/erp/cancel-box";
import { PrintButton } from "@/components/erp/shell";
import { Facts, PageHead, Pending } from "@/components/erp/ui";
import { openApproval } from "@/lib/erp/books";
import styles from "@/components/erp/erp.module.css";
import { askDelete } from "../../actions";

export const metadata = { title: "Payment" };

export default async function MoneyOutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string; saved?: string }>;
}) {
  const u = await requireUser();
  const id = toId((await params).id);
  const m = id ? await getMoneyOut(id) : null;
  if (!m) notFound();
  const sp = await searchParams;
  const pending = m.cancelled_at ? null : await openApproval(`money_out:${m.id}`);
  const req = m.request_id ? await getRequest(m.request_id) : null;
  const editor = canDo(u.role, "editor");

  return (
    <>
      <PageHead title={`Payment ${m.voucher_no}`} sub={m.cancelled_at ? "Deleted" : showDate(m.on_date)} back={{ href: "/erp/money", label: "Money" }}>
        {!m.cancelled_at && (
          <>
            <PrintButton />
            {editor && !pending && (
              <Link href={`/erp/money/out/${m.id}/edit`} className={styles.btnQuiet}>
                Change
              </Link>
            )}
          </>
        )}
      </PageHead>

      {sp.new && !m.cancelled_at && <p className={`${styles.formDone} ${styles.noPrint}`}>Saved as {m.voucher_no}.</p>}
      {sp.saved && <p className={`${styles.formDone} ${styles.noPrint}`}>Change saved.</p>}
      {pending && <Pending a={pending} />}
      {m.cancelled_at && (
        <p className={`${styles.banner} ${styles.bannerWarn}`}>
          Deleted on {showWhen(m.cancelled_at)}. {m.cancel_reason}
        </p>
      )}

      <div className={styles.card}>
        <p className={`${styles.bigAmount} ${m.cancelled_at ? styles.muted : styles.out}`}>{inr(m.amount_paise)}</p>
        <p className={styles.words}>{rupeesInWords(m.amount_paise)} rupees</p>
        <Facts
          items={[
            ["Paid to", m.paid_to],
            ["Date", showDate(m.on_date)],
            ["For", labelOf(PURPOSES, m.purpose, m.purpose_other) + (m.stipend_month ? `, ${showMonth(m.stipend_month)}` : "")],
            [
              "Family",
              m.family_id && (
                <Link className={styles.link} href={`/erp/families/${m.family_id}`}>
                  {m.family_name}
                </Link>
              ),
            ],
            ["Request", req && `${labelOf(KINDS, req.kind, req.kind_other)}, asked on ${showDate(req.asked_on)}`],
            [
              "Work",
              m.work_id && (
                <Link className={styles.link} href={`/erp/works/${m.work_id}`}>
                  {m.work_name}
                </Link>
              ),
            ],
            ["From which money", labelOf(HEADS, m.head, m.head_other)],
            ["Paid by", METHODS[m.method].en],
            ["Number", m.reference],
            ["Note", m.note],
            ["Entered by", `${m.created_by_name ?? "the office"}, ${showWhen(m.created_at)}`],
          ]}
        />
      </div>

      {!m.cancelled_at && editor && !pending && (
        <AskBox
          action={askDelete.bind(null, "out", m.id)}
          title="Delete this payment"
          explain="Deleting needs the approval of all the approvers. Once they agree, the payment is crossed out and leaves every total; it stays on record."
          button="Ask to delete"
        />
      )}
    </>
  );
}
