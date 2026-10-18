import { KINDS, PLACES, WORK_STATUSES, todayIST, type Role } from "@/lib/erp/labels";
import type { Family, Meeting, Member, Request, Work } from "@/lib/erp/data";
import type { FormState } from "@/lib/erp/form-state";
import { AmountInput, ChoiceWithOther, Chips, ErpForm, Field, Submit, type Choice } from "./form";
import styles from "./erp.module.css";

/** The office's shorter forms. Each one is the same for adding and for changing. */

type Action = (state: FormState, data: FormData) => Promise<FormState>;

const choices = (o: Record<string, { en: string; hi: string }>): Choice[] =>
  Object.entries(o).map(([value, l]) => ({ value, en: l.en, hi: l.hi }));

export function Places() {
  return (
    <datalist id="places">
      {PLACES.map((p) => (
        <option key={p} value={p} />
      ))}
    </datalist>
  );
}

/* ------------------------------------------------------------ a family */

export function FamilyForm({ action, family, submit }: { action: Action; family?: Family; submit: string }) {
  return (
    <ErpForm action={action}>
      <div className={styles.grid}>
        <Field label="Name of the person helped" hint="Ghar ke bade ka naam" name="name" wide>
          <input name="name" autoComplete="off" defaultValue={family?.name ?? ""} />
        </Field>
        <Field label="Place" hint="Wadi ya mohalla" name="place">
          <input name="place" list="places" autoComplete="off" defaultValue={family?.place ?? ""} />
        </Field>
        <Field label="Mobile" hint="Optional" name="phone">
          <input name="phone" type="tel" inputMode="tel" defaultValue={family?.phone ?? ""} />
        </Field>
        <Field label="People in the house" hint="Ghar mein kitne log" name="people">
          <input name="people" inputMode="numeric" defaultValue={family?.people ?? ""} />
        </Field>
        <Field label="Notes" hint="Halaat, kya zaroorat hai" name="notes" wide>
          <textarea name="notes" defaultValue={family?.notes ?? ""} />
        </Field>
      </div>
      <div className={styles.fold}>
        <div style={{ paddingTop: 16 }}>
          <label className={styles.check} style={{ marginBottom: 14 }}>
            <input type="checkbox" name="stipend_active" defaultChecked={family?.stipend_active ?? false} />
            <span>
              <strong>Gets monthly help</strong>
              <span className={styles.hint} style={{ display: "block" }}>
                Har maheene paisa milta hai
              </span>
            </span>
          </label>
          <AmountInput name="stipend" label="Monthly help amount" hint="Har maheene kitna" defaultPaise={family?.stipend_paise} />
        </div>
      </div>
      {family && (
        <label className={styles.check}>
          <input type="checkbox" name="inactive" defaultChecked={!family.active} />
          <span>
            <strong>No longer helped</strong>
            <span className={styles.hint} style={{ display: "block" }}>
              Hides the family from the lists. Everything paid stays in the record.
            </span>
          </span>
        </label>
      )}
      <Places />
      <div className={styles.actions}>
        <Submit>{submit}</Submit>
      </div>
    </ErpForm>
  );
}

/* ------------------------------------------------------------ a request for help */

export function RequestForm({ action }: { action: Action }) {
  return (
    <ErpForm action={action} resetOnDone>
      <ChoiceWithOther
        name="kind"
        legend="What do they need?"
        hint="Kis cheez ki zaroorat"
        options={choices(KINDS)}
        otherLabel="What do they need?"
      />
      <div className={styles.grid}>
        <AmountInput name="asked" label="Amount asked" hint="Optional, if known" />
        <Field label="Asked on" hint="Kab maanga" name="asked_on">
          <input name="asked_on" type="date" defaultValue={todayIST()} />
        </Field>
        <Field label="Details" hint="Hospital, school, kya hua" name="details" wide>
          <textarea name="details" />
        </Field>
      </div>
      <div className={styles.actions}>
        <Submit>Save the request</Submit>
      </div>
    </ErpForm>
  );
}

export function DecideForm({ action, request }: { action: Action; request: Request }) {
  const stipend = request.kind === "stipend";
  return (
    <ErpForm action={action}>
      <div className={styles.grid}>
        <AmountInput
          name="approved"
          label={stipend ? "Approved each month" : "Amount approved"}
          hint={stipend ? "Har maheene kitna" : "Kitna manzoor hua"}
          defaultPaise={request.approved_paise ?? request.asked_paise}
        />
        <Field label="Decided on" hint="Faisla kab hua" name="decided_on">
          <input name="decided_on" type="date" defaultValue={todayIST()} />
        </Field>
        <Field label="Note" hint="Optional, e.g. meeting of 13 Sep" name="note" wide>
          <input name="note" defaultValue={request.decision_note ?? ""} />
        </Field>
      </div>
      <div className={styles.actions}>
        <Submit name="decision" value="approve">
          Approve
        </Submit>
        <Submit name="decision" value="decline" quiet>
          Not approved
        </Submit>
      </div>
    </ErpForm>
  );
}

/* ------------------------------------------------------------ a village work */

export function WorkForm({ action, work, submit }: { action: Action; work?: Work; submit: string }) {
  return (
    <ErpForm action={action}>
      <div className={styles.grid}>
        <Field label="Name of the work" hint="e.g. Pipeline to Rab Bhoiwadi" name="name" wide>
          <input name="name" autoComplete="off" defaultValue={work?.name ?? ""} />
        </Field>
        <Field label="Place" hint="Kahan" name="place">
          <input name="place" list="places" autoComplete="off" defaultValue={work?.place ?? ""} />
        </Field>
        <AmountInput name="budget" label="Planned cost" hint="Kitna kharcha socha, optional" defaultPaise={work?.budget_paise} />
      </div>
      <Chips
        name="status"
        legend="Where is it?"
        hint="Kaam kahan tak"
        options={choices(WORK_STATUSES)}
        defaultValue={work?.status ?? "planned"}
      />
      <div className={styles.grid}>
        <Field label="Started on" hint="Optional" name="started_on">
          <input name="started_on" type="date" defaultValue={work?.started_on ?? ""} />
        </Field>
        <Field label="Finished on" hint="Optional" name="finished_on">
          <input name="finished_on" type="date" defaultValue={work?.finished_on ?? ""} />
        </Field>
        <Field label="Notes" hint="Contractor, quotation, decisions" name="notes" wide>
          <textarea name="notes" defaultValue={work?.notes ?? ""} />
        </Field>
      </div>
      <Places />
      <div className={styles.actions}>
        <Submit>{submit}</Submit>
      </div>
    </ErpForm>
  );
}

/* ------------------------------------------------------------ a member */

export function MemberForm({ action, member, submit }: { action: Action; member?: Member; submit: string }) {
  return (
    <ErpForm action={action}>
      <div className={styles.grid}>
        <Field label="Name" name="name" wide>
          <input name="name" autoComplete="off" defaultValue={member?.name ?? ""} />
        </Field>
        <Field label="Mobile" hint="Optional" name="phone">
          <input name="phone" type="tel" inputMode="tel" defaultValue={member?.phone ?? ""} />
        </Field>
        <Field label="Lives in" hint="Pewe, Mumbai, Dubai…" name="lives_in">
          <input name="lives_in" list="places" autoComplete="off" defaultValue={member?.lives_in ?? ""} />
        </Field>
        <Field label="Post" hint="Optional, e.g. Treasurer" name="post">
          <input name="post" defaultValue={member?.post ?? ""} />
        </Field>
        <Field label="Notes" hint="Optional" name="notes">
          <input name="notes" defaultValue={member?.notes ?? ""} />
        </Field>
      </div>
      {member && (
        <label className={styles.check}>
          <input type="checkbox" name="inactive" defaultChecked={!member.active} />
          <span>
            <strong>No longer a member</strong>
          </span>
        </label>
      )}
      <Places />
      <div className={styles.actions}>
        <Submit>{submit}</Submit>
      </div>
    </ErpForm>
  );
}

/* ------------------------------------------------------------ a meeting or a notice */

export function MeetingForm({ action, meeting, submit }: { action: Action; meeting?: Meeting; submit: string }) {
  return (
    <ErpForm action={action}>
      <Chips
        name="kind"
        legend="Is it a meeting or a notice?"
        options={[
          { value: "meeting", en: "Meeting", hi: "Baithak, minutes" },
          { value: "notice", en: "Notice", hi: "Elaan, khabar" },
        ]}
        defaultValue={meeting?.kind ?? "meeting"}
      />
      <div className={styles.grid}>
        <Field label="Date" name="on_date">
          <input name="on_date" type="date" defaultValue={meeting?.on_date ?? todayIST()} />
        </Field>
        <Field label="Title" hint="e.g. Zakat committee meeting" name="title">
          <input name="title" autoComplete="off" defaultValue={meeting?.title ?? ""} />
        </Field>
        <Field label="What was decided, or what it says" hint="Kya tay hua" name="body" wide>
          <textarea name="body" style={{ minHeight: 200 }} defaultValue={meeting?.body ?? ""} />
        </Field>
      </div>
      <div className={styles.actions}>
        <Submit>{submit}</Submit>
      </div>
    </ErpForm>
  );
}

/* ------------------------------------------------------------ a person with access */

export function PersonForm({
  action,
  person,
  submit,
}: {
  action: Action;
  person?: { name: string; phone: string; role: Role; post: string | null; active: boolean };
  submit: string;
}) {
  return (
    <ErpForm action={action}>
      <div className={styles.grid}>
        <Field label="Name" name="name">
          <input name="name" autoComplete="off" defaultValue={person?.name ?? ""} />
        </Field>
        <Field label="Post" hint="e.g. Treasurer" name="post">
          <input name="post" defaultValue={person?.post ?? ""} />
        </Field>
        {!person && (
          <>
            <Field label="Mobile number" hint="They sign in with this. From abroad, start with +" name="phone">
              <input name="phone" type="tel" inputMode="tel" placeholder="98123 45678" />
            </Field>
            <Field label="Their Gmail" hint="Optional. Lets them sign in the first time without a link" name="email">
              <input name="email" type="email" inputMode="email" autoCapitalize="none" spellCheck={false} />
            </Field>
          </>
        )}
      </div>
      {person && (
        <label className={styles.check}>
          <input type="checkbox" name="inactive" defaultChecked={!person.active} />
          <span>
            <strong>Remove their access</strong>
            <span className={styles.hint} style={{ display: "block" }}>
              They are signed out at once. Everything they entered stays, with their name on it.
            </span>
          </span>
        </label>
      )}
      <div className={styles.actions}>
        <Submit>{submit}</Submit>
      </div>
    </ErpForm>
  );
}
