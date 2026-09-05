import { ErpHead } from "@/components/erp/page-head";
import { ProtoAction } from "@/components/proto-action";
import { Stat, Badge, Ledger, Th, Td, Panel } from "@/components/ui/primitives";
import { ZAKAT_REQUESTS, ZAKAT_CATEGORIES, ZAKAT_SUMMARY, memberById } from "@/lib/mock-data";
import { rupees, rupeesShort, longDate, shortDate, daysUntil } from "@/lib/format";

export const metadata = { title: "Zakat requests" };

const STAGES = ["PENDING", "APPROVED", "DISBURSED", "REJECTED"] as const;

const STAGE_NOTE: Record<string, string> = {
  PENDING: "Heard every second Friday",
  APPROVED: "Sanctioned, awaiting payment",
  DISBURSED: "Paid and entered",
  REJECTED: "Refused, with ground recorded",
};

export default function ErpZakatPage() {
  const label = (k: string) => ZAKAT_CATEGORIES.find((c) => c.key === k)?.label ?? k;

  return (
    <>
      <ErpHead
        title="Zakat & welfare requests"
        lede="The queue, in the order it must be worked. An application moves Pending → Approved → Disbursed, and every move is stamped with the member who made it."
        actions={
          <>
            <ProtoAction
              label="Enter an application"
              variant="primary"
              size="sm"
              does="Opens the application form on behalf of an applicant who applied on paper or in person."
              detail={[
                "Creates a ZakatRequest with status PENDING and allocates the next ZR reference.",
                "The clerk entering it and the ward representative who verified it are both recorded — they are usually different people, and the record should show that.",
              ]}
            />
            <ProtoAction
              label="Print the Friday list"
              variant="secondary"
              size="sm"
              does="Produces the printable agenda of pending applications for the committee's second-Friday sitting."
              detail={["Ordered oldest first, with the amount, the head, the ward representative's verification note, and space for the decision to be written in by hand."]}
            />
          </>
        }
      />

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Applications this year" value={String(ZAKAT_SUMMARY.requestsThisYear)} sub={`${ZAKAT_SUMMARY.householdsHelped} households helped`} />
        <Stat label="Disbursed" value={rupees(ZAKAT_SUMMARY.disbursedThisYear)} sub="All four heads" tone="maroon" />
        <Stat label="Standing stipends" value={String(ZAKAT_SUMMARY.recurringStipends)} sub={`${rupeesShort(ZAKAT_SUMMARY.monthlyStipendOutgo)} a month, recurring`} tone="brass" />
        <Stat label="Average decision" value={`${ZAKAT_SUMMARY.averageDecisionDays} days`} sub="Application to committee decision" tone="pine" />
      </div>

      {/* Pipeline */}
      <div className="mt-10 grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-4">
        {STAGES.map((stage) => {
          const rows = ZAKAT_REQUESTS.filter((r) => r.status === stage);
          const sum = rows.reduce((s, r) => s + r.amount, 0);
          return (
            <div key={stage} className="bg-paper p-5">
              <div className="flex items-center justify-between gap-2">
                <Badge tone={stage.toLowerCase()}>{stage}</Badge>
                <span className="num text-[17px] text-ink">{rows.length}</span>
              </div>
              <div className="num mt-3 text-[16.5px] text-ink-2">{rupees(sum)}</div>
              <div className="label mt-2">{STAGE_NOTE[stage]}</div>
            </div>
          );
        })}
      </div>

      {/* Pending — the working queue */}
      <section className="mt-12">
        <h2 className="display border-b-2 border-ink pb-2 text-[19px] leading-tight">
          Pending — to be heard on Friday
        </h2>

        <div className="mt-5 space-y-px bg-rule">
          {ZAKAT_REQUESTS.filter((r) => r.status === "PENDING").map((r) => (
            <article key={r.id} className="grid gap-5 bg-paper p-5 lg:grid-cols-[1.7fr_auto] lg:gap-8">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="num text-[13px] font-semibold text-ink">{r.reference}</span>
                  <Badge tone="pending">{label(r.category)}</Badge>
                  {r.isRecurring && <Badge tone="neutral">Standing renewal</Badge>}
                  <span className="num text-[12.5px] text-ink-3">
                    {daysUntil(r.submittedOn, "2026-09-02") * -1} days waiting
                  </span>
                </div>
                <div className="display mt-2.5 text-[18px] leading-tight">{r.applicantName}</div>
                <div className="num mt-0.5 text-[12.5px] text-ink-3">
                  {r.mohalla} · applied {longDate(r.submittedOn)}
                </div>
                <p className="mt-3 max-w-2xl text-[15.5px] leading-[1.65] text-ink-2">{r.details}</p>
              </div>

              <div className="lg:w-56">
                <div className="border-t-2 border-ink pt-3">
                  <div className="label">Amount sought</div>
                  <div className="num mt-1.5 text-[22px] leading-none text-ink">{rupees(r.amount)}</div>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <ProtoAction
                    label="Approve"
                    variant="primary"
                    size="sm"
                    fullWidth
                    title={`Approve ${r.reference}`}
                    does="Sets the status to APPROVED, records the approving member and the date, and moves the application into the payment queue."
                    detail={[
                      "The approver is written from the signed-in member, not chosen from a list, so an approval can never be attributed to someone who was not there.",
                      "Approving does not move money. Payment is a second, separate act — that separation is deliberate.",
                    ]}
                  />
                  <ProtoAction
                    label="Approve a lesser sum"
                    variant="secondary"
                    size="sm"
                    fullWidth
                    title={`Part-approve ${r.reference}`}
                    does="Sanctions less than was asked for, with the reason recorded."
                    detail={["Both the sum sought and the sum sanctioned stay on the record. The applicant is told the difference and the reason for it."]}
                  />
                  <ProtoAction
                    label="Refuse"
                    variant="danger"
                    size="sm"
                    fullWidth
                    title={`Refuse ${r.reference}`}
                    does="Sets the status to REJECTED. A written ground is required — the field cannot be left empty."
                    detail={[
                      "The ground is published on the public welfare page alongside the refusal, so a refusal can always be argued with.",
                      "Where a refusal is on grounds of size rather than merit, the committee is prompted to consider opening a flash fund instead.",
                    ]}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Everything decided */}
      <section className="mt-12">
        <h2 className="display border-b-2 border-ink pb-2 text-[19px] leading-tight">
          Decided this year
        </h2>

        <div className="mt-5">
          <Ledger>
            <thead>
              <tr>
                <Th>Reference</Th>
                <Th>Applicant</Th>
                <Th>Mohalla</Th>
                <Th>Head</Th>
                <Th align="right">Amount</Th>
                <Th>Applied</Th>
                <Th>Decided</Th>
                <Th>Disbursed</Th>
                <Th>Approver</Th>
                <Th align="center">Status</Th>
              </tr>
            </thead>
            <tbody>
              {ZAKAT_REQUESTS.filter((r) => r.status !== "PENDING").map((r) => {
                const ap = r.approverMemberId ? memberById(r.approverMemberId) : undefined;
                return (
                  <tr key={r.id}>
                    <Td mono className="font-semibold">{r.reference}</Td>
                    <Td className="whitespace-nowrap">{r.applicantName}</Td>
                    <Td>{r.mohalla}</Td>
                    <Td>
                      {label(r.category)}
                      {r.isRecurring && <span className="block text-[12px] text-ink-3">standing</span>}
                    </Td>
                    <Td align="right" mono>{rupees(r.amount)}</Td>
                    <Td mono>{shortDate(r.submittedOn)}</Td>
                    <Td mono>{r.decidedOn ? shortDate(r.decidedOn) : "—"}</Td>
                    <Td mono>{r.disbursedOn ? shortDate(r.disbursedOn) : "—"}</Td>
                    <Td className="whitespace-nowrap text-ink-2">
                      {ap ? ap.fullName : "—"}
                      {r.approverMemberId && (
                        <span className="num block text-[12px] text-ink-3">{r.approverMemberId}</span>
                      )}
                    </Td>
                    <Td align="center"><Badge tone={r.status.toLowerCase()}>{r.status}</Badge></Td>
                  </tr>
                );
              })}
            </tbody>
          </Ledger>
        </div>

        <Panel tone="sunk" className="mt-6">
          <div className="p-5">
            <div className="label label-maroon">Why the approver column matters</div>
            <p className="mt-2 max-w-3xl text-[15px] leading-[1.65] text-ink-2">
              A welfare decision in a village is never only administrative — the
              person who took it will meet the applicant at the masjid on Friday.
              Recording the name is not surveillance of the committee; it is what
              lets a member say honestly that a decision was the committee's and
              not a favour or a slight.
            </p>
          </div>
        </Panel>
      </section>
    </>
  );
}
