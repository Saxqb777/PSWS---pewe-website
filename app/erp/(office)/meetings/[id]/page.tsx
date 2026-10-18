import { notFound } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import { getMeeting } from "@/lib/erp/data";
import { canDo, showDate } from "@/lib/erp/labels";
import { toId } from "@/lib/erp/form-state";
import { MeetingForm } from "@/components/erp/forms";
import { PrintButton } from "@/components/erp/shell";
import { PageHead } from "@/components/erp/ui";
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
  return (
    <>
      <PageHead title={m.title} sub={`${m.kind === "meeting" ? "Meeting" : "Notice"} · ${showDate(m.on_date)}`} back={{ href: "/erp/meetings", label: "Meetings and notices" }}>
        <PrintButton />
      </PageHead>
      {(sp.new || sp.saved) && <p className={`${styles.formDone} ${styles.noPrint}`}>Saved.</p>}
      <div className={styles.card} style={{ whiteSpace: "pre-line", marginBottom: 24 }}>
        {m.body || <span className={styles.muted}>Nothing written yet.</span>}
      </div>
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
