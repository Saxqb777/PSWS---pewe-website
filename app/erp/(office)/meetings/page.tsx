import Link from "next/link";
import { requireUser } from "@/lib/erp/auth";
import { listMeetings } from "@/lib/erp/data";
import { canDo, showDate } from "@/lib/erp/labels";
import { Empty, PageHead } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";

export const metadata = { title: "Meetings and notices" };

export default async function MeetingsPage() {
  const u = await requireUser();
  const rows = await listMeetings();
  const editor = canDo(u.role, "editor");
  return (
    <>
      <PageHead title="Meetings and notices" sub="What the committee met about and decided, and what it told the village.">
        {editor && (
          <Link href="/erp/meetings/new" className={styles.btn}>
            + Add a meeting or notice
          </Link>
        )}
      </PageHead>
      {rows.length ? (
        <ul className={styles.list}>
          {rows.map((m) => (
            <li key={m.id} className={styles.row}>
              <Link href={`/erp/meetings/${m.id}`} className={styles.rowLink}>
                <span className={styles.rowMain}>
                  <span className={styles.rowTitle}>
                    {m.title}
                    <span className={styles.tag}>{m.kind === "meeting" ? "Meeting" : "Notice"}</span>
                  </span>
                  <span className={styles.rowMeta}>
                    {showDate(m.on_date)}
                    {m.created_by_name ? ` · written by ${m.created_by_name}` : ""}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty
          action={
            editor ? (
              <Link href="/erp/meetings/new" className={styles.btn}>
                Add the first one
              </Link>
            ) : null
          }
        >
          Nothing yet.
        </Empty>
      )}
    </>
  );
}
