"use client";

import { useState } from "react";
import { COUNTRIES, CURRENCIES, type Method } from "@/lib/erp/labels";
import { AmountInput, ChoiceWithOther, Field, type Choice } from "./form";
import styles from "./erp.module.css";

/**
 * The parts of a money form that the member's "I have sent it", the
 * Accountant's receipt and the Accountant's payment share, so all three ask
 * the same things in the same way.
 */

/** What to ask for, by how the money went: [label, hint]. */
export type RefLabels = Record<Method, [string, string]>;

/** How it came or went, then what goes with that: the number, the bank, or what "Other" was. */
export function HowBox({
  legend,
  hint,
  options,
  defaultMethod,
  refs,
  initial = {},
  onChange,
}: {
  legend: string;
  hint: string;
  options: Choice[];
  defaultMethod: Method;
  refs: RefLabels;
  initial?: { reference?: string | null; method_other?: string | null; bank_name?: string | null };
  onChange?: (m: Method) => void;
}) {
  const [method, setMethod] = useState<Method>(defaultMethod);
  const [label, refHint] = refs[method];
  return (
    <>
      <ChoiceWithOther
        name="method"
        legend={legend}
        hint={hint}
        options={options}
        defaultValue={defaultMethod}
        onChange={(v) => {
          setMethod(v as Method);
          onChange?.(v as Method);
        }}
        otherLabel="How? Say it in a few words"
        otherDefault={initial.method_other}
      />
      <div className={styles.grid}>
        {method === "bank" && (
          <Field label="Bank name" hint="e.g. Bank of India, Emirates NBD" name="bank_name">
            <input name="bank_name" autoComplete="off" defaultValue={initial.bank_name ?? ""} />
          </Field>
        )}
        <Field label={label} hint={refHint} name="reference">
          <input
            name="reference"
            autoComplete="off"
            inputMode={method === "upi" ? "numeric" : "text"}
            defaultValue={initial.reference ?? ""}
          />
        </Field>
      </div>
    </>
  );
}

/**
 * The amount: rupees, as nearly always. "Sent in another currency?" turns it
 * into the amount in that currency, and, for the Accountant, the rupees that
 * arrived in the bank, which is what the books count.
 */
export function AmountBox({
  label,
  hint,
  defaultPaise,
  initialCurrency,
  initialSent,
  rupeesToo,
  onChange,
}: {
  label: string;
  hint: string;
  defaultPaise?: number | null;
  initialCurrency?: string | null;
  initialSent?: number | null;
  /** the Accountant also types the rupees that arrived; a member leaves that to the Accountant */
  rupeesToo: boolean;
  onChange?: (paise: number | null) => void;
}) {
  const [currency, setCurrency] = useState(initialCurrency && initialCurrency !== "INR" ? initialCurrency : "INR");
  const abroad = currency !== "INR";
  return (
    <div className={styles.moneyBox}>
      {abroad ? (
        <div className={styles.grid}>
          <Field label="Currency" hint="Kis currency mein" name="currency">
            <select name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {Object.entries(CURRENCIES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`${label}, in ${currency}`} hint={hint} name="sent_amount">
            <input
              name="sent_amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              defaultValue={initialSent ? String(initialSent) : ""}
            />
          </Field>
          {rupeesToo && (
            <AmountInput
              name="amount"
              label="Rupees that arrived"
              hint="In the bank, after the exchange"
              defaultPaise={defaultPaise}
              onChange={onChange}
            />
          )}
        </div>
      ) : (
        <>
          <input type="hidden" name="currency" value="INR" />
          <AmountInput name="amount" label={label} hint={hint} defaultPaise={defaultPaise} onChange={onChange} />
        </>
      )}
      {!rupeesToo && abroad && (
        <p className={styles.note}>The Accountant types the rupees that arrived in the bank. Your receipt is in rupees.</p>
      )}
      <button type="button" className={styles.textBtn} onClick={() => setCurrency(abroad ? "INR" : "AED")}>
        {abroad ? "It was rupees" : "Sent in another currency?"}
      </button>
    </div>
  );
}

/** The country it was sent from. India unless they say otherwise: many send from the Gulf, in rupees or not. */
export function CountryField({ initial }: { initial?: string | null }) {
  return (
    <Field label="Sent from" hint="Kis desh se" name="country">
      <input name="country" list="psws-countries" autoComplete="off" defaultValue={initial ?? "India"} />
      <datalist id="psws-countries">
        {COUNTRIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </Field>
  );
}

const MOST_BOXES = 40;

/**
 * Money a member gathered from several people: their collection, not their
 * own gift. Say how many, and a box opens for each one's name.
 */
export function GiversBox({
  title,
  explain,
  onToggle,
}: {
  title: string;
  explain: string;
  onToggle?: (on: boolean) => void;
}) {
  const [on, setOn] = useState(false);
  const [count, setCount] = useState("");
  const n = Math.min(Math.max(Number.parseInt(count, 10) || 0, 0), MOST_BOXES);
  return (
    <>
      <label className={styles.check}>
        <input
          type="checkbox"
          name="collected"
          checked={on}
          onChange={(e) => {
            setOn(e.target.checked);
            onToggle?.(e.target.checked);
          }}
        />
        <span>
          <strong>{title}</strong>
          <span className={styles.hint} style={{ display: "block" }}>
            {explain}
          </span>
        </span>
      </label>
      {on && (
        <div className={styles.givers}>
          <Field label="From how many people?" hint="Kitne logon se" name="people">
            <input
              name="people"
              inputMode="numeric"
              autoComplete="off"
              placeholder="5"
              value={count}
              onChange={(e) => setCount(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </Field>
          {n > 0 && (
            <fieldset className={styles.giverNames}>
              <legend className={styles.label}>
                Their names
                <span className={styles.hint}>Optional · they show on the receipt</span>
              </legend>
              <div className={styles.giverGrid}>
                {Array.from({ length: n }, (_, i) => (
                  <label key={i} className={styles.giverBox}>
                    <span aria-hidden="true">{i + 1}</span>
                    <input name="giver" autoComplete="off" aria-label={`Name ${i + 1}`} placeholder={`Name ${i + 1}`} />
                  </label>
                ))}
              </div>
              {Number(count) > MOST_BOXES && (
                <p className={styles.note}>Type the first {MOST_BOXES} names here; the rest can go in the note.</p>
              )}
              <label className={styles.check} style={{ marginTop: 10 }}>
                <input type="checkbox" name="givers_hidden" />
                <span>
                  <strong>Keep their names hidden</strong>
                  <span className={styles.hint} style={{ display: "block" }}>
                    They stay on the receipt, but not on the appeal for every member to see.
                  </span>
                </span>
              </label>
            </fieldset>
          )}
        </div>
      )}
    </>
  );
}
