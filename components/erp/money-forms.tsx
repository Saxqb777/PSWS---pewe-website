"use client";

import { useState } from "react";
import { HEADS, METHODS, PLACES, PURPOSES, type Head, type Method, type Purpose } from "@/lib/erp/labels";
import type { FormState } from "@/lib/erp/form-state";
import { AmountInput, Chips, ErpForm, Field, Submit, type Choice } from "./form";
import styles from "./erp.module.css";

type Action = (state: FormState, data: FormData) => Promise<FormState>;

const choices = <K extends string>(o: Record<K, { en: string; hi: string }>, keys?: K[]): Choice[] =>
  (keys ?? (Object.keys(o) as K[])).map((k) => ({ value: k, en: o[k].en, hi: o[k].hi }));

const REFERENCE_HINT: Record<Method, string> = {
  cash: "Not needed for cash",
  upi: "UPI reference number",
  bank: "UTR or bank reference",
  cheque: "Cheque number and bank",
};

/* ------------------------------------------------------------ money received */

export interface MoneyInInitial {
  on_date: string;
  from_name?: string;
  from_phone?: string | null;
  from_place?: string | null;
  amount_paise?: number | null;
  head?: Head;
  method?: Method;
  reference?: string | null;
  note?: string | null;
}

export function MoneyInForm({
  action,
  initial,
  names,
  submit,
}: {
  action: Action;
  initial: MoneyInInitial;
  names: string[];
  submit: string;
}) {
  const [method, setMethod] = useState<Method>(initial.method ?? "cash");
  return (
    <ErpForm action={action}>
      <div className={styles.grid}>
        <Field label="Received from" hint="Kisne diya" name="from_name" wide>
          <input name="from_name" list="known-names" autoComplete="off" defaultValue={initial.from_name ?? ""} />
          <datalist id="known-names">
            {names.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </Field>
        <AmountInput name="amount" defaultPaise={initial.amount_paise} />
        <Field label="Date" hint="Kab aaya" name="on_date">
          <input name="on_date" type="date" defaultValue={initial.on_date} />
        </Field>
      </div>
      <Chips name="head" legend="What is it for?" hint="Kis cheez ke liye" options={choices(HEADS)} defaultValue={initial.head ?? "zakat"} />
      <Chips
        name="method"
        legend="How did it come?"
        hint="Kaise aaya"
        options={choices(METHODS)}
        value={method}
        onChange={(v) => setMethod(v as Method)}
      />
      <div className={styles.grid}>
        <Field label="Reference" hint={REFERENCE_HINT[method]} name="reference">
          <input name="reference" autoComplete="off" defaultValue={initial.reference ?? ""} />
        </Field>
        <Field label="Their place" hint="Gaon ya shehar, if you know" name="from_place">
          <input name="from_place" list="places" autoComplete="off" defaultValue={initial.from_place ?? ""} />
          <datalist id="places">
            {PLACES.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </Field>
        <Field label="Their mobile, for the receipt on WhatsApp" hint="Optional" name="from_phone">
          <input name="from_phone" type="tel" inputMode="tel" defaultValue={initial.from_phone ?? ""} />
        </Field>
        <Field label="Note" hint="Optional" name="note">
          <input name="note" defaultValue={initial.note ?? ""} />
        </Field>
      </div>
      <div className={styles.actions}>
        <Submit>{submit}</Submit>
      </div>
    </ErpForm>
  );
}

/* ------------------------------------------------------------ money paid */

type For = "family" | "work" | "other";

const FOR_CHOICES: Choice[] = [
  { value: "family", en: "A family", hi: "Kisi parivaar ko madad" },
  { value: "work", en: "A village work", hi: "Gaon ka kaam" },
  { value: "other", en: "Office, bank or other", hi: "Baaki kharcha" },
];

const PURPOSES_FOR: Record<For, Purpose[]> = {
  family: ["medical", "education", "livelihood", "emergency", "stipend", "other"],
  work: ["works"],
  other: ["office", "bank", "other"],
};

const HEAD_FOR: Record<For, Head> = { family: "zakat", work: "development", other: "other" };

export interface MoneyOutInitial {
  on_date: string;
  for?: For;
  paid_to?: string;
  amount_paise?: number | null;
  head?: Head;
  purpose?: Purpose;
  method?: Method;
  reference?: string | null;
  family_id?: number | null;
  request_id?: number | null;
  work_id?: number | null;
  note?: string | null;
}

export function MoneyOutForm({
  action,
  initial,
  families,
  works,
  submit,
  request,
}: {
  action: Action;
  initial: MoneyOutInitial;
  families: { id: number; name: string; place: string | null }[];
  works: { id: number; name: string }[];
  submit: string;
  /** when paying a request that was approved, its line is shown and kept */
  request?: { id: number; label: string } | null;
}) {
  const [forWhat, setFor] = useState<For>(initial.for ?? "family");
  const [head, setHead] = useState<Head>(initial.head ?? HEAD_FOR[initial.for ?? "family"]);
  const [purpose, setPurpose] = useState<Purpose | "">(initial.purpose ?? (initial.for === "work" ? "works" : ""));
  const [family, setFamily] = useState<string>(initial.family_id ? String(initial.family_id) : "");
  const [method, setMethod] = useState<Method>(initial.method ?? "bank");

  return (
    <ErpForm action={action}>
      {request && <input type="hidden" name="request_id" value={request.id} />}
      <Chips
        name="for"
        legend="Who or what was it paid for?"
        hint="Kiske liye"
        options={request ? FOR_CHOICES.slice(0, 1) : FOR_CHOICES}
        value={forWhat}
        onChange={(v) => {
          const f = v as For;
          setFor(f);
          setHead(HEAD_FOR[f]);
          setPurpose(f === "work" ? "works" : "");
        }}
      />

      {forWhat === "family" && (
        <div className={styles.grid}>
          <Field label="Family" hint="Kis parivaar ko" name="family_id" wide>
            <select name="family_id" value={family} onChange={(e) => setFamily(e.target.value)} disabled={!!request}>
              <option value="">Choose…</option>
              <option value="new">＋ A new family (not in the list yet)</option>
              {families.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                  {f.place ? ` · ${f.place}` : ""}
                </option>
              ))}
            </select>
            {request && <input type="hidden" name="family_id" value={family} />}
          </Field>
          {request && <p className={`${styles.note} ${styles.wide}`}>Paying: {request.label}</p>}
          {family === "new" && (
            <>
              <Field label="Name of the person helped" hint="Jinko madad mili" name="new_family_name">
                <input name="new_family_name" autoComplete="off" />
              </Field>
              <Field label="Their place" hint="Wadi ya mohalla" name="new_family_place">
                <input name="new_family_place" list="places" autoComplete="off" />
              </Field>
            </>
          )}
        </div>
      )}

      {forWhat === "work" && (
        <Field label="Which work?" hint="Kaunsa kaam" name="work_id">
          <select name="work_id" defaultValue={initial.work_id ? String(initial.work_id) : ""}>
            <option value="">Choose…</option>
            {works.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      {forWhat !== "work" && (
        <Chips
          name="purpose"
          legend="What was it for?"
          hint="Kis kaam ke liye"
          options={choices(PURPOSES, PURPOSES_FOR[forWhat])}
          value={purpose}
          onChange={(v) => setPurpose(v as Purpose)}
        />
      )}
      {forWhat === "work" && <input type="hidden" name="purpose" value="works" />}
      {forWhat === "family" && purpose === "stipend" && (
        <p className={styles.note}>
          For the regular monthly stipend, use Monthly stipends: it pays everyone at once and never pays a family twice for
          the same month.
        </p>
      )}

      <div className={styles.grid}>
        <AmountInput name="amount" defaultPaise={initial.amount_paise} />
        <Field label="Date" hint="Kab diya" name="on_date">
          <input name="on_date" type="date" defaultValue={initial.on_date} />
        </Field>
        <Field
          label="Paid to"
          hint={forWhat === "family" ? "Leave empty if it went to the family itself" : "Contractor, shop or person"}
          name="paid_to"
          wide
        >
          <input name="paid_to" autoComplete="off" defaultValue={initial.paid_to ?? ""} />
        </Field>
      </div>

      <Chips
        name="head"
        legend="Paid out of"
        hint="Kis paise se"
        options={choices(HEADS)}
        value={head}
        onChange={(v) => setHead(v as Head)}
      />
      <Chips
        name="method"
        legend="How was it paid?"
        hint="Kaise diya"
        options={choices(METHODS)}
        value={method}
        onChange={(v) => setMethod(v as Method)}
      />
      <div className={styles.grid}>
        <Field label="Reference" hint={REFERENCE_HINT[method]} name="reference">
          <input name="reference" autoComplete="off" defaultValue={initial.reference ?? ""} />
        </Field>
        <Field label="Note" hint="Optional, e.g. bill number" name="note">
          <input name="note" defaultValue={initial.note ?? ""} />
        </Field>
      </div>
      <datalist id="places">
        {PLACES.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <div className={styles.actions}>
        <Submit>{submit}</Submit>
      </div>
    </ErpForm>
  );
}
