import { notFound } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import { portalOn } from "@/lib/erp/flags";
import { listPortalMembers } from "@/lib/erp/portal";
import { inr, showPhone } from "@/lib/erp/labels";
import { ErpForm, Field, Submit } from "@/components/erp/form";
import { PageHead, Section } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";
import { addMember } from "../actions";

export const metadata = { title: "Members and their numbers" };

export default async function PortalMembers() {
  await requireUser("editor");
  if (!portalOn()) notFound();
  const people = await listPortalMembers();
  const office = people.filter((m) => m.role !== "member");
  const members = people.filter((m) => m.role === "member");

  const table = (rows: typeof people) => (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">PSWS number</th>
            <th scope="col">Name</th>
            <th scope="col">Mobile</th>
            <th scope="col">Signed in</th>
            <th scope="col">Gave this year</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id} style={m.active ? undefined : { opacity: 0.5 }}>
              <td style={{ fontFamily: "var(--font-plex-mono), monospace", whiteSpace: "nowrap" }}>
                {m.member_no ?? "Given at first sign-in"}
              </td>
              <td>
                {m.name}
                {m.post ? <span className={styles.muted}> · {m.post}</span> : null}
              </td>
              <td>{showPhone(m.phone)}</td>
              <td>{m.has_password ? "Yes" : "Not yet"}</td>
              <td>{m.gave_paise ? inr(m.gave_paise) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <PageHead
        title="Members and their numbers"
        sub="Everyone gets a PSWS number of their own the first time they sign in. Only the office sees this list."
        back={{ href: "/erp/portal", label: "Members' portal" }}
      />

      <Section title={`Members (${members.length})`} />
      {members.length ? table(members) : <p className={styles.note}>No members with only a portal yet.</p>}

      <Section title={`The office's people (${office.length})`} />
      {table(office)}

      <Section title="Add a member" />
      <p className={styles.p}>
        They get their own portal and nothing in the office. The first time, they sign in with this mobile number and Gmail and
        choose their own password.
      </p>
      <ErpForm action={addMember} resetOnDone>
        <div className={styles.grid}>
          <Field label="Name" name="name" wide>
            <input name="name" autoComplete="off" />
          </Field>
          <Field label="Mobile number" hint="From abroad, start with +" name="phone">
            <input name="phone" type="tel" inputMode="tel" />
          </Field>
          <Field label="Gmail" hint="They need it the first time" name="email">
            <input name="email" type="email" inputMode="email" autoCapitalize="none" spellCheck={false} />
          </Field>
          <Field label="Lives in" hint="Optional: Pewe, Mumbai, Dubai…" name="lives_in">
            <input name="lives_in" autoComplete="off" />
          </Field>
        </div>
        <div className={styles.actions}>
          <Submit>Add the member</Submit>
        </div>
      </ErpForm>
    </>
  );
}
