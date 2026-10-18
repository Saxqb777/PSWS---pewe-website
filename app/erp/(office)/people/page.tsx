import Link from "next/link";
import { requireUser, siteOrigin } from "@/lib/erp/auth";
import { committeeWithoutAccess, listPeople } from "@/lib/erp/data";
import { showPhone, showWhen } from "@/lib/erp/labels";
import { ErpForm, Submit } from "@/components/erp/form";
import { PersonForm } from "@/components/erp/forms";
import { waLink } from "@/lib/erp/form-state";
import { PageHead } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";
import { addPersonAction, giveCommitteeAccessAction } from "./actions";

export const metadata = { title: "People with access" };

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ given?: string }> }) {
  await requireUser("admin");
  const given = Number((await searchParams).given ?? -1);
  const [people, waiting, origin] = await Promise.all([listPeople(), committeeWithoutAccess(), siteOrigin()]);
  const notYet = people.filter((p) => p.active && p.has_first_email && !p.has_password).length;
  const groupMessage = [
    "The PSWS office is open.",
    "",
    "The first time:",
    `1. Open ${origin}/erp/login?first=1`,
    "2. Type your mobile number and the Gmail you gave in the members' details form. From abroad, start the number with + and the country code.",
    "3. Choose your password.",
    "",
    "After that, sign in with your mobile number and password.",
  ].join("\n");
  return (
    <>
      <PageHead title="People with access" sub="Everyone here has full access, and signs in with their own mobile number and password." />

      {given >= 0 && (
        <p className={styles.formDone}>
          {given
            ? `${given} committee ${given === 1 ? "member has" : "members have"} a login now. Send them the message below.`
            : "Everyone in the members' form already has a login."}
        </p>
      )}

      {waiting.length > 0 && (
        <section className={styles.card} style={{ marginBottom: 16 }}>
          <h2 className={styles.h2} style={{ marginTop: 0 }}>
            The committee
          </h2>
          <p className={styles.p}>
            {waiting.length} committee {waiting.length === 1 ? "member has" : "members have"} filled in the members&apos;
            details form but {waiting.length === 1 ? "has" : "have"} no login yet: {waiting.join(", ")}.
          </p>
          <p className={styles.p}>
            Each gets a login with their mobile number and full access. The first time, they confirm the Gmail they gave
            in the form and choose a password.
          </p>
          <ErpForm action={giveCommitteeAccessAction}>
            <div className={styles.actions}>
              <Submit>Give {waiting.length === 1 ? "them" : `all ${waiting.length}`} a login</Submit>
            </div>
          </ErpForm>
        </section>
      )}

      {notYet > 0 && (
        <section className={styles.line} style={{ marginBottom: 16 }}>
          <span>
            {notYet} {notYet === 1 ? "person has" : "people have"} not signed in yet.
          </span>
          <a className={styles.btn} href={waLink(null, groupMessage)} target="_blank" rel="noopener noreferrer">
            Message the group
          </a>
        </section>
      )}

      <section className={styles.card} style={{ marginBottom: 8 }}>
        <h2 className={styles.h2} style={{ marginTop: 0 }}>
          Give someone access
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
                  {!p.active && <span className={`${styles.tag} ${styles.tagOut}`}>no access</span>}
                  {p.active && !p.has_password && (
                    <span className={`${styles.tag} ${styles.tagWarn}`}>
                      {p.has_first_email ? "not signed in yet" : "link not used yet"}
                    </span>
                  )}
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
    </>
  );
}
