import Link from "next/link";
import { requireUser } from "@/lib/erp/auth";
import { listPeople } from "@/lib/erp/data";
import { ROLES, showPhone, showWhen } from "@/lib/erp/labels";
import { PersonForm } from "@/components/erp/forms";
import { PageHead } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";
import { addPersonAction } from "./actions";

export const metadata = { title: "People with access" };

export default async function PeoplePage() {
  await requireUser("admin");
  const people = await listPeople();
  return (
    <>
      <PageHead title="People with access" sub="Kaun dekh sakta hai. Everyone signs in with their own mobile number and password." />

      <section className={styles.card} style={{ marginBottom: 8 }}>
        <h2 className={styles.h2} style={{ marginTop: 0 }}>
          Give someone access<small>Naya vyakti</small>
        </h2>
        <PersonForm action={addPersonAction} submit="Add and make their link" />
      </section>

      <h2 className={styles.h2}>Everyone with access</h2>
      <ul className={styles.list}>
        {people.map((p) => (
          <li key={p.id} className={`${styles.row} ${p.active ? "" : styles.cancelled}`}>
            <Link href={`/erp/people/${p.id}`} className={styles.rowLink}>
              <span className={styles.rowMain}>
                <span className={styles.rowTitle}>
                  {p.name}
                  <span className={styles.tag}>{ROLES[p.role].en}</span>
                  {!p.active && <span className={`${styles.tag} ${styles.tagOut}`}>No access</span>}
                  {p.active && !p.has_password && <span className={`${styles.tag} ${styles.tagWarn}`}>Link not used yet</span>}
                </span>
                <span className={styles.rowMeta}>
                  {[p.post, showPhone(p.phone), p.last_login_at ? `last in ${showWhen(p.last_login_at)}` : "never signed in"]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <h2 className={styles.h2}>What each can do</h2>
      <ul className={styles.list}>
        {Object.entries(ROLES).map(([k, r]) => (
          <li key={k} className={styles.row}>
            <div className={styles.rowStatic}>
              <span className={styles.rowMain}>
                <span className={styles.rowTitle}>{r.en}</span>
                <span className={styles.rowMeta}>
                  {k === "admin"
                    ? "Everything, and gives or removes access. Keep this to one or two people."
                    : k === "editor"
                      ? "Sees everything; adds and changes receipts, payments, families, works, members and meetings."
                      : "Sees everything, and downloads reports. Cannot add or change anything."}
                </span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
