import { notFound } from "next/navigation";
import { OWNER_PHONE, requireUser } from "@/lib/erp/auth";
import { getPerson } from "@/lib/erp/data";
import { showPhone, showWhen } from "@/lib/erp/labels";
import { toId } from "@/lib/erp/form-state";
import { ErpForm, Submit } from "@/components/erp/form";
import { PersonForm } from "@/components/erp/forms";
import { PageHead } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";
import { newLinkAction, setApproverAction, updatePersonAction } from "../actions";

export const metadata = { title: "Access" };

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser("admin");
  const id = toId((await params).id);
  const p = id ? await getPerson(id) : null;
  if (!p) notFound();
  return (
    <>
      <PageHead
        title={p.name}
        sub={`${showPhone(p.phone)} · ${p.last_login_at ? `last signed in ${showWhen(p.last_login_at)}` : "has not signed in yet"}`}
        back={{ href: "/erp/people", label: "People with access" }}
      />
      {p.approver && <p className={`${styles.banner}`}>Approves deletions and changes.</p>}
      <PersonForm action={updatePersonAction.bind(null, p.id)} person={p} submit="Save" />

      {me.phone === OWNER_PHONE && (
        <section className={styles.box} style={{ marginTop: 24 }}>
          <ErpForm action={setApproverAction.bind(null, p.id)}>
            <label className={styles.check}>
              <input type="checkbox" name="approver" defaultChecked={p.approver} />
              <span>
                <strong>Approves deletions and changes</strong>
                <span className={styles.checkHint}>Only you, the website owner, can change who approves.</span>
              </span>
            </label>
            <div className={styles.actions}>
              <Submit quiet>Save</Submit>
            </div>
          </ErpForm>
        </section>
      )}

      {p.active && p.id !== me.id && (
        <>
          <h2 className={styles.h2}>
            Password link
          </h2>
          <p className={styles.p}>
            {p.has_password
              ? "If they forgot their password, make a new link and send it to them. They choose a new password with it."
              : "They have not set their password yet. If the first link is lost or ran out, make a new one."}
          </p>
          <ErpForm action={newLinkAction.bind(null, p.id)}>
            <div className={styles.actions}>
              <Submit quiet>Make a new link</Submit>
            </div>
          </ErpForm>
        </>
      )}
    </>
  );
}
