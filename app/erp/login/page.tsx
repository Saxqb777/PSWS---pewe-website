import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, hasAnyone } from "@/lib/erp/auth";
import { ErpForm, Field, Submit } from "@/components/erp/form";
import styles from "@/components/erp/erp.module.css";
import { signIn } from "../actions";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await currentUser()) redirect("/erp");
  const empty = !(await hasAnyone());
  return (
    <main className={styles.door}>
      <div className={styles.doorBox}>
        <p className={styles.doorWord}>
          PSWS <span>Office</span>
        </p>
        <h1 className={styles.doorTitle}>The office</h1>
        <p className={styles.sub}>For the committee of the Pewe Social Welfare Society.</p>

        {empty ? (
          <p className={`${styles.banner} ${styles.bannerWarn}`} style={{ marginTop: 20 }}>
            Nobody has been given access yet. The first admin starts the office with the setup code.{" "}
            <Link href="/erp/setup" className={styles.link}>
              Set up the office
            </Link>
          </p>
        ) : (
          <ErpForm action={signIn}>
            <Field label="Mobile number" hint="Aapka number" name="phone">
              <input name="phone" type="tel" inputMode="tel" autoComplete="username" placeholder="98123 45678" />
            </Field>
            <Field label="Password" name="password">
              <input name="password" type="password" autoComplete="current-password" />
            </Field>
            <Submit>Sign in</Submit>
          </ErpForm>
        )}

        <p className={styles.doorNote}>
          New here, or forgot your password? Ask the General Secretary or an admin to send you a link on WhatsApp.
        </p>
      </div>
    </main>
  );
}
