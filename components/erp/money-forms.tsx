"use client";

import { useState } from "react";
import {
  FAMILY_PURPOSES,
  HEADS,
  METHODS,
  PLACES,
  PURPOSES,
  inr,
  type Head,
  type Method,
  type Purpose,
} from "@/lib/erp/labels";
import type { FormState } from "@/lib/erp/form-state";
import { AmountInput, ChoiceWithOther, Chips, ErpForm, Field, Submit, type Choice } from "./form";
import styles from "./erp.module.css";

type Action = (state: FormState, data: FormData) => Promise<FormState>;

const choices = <K extends string>(o: Record<K, { en: string; hi: string }>, keys?: K[]): Choice[] =>
  (keys ?? (Object.keys(o) as K[])).map((k) => ({ value: k, en: o[k].en, hi: o[k].hi }));

const REFERENCE_LABEL: Record<Method, string> = {
  cash: "Number",
  upi: "UPI number",
  bank: "Bank number (UTR)",
  cheque: "Cheque number",
};

const REFERENCE_HINT: Record<Method, string> = {
  cash: "Not needed for cash",
  upi: "From the UPI message",
  bank: "From the bank message",
  cheque: "Cheque number and bank",
};

/** For a change to a saved entry: why, for the approvers. */
function ReasonBox() {
  return (
    <Field label="Why does it need changing?" hint="Kyun? The approvers read this before they approve" name="reason">
      <input name="reason" autoComplete="off" />
    </Field>
  );
}

/* ------------------------------------------------------------ money received */

export interface MoneyInInitial {
  on_date: string;
  from_name?: string;
  from_phone?: string | null;
  from_place?: string | null;
  amount_paise?: number | null;
  head?: Head;
  head_other?: string | null;
  method?: Method;
  reference?: string | null;
  note?: string | null;
}

export function MoneyInForm({
  action,
  initial,
  names,
  submit,
  askReason = false,
}: {
  action: Action;
  initial: MoneyInInitial;
  names: string[];
  submit: string;
  /** changing a saved receipt: the change goes to the approvers with a reason */
  askReason?: boolean;
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
      <ChoiceWithOther
        name="head"
        legend="What is it for?"
        hint="Kis cheez ke liye"
        options={choices(HEADS)}
        defaultValue={initial.head ?? "zakat"}
        otherLabel="What is it for?"
        otherDefault={initial.head_other}
      />
      <Chips
        name="method"
        legend="How did it come?"
        hint="Kaise aaya"
        options={choices(METHODS)}
        value={method}
        onChange={(v) => setMethod(v as Method)}
      />
      <div className={styles.grid}>
        <Field label={REFERENCE_LABEL[method]} hint={REFERENCE_HINT[method]} name="reference">
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
      {askReason && <ReasonBox />}
      <div className={styles.actions}>
        <Submit>{submit}</Submit>
      </div>
    </ErpForm>
  );
}

/* ------------------------------------------------------------ money paid */

/** The money a payment usually comes out of, by what it was for. */
const HEAD_FOR = (p: Purpose | ""): Head | null =>
  p === "" ? null : FAMILY_PURPOSES.includes(p as Purpose) ? "zakat" : p === "works" ? "development" : null;

export interface MoneyOutInitial {
  on_date: string;
  paid_to?: string;
  amount_paise?: number | null;
  head?: Head;
  head_other?: string | null;
  purpose?: Purpose;
  purpose_other?: string | null;
  method?: Method;
  reference?: string | null;
  family_id?: number | null;
  request_id?: number | null;
  work_id?: number | null;
  note?: string | null;
  /** opened from "Family helped": show the family box from the start */
  forFamily?: boolean;
}

/**
 * A payment: who, how much, and what for. A family or a village work can be
 * linked when it applies, but nothing is required beyond who and how much,
 * so a payment can always be saved.
 */
export function MoneyOutForm({
  action,
  initial,
  families,
  works,
  submit,
  request,
  askReason = false,
  funds = null,
}: {
  action: Action;
  initial: MoneyOutInitial;
  families: { id: number; name: string; place: string | null }[];
  works: { id: number; name: string }[];
  submit: string;
  /** when paying a request that was approved, its line is shown and kept */
  request?: { id: number; label: string } | null;
  /** changing a saved payment: the change goes to the approvers with a reason */
  askReason?: boolean;
  /** what is left in each fund, once starting balances are set */
  funds?: { head: Head; left: number }[] | null;
}) {
  const [purpose, setPurpose] = useState<Purpose | "">(initial.purpose ?? "");
  const [head, setHead] = useState<Head>(initial.head ?? HEAD_FOR(initial.purpose ?? "") ?? "zakat");
  const [headTouched, setHeadTouched] = useState(!!initial.head);
  const [family, setFamily] = useState<string>(initial.family_id ? String(initial.family_id) : "");
  const [method, setMethod] = useState<Method>(initial.method ?? "bank");
  const [amount, setAmount] = useState<number | null>(initial.amount_paise ?? null);
  const fund = funds?.find((f) => f.head === head) ?? null;
  const over = !!fund && !!amount && amount > fund.left;
  const showFamily =
    !!request ||
    !!initial.forFamily ||
    family !== "" ||
    (purpose !== "" && FAMILY_PURPOSES.includes(purpose as Purpose));
  const showWork = purpose === "works" || !!initial.work_id;

  return (
    <ErpForm action={action}>
      {request && <input type="hidden" name="request_id" value={request.id} />}

      <div className={styles.grid}>
        <Field label="Paid to" hint="Kisko diya: person, shop or contractor" name="paid_to" wide>
          <input name="paid_to" autoComplete="off" defaultValue={initial.paid_to ?? ""} />
        </Field>
        <AmountInput name="amount" defaultPaise={initial.amount_paise} onChange={setAmount} />
        <Field label="Date" hint="Kab diya" name="on_date">
          <input name="on_date" type="date" defaultValue={initial.on_date} />
        </Field>
      </div>

      <ChoiceWithOther
        name="purpose"
        legend="What was it for?"
        hint="Kis kaam ke liye"
        options={choices(PURPOSES)}
        value={purpose}
        onChange={(v) => {
          const p = v as Purpose;
          setPurpose(p);
          const h = HEAD_FOR(p);
          if (h && !headTouched) setHead(h);
        }}
        otherLabel="What was it for?"
        otherDefault={initial.purpose_other}
      />
      {purpose === "stipend" && !request && (
        <p className={styles.note}>
          For regular monthly help, use the Monthly help page: it pays everyone at once and never pays a family twice in
          a month.
        </p>
      )}

      {showFamily && (
        <div className={styles.grid}>
          <Field label="Which family?" hint="Optional. Leave empty if it was not for a family" name="family_id" wide>
            <select name="family_id" value={family} onChange={(e) => setFamily(e.target.value)} disabled={!!request}>
              <option value="">Not for a family</option>
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

      {showWork && (
        <Field
          label="Which village work?"
          hint="Optional. Add the work under Village works to see its total cost"
          name="work_id"
        >
          <select name="work_id" defaultValue={initial.work_id ? String(initial.work_id) : ""}>
            <option value="">Not linked to a work</option>
            {works.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <ChoiceWithOther
        name="head"
        legend="From which money?"
        hint="Kis paise se"
        options={choices(HEADS)}
        value={head}
        onChange={(v) => {
          setHead(v as Head);
          setHeadTouched(true);
        }}
        otherLabel="Which money?"
        otherDefault={initial.head_other}
      />
      {fund && (
        <p className={styles.note} style={over ? { color: "var(--out)", fontWeight: 500 } : undefined}>
          {HEADS[head].en} fund: {inr(Math.max(fund.left, 0))} left
          {over ? `. This payment is ${inr(amount! - Math.max(fund.left, 0))} more than the fund has.` : "."}
        </p>
      )}
      {over && (
        <label className={styles.check}>
          <input type="checkbox" name="over" />
          <span>
            <strong>Pay anyway</strong>
            <span className={styles.checkHint}>Only if this is right, e.g. the fund will be paid back.</span>
          </span>
        </label>
      )}
      <Chips
        name="method"
        legend="How was it paid?"
        hint="Kaise diya"
        options={choices(METHODS)}
        value={method}
        onChange={(v) => setMethod(v as Method)}
      />
      <div className={styles.grid}>
        <Field label={REFERENCE_LABEL[method]} hint={REFERENCE_HINT[method]} name="reference">
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
      {askReason && <ReasonBox />}
      <div className={styles.actions}>
        <Submit>{submit}</Submit>
      </div>
    </ErpForm>
  );
}
