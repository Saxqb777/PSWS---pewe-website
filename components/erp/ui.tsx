import Link from "next/link";
import { HEADS, METHOD_SHORT, PURPOSES, inr, shortNo, showDate, showDay, labelOf } from "@/lib/erp/labels";
import type { MoneyRow } from "@/lib/erp/data";
import type { Approval, Correction } from "@/lib/erp/books";
import styles from "./erp.module.css";

/** The top of every office page: where you are, and what you can do here. */
export function PageHead({
  title,
  sub,
  back,
  children,
}: {
  title: string;
  sub?: string;
  back?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <header className={styles.head}>
      <div>
        {back && (
          <Link href={back.href} className={`${styles.back} ${styles.noPrint}`}>
            ← {back.label}
          </Link>
        )}
        <h1 className={styles.title}>{title}</h1>
        {sub && <p className={styles.sub}>{sub}</p>}
      </div>
      {children && <div className={`${styles.actions} ${styles.noPrint}`}>{children}</div>}
    </header>
  );
}

/** A section heading, with a link on the right when there is somewhere to go. */
export function Section({ title, link }: { title: string; link?: { href: string; label: string } }) {
  return (
    <h2 className={styles.h2}>
      {title}
      {link && (
        <Link href={link.href} className={styles.link}>
          {link.label}
        </Link>
      )}
    </h2>
  );
}

/** Money in green with a plus, money out in laterite with a minus. In a list the ₹ goes without saying. */
export function Amount({ paise, dir, bare = false }: { paise: number; dir?: "in" | "out"; bare?: boolean }) {
  const text = bare ? inr(paise).replace("₹", "") : inr(paise);
  if (!dir) return <>{text}</>;
  return <span className={dir === "in" ? styles.in : styles.out}>{(dir === "in" ? "+" : "−") + text}</span>;
}

/** An empty list says what to do next. */
export function Empty({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className={styles.empty}>
      <p>{children}</p>
      {action && <div className={styles.actions}>{action}</div>}
    </div>
  );
}

function MoneyLine({ r, withDate }: { r: MoneyRow; withDate: boolean }) {
  const what =
    r.dir === "transfer"
      ? r.who.includes("deposited")
        ? "Cash → Bank"
        : "Bank → Cash"
      : r.dir === "in"
        ? labelOf(HEADS, r.head, r.head_other)
        : (r.work_name ?? labelOf(PURPOSES, r.purpose, r.purpose_other));
  return (
    <li className={`${styles.row} ${r.cancelled ? styles.cancelled : ""}`}>
      <Link href={`/erp/money/${r.dir}/${r.id}`} className={styles.rowLink}>
        <span className={styles.rowMain}>
          <span className={styles.rowTitle}>{r.who}</span>
          <span className={styles.rowMeta}>
            {withDate && `${showDate(r.on_date)} · `}
            {what}
            {r.dir !== "transfer" && ` · ${METHOD_SHORT[r.method]}`} · {shortNo(r.no)}
            {r.cancelled && <span className={`${styles.tag} ${styles.tagOut}`}>deleted</span>}
          </span>
        </span>
        <span className={styles.rowAmt}>
          {r.dir === "transfer" ? (
            <span className={styles.muted}>{inr(r.amount_paise).replace("₹", "")}</span>
          ) : (
            <Amount paise={r.amount_paise} dir={r.dir} bare />
          )}
        </span>
      </Link>
    </li>
  );
}

/** What an approved change or deletion did, on the day it was approved. Not counted again in the day's total. */
function CorrectionLine({ c }: { c: Correction }) {
  const diff = c.after_paise - c.before_paise;
  const sign = c.dir === "out" ? -1 : 1;
  return (
    <li className={styles.row}>
      <Link href={`/erp/money/${c.dir}/${c.entity_id}`} className={styles.rowLink}>
        <span className={styles.rowMain}>
          <span className={styles.rowTitle}>
            Correction to {shortNo(c.no)}
            <span className={styles.tag}>approved</span>
          </span>
          <span className={styles.rowMeta} style={{ whiteSpace: "pre-line" }}>
            {c.what}
          </span>
        </span>
        <span className={`${styles.rowAmt} ${styles.muted}`}>
          {diff ? `${diff * sign > 0 ? "+" : "−"}${inr(Math.abs(diff)).replace("₹", "")}` : ""}
        </span>
      </Link>
    </li>
  );
}

/**
 * Receipts and payments, newest first, ruled off by day as in the cash
 * book, each day with what came in and went out. Deleted entries stay,
 * crossed out, and do not count; a correction line marks the day each
 * approved change or deletion was made. Moves between cash and the bank
 * are listed but are neither income nor spending.
 */
export function MoneyList({
  rows,
  byDay = true,
  corrections = [],
}: {
  rows: MoneyRow[];
  byDay?: boolean;
  corrections?: Correction[];
}) {
  if (!byDay) {
    return (
      <ul className={styles.list}>
        {rows.map((r) => (
          <MoneyLine key={`${r.dir}${r.id}`} r={r} withDate />
        ))}
      </ul>
    );
  }
  const dates = [...new Set([...rows.map((r) => r.on_date), ...corrections.map((c) => c.on_date)])].sort().reverse();
  return (
    <div>
      {dates.map((date) => {
        const dayRows = rows.filter((r) => r.on_date === date);
        const dayCorrections = corrections.filter((c) => c.on_date === date);
        const live = dayRows.filter((r) => !r.cancelled);
        const tin = live.filter((r) => r.dir === "in").reduce((s, r) => s + r.amount_paise, 0);
        const tout = live.filter((r) => r.dir === "out").reduce((s, r) => s + r.amount_paise, 0);
        return (
          <section key={date}>
            <h3 className={styles.day}>
              <span>{showDay(date)}</span>
              <span className={styles.dayTotal}>
                {[tin ? `+${inr(tin).replace("₹", "")}` : "", tout ? `−${inr(tout).replace("₹", "")}` : ""]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </h3>
            <ul className={styles.list}>
              {dayRows.map((r) => (
                <MoneyLine key={`${r.dir}${r.id}`} r={r} withDate={false} />
              ))}
              {dayCorrections.map((c) => (
                <CorrectionLine key={`c${c.id}`} c={c} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** A record's details, as label and value. Empty values are left out. */
export function Facts({ items }: { items: [string, React.ReactNode][] }) {
  const shown = items.filter(([, v]) => v !== null && v !== undefined && v !== "" && v !== false);
  return (
    <dl className={styles.facts}>
      {shown.map(([k, v]) => (
        <div key={k} style={{ display: "contents" }}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A request about this thing is waiting for the approvers. */
export function Pending({ a }: { a: Approval }) {
  const days = Math.max(1, Math.ceil((new Date(a.expires_at).getTime() - Date.now()) / 864e5));
  return (
    <div className={`${styles.banner} ${styles.bannerWarn}`}>
      <p style={{ margin: 0 }}>
        <strong>
          Waiting for approval to {a.action}: {a.yes} of {a.needed} approved
        </strong>
        {a.no ? `, ${a.no} said no` : ""}. {days === 1 ? "1 day" : `${days} days`} left.
      </p>
      {a.change_lines && (
        <p style={{ margin: "6px 0 0", whiteSpace: "pre-line" }} className={styles.note}>
          {a.change_lines}
        </p>
      )}
      <p style={{ margin: "6px 0 0" }} className={styles.note}>
        Asked by {a.asked_by_name}: {a.reason}{" "}
        <Link href={`/erp/approvals/${a.id}`} className={styles.link}>
          See who has approved
        </Link>
      </p>
    </div>
  );
}
