"use client";

import Link from "next/link";
import { useState } from "react";
import { HEADS, METHODS, inr, showMonth, todayIST } from "@/lib/erp/labels";
import type { FormState } from "@/lib/erp/form-state";
import type { StipendLine } from "@/lib/erp/data";
import { ChoiceWithOther, Chips, ErpForm, Field, Submit } from "./form";
import styles from "./erp.module.css";

/**
 * The month's stipends in one go: everyone on the stipend is ticked with
 * their usual amount, anyone already paid this month is shown as paid and
 * cannot be paid twice.
 */
export function StipendRun({
  action,
  month,
  lines,
  funds = null,
}: {
  action: (s: FormState, d: FormData) => Promise<FormState>;
  month: string;
  lines: StipendLine[];
  /** what is left in each fund, once starting balances are set */
  funds?: { head: string; left: number }[] | null;
}) {
  const todo = lines.filter((l) => !l.paid_voucher);
  const [ticked, setTicked] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(todo.map((l) => [l.family_id, true])),
  );
  const [amounts, setAmounts] = useState<Record<number, string>>(() =>
    Object.fromEntries(todo.map((l) => [l.family_id, String(l.stipend_paise / 100)])),
  );
  const chosen = todo.filter((l) => ticked[l.family_id]);
  const [head, setHead] = useState("zakat");
  const total = chosen.reduce((s, l) => s + Math.round(Number(String(amounts[l.family_id] ?? "").replace(/[,\s₹]/g, "")) * 100 || 0), 0);

  return (
    <ErpForm
      action={action}
      confirm={`Pay ${chosen.length} ${chosen.length === 1 ? "family" : "families"} ${inr(total)} for ${showMonth(month)}?`}
    >
      <ul className={styles.list}>
        {lines.map((l) =>
          l.paid_voucher ? (
            <li key={l.family_id} className={styles.row}>
              <div className={styles.rowStatic}>
                <span className={styles.rowMain}>
                  <span className={styles.rowTitle}>
                    {l.name}
                    <span className={`${styles.tag} ${styles.tagIn}`}>Paid</span>
                  </span>
                  <span className={styles.rowMeta}>
                    {[l.place, l.paid_voucher].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className={styles.rowAmt}>{inr(l.paid_paise)}</span>
              </div>
            </li>
          ) : (
            <li key={l.family_id} className={styles.row}>
              <div className={styles.rowStatic}>
                <label className={styles.check} style={{ flex: 1, minWidth: 0 }}>
                  <input
                    type="checkbox"
                    name="pay"
                    value={l.family_id}
                    checked={!!ticked[l.family_id]}
                    onChange={(e) => setTicked((t) => ({ ...t, [l.family_id]: e.target.checked }))}
                  />
                  <span className={styles.rowMain}>
                    <span className={styles.rowTitle}>{l.name}</span>
                    <span className={styles.rowMeta}>
                      {l.place ?? ""}{" "}
                      <Link className={styles.link} href={`/erp/families/${l.family_id}`}>
                        open
                      </Link>
                    </span>
                  </span>
                </label>
                <span className={styles.amount} style={{ width: 130, flex: "none" }}>
                  <span aria-hidden="true" style={{ fontSize: 17 }}>
                    ₹
                  </span>
                  <input
                    aria-label={`Amount for ${l.name}`}
                    name={`amount_${l.family_id}`}
                    inputMode="decimal"
                    value={amounts[l.family_id] ?? ""}
                    onChange={(e) => setAmounts((a) => ({ ...a, [l.family_id]: e.target.value }))}
                    style={{ minHeight: 44, fontSize: 17, border: 0, width: "100%", background: "transparent", fontFamily: "var(--mono)" }}
                  />
                </span>
              </div>
            </li>
          ),
        )}
      </ul>

      {todo.length > 0 && (
        <>
          <div className={styles.grid}>
            <Field label="Date sent" hint="Kab bheja" name="on_date">
              <input name="on_date" type="date" defaultValue={todayIST()} />
            </Field>
            <Field label="Bank number" hint="Optional" name="reference">
              <input name="reference" autoComplete="off" />
            </Field>
          </div>
          <ChoiceWithOther
            name="head"
            legend="From which money?"
            hint="Kis paise se"
            options={Object.entries(HEADS).map(([value, l]) => ({ value, en: l.en, hi: l.hi }))}
            value={head}
            onChange={setHead}
            otherLabel="Which money?"
          />
          <FundNote funds={funds} head={head} total={total} />
          <Chips
            name="method"
            legend="How was it paid?"
            hint="Kaise diya"
            options={Object.entries(METHODS).map(([value, l]) => ({ value, en: l.en, hi: l.hi }))}
            defaultValue="bank"
          />
          <div className={styles.actions}>
            <Submit>
              Pay {chosen.length} {chosen.length === 1 ? "family" : "families"} · {inr(total)}
            </Submit>
          </div>
        </>
      )}
    </ErpForm>
  );
}

function FundNote({ funds, head, total }: { funds: { head: string; left: number }[] | null; head: string; total: number }) {
  const fund = funds?.find((f) => f.head === head);
  if (!fund) return null;
  const over = total > fund.left;
  return (
    <>
      <p className={styles.note} style={over ? { color: "var(--out)", fontWeight: 500 } : undefined}>
        {HEADS[head as keyof typeof HEADS]?.en} fund: {inr(Math.max(fund.left, 0))} left
        {over ? `. These payments are ${inr(total - Math.max(fund.left, 0))} more than the fund has.` : "."}
      </p>
      {over && (
        <label className={styles.check}>
          <input type="checkbox" name="over" />
          <span>
            <strong>Pay anyway</strong>
            <span className={styles.checkHint}>Only if this is right.</span>
          </span>
        </label>
      )}
    </>
  );
}
