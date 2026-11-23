"use client";

import { useState } from "react";
import { KINDS, inr, todayIST } from "@/lib/erp/labels";
import { NOT_COVERED, SLAB_ROWS, zakatMedical } from "@/lib/erp/zakat";
import type { FormState } from "@/lib/erp/form-state";
import { AmountInput, ChoiceWithOther, Chips, ErpForm, Field, Submit, type Choice } from "./form";
import { DateInput } from "./date-input";
import styles from "./erp.module.css";

type Action = (state: FormState, data: FormData) => Promise<FormState>;

const KIND_CHOICES: Choice[] = Object.entries(KINDS).map(([value, l]) => ({ value, en: l.en, hi: l.hi }));

const ADMITTED: Choice[] = [
  { value: "yes", en: "Yes, admitted", hi: "Bharti hai (IPD)" },
  { value: "no", en: "No", hi: "OPD, dawai, test" },
];

/**
 * A family's request for help. Medical asks what the Zakat slab needs: the
 * patient admitted in hospital, which hospital, and its bill, and shows what
 * Zakat pays and what the family pays as the bill is typed.
 */
export function RequestForm({ action }: { action: Action }) {
  const [kind, setKind] = useState("");
  const [admitted, setAdmitted] = useState("");
  const [bill, setBill] = useState<number | null>(null);
  const medical = kind === "medical";
  const share = bill ? zakatMedical(bill) : 0;
  return (
    <ErpForm action={action} resetOnDone>
      <ChoiceWithOther
        name="kind"
        legend="What do they need?"
        hint="Kis cheez ki zaroorat"
        options={KIND_CHOICES}
        onChange={setKind}
        otherLabel="What do they need?"
      />
      {medical && (
        <div className={styles.givers}>
          <Chips
            name="admitted"
            legend="Is the patient admitted in hospital?"
            hint="Zakat helps admitted patients (IPD) only"
            options={ADMITTED}
            value={admitted}
            onChange={setAdmitted}
          />
          {admitted === "no" ? (
            <p className={styles.formError} role="status">
              Zakat medical help is only for patients admitted to hospital. Not covered: {NOT_COVERED}.
            </p>
          ) : (
            <>
              <div className={styles.grid}>
                <Field label="Hospital" hint="The money goes to its account" name="hospital">
                  <input name="hospital" autoComplete="off" maxLength={120} />
                </Field>
                <AmountInput name="bill" label="Hospital bill or estimate" hint="Bill ya estimate" onChange={setBill} />
              </div>
              {share > 0 && bill && (
                <p className={styles.slabShare}>
                  By the Zakat slab: <b>Zakat pays {inr(share)}</b> · the family pays {inr(Math.max(bill - share, 0))}
                </p>
              )}
              <details className={styles.fold}>
                <summary>The Zakat medical slab</summary>
                <table className={styles.slab}>
                  <thead>
                    <tr>
                      <th>Hospital bill</th>
                      <th>Zakat pays</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SLAB_ROWS.map(([b, z]) => (
                      <tr key={b}>
                        <td>{b}</td>
                        <td>{z}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </>
          )}
        </div>
      )}
      <div className={styles.grid}>
        {!medical && <AmountInput name="asked" label="Amount asked" hint="Optional, if known" />}
        <Field label="Asked on" hint="Kab maanga" name="asked_on">
          <DateInput name="asked_on" defaultValue={todayIST()} />
        </Field>
        <Field label="Details" hint={medical ? "Patient, illness, ward, anything the approvers should know" : "Hospital, school, kya hua"} name="details" wide>
          <textarea name="details" />
        </Field>
      </div>
      <div className={styles.actions}>
        <Submit>Save the request</Submit>
      </div>
    </ErpForm>
  );
}
