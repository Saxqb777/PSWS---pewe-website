import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/erp/auth";
import { ASK_YES_NEEDED, getAsk, isPublicKind, memberMaySee, myPledges } from "@/lib/erp/portal";
import { ASK_KINDS, canDo, inr, showDate } from "@/lib/erp/labels";
import { toId } from "@/lib/erp/form-state";
import { AskStatus, H2, PledgeStatus, Raised } from "@/components/erp/portal-ui";
import { AutoRefresh, ShareAsk } from "@/components/erp/portal-client";
import { GiveForm } from "@/components/erp/portal-forms";
import { PayTo } from "@/components/erp/pay-to";
import styles from "@/components/erp/erp.module.css";
import p from "@/components/erp/portal.module.css";
import { sendPledge, takeBackAsk } from "../../actions";

export const metadata = { title: "Ask" };

export default async function AskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string; gave?: string }>;
}) {
  const u = await requireMember();
  const id = toId((await params).id);
  const a = id ? await getAsk(id) : null;
  const office = u.role !== "member" && canDo(u.role, "editor");
  if (!a || !memberMaySee(a, u.id, office)) notFound();
  const sp = await searchParams;
  const mine = (await myPledges(u.id)).filter((x) => x.ask_id === a.id);
  const open = a.status === "live" && isPublicKind(a.kind);
  const ended = open && a.closes_on && a.closes_on < new Date().toISOString().slice(0, 10);

  return (
    <>
      {open && <AutoRefresh every={5000} />}
      <Link href="/erp/me/asks" className={p.back}>
        ← Asks
      </Link>
      <p className={`${p.askKind} ${a.kind === "zakat" ? p.zakat : ""}`}>
        <span>{ASK_KINDS[a.kind].en}</span>
        <AskStatus a={a} />
      </p>
      <h1 className={p.h1}>{a.title}</h1>
      <p className={styles.note}>
        Put out by {a.asked_by === u.id ? "you" : a.asked_by_name} on {showDate(a.asked_at)}
        {a.closes_on && a.status === "live" ? ` · open until ${showDate(a.closes_on)}` : ""}
      </p>

      {sp.sent && (
        <p className={styles.formDone}>
          {a.kind === "help"
            ? "Sent to the office. You will see here what they decide."
            : `Sent for approval. Once ${ASK_YES_NEEDED} approvers say yes, every member sees it.`}
        </p>
      )}
      {sp.gave && (
        <p className={styles.formDone}>
          Thank you. The Treasurer checks the bank and makes your receipt; then it counts here and goes in your passbook.
        </p>
      )}

      {a.story && <p style={{ whiteSpace: "pre-line" }}>{a.story}</p>}
      {a.asked_by === u.id && a.private_note && (
        <p className={styles.note} style={{ whiteSpace: "pre-line" }}>
          <b>For the office only:</b> {a.private_note}
        </p>
      )}

      {(a.status === "live" || a.status === "closed") && isPublicKind(a.kind) && (
        <div style={{ margin: "18px 0 6px" }}>
          <Raised a={a} />
        </div>
      )}

      {a.status === "waiting" && (
        <div className={`${styles.banner} ${styles.bannerWarn}`}>
          <p style={{ margin: 0 }}>
            <b>
              Waiting for approval: {a.yes} of {ASK_YES_NEEDED} approvers said yes
            </b>
            {a.no ? `, ${a.no} said no` : ""}.
          </p>
          {a.asked_by === u.id && (
            <form action={takeBackAsk.bind(null, a.id)} style={{ marginTop: 10 }}>
              <button type="submit" className={styles.btnQuiet}>
                Take it back
              </button>
            </form>
          )}
        </div>
      )}
      {a.status === "live" && a.kind === "help" && (
        <p className={styles.formDone}>Accepted by the approvers. The office will be in touch about the help.</p>
      )}
      {a.status === "declined" && <p className={`${styles.banner} ${styles.bannerWarn}`}>The approvers did not approve this.</p>}
      {a.status === "closed" && a.closing_note && (
        <p className={p.done}>
          <b>How the money was spent:</b> {a.closing_note}
        </p>
      )}

      {mine.length > 0 && (
        <>
          <H2>What I sent</H2>
          <ul className={p.items}>
            {mine.map((x) => (
              <li key={x.id}>
                <span className={p.itemTitle}>
                  {showDate(x.sent_on)}
                  <PledgeStatus status={x.status} />
                </span>
                <span className={p.itemAmt}>{inr(x.amount_paise)}</span>
                <span className={p.itemMeta}>
                  {x.receipt_no ? `Receipt ${x.receipt_no}` : x.check_note ? `Treasurer: ${x.check_note}` : "The Treasurer is checking"}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {open && !ended && (
        <>
          <H2>Give to this</H2>
          <PayTo />
          <GiveForm action={sendPledge.bind(null, a.id)} chooseFund={false} />
          <H2>Tell others</H2>
          <ShareAsk title={a.title} path={`/erp/me/asks/${a.id}`} />
        </>
      )}
      {ended && <p className={styles.note}>This ask has ended. The office will close it and say how the money was spent.</p>}
    </>
  );
}
