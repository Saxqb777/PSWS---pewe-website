import Link from "next/link";
import { requireUser } from "@/lib/erp/auth";
import { ACTION_LABEL, approverNames, listApprovals, type Approval } from "@/lib/erp/books";
import { showWhen } from "@/lib/erp/labels";
import { Empty, PageHead, Section } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";

export const metadata = { title: "Approvals" };

const STATUS = { approved: "done", expired: "ran out after 7 days", withdrawn: "withdrawn", waiting: "waiting" } as const;

function daysLeft(a: Approval) {
  const d = Math.max(1, Math.ceil((new Date(a.expires_at).getTime() - Date.now()) / 864e5));
  return d === 1 ? "1 day left" : `${d} days left`;
}

export default async function ApprovalsPage() {
  const u = await requireUser();
  const [open, closed, names] = await Promise.all([listApprovals(true), listApprovals(false), approverNames()]);
  return (
    <>
      <PageHead
        title="Approvals"
        sub={`Deleting or changing money, and removing a family, member or work, needs all ${names.length || 4} approvers within 7 days: ${names.join(", ") || "not set yet"}.`}
      />

      <Section title="Waiting" />
      {open.length ? (
        <ul className={styles.list}>
          {open.map((a) => {
            const mine = (a as Approval & { approvers: number[] }).approvers.includes(u.id);
            return (
              <li key={a.id} className={styles.row}>
                <Link href={`/erp/approvals/${a.id}`} className={styles.rowLink}>
                  <span className={styles.rowMain}>
                    <span className={styles.rowTitle}>
                      {ACTION_LABEL[a.action]} {a.summary}
                    </span>
                    <span className={styles.rowMeta}>
                      Asked by {a.asked_by_name} · {daysLeft(a)}
                      {a.no ? ` · ${a.no} said no` : ""}
                      {mine && <span className={`${styles.tag} ${styles.tagWarn}`}>your approval</span>}
                    </span>
                  </span>
                  <span className={styles.rowAmt}>
                    {a.yes} of {a.needed}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty>Nothing is waiting for approval.</Empty>
      )}

      {closed.length > 0 && (
        <>
          <Section title="Finished" />
          <ul className={styles.list}>
            {closed.map((a) => (
              <li key={a.id} className={styles.row}>
                <Link href={`/erp/approvals/${a.id}`} className={styles.rowLink}>
                  <span className={styles.rowMain}>
                    <span className={styles.rowTitle}>
                      {ACTION_LABEL[a.action]} {a.summary}
                      <span className={`${styles.tag} ${a.status === "approved" ? styles.tagIn : ""}`}>{STATUS[a.status]}</span>
                    </span>
                    <span className={styles.rowMeta}>
                      Asked by {a.asked_by_name} · {showWhen(a.closed_at ?? a.asked_at)}
                    </span>
                  </span>
                  <span className={styles.rowAmt}>
                    {a.yes} of {a.needed}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
