"use client";

import { useState } from "react";
import { rupees } from "@/lib/format";
import { STATEMENT } from "@/lib/record";
import styles from "./pewe.module.css";

const share = (n: number) => {
  const p = (n / STATEMENT.paidOut) * 100;
  return p < 1 ? "<1%" : `${Math.round(p)}%`;
};

const TONES = ["#a4472b", "#18201d", "#6d7a73", "#c98a5a", "#9aa59f", "#cfd6d2"];

/**
 * The latest two months straight from the bank statement: one bar split by
 * head. Point at a part of the bar (or a row) to read what it was.
 */
export function Statement() {
  const [on, setOn] = useState<string | null>(null);
  const heads = STATEMENT.heads;
  return (
    <div className={styles.statement}>
      <div className={styles.statementHead}>
        <p className={styles.chartYear}>
          From the bank statement · {STATEMENT.from} – {STATEMENT.to}
        </p>
        <p className={styles.chartValue}>{rupees(STATEMENT.paidOut)}</p>
        <p className={styles.chartNote}>paid out in two months, every rupee by bank transfer or cheque</p>
      </div>
      <div className={styles.statementBar} role="presentation" onMouseLeave={() => setOn(null)}>
        {heads.map((h, i) => (
          <span
            key={h.key}
            className={`${styles.statementPart} ${on && on !== h.key ? styles.statementDim : ""}`}
            style={{ flexGrow: h.amount, background: TONES[i] }}
            onMouseEnter={() => setOn(h.key)}
            title={`${h.label}: ${rupees(h.amount)}`}
          />
        ))}
      </div>
      <ul className={styles.statementRows}>
        {heads.map((h, i) => (
          <li key={h.key}>
            <button
              type="button"
              className={`${styles.statementRow} ${on === h.key ? styles.statementRowOn : ""}`}
              onMouseEnter={() => setOn(h.key)}
              onMouseLeave={() => setOn(null)}
              onFocus={() => setOn(h.key)}
              onBlur={() => setOn(null)}
              onClick={() => setOn(h.key)}
              aria-expanded={on === h.key}
            >
              <span className={styles.statementSwatch} style={{ background: TONES[i] }} aria-hidden="true" />
              <span className={styles.statementLabel}>{h.label}</span>
              <span className={styles.statementAmount}>{rupees(h.amount)}</span>
              <span className={styles.statementShare}>{share(h.amount)}</span>
            </button>
            {on === h.key && <p className={styles.statementNote}>{h.note}</p>}
          </li>
        ))}
      </ul>
      <p className={styles.statementSmall}>
        Totals only. The names of the families helped are never published. Two cheques that came back unpaid are not
        counted.
      </p>
    </div>
  );
}
