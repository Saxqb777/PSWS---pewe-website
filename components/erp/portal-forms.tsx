"use client";

import { useState } from "react";
import { ASK_KINDS, HEADS, todayIST, type AskKind } from "@/lib/erp/labels";
import type { FormState } from "@/lib/erp/form-state";
import { AmountInput, Chips, ErpForm, Field, Submit } from "./form";
import styles from "./erp.module.css";

/** The forms a member fills in on their own portal. */

type Action = (state: FormState, data: FormData) => Promise<FormState>;

const PAID_BY = [
  { value: "upi", en: "GPay / PhonePe", hi: "UPI se" },
  { value: "bank", en: "Bank transfer", hi: "Bank se" },
  { value: "cash", en: "Cash to the Treasurer", hi: "Nakad" },
  { value: "cheque", en: "Cheque", hi: "Cheque" },
];

const REF_LABEL: Record<string, [string, string]> = {
  upi: ["UPI number", "The 12-digit number in the payment message"],
  bank: ["Bank number (UTR)", "From the bank's message"],
  cash: ["Who did you give it to?", "And where"],
  cheque: ["Cheque number", "And the bank"],
};

/** "I sent ₹1,000": after paying PSWS from their own phone, a member says so; the Treasurer finds it and it counts. */
export function GiveForm({ action, chooseFund }: { action: Action; chooseFund: boolean }) {
  const [method, setMethod] = useState("upi");
  const [label, hint] = REF_LABEL[method];
  return (
    <ErpForm action={action}>
      <AmountInput name="amount" label="How much did you send?" hint="Kitna bheja" />
      {chooseFund && (
        <Chips
          name="head"
          legend="For"
          hint="Kis cheez ke liye"
          options={(["zakat", "donation", "development"] as const).map((k) => ({ value: k, en: HEADS[k].en, hi: HEADS[k].hi }))}
          defaultValue="donation"
        />
      )}
      <Chips name="method" legend="How did you send it?" hint="Kaise bheja" options={PAID_BY} value={method} onChange={setMethod} />
      <div className={styles.grid}>
        <Field label={label} hint={hint} name="reference">
          <input name="reference" autoComplete="off" inputMode={method === "upi" ? "numeric" : "text"} />
        </Field>
        <Field label="When?" hint="Kab bheja" name="sent_on">
          <input name="sent_on" type="date" defaultValue={todayIST()} max={todayIST()} />
        </Field>
      </div>
      <label className={styles.check}>
        <input type="checkbox" name="hide_name" />
        <span>
          <strong>Keep my name hidden</strong>
          <span className={styles.hint} style={{ display: "block" }}>
            Otherwise every member sees your name and how much you gave, as it comes in. Naam chhupana ho to tick kijiye.
          </span>
        </span>
      </label>
      <div className={styles.actions}>
        <Submit>I have sent it</Submit>
      </div>
    </ErpForm>
  );
}

const in30Days = () => {
  const d = new Date(todayIST());
  d.setUTCDate(d.getUTCDate() + 30);
  return d.toISOString().slice(0, 10);
};

/** A member puts out an ask: a collection, a Zakat appeal, or help for themselves or someone else. */
export function AskForm({ action, kind: start }: { action: Action; kind: AskKind }) {
  const [kind, setKind] = useState<AskKind>(start);
  const forSomeone = kind !== "collection";
  return (
    <ErpForm action={action}>
      <Chips
        name="kind"
        legend="What is it?"
        hint="Kya chahiye"
        options={(Object.keys(ASK_KINDS) as AskKind[]).map((k) => ({ value: k, en: ASK_KINDS[k].en, hi: ASK_KINDS[k].hi }))}
        value={kind}
        onChange={(v) => setKind(v as AskKind)}
      />
      <Field
        label={kind === "help" ? "What help is needed?" : "What is it for?"}
        hint={kind === "zakat" ? "Never the family's name: e.g. Hospital costs for a family in Pewe" : "One line, e.g. Water tank for Bhoiwadi"}
        name="title"
        wide
      >
        <input name="title" autoComplete="off" maxLength={90} />
      </Field>
      {kind !== "help" && (
        <Field label="Why, for everyone to read" hint="Kyun? Members read this before they give" name="story" wide>
          <textarea name="story" rows={4} />
        </Field>
      )}
      {forSomeone && (
        <Field
          label={kind === "help" ? "Tell the office about it" : "Who is it for?"}
          hint="Only the office and the approvers see this: name, place, phone, what happened"
          name="private_note"
          wide
        >
          <textarea name="private_note" rows={4} />
        </Field>
      )}
      {kind !== "help" && (
        <div className={styles.grid}>
          <AmountInput name="target" label="How much is needed?" hint="Kitna chahiye" />
          <Field label="Open until" hint="Kab tak" name="closes_on">
            <input name="closes_on" type="date" defaultValue={in30Days()} min={todayIST()} />
          </Field>
        </div>
      )}
      {kind === "collection" && (
        <Chips
          name="head"
          legend="Which fund does the money go to?"
          hint="Kis khaate mein"
          options={(["donation", "development"] as const).map((k) => ({ value: k, en: HEADS[k].en, hi: HEADS[k].hi }))}
          defaultValue="development"
        />
      )}
      <p className={styles.note}>
        {kind === "help"
          ? "It stays private. Two approvers look at it, someone may visit, and the office tells you here what was decided."
          : "Two of the four approvers look at it first. Once they say yes, every member sees it and can give. The money goes only to PSWS's bank, never to you."}
      </p>
      <div className={styles.actions}>
        <Submit>{kind === "help" ? "Send to the office" : "Send for approval"}</Submit>
      </div>
    </ErpForm>
  );
}

/** A note to the office: a change of phone or Gmail, a question. */
export function MessageForm({ action }: { action: Action }) {
  return (
    <ErpForm action={action} resetOnDone>
      <Field label="Message to the office" hint="E.g. my new mobile number is … (Office ko likhiye)" name="body" wide>
        <textarea name="body" rows={3} />
      </Field>
      <div className={styles.actions}>
        <Submit quiet>Send</Submit>
      </div>
    </ErpForm>
  );
}
