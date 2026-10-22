import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import { portalOn } from "@/lib/erp/flags";
import { ASK_YES_NEEDED, asksForApprover, officeAsks, openMessages, pledgesToCheck } from "@/lib/erp/portal";
import { ASK_KINDS, METHOD_SHORT, inr, showDate, showWhen } from "@/lib/erp/labels";
import { ErpForm, Field, Submit } from "@/components/erp/form";
import { Empty, PageHead, Section } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";
import { foundPayment, messageIsDone, paymentNotFound } from "./actions";

export const metadata = { title: "Members' portal" };

/** What the members' portal is waiting on the office for: approvals, payments to find in the bank, messages. */
export default async function OfficePortal({ searchParams }: { searchParams: Promise<{ found?: string; notfound?: string }> }) {
  const u = await requireUser("editor");
  if (!portalOn()) notFound();
  const sp = await searchParams;
  const [toApprove, toCheck, open, waiting, messages] = await Promise.all([
    asksForApprover(u.id),
    pledgesToCheck(),
    officeAsks(["live"]),
    officeAsks(["waiting"]),
    openMessages(),
  ]);

  return (
    <>
      <PageHead title="Members' portal" sub="Every member's own page: what they give, their asks, and what the office must check.">
        <Link href="/erp/portal/members" className={styles.btnQuiet}>
          Members and their numbers
        </Link>
        <Link href="/erp/live" className={styles.btnQuiet}>
          Live screen
        </Link>
      </PageHead>

      {sp.found && (
        <p className={styles.formDone}>
          Found. Receipt {sp.found} is made: it counts towards the ask and is in their passbook.
        </p>
      )}
      {sp.notfound && <p className={styles.formDone}>Saved. They see your note on their portal.</p>}

      <Section title={`Asks waiting for your approval${toApprove.length ? ` (${toApprove.length})` : ""}`} />
      {toApprove.length ? (
        <ul className={styles.list}>
          {toApprove.map((a) => (
            <li key={a.id} className={styles.row}>
              <Link href={`/erp/portal/asks/${a.id}`} className={styles.rowLink}>
                <span className={styles.rowMain}>
                  <span className={styles.rowTitle}>{a.title}</span>
                  <span className={styles.rowMeta}>
                    {ASK_KINDS[a.kind].en} · from {a.asked_by_name} · {a.yes} of {ASK_YES_NEEDED} said yes
                  </span>
                </span>
                <span className={styles.rowAmt}>{a.target_paise ? inr(a.target_paise) : ""}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>Nothing waits for your approval.</Empty>
      )}

      <Section title={`Payments to find in the bank${toCheck.length ? ` (${toCheck.length})` : ""}`} />
      {toCheck.length ? (
        <div style={{ display: "grid", gap: 12 }}>
          {toCheck.map((x) => (
            <div key={x.id} className={styles.card}>
              <p style={{ margin: 0 }}>
                <b>{inr(x.amount_paise)}</b> from <b>{x.member_name}</b> ({x.member_no}) · {METHOD_SHORT[x.method]}
                {x.reference ? ` ${x.reference}` : ""} · sent {showDate(x.sent_on)}
              </p>
              <p className={styles.note} style={{ margin: "4px 0 10px" }}>
                For {x.ask_title ?? "a fund"} · told us {showWhen(x.created_at)}
              </p>
              <ErpForm action={foundPayment.bind(null, x.id)}>
                <div className={styles.actions}>
                  <Submit>Found it: make the receipt</Submit>
                </div>
              </ErpForm>
              <details style={{ marginTop: 10 }}>
                <summary className={styles.link} style={{ cursor: "pointer" }}>
                  Not in the bank?
                </summary>
                <ErpForm action={paymentNotFound.bind(null, x.id)}>
                  <Field label="What should they check?" hint="They see this" name="note" wide>
                    <input name="note" autoComplete="off" />
                  </Field>
                  <div className={styles.actions}>
                    <Submit quiet>Tell them it is not found</Submit>
                  </div>
                </ErpForm>
              </details>
            </div>
          ))}
        </div>
      ) : (
        <Empty>No payments to check.</Empty>
      )}

      <Section title="Open asks" />
      {open.length ? (
        <ul className={styles.list}>
          {open.map((a) => (
            <li key={a.id} className={styles.row}>
              <Link href={`/erp/portal/asks/${a.id}`} className={styles.rowLink}>
                <span className={styles.rowMain}>
                  <span className={styles.rowTitle}>{a.title}</span>
                  <span className={styles.rowMeta}>
                    {ASK_KINDS[a.kind].en}
                    {a.kind === "help" ? " · private" : ` · ${a.givers} gave`}
                    {a.closes_on ? ` · until ${showDate(a.closes_on)}` : ""}
                  </span>
                </span>
                <span className={styles.rowAmt}>
                  {a.kind === "help" ? "" : `${inr(a.raised_paise)}${a.target_paise ? ` / ${inr(a.target_paise)}` : ""}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No ask is open.</Empty>
      )}

      {waiting.length > toApprove.length && (
        <p className={styles.note} style={{ marginTop: 10 }}>
          {waiting.length - toApprove.length} more waiting for the other approvers.
        </p>
      )}

      <Section title={`Messages from members${messages.length ? ` (${messages.length})` : ""}`} />
      {messages.length ? (
        <ul className={styles.list}>
          {messages.map((m) => (
            <li key={m.id} className={styles.row}>
              <div className={styles.rowStatic}>
                <span className={styles.rowMain}>
                  <span className={styles.rowTitle}>
                    {m.member_name} ({m.member_no})
                  </span>
                  <span className={styles.rowMeta}>
                    {m.body} · {showWhen(m.at)}
                  </span>
                </span>
                <form action={messageIsDone.bind(null, m.id)}>
                  <button type="submit" className={styles.btnQuiet}>
                    Done
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No messages.</Empty>
      )}
    </>
  );
}
