"use client";

import { useRef, useState } from "react";
import styles from "./erp.module.css";

/**
 * A date, always shown the British way: 24/10/2026, whatever the phone's own
 * setting. Type it, or tap the calendar. The form still sends 2026-10-24.
 */

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export const toUk = (iso: string) => (ISO.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");

/** "24/10/2026", "24-10-2026", "24.10.2026", "24102026" or "4/9/2026": the date, or null. */
export function fromUk(text: string): string | null {
  const t = text.trim();
  const m = t.match(/^(\d{1,2})[/.\-\s](\d{1,2})[/.\-\s](\d{4})$/) ?? t.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function DateInput({
  name,
  defaultValue = "",
  min,
  max,
  required,
}: {
  name: string;
  defaultValue?: string;
  min?: string;
  max?: string;
  required?: boolean;
}) {
  const [iso, setIso] = useState(ISO.test(defaultValue) ? defaultValue : "");
  const [text, setText] = useState(toUk(defaultValue));
  const picker = useRef<HTMLInputElement>(null);
  const inRange = (v: string) => (!min || v >= min) && (!max || v <= max);

  return (
    <span className={styles.dateBox}>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/yyyy"
        aria-label="Date, day/month/year"
        required={required}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const v = fromUk(e.target.value);
          if (v && inRange(v)) setIso(v);
          else if (!e.target.value.trim()) setIso("");
        }}
        onBlur={() => setText(toUk(iso))}
      />
      <button
        type="button"
        className={styles.dateBtn}
        aria-label="Pick from a calendar"
        onClick={() => {
          const el = picker.current;
          if (!el) return;
          try {
            el.showPicker();
          } catch {
            el.focus();
            el.click();
          }
        }}
      >
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
          <rect x="2.5" y="4" width="15" height="13.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M2.5 8.5h15M6.5 2v4M13.5 2v4" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>
      <input
        ref={picker}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        className={styles.datePick}
        value={iso}
        min={min}
        max={max}
        onChange={(e) => {
          setIso(e.target.value);
          setText(toUk(e.target.value));
        }}
      />
      <input type="hidden" name={name} value={iso} />
    </span>
  );
}
