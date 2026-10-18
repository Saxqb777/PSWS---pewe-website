import Link from "next/link";
import { requireUser } from "@/lib/erp/auth";
import { history } from "@/lib/erp/data";
import { showWhen } from "@/lib/erp/labels";
import { Empty, PageHead } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";

export const metadata = { title: "Who changed what" };

const KINDS: [string, string][] = [
  ["", "Everything"],
  ["money_in", "Receipts"],
  ["money_out", "Payments"],
  ["stipend", "Monthly help"],
  ["family", "Families"],
  ["request", "Requests"],
  ["work", "Works"],
  ["member", "Members"],
  ["meeting", "Meetings"],
  ["person", "Access"],
  ["approval", "Approvals"],
  ["transfer", "Cash and bank"],
];

const HREF: Record<string, (id: number) => string> = {
  money_in: (id) => `/erp/money/in/${id}`,
  money_out: (id) => `/erp/money/out/${id}`,
  family: (id) => `/erp/families/${id}`,
  work: (id) => `/erp/works/${id}`,
  member: (id) => `/erp/members/${id}`,
  meeting: (id) => `/erp/meetings/${id}`,
  approval: (id) => `/erp/approvals/${id}`,
  transfer: (id) => `/erp/money/transfer/${id}`,
};

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ of?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const of = KINDS.some(([k]) => k && k === sp.of) ? String(sp.of) : null;
  const lines = await history(400, of);
  return (
    <>
      <PageHead title="Who changed what" sub="Every entry, change and cancellation, newest first." />
      <form className={`${styles.filters} ${styles.filtersOne}`} method="get">
        <label className={styles.field}>
          <span className={styles.srOnly}>Show</span>
          <select name="of" defaultValue={of ?? ""}>
            {KINDS.map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={styles.btnQuiet}>
          Show
        </button>
      </form>
      {lines.length ? (
        <ul className={styles.list}>
          {lines.map((l) => {
            const href = l.entity_id && HREF[l.entity] ? HREF[l.entity](l.entity_id) : null;
            const body = (
              <span className={styles.rowMain}>
                <span className={styles.rowTitle} style={{ fontWeight: 500 }}>
                  {l.summary}
                </span>
                <span className={styles.rowMeta}>
                  {l.who ?? "Office"} {l.action} · {showWhen(l.at)}
                </span>
              </span>
            );
            return (
              <li key={l.id} className={styles.row}>
                {href ? (
                  <Link href={href} className={styles.rowLink}>
                    {body}
                  </Link>
                ) : (
                  <div className={styles.rowStatic}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty>Nothing yet. Everything anyone adds or changes shows up here.</Empty>
      )}
      <p className={styles.note} style={{ marginTop: 12 }}>
        <a className={styles.link} href="/erp/export/history">
          Download the full history for Excel
        </a>
      </p>
    </>
  );
}
