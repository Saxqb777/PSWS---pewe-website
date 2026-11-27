import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { currentUser, requireMember } from "@/lib/erp/auth";
import { myReceipt } from "@/lib/erp/portal";
import { toId, waLink } from "@/lib/erp/form-state";
import { PrintButton } from "@/components/erp/shell";
import { Receipt, receiptFileName, receiptText } from "@/components/erp/receipt";
import styles from "@/components/erp/erp.module.css";
import p from "@/components/erp/portal.module.css";

/** Saved as a PDF, the file takes the page's title: the receipt number, not "My PSWS". */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const u = await currentUser();
  const id = toId((await params).id);
  const m = u && u.role === "member" && id ? await myReceipt(u.id, id) : null;
  return { title: { absolute: m ? receiptFileName(m.receipt_no) : "PSWS Receipt" } };
}

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
