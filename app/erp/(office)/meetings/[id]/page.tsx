import { notFound } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import { getMeeting } from "@/lib/erp/data";
import { portalOn } from "@/lib/erp/flags";
import { whoIsComing } from "@/lib/erp/portal";
import Link from "next/link";
import { canDo, showDate } from "@/lib/erp/labels";
import { toId } from "@/lib/erp/form-state";
import { MeetingForm } from "@/components/erp/forms";
import { PrintButton } from "@/components/erp/shell";
import { PageHead, Section } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";
import { saveMeeting } from "../../members/actions";

export const metadata = { title: "Meeting or notice" };

export default async function MeetingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string; saved?: string }>;
}) {
  const u = await requireUser();
  const id = toId((await params).id);
  const m = id ? await getMeeting(id) : null;
  if (!m) notFound();
  const sp = await searchParams;
  const replies = m.kind === "meeting" && portalOn() ? await whoIsComing(m.id) : [];
  const yes = replies.filter((r) => r.coming);
  const no = replies.filter((r) => !r.coming);
  return (
    <>
      <PageHead title={m.title} sub={`${m.kind === "meeting" ? "Meeting" : "Notice"} · ${showDate(m.on_date)}`} back={{ href: "/erp/meetings", label: "Meetings and notices" }}>
        {m.has_minutes && (
          <Link href={`/erp/minutes/${m.id}`} className={styles.btn}>
            Read the minutes
          </Link>
        )}
        <PrintButton />
      </PageHead>
      {(sp.new || sp.saved) && (
        <p className={`${styles.formDone} ${styles.noPrint}`}>
          Saved.{m.for_website ? " Every member can read it in their portal." : ""}
        </p>
      )}
      {portalOn() && (
        <p className={`${styles.note} ${styles.noPrint}`}>
          {m.for_website
            ? "Members read this in their portal."
            : m.kind === "meeting"
              ? "Members see the date and title, not what is written here."
              : "Only the office sees this."}
        </p>
      )}
      <div className={styles.card} style={{ whiteSpace: "pre-line", marginBottom: 24 }}>
        {m.body || <span className={styles.muted}>Nothing written yet.</span>}
      </div>
      {replies.length > 0 && (
        <>
          <Section title={`Coming: ${yes.length}${no.length ? ` · can't come: ${no.length}` : ""}`} />
          <div className={styles.card} style={{ marginBottom: 24 }}>
            {yes.length > 0 && (
              <p style={{ margin: 0 }}>
                <b>Coming.</b> {yes.map((r) => r.name).join(", ")}
              </p>
            )}
            {no.length > 0 && (
              <p style={{ margin: yes.length ? "10px 0 0" : 0 }} className={styles.muted}>
                <b>Can&apos;t come.</b> {no.map((r) => r.name).join(", ")}
              </p>
            )}
          </div>
        </>
      )}
      {canDo(u.role, "editor") && (
        <details className={`${styles.fold} ${styles.noPrint}`}>
          <summary>Change it</summary>
          <div>
            <MeetingForm action={saveMeeting.bind(null, m.id)} meeting={m} submit="Save the change" />
          </div>
        </details>
      )}
    </>
  );
}
