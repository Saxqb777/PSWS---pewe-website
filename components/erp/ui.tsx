import Link from "next/link";
import { METHODS, PURPOSES, HEADS, inr, showDate } from "@/lib/erp/labels";
import type { MoneyRow } from "@/lib/erp/data";
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

/** Money in green with a plus, money out in laterite with a minus. */
export function Amount({ paise, dir }: { paise: number; dir?: "in" | "out" }) {
  if (!dir) return <>{inr(paise)}</>;
  return <span className={dir === "in" ? styles.in : styles.out}>{(dir === "in" ? "+" : "−") + inr(paise)}</span>;
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

export function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{children}</span>
    </div>
  );
}

/** Receipts and payments in one list, newest first. */
export function MoneyList({ rows }: { rows: MoneyRow[] }) {
  return (
    <ul className={styles.list}>
      {rows.map((r) => (
        <li key={`${r.dir}${r.id}`} className={`${styles.row} ${r.cancelled ? styles.cancelled : ""}`}>
          <Link href={`/erp/money/${r.dir}/${r.id}`} className={styles.rowLink}>
            <span className={styles.rowMain}>
              <span className={styles.rowTitle}>
                {r.who}
                {r.cancelled && <span className={`${styles.tag} ${styles.tagOut}`}>Cancelled</span>}
              </span>
              <span className={styles.rowMeta}>
                {showDate(r.on_date)} · {r.dir === "in" ? HEADS[r.head].en : PURPOSES[r.purpose ?? "other"].en} ·{" "}
                {METHODS[r.method].en.split(" (")[0]} · {r.no}
              </span>
            </span>
            <span className={styles.rowAmt}>
              <Amount paise={r.amount_paise} dir={r.dir} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
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
