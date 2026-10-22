import { requireMember } from "@/lib/erp/auth";
import { listMeetings } from "@/lib/erp/data";
import { showDay, todayIST } from "@/lib/erp/labels";
import { H2 } from "@/components/erp/portal-ui";
import styles from "@/components/erp/erp.module.css";
import p from "@/components/erp/portal.module.css";

export const metadata = { title: "Notices" };

/**
 * Meetings coming up, and the notices the office has marked for members.
 * A meeting's own notes stay in the office unless it is marked for members.
 */
export default async function NoticesPage() {
  await requireMember();
  const today = todayIST();
  const all = await listMeetings();
  const coming = all.filter((m) => m.kind === "meeting" && m.on_date >= today).reverse();
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
          </article>
        ))
      ) : (
        <p className={styles.note}>Nothing yet.</p>
      )}
    </>
  );
}
