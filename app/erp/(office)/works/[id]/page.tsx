import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import { getWork, paymentsFor } from "@/lib/erp/data";
import { WORK_STATUSES, canDo, inr, showDate } from "@/lib/erp/labels";
import { toId } from "@/lib/erp/form-state";
import { Empty, Facts, MoneyList, PageHead } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";

export const metadata = { title: "Village work" };

export default async function WorkPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string; saved?: string }>;
}) {
  const u = await requireUser();
  const id = toId((await params).id);
  const w = id ? await getWork(id) : null;
  if (!w) notFound();
  const sp = await searchParams;
  const payments = await paymentsFor({ workId: w.id });
  const editor = canDo(u.role, "editor");
  const left = w.budget_paise ? w.budget_paise - w.spent_paise : null;

  return (
    <>
      <PageHead title={w.name} sub={[w.place, WORK_STATUSES[w.status].en].filter(Boolean).join(" · ")} back={{ href: "/erp/works", label: "Village works" }}>
        {editor && (
          <>
            <Link href={`/erp/money/out/new?work=${w.id}`} className={styles.btn}>
              Record a payment
            </Link>
            <Link href={`/erp/works/${w.id}/edit`} className={styles.btnQuiet}>
              Change details
            </Link>
          </>
        )}
      </PageHead>
      {sp.new && <p className={styles.formDone}>Work saved. Record its payments here as they are made.</p>}
      {sp.saved && <p className={styles.formDone}>Change saved.</p>}

      <div className={styles.card}>
        <Facts
          items={[
            ["Spent", inr(w.spent_paise)],
            ["Budget", w.budget_paise && inr(w.budget_paise)],
            ["Left", left !== null && (left < 0 ? <span className={styles.out}>{inr(-left)} over the budget</span> : inr(left))],
            ["Started", w.started_on && showDate(w.started_on)],
            ["Finished", w.finished_on && showDate(w.finished_on)],
            ["Notes", w.notes && <span style={{ whiteSpace: "pre-line" }}>{w.notes}</span>],
          ]}
        />
        {w.budget_paise ? (
          <div className={`${styles.meter} ${w.spent_paise > w.budget_paise ? styles.meterOver : ""}`}>
            <span style={{ width: `${Math.min(w.spent_paise / w.budget_paise, 1) * 100}%` }} />
          </div>
        ) : null}
      </div>

      <h2 className={styles.h2}>
        Payments<small>Is kaam ka kharcha</small>
      </h2>
      {payments.length ? <MoneyList rows={payments} /> : <Empty>No payments recorded for this work yet.</Empty>}
    </>
  );
}
