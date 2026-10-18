import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, siteOrigin } from "@/lib/erp/auth";
import { ACTION_LABEL, approvalHref, getApproval } from "@/lib/erp/books";
import { showWhen } from "@/lib/erp/labels";
import { toId, waLink } from "@/lib/erp/form-state";
import { ErpForm, Field, Submit } from "@/components/erp/form";
import { Facts, PageHead, Section } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";
import { voteAction, withdrawAction } from "../actions";

export const metadata = { title: "Approval" };

const STATUS = {
  waiting: "Waiting for the approvers",
  approved: "Approved by all, and done",
  expired: "Not approved within 7 days, so nothing was done",
  withdrawn: "Withdrawn by the person who asked; nothing was done",
} as const;

export default async function ApprovalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string; voted?: string; withdrawn?: string }>;
}) {
  const u = await requireUser();
  const id = toId((await params).id);
  const a = id ? await getApproval(id) : null;
  if (!a) notFound();
  const sp = await searchParams;
  const waiting = a.status === "waiting";
  const mine = a.votes.find((v) => v.user_id === u.id);
  const href = approvalHref(a);
  const ask = `${ACTION_LABEL[a.action]} ${a.summary}`;
  const message = [
    "Approval needed in the PSWS office:",
    ask,
    `Reason: ${a.reason}`,
    "",
    `Approve or say no here: ${await siteOrigin()}/erp/approvals/${a.id}`,
  ].join("\n");
  const left = Math.max(1, Math.ceil((new Date(a.expires_at).getTime() - Date.now()) / 864e5));

  return (
    <>
      <PageHead title={`${ACTION_LABEL[a.action]}?`} sub={STATUS[a.status]} back={{ href: "/erp/approvals", label: "Approvals" }}>
        {waiting && (
          <a className={styles.btnQuiet} href={waLink(null, message)} target="_blank" rel="noopener noreferrer">
            Message the approvers
          </a>
        )}
      </PageHead>

      {sp.voted && (
        <p className={styles.formDone}>
          {sp.voted === "yes"
            ? a.status === "approved"
              ? "You approved it. Everyone has now approved, so it is done."
              : "You approved it."
            : "Your no is noted. You can change it while the request is open."}
        </p>
      )}
      {sp.withdrawn && <p className={styles.formDone}>Withdrawn. Nothing was changed.</p>}
      {sp.new && waiting && (
        <p className={styles.formDone}>
          Sent to the approvers. Nothing changes until all of them approve. Send them a message so they see it.
        </p>
      )}

      <div className={styles.card}>
        <Facts
          items={[
            [
              "What",
              href ? (
                <Link className={styles.link} href={href}>
                  {a.summary}
                </Link>
              ) : (
                a.summary
              ),
            ],
            ["Change", a.change_lines && <span style={{ whiteSpace: "pre-line" }}>{a.change_lines}</span>],
            ["Why", a.reason],
            ["Asked by", `${a.asked_by_name}, ${showWhen(a.asked_at)}`],
            ["Open until", waiting ? `${showWhen(a.expires_at)} (${left === 1 ? "1 day" : `${left} days`} left)` : null],
            ["Closed", !waiting && a.closed_at ? showWhen(a.closed_at) : null],
          ]}
        />
      </div>

      <Section title={`Approvers: ${a.yes} of ${a.needed} approved`} />
      <ul className={styles.list}>
        {a.votes.map((v) => (
          <li key={v.user_id} className={styles.row}>
            <div className={styles.rowStatic}>
              <span className={styles.rowMain}>
                <span className={styles.rowTitle}>
                  {v.name}
                  {v.user_id === u.id && <span className={styles.tag}>you</span>}
                </span>
                <span className={styles.rowMeta}>
                  {v.vote ? `${showWhen(v.at)}${v.note ? ` · ${v.note}` : ""}` : "Not yet"}
                </span>
              </span>
              <span
                className={`${styles.rowAmt} ${v.vote === "yes" ? styles.in : v.vote === "no" ? styles.out : styles.muted}`}
              >
                {v.vote === "yes" ? "✓ Approved" : v.vote === "no" ? "✗ Said no" : "… Not yet"}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {waiting && mine && (
        <section className={styles.box} style={{ marginTop: 20 }}>
          <p className={styles.p} style={{ fontWeight: 600 }}>
            {mine.vote === "yes"
              ? "You approved this. You can change your mind while it is open."
              : mine.vote === "no"
                ? "You said no. You can still approve while it is open."
                : "Your approval is needed."}
          </p>
          <ErpForm action={voteAction.bind(null, a.id)}>
            <Field label="Note" hint="Optional when you approve; needed when you say no" name="note">
              <input name="note" autoComplete="off" />
            </Field>
            <div className={styles.actions}>
              <Submit name="decision" value="yes">
                Approve
              </Submit>
              <Submit name="decision" value="no" danger>
                Say no
              </Submit>
            </div>
          </ErpForm>
        </section>
      )}

      {waiting && a.asked_by === u.id && (
        <ErpForm action={withdrawAction.bind(null, a.id)} confirm="Withdraw this request? Nothing will be changed.">
          <div className={styles.actions} style={{ marginTop: 20 }}>
            <Submit quiet>Withdraw my request</Submit>
          </div>
        </ErpForm>
      )}
    </>
  );
}
