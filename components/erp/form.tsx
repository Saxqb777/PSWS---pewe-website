"use client";

import { Fragment, createContext, startTransition, useActionState, useContext, useState } from "react";
import { inr, rupeesInWords, toPaise } from "@/lib/erp/labels";
import { waLink, type FormState } from "@/lib/erp/form-state";
import styles from "./erp.module.css";

/**
 * The pieces every office form is made of. A form sends itself to a server
 * action and keeps what was typed when something needs fixing, so nobody
 * has to fill a long form twice.
 */

type Action = (state: FormState, data: FormData) => Promise<FormState>;

const FormCtx = createContext<{ pending: boolean; errors: Record<string, string> }>({ pending: false, errors: {} });

export function ErpForm({
  action,
  children,
  confirm,
  className,
  resetOnDone = false,
}: {
  action: Action;
  children: React.ReactNode;
  /** asked before sending, for things that cannot be undone */
  confirm?: string;
  className?: string;
  /** empty the boxes after it worked, for forms that stay on the page */
  resetOnDone?: boolean;
}) {
  const [state, dispatch, pending] = useActionState(action, null);
  const [seen, setSeen] = useState<FormState>(null);
  const [round, setRound] = useState(0);
  if (state !== seen) {
    setSeen(state);
    if (state?.done && resetOnDone) setRound((r) => r + 1);
  }
  return (
    <form
      className={className ?? styles.form}
      noValidate
      onSubmit={(e) => {
        // sent by hand, so the boxes keep what was typed if the server sends it back
        e.preventDefault();
        if (pending) return;
        if (confirm && !window.confirm(confirm)) return;
        const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => dispatch(data));
      }}
    >
      {state?.error && (
        <p role="alert" className={styles.formError}>
          {state.error}
        </p>
      )}
      {state?.errors && Object.keys(state.errors).length > 0 && !state.error && (
        <p role="alert" className={styles.formError}>
          Please check the boxes marked in red. (Laal wale box dekhiye.)
        </p>
      )}
      {state?.done && (
        <p role="status" className={styles.formDone}>
          {state.done}
        </p>
      )}
      {state?.share && <SharePanel share={state.share} />}
      <FormCtx.Provider value={{ pending, errors: state?.errors ?? {} }}>
        <Fragment key={round}>{children}</Fragment>
      </FormCtx.Provider>
    </form>
  );
}

function SharePanel({ share }: { share: NonNullable<NonNullable<FormState>["share"]> }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={styles.share}>
      <p className={styles.shareUrl}>{share.url}</p>
      <div className={styles.actions}>
        <a className={styles.btn} href={waLink(share.phone, share.text)} target="_blank" rel="noopener noreferrer">
          Send on WhatsApp
        </a>
        <button
          type="button"
          className={styles.btnQuiet}
          onClick={() => {
            navigator.clipboard?.writeText(share.url).then(
              () => setCopied(true),
              () => setCopied(false),
            );
          }}
        >
          {copied ? "Copied" : "Copy the link"}
        </button>
      </div>
    </div>
  );
}

function useError(name: string) {
  return useContext(FormCtx).errors[name];
}

/** A labelled box. The hint is the same thing said the way the office says it. */
export function Field({
  label,
  hint,
  name,
  children,
  wide = false,
}: {
  label: string;
  hint?: string;
  name: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const err = useError(name);
  return (
    <label className={`${styles.field} ${wide ? styles.wide : ""} ${err ? styles.hasError : ""}`}>
      <span className={styles.label}>
        {label}
        {hint && <span className={styles.hint}>{hint}</span>}
      </span>
      {children}
      {err && <span className={styles.err}>{err}</span>}
    </label>
  );
}

/** Rupees, with the amount read back in lakh and in words as it is typed. */
export function AmountInput({
  name,
  label = "Amount",
  hint = "Kitna paisa",
  defaultPaise,
  onChange,
}: {
  name: string;
  label?: string;
  hint?: string;
  defaultPaise?: number | null;
  onChange?: (paise: number | null) => void;
}) {
  const [raw, setRaw] = useState(defaultPaise ? String(defaultPaise / 100) : "");
  const paise = toPaise(raw);
  const err = useError(name);
  return (
    <label className={`${styles.field} ${err ? styles.hasError : ""}`}>
      <span className={styles.label}>
        {label}
        <span className={styles.hint}>{hint}</span>
      </span>
      <span className={styles.amount}>
        <span aria-hidden="true">₹</span>
        <input
          name={name}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            onChange?.(toPaise(e.target.value));
          }}
        />
      </span>
      <span className={styles.amountSay} aria-live="polite">
        {paise ? `${inr(paise)} · ${rupeesInWords(paise)} rupees` : raw ? "Numbers only, e.g. 5000" : " "}
      </span>
      {err && <span className={styles.err}>{err}</span>}
    </label>
  );
}

export interface Choice {
  value: string;
  en: string;
  hi?: string;
}

/** One choice from a few, as big buttons. */
export function Chips({
  name,
  legend,
  hint,
  options,
  defaultValue,
  value,
  onChange,
}: {
  name: string;
  legend: string;
  hint?: string;
  options: Choice[];
  defaultValue?: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  const err = useError(name);
  return (
    <fieldset className={`${styles.chips} ${err ? styles.hasError : ""}`}>
      <legend className={styles.label}>
        {legend}
        {hint && <span className={styles.hint}>{hint}</span>}
      </legend>
      <div className={styles.chipRow}>
        {options.map((o) => (
          <label key={o.value} className={styles.chip}>
            <input
              type="radio"
              name={name}
              value={o.value}
              {...(value !== undefined
                ? { checked: value === o.value, onChange: () => onChange?.(o.value) }
                : { defaultChecked: defaultValue === o.value, onChange: () => onChange?.(o.value) })}
            />
            <span>
              {o.en}
              {o.hi && o.hi !== o.en && <small>{o.hi}</small>}
            </span>
          </label>
        ))}
      </div>
      {err && <span className={styles.err}>{err}</span>}
    </fieldset>
  );
}

/** The button that sends the form; it says so while it works. */
export function Submit({
  children,
  name,
  value,
  quiet = false,
  danger = false,
}: {
  children: React.ReactNode;
  name?: string;
  value?: string;
  quiet?: boolean;
  danger?: boolean;
}) {
  const { pending } = useContext(FormCtx);
  const cls = danger ? styles.btnDanger : quiet ? styles.btnQuiet : styles.btn;
  return (
    <button type="submit" className={cls} name={name} value={value} disabled={pending} aria-busy={pending}>
      {pending ? "Saving…" : children}
    </button>
  );
}

/** The same choice, with a box to type what it is when "Other" is picked. */
export function ChoiceWithOther({
  name,
  legend,
  hint,
  options,
  defaultValue,
  value,
  onChange,
  otherLabel,
  otherDefault,
}: {
  name: string;
  legend: string;
  hint?: string;
  options: Choice[];
  defaultValue?: string;
  value?: string;
  onChange?: (v: string) => void;
  otherLabel: string;
  otherDefault?: string | null;
}) {
  const [own, setOwn] = useState(defaultValue ?? "");
  const current = value ?? own;
  return (
    <>
      <Chips
        name={name}
        legend={legend}
        hint={hint}
        options={options}
        value={current}
        onChange={(v) => {
          setOwn(v);
          onChange?.(v);
        }}
      />
      {current === "other" && (
        <Field label={otherLabel} name={`${name}_other`}>
          <input name={`${name}_other`} autoComplete="off" defaultValue={otherDefault ?? ""} autoFocus={!otherDefault} />
        </Field>
      )}
    </>
  );
}
