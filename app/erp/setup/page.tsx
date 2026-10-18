import Link from "next/link";
import { connection } from "next/server";
import { hasAnyone } from "@/lib/erp/auth";
import { ErpForm, Field, Submit } from "@/components/erp/form";
import styles from "@/components/erp/erp.module.css";
import { setUp } from "../actions";

export const metadata = { title: "Set up the office" };

/** Used once: the first admin, with the setup code. Then it only points to sign in. */
export default async function SetupPage() {
  await connection();
  const done = await hasAnyone();
  return (
    <main className={styles.door}>
      <div className={styles.doorBox}>
        <p className={styles.doorWord}>Pewe Social Welfare Society · the office</p>
        {done ? (
          <>
            <h1 className={styles.doorTitle}>The office is set up</h1>
            <p className={styles.p} style={{ marginTop: 14 }}>
              Ask an admin to give you access.
            </p>
            <Link href="/erp/login" className={styles.btnQuiet}>
              Go to sign in
            </Link>
          </>
        ) : (
          <>
            <h1 className={styles.doorTitle}>Set up the office</h1>
            <p className={styles.sub}>Once only. You become the first admin, and give the others access.</p>
            <ErpForm action={setUp}>
              <Field label="Setup code" hint="Jo code aapko diya gaya" name="code">
                <input name="code" autoComplete="off" autoCapitalize="none" spellCheck={false} />
              </Field>
              <Field label="Your name" name="name">
                <input name="name" autoComplete="name" />
              </Field>
              <Field label="Your post" hint="e.g. General Secretary" name="post">
                <input name="post" />
              </Field>
              <Field label="Mobile number" hint="Isi se sign in hoga" name="phone">
                <input name="phone" type="tel" inputMode="tel" autoComplete="username" placeholder="98123 45678" />
              </Field>
              <Field label="Choose a password" hint="Kam se kam 8 akshar" name="password">
                <input name="password" type="password" autoComplete="new-password" />
              </Field>
              <Field label="The same password again" name="again">
                <input name="again" type="password" autoComplete="new-password" />
              </Field>
              <Submit>Start the office</Submit>
            </ErpForm>
          </>
        )}
      </div>
    </main>
  );
}
