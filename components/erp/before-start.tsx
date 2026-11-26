import Link from "next/link";
import type { BeforeStart } from "@/lib/erp/books";
import { inr, showDate } from "@/lib/erp/labels";
import styles from "./erp.module.css";

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Money dated before the starting balances is not in the balances: said plainly, with the fix. */
export function BeforeStartWarning({ b, link = false }: { b: BeforeStart; link?: boolean }) {
  const parts = [
    b.receipts.length ? `${count(b.receipts.length, "receipt", "receipts")} (${inr(b.in_paise)})` : "",
    b.payments.length ? `${count(b.payments.length, "payment", "payments")} (${inr(b.out_paise)})` : "",
  ].filter(Boolean);
  const all = [...b.receipts, ...b.payments].map((x) => x.no);
  const numbers = all.length > 5 ? `${all.slice(0, 5).join(", ")} and ${all.length - 5} more` : all.join(", ");
  return (
    <div className={`${styles.banner} ${styles.bannerWarn}`}>
      <p style={{ margin: 0 }}>
        <b>
          {parts.join(" and ")} {b.receipts.length + b.payments.length === 1 ? "is" : "are"} dated before the starting
          balances of {showDate(b.on_date)}, so the balances below leave {b.receipts.length + b.payments.length === 1 ? "it" : "them"} out.
        </b>
      </p>
      <p style={{ margin: "6px 0 0" }}>
        {numbers}. To count them, set the starting balances on an earlier day, with what was really in the bank and in
        cash that day{link ? (
          <>
            {" "}
            (<Link href="/erp/accounts">Accounts</Link>, Starting balances)
          </>
        ) : null}
        .
      </p>
    </div>
  );
}
