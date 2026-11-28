import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import { getFamily, listRequests, paymentsFor } from "@/lib/erp/data";
import { KINDS, STATUSES, canDo, inr, showDate, showPhone, labelOf, handlesMoney } from "@/lib/erp/labels";
import { toId } from "@/lib/erp/form-state";
import { DecideForm } from "@/components/erp/forms";
import { RequestForm } from "@/components/erp/request-form";
import { Empty, Facts, MoneyList, PageHead, Pending } from "@/components/erp/ui";
import { AskBox } from "@/components/erp/cancel-box";
import { Removed } from "@/components/erp/bring-back";
import { openApproval } from "@/lib/erp/books";
import styles from "@/components/erp/erp.module.css";
import { WHO_SEES, familyCode, maskFamily, maskMoneyRow, maskRequest, seesNames } from "@/lib/erp/privacy";
import { addFamilyRequest, askRemoveFamily, bringBackFamily, decideFamilyRequest } from "../actions";

export const metadata = { title: "Family" };

export default async function FamilyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string; saved?: string; back?: string }>;
}) {
  const u = await requireUser();
  const id = toId((await params).id);
  const found = id ? await getFamily(id) : null;
  if (!found) notFound();
  // anyone but the Accountant, the owner and the Zakat head sees the family's code and what is needed, never who they are
  const sees = seesNames(u);
  const f = maskFamily(found, sees);
  const sp = await searchParams;
  const [requests, payments] = await Promise.all([
    listRequests({ familyId: f.id }).then((rs) => rs.map((r) => maskRequest(r, sees))),
    paymentsFor({ familyId: f.id }).then((ps) => ps.map((p) => maskMoneyRow(p, sees))),
  ]);
  const pending = f.active ? await openApproval(`family:${f.id}`) : null;
  const editor = canDo(u.role, "editor");
  const money = handlesMoney(u);
  const total = payments.filter((p) => !p.cancelled).reduce((s, p) => s + p.amount_paise, 0);

  return (
    <>
      <PageHead
        title={f.name}
        sub={[sees ? familyCode(f.id) : null, f.place, f.active ? null : "Removed"].filter(Boolean).join(" · ") || "Family"}
        back={{ href: "/erp/families", label: "Families" }}
      >
        {money && f.active && (
          <Link href={`/erp/money/out/new?family=${f.id}`} className={styles.btn}>
            Record help given
          </Link>
        )}
        {editor && sees && (
          <Link href={`/erp/families/${f.id}/edit`} className={styles.btnQuiet}>
            Change details
          </Link>
        )}
      </PageHead>

      {sp.new && <p className={styles.formDone}>Family saved. Add what they asked for below, or record help already given.</p>}
      {sp.saved && <p className={styles.formDone}>Change saved.</p>}
      {sp.back && f.active && <p className={styles.formDone}>Brought back.</p>}

      {!sees && (
        <p className={`${styles.banner} ${styles.note}`}>
          Who this family is stays private: only {WHO_SEES} see the name, place and mobile.
        </p>
      )}

      <div className={styles.card}>
        <Facts
          items={[
            ["Mobile", f.phone && <a className={styles.link} href={`tel:+${f.phone}`}>{showPhone(f.phone)}</a>],
            ["People in the house", f.people],
            ["Monthly Stipend", f.stipend_active ? `${inr(f.stipend_paise)} a month` : "None"],
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
                    {labelOf(KINDS, r.kind, r.kind_other)}
                    <span className={`${styles.tag} ${r.status === "waiting" ? styles.tagWarn : r.status === "declined" ? styles.tagOut : styles.tagIn}`}>
                      {STATUSES[r.status].en}
                    </span>
                  </span>
                  <span className={styles.rowMeta}>
                    Asked {showDate(r.asked_on)}
                    {r.kind === "medical" && r.bill_paise
                      ? ` · ${r.hospital ?? "hospital"} bill ${inr(r.bill_paise)} · Zakat share by the slab ${inr(r.asked_paise ?? 0)}`
                      : r.asked_paise
                        ? ` for ${inr(r.asked_paise)}`
                        : ""}
                    {r.decided_on ? ` · decided ${showDate(r.decided_on)}` : ""}
                    {r.approved_paise ? ` · approved ${inr(r.approved_paise)}${r.kind === "stipend" ? " a month" : ""}` : ""}
                    {r.paid_paise ? ` · paid ${inr(r.paid_paise)}` : ""}
                  </span>
                  {r.details && <span className={styles.rowMeta} style={{ whiteSpace: "pre-line" }}>{r.details}</span>}
                  {r.decision_note && <span className={styles.rowMeta}>Note: {r.decision_note}</span>}
                </span>
                {money && r.status === "approved" && r.kind !== "stipend" && (
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

      {!f.active ? (
        <div style={{ marginTop: 28 }}>
          <Removed what="The family and everything paid to it" action={editor ? bringBackFamily.bind(null, f.id) : null} />
        </div>
      ) : pending ? (
        <div style={{ marginTop: 28 }}>
          <Pending a={pending} />
        </div>
      ) : (
        editor && (
          <AskBox
            action={askRemoveFamily.bind(null, f.id)}
            title="Remove this family"
            explain="For a family that is no longer helped. Removing needs all the approvers. Everything paid stays on record."
            button="Ask to remove"
          />
        )
      )}
    </>
  );
}
