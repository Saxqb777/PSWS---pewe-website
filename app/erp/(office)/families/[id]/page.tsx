import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import { getFamily, listRequests, paymentsFor } from "@/lib/erp/data";
import { KINDS, STATUSES, canDo, inr, showDate, showPhone } from "@/lib/erp/labels";
import { toId } from "@/lib/erp/form-state";
import { DecideForm, RequestForm } from "@/components/erp/forms";
import { Empty, Facts, MoneyList, PageHead } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";
import { addFamilyRequest, decideFamilyRequest } from "../actions";

export const metadata = { title: "Family" };

export default async function FamilyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string; saved?: string }>;
}) {
  const u = await requireUser();
  const id = toId((await params).id);
  const f = id ? await getFamily(id) : null;
  if (!f) notFound();
  const sp = await searchParams;
  const [requests, payments] = await Promise.all([listRequests({ familyId: f.id }), paymentsFor({ familyId: f.id })]);
  const editor = canDo(u.role, "editor");
  const total = payments.filter((p) => !p.cancelled).reduce((s, p) => s + p.amount_paise, 0);

  return (
    <>
      <PageHead title={f.name} sub={[f.place, f.active ? null : "No longer helped"].filter(Boolean).join(" · ") || "Family"} back={{ href: "/erp/families", label: "Families" }}>
        {editor && f.active && (
          <Link href={`/erp/money/out/new?family=${f.id}`} className={styles.btn}>
            Record help given
          </Link>
        )}
        {editor && (
          <Link href={`/erp/families/${f.id}/edit`} className={styles.btnQuiet}>
            Change details
          </Link>
        )}
      </PageHead>

      {sp.new && <p className={styles.formDone}>Family saved. Add what they asked for below, or record help already given.</p>}
      {sp.saved && <p className={styles.formDone}>Change saved.</p>}

      <div className={styles.card}>
        <Facts
          items={[
            ["Mobile", f.phone && <a className={styles.link} href={`tel:+${f.phone}`}>{showPhone(f.phone)}</a>],
            ["People in the house", f.people],
            ["Monthly help", f.stipend_active ? `${inr(f.stipend_paise)} a month` : "None"],
            ["Given so far", inr(total)],
            ["Notes", f.notes && <span style={{ whiteSpace: "pre-line" }}>{f.notes}</span>],
          ]}
        />
      </div>

      <h2 className={styles.h2}>
        Requests
      </h2>
      {requests.length ? (
        <ul className={styles.list}>
          {requests.map((r) => (
            <li key={r.id} className={styles.row}>
              <div className={styles.rowStatic}>
                <span className={styles.rowMain}>
                  <span className={styles.rowTitle}>
                    {KINDS[r.kind].en}
                    <span className={`${styles.tag} ${r.status === "waiting" ? styles.tagWarn : r.status === "declined" ? styles.tagOut : styles.tagIn}`}>
                      {STATUSES[r.status].en}
                    </span>
                  </span>
                  <span className={styles.rowMeta}>
                    Asked {showDate(r.asked_on)}
                    {r.asked_paise ? ` for ${inr(r.asked_paise)}` : ""}
                    {r.decided_on ? ` · decided ${showDate(r.decided_on)}` : ""}
                    {r.approved_paise ? ` · approved ${inr(r.approved_paise)}${r.kind === "stipend" ? " a month" : ""}` : ""}
                    {r.paid_paise ? ` · paid ${inr(r.paid_paise)}` : ""}
                  </span>
                  {r.details && <span className={styles.rowMeta} style={{ whiteSpace: "pre-line" }}>{r.details}</span>}
                  {r.decision_note && <span className={styles.rowMeta}>Note: {r.decision_note}</span>}
                </span>
                {editor && r.status === "approved" && r.kind !== "stipend" && (
                  <Link href={`/erp/money/out/new?request=${r.id}`} className={styles.btnQuiet}>
                    Pay
                  </Link>
                )}
              </div>
              {editor && r.status === "waiting" && (
                <details className={styles.fold} style={{ margin: "0 14px 14px" }}>
                  <summary>Record the committee&apos;s decision</summary>
                  <div>
                    <DecideForm action={decideFamilyRequest.bind(null, r.id)} request={r} />
                  </div>
                </details>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No requests yet.</Empty>
      )}
      {editor && f.active && (
        <details className={styles.fold} style={{ marginTop: 12 }}>
          <summary>+ Add a request</summary>
          <div>
            <RequestForm action={addFamilyRequest.bind(null, f.id)} />
          </div>
        </details>
      )}

      <h2 className={styles.h2}>
        Help given
      </h2>
      {payments.length ? <MoneyList rows={payments} byDay={false} /> : <Empty>Nothing paid to this family yet.</Empty>}
    </>
  );
}
