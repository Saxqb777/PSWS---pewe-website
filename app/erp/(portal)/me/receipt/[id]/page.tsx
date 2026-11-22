import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/erp/auth";
import { myReceipt } from "@/lib/erp/portal";
import { toId, waLink } from "@/lib/erp/form-state";
import { PrintButton } from "@/components/erp/shell";
import { Receipt, receiptText } from "@/components/erp/receipt";
import styles from "@/components/erp/erp.module.css";
import p from "@/components/erp/portal.module.css";

export const metadata = { title: "Receipt" };

/** A member's own receipt, as the office printed it: to keep, print, or send on. */
export default async function MyReceipt({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireMember();
  const id = toId((await params).id);
  const m = id ? await myReceipt(u.id, id) : null;
  if (!m) notFound();

  return (
    <>
      <Link href="/erp/me/passbook" className={`${p.back} ${styles.noPrint}`}>
        ← My passbook
      </Link>
      <h1 className={`${p.h1} ${styles.noPrint}`}>Receipt {m.receipt_no}</h1>
      <div className={`${p.docActions} ${styles.noPrint}`}>
        <a className={styles.btn} href={waLink(null, receiptText(m))} target="_blank" rel="noopener noreferrer">
          Send on WhatsApp
        </a>
        <PrintButton label="Print or save as PDF" />
      </div>
      <Receipt m={m} />
    </>
  );
}
