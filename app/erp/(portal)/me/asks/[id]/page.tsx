import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/erp/auth";
import { ASK_YES_NEEDED, askCollectors, getAsk, isPublicKind, memberMaySee, myPledges, pledgeAmount } from "@/lib/erp/portal";
import { ASK_KINDS, canDo, inr, showDate } from "@/lib/erp/labels";
import { toId } from "@/lib/erp/form-state";
import { AskStatus, H2, PledgeStatus, Raised } from "@/components/erp/portal-ui";
import { AutoRefresh, ShareAsk } from "@/components/erp/portal-client";
import { GiveForm, PhotoForm } from "@/components/erp/portal-forms";
import { AskPhotos } from "@/components/erp/ask-photos";
import { askPhotos } from "@/lib/erp/files";
import { PayTo } from "@/components/erp/pay-to";
import styles from "@/components/erp/erp.module.css";
import p from "@/components/erp/portal.module.css";
import { addOwnPhoto, removeOwnPhoto, sendPledge, takeBackAsk } from "../../actions";

export const metadata = { title: "Donate" };

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
  const [pledges, collectors, photos] = await Promise.all([myPledges(u.id), askCollectors(a.id), askPhotos(a.id)]);
  const asker = a.asked_by === u.id;
  const canAddPhoto = asker && (a.status === "waiting" || a.status === "live" || a.status === "closed");
  const mine = pledges.filter((x) => x.ask_id === a.id);
  const open = a.status === "live" && isPublicKind(a.kind);
  const ended = open && a.closes_on && a.closes_on < new Date().toISOString().slice(0, 10);

  return (
    <>
      {open && <AutoRefresh every={5000} />}
      <Link href="/erp/me/asks" className={p.back}>
        ← Donate
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
          Thank you. The PSWS Accountant checks the bank and makes your receipt; then it counts here and goes in your passbook.
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

      {collectors.length > 0 && isPublicKind(a.kind) && (
        <>
          <H2>Collected by</H2>
          <ul className={p.items}>
            {collectors.map((c) => (
              <li key={c.name}>
                <span className={p.itemTitle}>{c.name}</span>
                <span className={p.itemAmt}>{inr(c.amount_paise)}</span>
                {c.people > 0 && (
                  <span className={p.itemMeta}>
                    From {c.people === 1 ? "1 person" : `${c.people} people`}
                    {c.names.length > 0 && `: ${c.names.join(", ")}`}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
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

      {(photos.length > 0 || canAddPhoto) && (
        <>
          <H2>Photos</H2>
          <AskPhotos
            photos={photos}
            removeFor={(ph) => (ph.uploaded_by === u.id ? removeOwnPhoto.bind(null, a.id, ph.id) : null)}
          />
          {canAddPhoto && <PhotoForm action={addOwnPhoto.bind(null, a.id)} />}
        </>
      )}

      {mine.length > 0 && (
        <>
          <H2>What I sent</H2>
          <ul className={p.items}>
            {mine.map((x) => (
              <li key={x.id}>
                <span className={p.itemTitle}>
                  {showDate(x.sent_on)}
                  {x.collected ? ` · collected${x.people ? ` from ${x.people}` : ""}` : ""}
                  <PledgeStatus status={x.status} />
                </span>
                <span className={p.itemAmt}>{pledgeAmount(x)}</span>
                <span className={p.itemMeta}>
                  {x.receipt_no && x.money_in_id ? (
                    <Link href={`/erp/me/receipt/${x.money_in_id}`}>Receipt {x.receipt_no}</Link>
                  ) : x.check_note ? (
                    `Accountant: ${x.check_note}`
                  ) : (
                    "The Accountant is checking"
                  )}
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
      {ended && <p className={styles.note}>This appeal has ended. The office will close it and say how the money was spent.</p>}
    </>
  );
}
