import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUser, hasAnyone, homePath, isDemo } from "@/lib/erp/auth";
import { portalOn } from "@/lib/erp/flags";
import { listPortalMembers } from "@/lib/erp/portal";
import { ErpForm, Field, Submit } from "@/components/erp/form";
import styles from "@/components/erp/erp.module.css";
import p from "@/components/erp/portal.module.css";
import { demoAs, firstTime, signIn } from "../actions";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ first?: string }> }) {
  // made fresh for every visit, never once at build time
  await connection();
  const demo = await isDemo();
  // in the demo, anyone can come back here to be someone else
  if (!demo && (await currentUser())) redirect(homePath());
  const first = (await searchParams).first === "1";
  const empty = !(await hasAnyone());
  const portal = portalOn();
  const samples = demo ? (await listPortalMembers()).filter((m) => m.active) : [];
  return (
    <main className={styles.door}>
      <div className={styles.doorBox}>
        <p className={styles.doorWord}>
          PSWS <span>{portal ? "Members" : "Office"}</span>
        </p>
        <h1 className={styles.doorTitle}>{portal ? "My PSWS" : "The office"}</h1>
        <p className={styles.sub}>
          {portal
            ? "For every member of the Pewe Social Welfare Society: your own number and page."
            : "For the committee of the Pewe Social Welfare Society."}
        </p>

        {demo && (
          <section style={{ marginTop: 20 }}>
            <p className={`${styles.banner} ${styles.bannerWarn}`} style={{ margin: 0 }}>
              This is the demo: sample people and sample money. Tap a person to see the portal as them.
            </p>
            {(
              [
                // in the order the posts were given: President first
                ["The committee", samples.filter((m) => m.role !== "member").sort((a, b) => a.id - b.id)],
                ["Members", samples.filter((m) => m.role === "member")],
              ] as const
            ).map(([group, list]) => (
              <div key={group} className={p.who}>
                <p className={styles.label} style={{ margin: "8px 0 0" }}>
                  {group}
                </p>
                {list.map((m) => (
                  <form key={m.id} action={demoAs}>
                    <input type="hidden" name="id" value={m.id} />
                    <button type="submit" className={p.whoBtn}>
                      <span>
                        {m.name}
                        <small>{m.role === "member" ? "Member" : (m.post ?? "Committee")}</small>
                      </span>
                      <span>{m.member_no}</span>
                    </button>
                  </form>
                ))}
              </div>
            ))}
          </section>
        )}

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
                <Submit>{portal ? "Open my PSWS" : "Open the office"}</Submit>
              </ErpForm>
            ) : (
              <ErpForm action={signIn}>
                <Field
                  label={portal ? "PSWS number or mobile number" : "Mobile number"}
                  hint={portal ? "E.g. PSWS-48213" : "From abroad, start with +"}
                  name="phone"
                >
                  <input
                    name="phone"
                    type={portal ? "text" : "tel"}
                    inputMode={portal ? "text" : "tel"}
                    autoCapitalize={portal ? "characters" : undefined}
                    autoComplete="username"
                    placeholder={portal ? "PSWS-48213" : "98123 45678"}
                  />
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
