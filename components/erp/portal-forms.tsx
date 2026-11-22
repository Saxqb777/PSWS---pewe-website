"use client";

import { useState } from "react";
import { ASK_KINDS, HEADS, todayIST, type AskKind } from "@/lib/erp/labels";
import type { FormState } from "@/lib/erp/form-state";
import { AmountInput, ChoiceWithOther, Chips, ErpForm, Field, Submit, type Choice } from "./form";
import { AmountBox, CountryField, GiversBox, HowBox, type RefLabels } from "./money-detail";
import { PictureInput } from "./picture-input";
import styles from "./erp.module.css";

/** The forms a member fills in on their own portal. */

type Action = (state: FormState, data: FormData) => Promise<FormState>;

const PAID_BY: Choice[] = [
  { value: "upi", en: "GPay / PhonePe", hi: "UPI se" },
  { value: "bank", en: "Bank transfer", hi: "Bank se" },
  { value: "cash", en: "Cash", hi: "Nakad" },
  { value: "cheque", en: "Cheque", hi: "Cheque" },
  { value: "other", en: "Other", hi: "Kuch aur" },
];

const REFS: RefLabels = {
  upi: ["UPI number", "The 12-digit number in the payment message"],
  bank: ["Bank number (UTR)", "From the bank's message"],
  cash: ["Who did you give it to?", "And where"],
  cheque: ["Cheque number", "And the bank"],
  other: ["Number or note", "Anything that helps the Accountant find it"],
};

const FUNDS: Choice[] = (["zakat", "donation", "development", "other"] as const).map((k) => ({
  value: k,
  en: HEADS[k].en,
  hi: HEADS[k].hi,
}));

/** "I sent ₹1,000": after paying PSWS the usual way, a member says so; the PSWS Accountant finds it and it counts. */
export function GiveForm({ action, chooseFund }: { action: Action; chooseFund: boolean }) {
  const [collected, setCollected] = useState(false);
  return (
    <ErpForm action={action}>
      <GiversBox
        title="I collected this from others"
        explain="Money you gathered from family or friends. It counts as your collection, not your own gift. Doosron se jama kiya."
        onToggle={setCollected}
      />
      <AmountBox
        label={collected ? "How much did you send in all?" : "How much did you send?"}
        hint="Kitna bheja"
        rupeesToo={false}
      />
      {chooseFund && (
        <ChoiceWithOther
          name="head"
          legend="For"
          hint="Kis cheez ke liye"
          options={FUNDS}
          defaultValue="donation"
          otherLabel="What is it for?"
        />
      )}
      <HowBox legend="How did you send it?" hint="Kaise bheja" options={PAID_BY} defaultMethod="upi" refs={REFS} />
      <div className={styles.grid}>
        <CountryField />
        <Field label="When?" hint="Kab bheja" name="sent_on">
          <input name="sent_on" type="date" defaultValue={todayIST()} max={todayIST()} />
        </Field>
      </div>
      <PictureInput
        name="proof"
        label="Screenshot of the payment"
        hint="Optional · only you and the Accountant see it"
        add="Add a screenshot"
      />
      <label className={styles.check}>
        <input type="checkbox" name="hide_name" />
        <span>
          <strong>Keep my name hidden</strong>
          <span className={styles.hint} style={{ display: "block" }}>
            {collected
              ? "Otherwise every member sees your name with what you collected. Naam chhupana ho to tick kijiye."
              : "Otherwise every member sees your name and how much you gave, as it comes in. Naam chhupana ho to tick kijiye."}
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

/** A photo on an ask: what is needed, or what the money did. */
export function PhotoForm({ action, office = false }: { action: Action; office?: boolean }) {
  return (
    <ErpForm action={action} resetOnDone>
      <PictureInput
        name="photo"
        label="Add a photo"
        hint={office ? "e.g. the finished work, or the bill" : "e.g. what needs fixing"}
        add="Choose a photo"
      />
      <Field label="A line about it" hint="Optional" name="caption">
        <input name="caption" autoComplete="off" maxLength={120} placeholder={office ? "After: the new roof" : "Before: the roof today"} />
      </Field>
      <div className={styles.actions}>
        <Submit quiet>Add the photo</Submit>
      </div>
    </ErpForm>
  );
}
