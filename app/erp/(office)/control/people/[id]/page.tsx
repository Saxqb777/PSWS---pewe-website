import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/erp/auth";
import { getAccount } from "@/lib/erp/control";
import { portalOn } from "@/lib/erp/flags";
import { showPhone, showWhen } from "@/lib/erp/labels";
import { toId } from "@/lib/erp/form-state";
import { ErpForm, Field, Submit } from "@/components/erp/form";
import { Facts, PageHead } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";
import { activeAction, contactAction, lookAt, resetPasswordAction, unlockAction } from "../../actions";

export const metadata = { title: "Control room" };

export default async function ControlPerson({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ unlocked?: string }>;
}) {
  await requireOwner();
  const id = toId((await params).id);
  const a = id ? await getAccount(id) : null;
  if (!a) notFound();
  const portal = portalOn();
  const unlocked = (await searchParams).unlocked === "1";
  return (
    <>
      <PageHead
        title={a.name}
        sub={a.last_login_at ? `Last signed in ${showWhen(a.last_login_at)}` : "Has never signed in"}
        back={{ href: "/erp/control", label: "Control room" }}
      >
        {portal && a.active && (
          <form action={lookAt.bind(null, a.id)}>
            <button type="submit" className={styles.btn}>
              See their portal
            </button>
          </form>
        )}
      </PageHead>

      {unlocked && <p className={styles.formDone}>Unlocked. {a.name} can try their password again now.</p>}
      <Facts
        items={[
          ["Account", a.active ? "On" : "Off: cannot sign in"],
          ["In the office", a.role === "member" ? "No, a member with a portal" : `Yes${a.post ? `, ${a.post}` : ""}`],
          ["Approver", a.approver ? "Yes, one of the people who approve" : null],
          ["PSWS number", portal ? (a.member_no ?? "Not given yet: it comes the first time they open their portal") : null],
          ["Mobile", showPhone(a.phone)],
          ["Gmail", a.first_email ?? "None on file"],
          ["Lives in", a.lives_in],
          ["Password", a.has_password ? "Set" : "Not chosen yet"],
          ["Wrong passwords", a.locked ? `Locked after ${a.failed_logins || "too many"} tries` : a.failed_logins ? String(a.failed_logins) : null],
          ["Added", showWhen(a.created_at)],
        ]}
      />
      {portal && a.active && (
        <p className={styles.p}>
          See their portal shows exactly what they see, to help them. Look only: nothing can be sent in their name, and the
          look is written to Who changed what.
        </p>
      )}

      {(a.locked || a.failed_logins > 0) && (
        <section className={styles.box} style={{ marginTop: 20 }}>
          <h2 className={styles.h2} style={{ marginTop: 0 }}>
            Locked out
          </h2>
          <p className={styles.p}>They typed a wrong password too many times. Unlock to let them try again now.</p>
          <ErpForm action={unlockAction.bind(null, a.id)}>
            <div className={styles.actions}>
              <Submit quiet>Unlock</Submit>
            </div>
          </ErpForm>
        </section>
      )}

      <section className={styles.box} style={{ marginTop: 20 }}>
        <h2 className={styles.h2} style={{ marginTop: 0 }}>
          Forgot their password
        </h2>
        <p className={styles.p}>
          Clears their password and signs them out everywhere. You get a link to send them on WhatsApp, to choose a new one.
          {a.first_email && " They can also use First time here with their mobile and Gmail."}
        </p>
        <ErpForm
          action={resetPasswordAction.bind(null, a.id)}
          confirm={`Clear ${a.name}'s password and sign them out? They choose a new one with the link.`}
        >
          <div className={styles.actions}>
            <Submit quiet>Reset their password</Submit>
          </div>
        </ErpForm>
      </section>

      <section className={styles.box} style={{ marginTop: 20 }}>
        <h2 className={styles.h2} style={{ marginTop: 0 }}>
          Mobile number and Gmail
        </h2>
        <p className={styles.p}>For a typo. They sign in with this mobile number, and use this Gmail the first time.</p>
        <ErpForm action={contactAction.bind(null, a.id)}>
          <Field label="Mobile number" hint="From abroad, start with +" name="phone">
            <input name="phone" type="tel" inputMode="tel" defaultValue={showPhone(a.phone)} />
          </Field>
          <Field label="Gmail" name="email">
            <input
              name="email"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              defaultValue={a.first_email ?? ""}
            />
          </Field>
          <div className={styles.actions}>
            <Submit quiet>Save</Submit>
          </div>
        </ErpForm>
      </section>

      <section className={styles.box} style={{ marginTop: 20 }}>
        <h2 className={styles.h2} style={{ marginTop: 0 }}>
          {a.active ? "Turn the account off" : "Turn the account back on"}
        </h2>
        <p className={styles.p}>
          {a.active
            ? "They can no longer sign in, and are signed out at once. Nothing they did is removed."
            : "They can sign in again with their mobile number or PSWS number and their password."}
        </p>
        <ErpForm
          action={activeAction.bind(null, a.id)}
          confirm={a.active ? `Turn off ${a.name}'s account? They are signed out at once.` : undefined}
        >
          <div className={styles.actions}>
            <Submit quiet>{a.active ? "Turn off" : "Turn back on"}</Submit>
          </div>
        </ErpForm>
      </section>
    </>
  );
}
