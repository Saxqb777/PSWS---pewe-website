import { requireMember } from "@/lib/erp/auth";
import { listMeetings } from "@/lib/erp/data";
import { meetingReplies } from "@/lib/erp/portal";
import Link from "next/link";
import { showDay, todayIST } from "@/lib/erp/labels";
import { H2 } from "@/components/erp/portal-ui";
import styles from "@/components/erp/erp.module.css";
import p from "@/components/erp/portal.module.css";
import { replyMeeting } from "../actions";

export const metadata = { title: "Notices" };

/**
 * Meetings coming up, and the notices the office has marked for members.
 * A meeting's own notes stay in the office unless it is marked for members.
 */
export default async function NoticesPage() {
  const u = await requireMember();
  const today = todayIST();
  const all = await listMeetings();
  const coming = all.filter((m) => m.kind === "meeting" && m.on_date >= today).reverse();
  const replies = await meetingReplies(
    coming.map((m) => m.id),
    u.id,
  );
  const shared = all.filter((m) => m.for_website && !(m.kind === "meeting" && m.on_date >= today));

  return (
    <>
      <h1 className={p.h1}>Notices</h1>
      <p className={p.lead}>Meetings and news from the office.</p>

      <H2>Coming up</H2>
      {coming.length ? (
        coming.map((m) => (
          <article key={m.id} className={p.notice}>
            <span className={p.noticeDate}>{showDay(m.on_date)}</span>
            <h3>{m.title}</h3>
            {m.for_website && m.body && <p>{m.body}</p>}
            <Coming id={m.id} r={replies[m.id]} />
          </article>
        ))
      ) : (
        <p className={styles.note}>No meeting is planned yet.</p>
      )}

      <H2>From the office</H2>
      {shared.length ? (
        shared.map((m) => (
          <article key={m.id} className={p.notice}>
            <span className={p.noticeDate}>
              {m.kind === "meeting" ? "Meeting · " : ""}
              {showDay(m.on_date)}
            </span>
            <h3>{m.title}</h3>
            {m.body && <p>{m.body}</p>}
            {m.has_minutes && (
              <Link href={`/erp/minutes/${m.id}`} className={p.minutesLink}>
                Read the minutes
              </Link>
            )}
          </article>
        ))
      ) : (
        <p className={styles.note}>Nothing yet.</p>
      )}
    </>
  );
}

/** "Are you coming?" Two buttons; the one picked stays lit, and it can be changed until the day. */
function Coming({ id, r }: { id: number; r: { coming: number; not: number; mine: boolean | null } }) {
  return (
    <div className={p.rsvp}>
      <span className={p.rsvpAsk}>
        {r.mine === true ? "You said you are coming." : r.mine === false ? "You said you cannot come." : "Are you coming?"}
      </span>
      <form action={replyMeeting.bind(null, id, true)}>
        <button type="submit" aria-pressed={r.mine === true} className={p.rsvpBtn}>
          I&apos;m coming
        </button>
      </form>
      <form action={replyMeeting.bind(null, id, false)}>
        <button type="submit" aria-pressed={r.mine === false} className={p.rsvpBtn}>
          Can&apos;t come
        </button>
      </form>
      {r.coming > 0 && (
        <span className={p.rsvpCount}>
          {r.coming === 1 ? "1 member is coming" : `${r.coming} members are coming`}
        </span>
      )}
    </div>
  );
}
