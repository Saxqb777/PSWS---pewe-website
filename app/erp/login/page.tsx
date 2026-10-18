import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, hasAnyone } from "@/lib/erp/auth";
import { ErpForm, Field, Submit } from "@/components/erp/form";
import styles from "@/components/erp/erp.module.css";
import { firstTime, signIn } from "../actions";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ first?: string }> }) {
  if (await currentUser()) redirect("/erp");
  const first = (await searchParams).first === "1";
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
          <>
            <nav className={styles.tabs} aria-label="Sign in" style={{ marginTop: 20, marginBottom: 0 }}>
              <Link href="/erp/login" aria-current={first ? undefined : "page"}>
                Sign in
              </Link>
              <Link href="/erp/login?first=1" aria-current={first ? "page" : undefined}>
                First time here
              </Link>
            </nav>
            {first ? (
              <ErpForm action={firstTime}>
                <p className={styles.note}>
                  Use the mobile number and the Gmail you gave in the members&apos; details form, then choose your
                  password.
                </p>
                <Field label="Mobile number" hint="From abroad, start with + and the country code" name="phone">
                  <input name="phone" type="tel" inputMode="tel" autoComplete="username" placeholder="98123 45678" />
                </Field>
                <Field label="Your Gmail" hint="The one in the members' form" name="email">
                  <input
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </Field>
                <Field label="Choose a password" hint="Kam se kam 8 akshar" name="password">
                  <input name="password" type="password" autoComplete="new-password" />
                </Field>
                <Field label="The same password again" name="again">
                  <input name="again" type="password" autoComplete="new-password" />
                </Field>
                <Submit>Open the office</Submit>
              </ErpForm>
            ) : (
              <ErpForm action={signIn}>
                <Field label="Mobile number" hint="From abroad, start with +" name="phone">
                  <input name="phone" type="tel" inputMode="tel" autoComplete="username" placeholder="98123 45678" />
                </Field>
                <Field label="Password" name="password">
                  <input name="password" type="password" autoComplete="current-password" />
                </Field>
                <Submit>Sign in</Submit>
              </ErpForm>
            )}
          </>
        )}

        <p className={styles.doorNote}>Forgot your password? Ask the General Secretary to send you a new link.</p>
      </div>
    </main>
  );
}
