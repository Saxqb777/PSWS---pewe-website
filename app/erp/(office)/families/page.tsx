import Link from "next/link";
import { requireUser } from "@/lib/erp/auth";
import { listFamilies } from "@/lib/erp/data";
import { canDo, clean, fyOf, inr, showDate, todayIST } from "@/lib/erp/labels";
import { Empty, PageHead } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";

export const metadata = { title: "Families" };

type Search = { q?: string; only?: string };

export default async function FamiliesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const q = clean(sp.q, 80);
  const only = sp.only === "stipend" || sp.only === "waiting" ? sp.only : "all";
  const fy = fyOf(todayIST());
  const rows = await listFamilies(fy, q, only);
  const editor = canDo(u.role, "editor");
  const tab = (o: string) => `/erp/families?${new URLSearchParams({ only: o, ...(q ? { q } : {}) })}`;

  return (
    <>
      <PageHead title="Families">
        {editor && (
          <Link href="/erp/families/new" className={styles.btn}>
            + Add a family
          </Link>
        )}
      </PageHead>

      <nav className={styles.tabs} aria-label="Show">
        {(
          [
            ["all", "All"],
            ["stipend", "Monthly help"],
            ["waiting", "Waiting"],
          ] as const
        ).map(([o, label]) => (
          <Link key={o} href={tab(o)} aria-current={only === o ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </nav>

      <form className={`${styles.filters} ${styles.filtersOne}`} method="get">
        <input type="hidden" name="only" value={only} />
        <label className={styles.field}>
          <span className={styles.srOnly}>Search</span>
          <input name="q" type="search" placeholder="Name, place or mobile" defaultValue={q ?? ""} />
        </label>
        <button type="submit" className={styles.btnQuiet}>
          Search
        </button>
      </form>

      {rows.length ? (
        <ul className={styles.list}>
          {rows.map((f) => (
            <li key={f.id} className={`${styles.row} ${f.active ? "" : styles.cancelled}`}>
              <Link href={`/erp/families/${f.id}`} className={styles.rowLink}>
                <span className={styles.rowMain}>
                  <span className={styles.rowTitle}>
                    {f.name}
                    {f.stipend_active && <span className={`${styles.tag} ${styles.tagIn}`}>monthly help</span>}
                    {f.waiting > 0 && <span className={`${styles.tag} ${styles.tagWarn}`}>{f.waiting} waiting</span>}
                    {!f.active && <span className={styles.tag}>not helped now</span>}
                  </span>
                  <span className={styles.rowMeta}>
                    {[
                      f.place,
                      f.people ? `${f.people} people` : null,
                      f.helped_this_year ? `${inr(f.helped_this_year)} this year` : null,
                      f.last_help ? `last helped ${showDate(f.last_help)}` : "not helped yet",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty
          action={
            editor && !q ? (
              <Link href="/erp/families/new" className={styles.btn}>
                Add the first family
              </Link>
            ) : null
          }
        >
          {q ? `No family matches “${q}”.` : only === "all" ? "No families yet." : "None right now."}
        </Empty>
      )}
    </>
  );
}
