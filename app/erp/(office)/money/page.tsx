import Link from "next/link";
import { requireUser } from "@/lib/erp/auth";
import { knownYears, listMoney } from "@/lib/erp/data";
import { canDo, clean, fyMonths, fyOf, inr, showMonth, todayIST } from "@/lib/erp/labels";
import { Empty, MoneyList, PageHead, Stat } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";

export const metadata = { title: "Money" };

type Search = { fy?: string; month?: string; dir?: string; q?: string };

export default async function MoneyPage({ searchParams }: { searchParams: Promise<Search> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const current = fyOf(todayIST());
  const years = await knownYears(current);
  const fy = years.includes(String(sp.fy)) ? String(sp.fy) : current;
  const months = fyMonths(fy);
  const month = months.includes(String(sp.month)) ? String(sp.month) : null;
  const dir = sp.dir === "in" || sp.dir === "out" ? sp.dir : "all";
  const q = clean(sp.q, 80);
  const rows = await listMoney({ fy, month, dir, q });
  const live = rows.filter((r) => !r.cancelled);
  const totalIn = live.filter((r) => r.dir === "in").reduce((s, r) => s + r.amount_paise, 0);
  const totalOut = live.filter((r) => r.dir === "out").reduce((s, r) => s + r.amount_paise, 0);
  const qs = (d: string) => {
    const p = new URLSearchParams({ fy, dir: d });
    if (month) p.set("month", month);
    if (q) p.set("q", q);
    return `/erp/money?${p}`;
  };
  const exportQs = new URLSearchParams({ fy, ...(month ? { month } : {}) });

  return (
    <>
      <PageHead title="Money" sub="Paisa aaya, paisa gaya. Every receipt and payment.">
        {canDo(u.role, "editor") && (
          <>
            <Link href="/erp/money/in/new" className={styles.btn}>
              + Money received
            </Link>
            <Link href="/erp/money/out/new" className={styles.btnQuiet}>
              − Money paid
            </Link>
          </>
        )}
      </PageHead>

      <form className={styles.filters} method="get">
        <input type="hidden" name="dir" value={dir} />
        <label className={styles.field}>
          <span className={styles.label}>Year</span>
          <select name="fy" defaultValue={fy}>
            {years.map((y) => (
              <option key={y} value={y}>
                April {y.slice(0, 4)} to March 20{y.slice(5)}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Month</span>
          <select name="month" defaultValue={month ?? ""}>
            <option value="">The whole year</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {showMonth(m)}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Search</span>
          <input name="q" type="search" placeholder="Name, receipt no., reference" defaultValue={q ?? ""} />
        </label>
        <button type="submit" className={styles.btnQuiet}>
          Show
        </button>
      </form>

      <nav className={styles.tabs} aria-label="Show">
        {(
          [
            ["all", "Everything"],
            ["in", "Received"],
            ["out", "Paid"],
          ] as const
        ).map(([d, label]) => (
          <Link key={d} href={qs(d)} aria-current={dir === d ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </nav>

      <div className={styles.stats} style={{ marginBottom: 18 }}>
        <Stat label="Received">
          <span className={styles.in}>{inr(totalIn)}</span>
        </Stat>
        <Stat label="Paid">
          <span className={styles.out}>{inr(totalOut)}</span>
        </Stat>
      </div>

      {rows.length ? (
        <>
          <MoneyList rows={rows} />
          {rows.length >= 500 && (
            <p className={styles.note}>Showing the latest 500. Pick a month or search to see the rest.</p>
          )}
        </>
      ) : (
        <Empty
          action={
            canDo(u.role, "editor") && !q ? (
              <Link href="/erp/money/in/new" className={styles.btn}>
                Add the first receipt
              </Link>
            ) : null
          }
        >
          {q ? `Nothing matches “${q}”.` : "Nothing here yet for this time."}
        </Empty>
      )}

      <p className={styles.note} style={{ marginTop: 16 }}>
        Download for Excel:{" "}
        <a className={styles.link} href={`/erp/export/money-in?${exportQs}`}>
          money received
        </a>{" "}
        ·{" "}
        <a className={styles.link} href={`/erp/export/money-out?${exportQs}`}>
          money paid
        </a>
      </p>
    </>
  );
}
