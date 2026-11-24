import Link from "next/link";
import { requireUser } from "@/lib/erp/auth";
import { ACTION_LABEL, approverNames, listApprovals, type Approval } from "@/lib/erp/books";
import { ASK_KINDS, inr, showWhen } from "@/lib/erp/labels";
import { portalOn } from "@/lib/erp/flags";
import { ASK_YES_NEEDED, asksForApprover, officeAsks } from "@/lib/erp/portal";
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
  const portal = portalOn();
  const [open, closed, names, appeals, mine] = await Promise.all([
    listApprovals(true),
    listApprovals(false),
    approverNames(),
    portal ? officeAsks(["waiting"]) : Promise.resolve([]),
    portal ? asksForApprover(u.id) : Promise.resolve([]),
  ]);
  const myTurn = new Set(mine.map((a) => a.id));
  return (
    <>
      <PageHead
        title="Approvals"
        sub={`Deleting or changing money, and removing a family, member or work, needs all ${names.length || 4} approvers within 7 days: ${names.join(", ") || "not set yet"}.`}
      />

      {portal && (
        <>
          <Section title={`Members' appeals${appeals.length ? ` (${appeals.length})` : ""}`} />
          <p className={styles.note} style={{ marginTop: 0 }}>
            An appeal for donations opens to every member once {ASK_YES_NEEDED} of the approvers say yes.
          </p>
          {appeals.length ? (
            <ul className={styles.list}>
              {appeals.map((a) => (
                <li key={a.id} className={styles.row}>
                  <Link href={`/erp/portal/asks/${a.id}`} className={styles.rowLink}>
                    <span className={styles.rowMain}>
                      <span className={styles.rowTitle}>{a.title}</span>
                      <span className={styles.rowMeta}>
                        {ASK_KINDS[a.kind].en} · from {a.asked_by_name}
                        {a.no ? ` · ${a.no} said no` : ""}
                        {myTurn.has(a.id) && <span className={`${styles.tag} ${styles.tagWarn}`}>your approval</span>}
                      </span>
                    </span>
                    <span className={styles.rowAmt}>
                      {a.yes} of {ASK_YES_NEEDED}
                      {a.target_paise ? <small style={{ display: "block", fontWeight: 400 }}>{inr(a.target_paise)}</small> : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No appeal is waiting.</Empty>
          )}
        </>
      )}

      <Section title="Changes and deletions waiting" />
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
