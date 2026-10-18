import Link from "next/link";
import { readInvite } from "@/lib/erp/auth";
import { ErpForm, Field, Submit } from "@/components/erp/form";
import styles from "@/components/erp/erp.module.css";
import { setPassword } from "../actions";

export const metadata = { title: "Set your password" };

/** Where the WhatsApp link lands: the person sets their own password. */
export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t = "" } = await searchParams;
  const invite = await readInvite(String(t));
  return (
    <main className={styles.door}>
      <div className={styles.doorBox}>
        <p className={styles.doorWord}>
          PSWS <span>Office</span>
        </p>
        {invite ? (
          <>
            <h1 className={styles.doorTitle}>Welcome, {invite.name}</h1>
            <p className={styles.sub}>Choose your password. Only you will know it.</p>
            <ErpForm action={setPassword}>
              <input type="hidden" name="token" value={String(t)} />
              <Field label="New password" hint="Kam se kam 8 akshar" name="password">
                <input name="password" type="password" autoComplete="new-password" />
              </Field>
              <Field label="The same password again" hint="Dobara" name="again">
                <input name="again" type="password" autoComplete="new-password" />
              </Field>
              <Submit>Save and open the office</Submit>
            </ErpForm>
            <p className={styles.doorNote}>From now on you sign in with your mobile number and this password.</p>
          </>
        ) : (
          <>
            <h1 className={styles.doorTitle}>This link has run out</h1>
            <p className={styles.p} style={{ marginTop: 14 }}>
              A link works once, for 7 days. Ask the General Secretary or an admin to send you a new one.
            </p>
            <Link href="/erp/login" className={styles.btnQuiet}>
              Go to sign in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
