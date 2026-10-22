import Link from "next/link";
import { requireMember } from "@/lib/erp/auth";
import { getMe, myMessages } from "@/lib/erp/portal";
import { showDate, showPhone } from "@/lib/erp/labels";
import { ErpForm, Field, Submit } from "@/components/erp/form";
import { Facts } from "@/components/erp/ui";
import { H2, MemberCard } from "@/components/erp/portal-ui";
import { MessageForm } from "@/components/erp/portal-forms";
import styles from "@/components/erp/erp.module.css";
import p from "@/components/erp/portal.module.css";
import { signOut } from "../../../actions";
import { changePortalPassword, messageOffice } from "../actions";

export const metadata = { title: "Me" };

export default async function CardPage() {
  const u = await requireMember();
  const [me, messages] = await Promise.all([getMe(u.id), myMessages(u.id)]);
  return (
    <>
      <h1 className={p.h1}>Me</h1>
      <MemberCard name={u.name} memberNo={u.member_no} since={me?.member_since ?? null} post={u.post} />

      <H2>My details</H2>
      <div className={styles.card}>
        <Facts
          items={[
            ["PSWS number", u.member_no],
            ["Mobile", showPhone(u.phone)],
            ["Gmail", me?.email],
            ["Lives in", me?.lives_in],
            ["Post", u.post],
            ["Member since", me?.member_since ? showDate(me.member_since) : null],
          ]}
        />
      </div>
      <p className={styles.note} style={{ marginTop: 8 }}>
        Something wrong or changed? Tell the office below.
      </p>
      <MessageForm action={messageOffice} />
      {messages.length > 0 && (
        <ul className={p.items} style={{ marginTop: 12 }}>
          {messages.map((m) => (
            <li key={m.id}>
              <span>{m.body}</span>
              <span className={`${p.status} ${m.done_at ? p.stOk : p.stWait}`}>{m.done_at ? "Done" : "Sent"}</span>
              <span className={p.itemMeta}>{showDate(m.at)}</span>
            </li>
          ))}
        </ul>
      )}

      <H2>For a meeting</H2>
      <p className={styles.p}>
        The live screen shows the open asks and what is coming in, big enough for a TV.{" "}
        <Link href="/erp/live" className={styles.link}>
          Open the live screen
        </Link>
      </p>

      <H2>Change my password</H2>
      <ErpForm action={changePortalPassword} resetOnDone>
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
          <Submit quiet>Change my password</Submit>
        </div>
      </ErpForm>

      <H2>Sign out</H2>
      <form action={signOut}>
        <button type="submit" className={styles.btnQuiet}>
          Sign out
        </button>
      </form>
    </>
  );
}
