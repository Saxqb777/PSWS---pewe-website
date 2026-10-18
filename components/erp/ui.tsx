import Link from "next/link";
import { HEADS, METHOD_SHORT, PURPOSES, inr, shortNo, showDate, showDay } from "@/lib/erp/labels";
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
  const what = r.dir === "in" ? HEADS[r.head].en : (r.work_name ?? PURPOSES[r.purpose ?? "other"].en);
  return (
    <li className={`${styles.row} ${r.cancelled ? styles.cancelled : ""}`}>
      <Link href={`/erp/money/${r.dir}/${r.id}`} className={styles.rowLink}>
        <span className={styles.rowMain}>
          <span className={styles.rowTitle}>{r.who}</span>
          <span className={styles.rowMeta}>
            {withDate && `${showDate(r.on_date)} · `}
            {what} · {METHOD_SHORT[r.method]} · {shortNo(r.no)}
            {r.cancelled && <span className={`${styles.tag} ${styles.tagOut}`}>cancelled</span>}
          </span>
        </span>
        <span className={styles.rowAmt}>
          <Amount paise={r.amount_paise} dir={r.dir} bare />
        </span>
      </Link>
    </li>
  );
}

/**
 * Receipts and payments, newest first, ruled off by day as in the cash
 * book, each day with what came in and went out. Cancelled entries stay,
 * crossed out, and do not count.
 */
export function MoneyList({ rows, byDay = true }: { rows: MoneyRow[]; byDay?: boolean }) {
  if (!byDay) {
    return (
      <ul className={styles.list}>
        {rows.map((r) => (
          <MoneyLine key={`${r.dir}${r.id}`} r={r} withDate />
        ))}
      </ul>
    );
  }
  const days: { date: string; rows: MoneyRow[] }[] = [];
  for (const r of rows) {
    const last = days[days.length - 1];
    if (last && last.date === r.on_date) last.rows.push(r);
    else days.push({ date: r.on_date, rows: [r] });
  }
  return (
    <div>
      {days.map((d) => {
        const live = d.rows.filter((r) => !r.cancelled);
        const tin = live.filter((r) => r.dir === "in").reduce((s, r) => s + r.amount_paise, 0);
        const tout = live.filter((r) => r.dir === "out").reduce((s, r) => s + r.amount_paise, 0);
        return (
          <section key={d.date}>
            <h3 className={styles.day}>
              <span>{showDay(d.date)}</span>
              <span className={styles.dayTotal}>
                {[tin ? `+${inr(tin).replace("₹", "")}` : "", tout ? `−${inr(tout).replace("₹", "")}` : ""]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </h3>
            <ul className={styles.list}>
              {d.rows.map((r) => (
                <MoneyLine key={`${r.dir}${r.id}`} r={r} withDate={false} />
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
