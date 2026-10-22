import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import { portalOn } from "@/lib/erp/flags";
import { ASK_YES_NEEDED, askReceipts, askVotes, getAsk, isPublicKind } from "@/lib/erp/portal";
import { ASK_KINDS, ASK_STATUSES, HEADS, METHOD_SHORT, inr, showDate, showWhen } from "@/lib/erp/labels";
import { toId } from "@/lib/erp/form-state";
import { ErpForm, Field, Submit } from "@/components/erp/form";
import { Facts, PageHead, Section } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";
import { closeTheAsk, voteOnAsk } from "../../actions";

export const metadata = { title: "Ask" };

export default async function OfficeAsk({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ voted?: string; closed?: string }>;
}) {
  const u = await requireUser("editor");
  if (!portalOn()) notFound();
  const id = toId((await params).id);
  const a = id ? await getAsk(id) : null;
  if (!a) notFound();
  const sp = await searchParams;
  const [votes, receipts] = await Promise.all([askVotes(a.id), askReceipts(a.id)]);
  const myVote = votes.find((v) => v.user_id === u.id);
  const label = a.kind === "help" && a.status === "live" ? "Accepted" : ASK_STATUSES[a.status].en;

  return (
    <>
      <PageHead title={a.title} sub={`${ASK_KINDS[a.kind].en} · ${label}`} back={{ href: "/erp/portal", label: "Members' portal" }}>
        {isPublicKind(a.kind) && a.status !== "waiting" && (
          <Link href={`/erp/me/asks/${a.id}`} className={styles.btnQuiet}>
            As members see it
          </Link>
        )}
      </PageHead>
      {sp.voted && <p className={styles.formDone}>Saved. {a.status === "live" ? "It is open: every member can see it now." : ""}</p>}
      {sp.closed && <p className={styles.formDone}>Closed. Every member can read how the money was spent.</p>}

      <div className={styles.card}>
        <Facts
          items={[
            ["Put out by", `${a.asked_by_name}, ${showWhen(a.asked_at)}`],
            ["Why (members read this)", a.story],
            ["For the office only", a.private_note],
            ["Needed", a.target_paise ? inr(a.target_paise) : null],
            ["Goes to", HEADS[a.head].en],
            ["Open until", a.closes_on ? showDate(a.closes_on) : null],
            ["Raised", isPublicKind(a.kind) ? `${inr(a.raised_paise)} from ${a.givers} · ${inr(a.waiting_paise)} being checked` : null],
            ["How it was spent", a.closing_note],
          ]}
        />
      </div>

      <Section title={`Approvers: ${a.yes} of ${ASK_YES_NEEDED} needed said yes`} />
      <ul className={styles.list}>
        {votes.map((v) => (
          <li key={v.user_id} className={styles.row}>
            <div className={styles.rowStatic}>
              <span className={styles.rowMain}>
                <span className={styles.rowTitle}>{v.name}</span>
                <span className={styles.rowMeta}>
                  {v.post}
                  {v.note ? ` · ${v.note}` : ""}
                </span>
              </span>
              <span className={`${styles.tag} ${v.vote === "yes" ? styles.tagIn : v.vote === "no" ? styles.tagOut : ""}`}>
                {v.vote === "yes" ? "Yes" : v.vote === "no" ? "No" : "Not yet"}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {a.status === "waiting" && myVote && (
        <>
          <Section title="Your answer" />
          <ErpForm action={voteOnAsk.bind(null, a.id)}>
            <p className={styles.note}>
              {a.kind === "zakat"
                ? "Check it is a family that can receive Zakat, and that the title does not name them."
                : a.kind === "help"
                  ? "It stays private. Saying yes means the office takes it up; it is not shown to members."
                  : "Once two approvers say yes, every member sees it and can give."}
            </p>
            <Field label="Note" hint="Needed when you say no; the member sees it" name="note" wide>
              <input name="note" autoComplete="off" />
            </Field>
            <div className={styles.actions}>
              <Submit name="vote" value="yes">
                Yes, approve
              </Submit>
              <Submit name="vote" value="no" quiet>
                No
              </Submit>
            </div>
          </ErpForm>
        </>
      )}

      {isPublicKind(a.kind) && (
        <>
          <Section title={`Given (${receipts.length})`} />
          {receipts.length ? (
            <ul className={styles.list}>
              {receipts.map((r) => (
                <li key={r.id} className={styles.row}>
                  <Link href={`/erp/money/in/${r.id}`} className={styles.rowLink}>
                    <span className={styles.rowMain}>
                      <span className={styles.rowTitle}>{r.from_name}</span>
                      <span className={styles.rowMeta}>
                        {showDate(r.on_date)} · {METHOD_SHORT[r.method]} · {r.receipt_no}
                        {r.member_no ? ` · ${r.member_no}` : ""}
                      </span>
                    </span>
                    <span className={styles.rowAmt}>{inr(r.amount_paise)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.note}>Nothing yet.</p>
          )}
        </>
      )}

      {a.status === "live" && (
        <>
          <Section title="Close it" />
          <ErpForm action={closeTheAsk.bind(null, a.id)} confirm="Close this ask? Members can no longer give to it.">
            <Field
              label={a.kind === "help" ? "What was done?" : "How was the money spent?"}
              hint="Every member reads this, e.g. Paid ₹38,000 to the hospital on 20 Oct, bill with the Treasurer"
              name="note"
              wide
            >
              <textarea name="note" rows={3} />
            </Field>
            <div className={styles.actions}>
              <Submit>Close the ask</Submit>
            </div>
          </ErpForm>
        </>
      )}
    </>
  );
}
