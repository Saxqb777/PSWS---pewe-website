import Link from "next/link";
import { requireUser } from "@/lib/erp/auth";
import { committeeDetails, listMembers } from "@/lib/erp/data";
import { canDo, clean, showPhone } from "@/lib/erp/labels";
import { Empty, PageHead } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";

export const metadata = { title: "Members" };

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string; added?: string; saved?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const q = clean(sp.q, 80);
  const [members, committee] = await Promise.all([listMembers(q), committeeDetails()]);
  const editor = canDo(u.role, "editor");
  const active = members.filter((m) => m.active).length;

  return (
    <>
      <PageHead title="Members" sub={`${active} ${active === 1 ? "member" : "members"}`}>
        {editor && (
          <Link href="/erp/members/new" className={styles.btn}>
            + Add a member
          </Link>
        )}
      </PageHead>
      {sp.added && <p className={styles.formDone}>Member added.</p>}
      {sp.saved && <p className={styles.formDone}>Change saved.</p>}

      <form className={`${styles.filters} ${styles.filtersOne}`} method="get">
        <label className={styles.field}>
          <span className={styles.srOnly}>Search</span>
          <input name="q" type="search" placeholder="Name, place or mobile" defaultValue={q ?? ""} />
        </label>
        <button type="submit" className={styles.btnQuiet}>
          Search
        </button>
      </form>

      {members.length ? (
        <ul className={styles.list}>
          {members.map((m) => (
            <li key={m.id} className={`${styles.row} ${m.active ? "" : styles.cancelled}`}>
              <Link href={`/erp/members/${m.id}`} className={styles.rowLink}>
                <span className={styles.rowMain}>
                  <span className={styles.rowTitle}>
                    {m.name}
                    {m.post && <span className={styles.tag}>{m.post}</span>}
                  </span>
                  <span className={styles.rowMeta}>{[m.lives_in, showPhone(m.phone)].filter(Boolean).join(" · ") || " "}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty
          action={
            editor && !q ? (
              <Link href="/erp/members/new" className={styles.btn}>
                Add the first member
              </Link>
            ) : null
          }
        >
          {q ? `No member matches “${q}”.` : "No members yet."}
        </Empty>
      )}

      {committee.length > 0 && (
        <details className={styles.fold} style={{ marginTop: 24 }}>
          <summary>The committee&apos;s own contact details ({committee.length})</summary>
          <div>
            <p className={styles.note}>From the details form each committee member filled in. Change them there, not here.</p>
            <ul className={styles.list}>
              {committee.map((c) => (
                <li key={c.name + c.phone} className={styles.row}>
                  <div className={styles.rowStatic}>
                    <span className={styles.rowMain}>
                      <span className={styles.rowTitle}>{c.name}</span>
                      <span className={styles.rowMeta}>{[c.phone, c.gmail, c.works_in].filter(Boolean).join(" · ")}</span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </>
  );
}
