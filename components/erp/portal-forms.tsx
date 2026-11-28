"use client";

import { useState } from "react";
import { ASK_KINDS, HEADS, inr, showDate, todayIST, type AskKind } from "@/lib/erp/labels";
import type { FormState } from "@/lib/erp/form-state";
import { readProof, type ProofRead } from "@/app/erp/(portal)/me/actions";
import { AmountInput, ChoiceWithOther, Chips, ErpForm, Field, Submit, type Choice } from "./form";
import { AmountBox, CountryField, GiversFields, HowBox, type RefLabels } from "./money-detail";
import { PictureInput } from "./picture-input";
import styles from "./erp.module.css";
import { DateInput } from "./date-input";

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
  upi: ["UTR / UPI transaction ID", "The 12 digits. GPay: open the payment, UPI transaction ID. PhonePe: UTR"],
  bank: ["UTR / reference number", "In the bank's SMS or app, after the transfer"],
  cash: ["Who did you give it to?", "And where"],
  cheque: ["Cheque number", "And the bank"],
  other: ["Number or note", "Anything that helps the Accountant find it"],
};

const FUNDS: Choice[] = (["zakat", "donation", "development", "other"] as const).map((k) => ({
  value: k,
  en: HEADS[k].en,
  hi: HEADS[k].hi,
}));

/** A promise the member can now pay, as the Give form offers it. */
export interface OpenPromise {
  id: number;
  label: string;
  giver_name: string | null;
  country: string | null;
  amount_paise: number;
}

/** Whose money it is: the member's own, one other person's, or a collection from several. */
type FromWho = "me" | "someone" | "many";

const FROM_WHO: Choice[] = [
  { value: "me", en: "Me", hi: "Mera apna" },
  { value: "someone", en: "Someone else", hi: "Kisi aur ka" },
  { value: "many", en: "Several people", hi: "Kai logon se jama" },
];

const HIDE: Record<FromWho, [string, string]> = {
  me: ["Keep my name hidden", "Otherwise every member sees your name and how much you gave, as it comes in. Naam chhupana ho to tick kijiye."],
  someone: ["Keep their name hidden", "Otherwise every member sees their name and how much they gave. It stays on the receipt."],
  many: ["Keep my name hidden", "Otherwise every member sees your name with what you collected. Naam chhupana ho to tick kijiye."],
};

/**
 * "I sent ₹1,000": after paying PSWS the usual way, a member says so; the PSWS
 * Accountant finds it and it counts. The gift is in the name of whoever's money
 * it is: someone abroad gives it to a member in India, who pays it in and
 * records it here for them.
 */
export function GiveForm({
  action,
  chooseFund,
  promises = [],
  reads = false,
}: {
  action: Action;
  chooseFund: boolean;
  /** open promises to this appeal: sending one turns it from promised into sent */
  promises?: OpenPromise[];
  /** the screenshot reader is switched on: the form fills itself from the picture */
  reads?: boolean;
}) {
  const [from, setFrom] = useState<FromWho>("me");
  const [promise, setPromise] = useState("");
  const [giverName, setGiverName] = useState("");
  const [read, setRead] = useState<ProofRead | null>(null);
  const [reading, setReading] = useState(false);
  // goes up each time the screenshot is read, so the boxes below take their new starting values
  const [fill, setFill] = useState(0);
  const seen = read?.ok ? read : null;
  const kept = promises.find((x) => String(x.id) === promise) ?? null;
  const pick = (v: string) => {
    setPromise(v);
    const pr = promises.find((x) => String(x.id) === v);
    if (pr) {
      setFrom(pr.giver_name ? "someone" : "me");
      setGiverName(pr.giver_name ?? "");
    }
  };
  const picked = async (file: File | null) => {
    setRead(null);
    if (!file || !reads) return;
    setReading(true);
    const fd = new FormData();
    fd.append("proof", file);
    let r: ProofRead;
    try {
      r = await readProof(fd);
    } catch {
      r = { ok: false, why: "unreadable" };
    }
    setReading(false);
    setRead(r);
    if (r.ok) {
      setFill((n) => n + 1);
      if (r.other_person && r.payer_name) {
        setFrom("someone");
        setGiverName(r.payer_name);
      }
    }
  };
  return (
    <ErpForm action={action}>
      <PictureInput
        name="proof"
        label="Screenshot of the payment"
        hint={reads ? "Add it first and the form fills itself. Only you and the Accountant see it" : "Optional · only you and the Accountant see it"}
        add="Add the screenshot"
        onPicked={picked}
        note={<ReadNote read={read} reading={reading} />}
      />
      {promises.length > 0 && (
        <Field label="Paying a commitment?" hint="Pick it, so it stops counting as committed" name="promise_id">
          <select name="promise_id" value={promise} onChange={(e) => pick(e.target.value)}>
            <option value="">No, a new gift</option>
            {promises.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Chips
        name="from_who"
        legend="Whose money is it?"
        hint="Kiska paisa hai"
        options={FROM_WHO}
        value={from}
        onChange={(v) => setFrom(v as FromWho)}
      />
      {from === "someone" && (
        <div className={styles.givers}>
          <p className={styles.note} style={{ marginTop: 0 }}>
            The receipt is made in their name, and it counts as their gift. You are the one who paid it in.
          </p>
          <div className={styles.grid}>
            <Field label="Their full name" hint="Jinka paisa hai" name="giver_name">
              <input
                name="giver_name"
                autoComplete="off"
                maxLength={80}
                value={giverName}
                onChange={(e) => setGiverName(e.target.value)}
              />
            </Field>
            <CountryField key={`c${promise}`} initial={kept?.country} label="Where do they live?" hint="Kis desh mein rehte hain" />
          </div>
        </div>
      )}
      {from === "many" && (
        <>
          <p className={styles.note} style={{ marginTop: 0 }}>
            Money you gathered from family or friends. It counts as your collection, not your own gift. Doosron se jama kiya.
          </p>
          <GiversFields />
        </>
      )}
      <AmountBox
        key={`a${promise}-${fill}`}
        label={from === "many" ? "How much did you send in all?" : "How much did you send?"}
        hint="Kitna bheja"
        defaultPaise={seen?.amount_paise ?? kept?.amount_paise}
        rupeesToo={false}
      />
      {chooseFund && (
        <ChoiceWithOther
          name="head"
          legend="For"
          hint="Kis cheez ke liye"
          options={FUNDS}
          defaultValue="zakat"
          otherLabel="What is it for?"
        />
      )}
      <HowBox
        key={`h${fill}`}
        legend="How did you send it?"
        hint="Kaise bheja"
        options={PAID_BY}
        defaultMethod={seen?.method ?? "upi"}
        refs={REFS}
        initial={{ reference: seen?.reference, bank_name: seen?.method === "bank" ? seen.payer_bank : null }}
      />
      <div className={styles.grid}>
        {from !== "someone" && (
          <CountryField
            key={`c${promise}`}
            initial={kept?.country}
            label={from === "many" ? "Where do they live?" : "Where do you live?"}
            hint={from === "many" ? "Most of them, kis desh mein" : "Kis desh mein rehte hain"}
          />
        )}
        <Field label="When?" hint="Kab bheja" name="sent_on">
          <DateInput key={`d${fill}`} name="sent_on" defaultValue={seen?.sent_on ?? todayIST()} max={todayIST()} />
        </Field>
      </div>
      <label className={styles.check}>
        <input type="checkbox" name="hide_name" />
        <span>
          <strong>{HIDE[from][0]}</strong>
          <span className={styles.hint} style={{ display: "block" }}>
            {HIDE[from][1]}
          </span>
        </span>
      </label>
      <div className={styles.actions}>
        <Submit>I have sent it</Submit>
      </div>
    </ErpForm>
  );
}

/** What the screenshot said, in one line, so the member checks it rather than types it. */
function ReadNote({ read, reading }: { read: ProofRead | null; reading: boolean }) {
  if (reading) return <span className={styles.hint}>Reading the screenshot…</span>;
  if (!read || (!read.ok && read.why === "off")) return null;
  if (!read.ok)
    return (
      <span className={styles.note}>
        {read.why === "not_a_payment"
          ? "This does not look like a payment screenshot. Type the details below."
          : read.why === "bad_file"
            ? "Choose a photo or a screenshot (JPG or PNG)."
            : "Could not read the screenshot. Type the details below."}
      </span>
    );
  const bits = [
    read.amount_paise ? inr(read.amount_paise) : null,
    read.sent_on ? showDate(read.sent_on) : null,
    read.reference ? `UPI ID ${read.reference}` : null,
    read.payer_name ? `from ${read.payer_name}${read.payer_bank ? ` (${read.payer_bank})` : ""}` : null,
    read.app ? `on ${read.app}` : null,
  ].filter(Boolean);
  return (
    <span className={styles.note} style={{ display: "block" }}>
      <b>Read from the screenshot:</b> {bits.length ? bits.join(" · ") : "nothing clear"}.
      {read.paid_to === "psws" && " Paid to PSWS ✓."}
      {read.abroad && " Paid from an NRO / NRE account: if the giver lives abroad, pick their country."}
      {" "}Check the form below and change anything that is wrong.
      {read.paid_to === "other" && (
        <span className={styles.err} style={{ display: "block" }}>
          This does not look like a payment to PSWS. Check the screenshot.
        </span>
      )}
      {read.status === "failed" && (
        <span className={styles.err} style={{ display: "block" }}>
          The screenshot shows a payment that failed.
        </span>
      )}
      {read.status === "pending" && (
        <span className={styles.err} style={{ display: "block" }}>
          The screenshot shows a payment still pending.
        </span>
      )}
    </span>
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
            <DateInput name="closes_on" defaultValue={in30Days()} min={todayIST()} />
          </Field>
        </div>
      )}
      {kind === "collection" && (
        <Chips
          name="head"
          legend="Which fund does the money go to?"
          hint="Kis khaate mein"
          options={(["zakat", "donation", "development"] as const).map((k) => ({ value: k, en: HEADS[k].en, hi: HEADS[k].hi }))}
          defaultValue="development"
        />
      )}
      {kind === "help" && (
        <p className={styles.note}>
          <b>Hospital bills:</b> Zakat helps patients admitted to hospital (IPD), paid straight to the hospital as per the
          bill and the Zakat Committee&apos;s slab. OPD, outside tests and medicines are not covered.
        </p>
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

const PROMISE_WHO: Choice[] = [
  { value: "me", en: "Mine", hi: "Mera" },
  { value: "someone", en: "Someone else's", hi: "Kisi aur ka" },
];

/**
 * "I will give ₹50,000": promised to an appeal, not sent yet, as the Ramadan
 * sheet's "Committed". It counts as promised until the money is sent.
 */
export function PromiseForm({ action }: { action: Action }) {
  const [who, setWho] = useState("me");
  return (
    <ErpForm action={action} resetOnDone>
      <Chips
        name="promise_who"
        legend="Whose commitment is it?"
        hint="Kisne waada kiya"
        options={PROMISE_WHO}
        value={who}
        onChange={setWho}
      />
      <div className={styles.grid}>
        {who === "someone" && (
          <Field label="Their full name" hint="Jinhone waada kiya" name="promise_name">
            <input name="promise_name" autoComplete="off" maxLength={80} />
          </Field>
        )}
        <CountryField
          label={who === "someone" ? "Where do they live?" : "Where do you live?"}
          hint="Kis desh mein rehte hain"
        />
        <AmountInput name="promise_amount" label="How much is committed?" hint="Kitne ka waada" />
        <Field label="A note" hint="Optional, e.g. after salary on the 5th" name="promise_note">
          <input name="promise_note" autoComplete="off" maxLength={200} />
        </Field>
      </div>
      <div className={styles.actions}>
        <Submit>Save the commitment</Submit>
      </div>
    </ErpForm>
  );
}
