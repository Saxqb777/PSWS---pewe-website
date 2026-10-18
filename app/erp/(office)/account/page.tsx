import { requireUser } from "@/lib/erp/auth";
import { ROLES, showPhone } from "@/lib/erp/labels";
import { ErpForm, Field, Submit } from "@/components/erp/form";
import { Facts, PageHead } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";
import { changeMyPassword, signOut } from "../../actions";

export const metadata = { title: "My account" };

export default async function AccountPage() {
  const u = await requireUser();
  return (
    <>
      <PageHead title="My account" />
      <div className={styles.card}>
        <Facts
          items={[
            ["Name", u.name],
            ["Post", u.post],
            ["Mobile", showPhone(u.phone)],
            ["Can", `${ROLES[u.role].en}. ${ROLES[u.role].hi}.`],
          ]}
        />
      </div>

      <h2 className={styles.h2}>
        Change my password
      </h2>
      <ErpForm action={changeMyPassword} resetOnDone>
        <div className={styles.grid}>
          <Field label="Current password" name="current" wide>
            <input name="current" type="password" autoComplete="current-password" />
          </Field>
          <Field label="New password" hint="Kam se kam 8 akshar" name="password">
            <input name="password" type="password" autoComplete="new-password" />
          </Field>
          <Field label="The new one again" name="again">
            <input name="again" type="password" autoComplete="new-password" />
          </Field>
        </div>
        <div className={styles.actions}>
          <Submit>Change my password</Submit>
        </div>
      </ErpForm>

      <h2 className={styles.h2}>Sign out</h2>
      <p className={styles.p}>On a shared phone or computer, sign out when you are done.</p>
      <form action={signOut}>
        <button type="submit" className={styles.btnQuiet}>
          Sign out
        </button>
      </form>
    </>
  );
}
