import Link from "next/link";
import { requireUser } from "@/lib/erp/auth";
import { listWorks } from "@/lib/erp/data";
import { WORK_STATUSES, canDo, inr } from "@/lib/erp/labels";
import { Empty, PageHead } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";

export const metadata = { title: "Village works" };

export default async function WorksPage() {
  const u = await requireUser();
  const [works, removed] = await Promise.all([listWorks(), listWorks(true)]);
  const editor = canDo(u.role, "editor");
  return (
    <>
      <PageHead title="Village works">
        {editor && (
          <Link href="/erp/works/new" className={styles.btn}>
            + Add a work
          </Link>
        )}
      </PageHead>
      {works.length ? (
        <ul className={styles.list}>
          {works.map((w) => {
            const share = w.budget_paise ? Math.min(w.spent_paise / w.budget_paise, 1) : 0;
            return (
              <li key={w.id} className={styles.row}>
                <Link href={`/erp/works/${w.id}`} className={styles.rowLink}>
                  <span className={styles.rowMain} style={{ flex: 1 }}>
                    <span className={styles.rowTitle}>
                      {w.name}
                      <span className={`${styles.tag} ${w.status === "running" ? styles.tagWarn : w.status === "done" ? styles.tagIn : ""}`}>
                        {WORK_STATUSES[w.status].en}
                      </span>
                    </span>
                    <span className={styles.rowMeta}>
                      {[w.place, w.budget_paise ? `${inr(w.spent_paise)} of ${inr(w.budget_paise)} spent` : `${inr(w.spent_paise)} spent`]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {w.budget_paise ? (
                      <span className={`${styles.meter} ${w.spent_paise > w.budget_paise ? styles.meterOver : ""}`}>
                        <span style={{ width: `${share * 100}%` }} />
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty
          action={
            editor ? (
              <Link href="/erp/works/new" className={styles.btn}>
                Add the first work
              </Link>
            ) : null
          }
        >
          No works yet. Add one, then record its payments against it.
        </Empty>
      )}
      {removed.length > 0 && (
        <details className={styles.fold} style={{ marginTop: 20 }}>
          <summary>Removed works ({removed.length})</summary>
          <div>
            <ul className={styles.list}>
              {removed.map((w) => (
                <li key={w.id} className={`${styles.row} ${styles.cancelled}`}>
                  <Link href={`/erp/works/${w.id}`} className={styles.rowLink}>
                    <span className={styles.rowMain}>
                      <span className={styles.rowTitle}>{w.name}</span>
                      <span className={styles.rowMeta}>{inr(w.spent_paise)} spent</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </>
  );
}
