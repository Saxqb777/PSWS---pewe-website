import { ErpHead } from "@/components/erp/page-head";
import { ProtoAction } from "@/components/proto-action";
import { Stat, Badge, Progress, Ledger, Th, Td, Panel } from "@/components/ui/primitives";
import { PROJECTS, memberById } from "@/lib/mock-data";
import { rupees, pct, longDate } from "@/lib/format";

export const metadata = { title: "Projects & quotations" };

export default function ErpProjectsPage() {
  const running = PROJECTS.filter((p) => p.status !== "COMPLETED");
  const totalBudget = PROJECTS.reduce((s, p) => s + p.budget, 0);
  const totalSpent = PROJECTS.reduce((s, p) => s + p.spent, 0);
  const awaiting = PROJECTS.filter((p) => p.quotations.length > 0 && p.quotations.length < 3);

  return (
    <>
      <ErpHead
        title="Projects & quotations"
        lede="Works, their budgets, and the procurement trail behind each one. No work above one lakh is awarded on fewer than three written quotations."
        actions={
          <>
            <ProtoAction
              label="Open a project"
              variant="primary"
              size="sm"
              does="Opens the project sheet — title, description, budget, lead member and target completion."
              detail={[
                "A project starts at PLANNED. It cannot move to IN_PROGRESS until a quotation is marked awarded.",
                "The budget is set once by committee resolution; changing it afterwards requires a fresh resolution and is recorded as a revision, not an edit.",
              ]}
            />
            <ProtoAction
              label="Upload a quotation"
              variant="secondary"
              size="sm"
              does="Opens the quotation upload — vendor, place, amount, and the scanned document."
              detail={[
                "Amounts stay sealed until the committee formally opens them on a minuted date. Nobody, including Admin, can read a price before that.",
                "The uploading member's ID is stamped on the record and cannot be changed afterwards.",
              ]}
            />
          </>
        }
      />

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Projects" value={`${running.length} of ${PROJECTS.length}`} sub="Currently running" />
        <Stat label="Committed budget" value={rupees(totalBudget)} sub="Across all works" tone="brass" />
        <Stat label="Spent to date" value={rupees(totalSpent)} sub={`${pct(totalSpent, totalBudget)}% of budget`} tone="maroon" />
        <Stat label="Short of three quotes" value={String(awaiting.length)} sub="Cannot be awarded yet" tone="pine" />
      </div>

      <div className="mt-12 space-y-12">
        {PROJECTS.map((p) => {
          const lead = memberById(p.leadMemberId);
          const sorted = [...p.quotations].sort((a, b) => a.amount - b.amount);
          const lowest = sorted[0];

          return (
            <article key={p.id} className="border-t-2 border-ink pt-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Badge tone={p.status.toLowerCase()}>{p.status.replace("_", " ")}</Badge>
                    <span className="num text-[12.5px] text-ink-3">
                      Lead {lead?.fullName ?? p.leadMemberId} · {p.leadMemberId}
                    </span>
                  </div>
                  <h2 className="display mt-2.5 text-[22px] leading-tight">{p.title}</h2>
                  <p className="mt-2 max-w-3xl text-[15px] leading-[1.65] text-ink-2">{p.description}</p>
                </div>

                <div className="w-full sm:w-64">
                  <div className="border-t-2 border-ink pt-3">
                    <div className="label">Spend against budget</div>
                    <div className="num mt-1.5 text-[19px] leading-none text-ink">
                      {rupees(p.spent)} <span className="text-[14.5px] text-ink-3">/ {rupees(p.budget)}</span>
                    </div>
                    <div className="mt-2.5">
                      <Progress value={pct(p.spent, p.budget)} tone="pine" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-7 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-10">
                {/* Quotation comparison */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-2">
                    <h3 className="label label-brass">Quotation comparison</h3>
                    <span className="num text-[12.5px] text-ink-3">
                      {p.quotations.length} received
                      {p.quotations.length < 3 && p.budget > 100000 && " · three required"}
                    </span>
                  </div>

                  {p.quotations.length === 0 ? (
                    <p className="mt-4 text-[15px] text-ink-3">
                      Not yet gone out to quotation.
                    </p>
                  ) : (
                    <div className="mt-4">
                      <Ledger>
                        <thead>
                          <tr>
                            <Th>Vendor</Th>
                            <Th align="right">Amount</Th>
                            <Th align="right">vs lowest</Th>
                            <Th>Received</Th>
                            <Th>Uploaded by</Th>
                            <Th align="center">Award</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {sorted.map((q, i) => (
                            <tr key={q.id} className={q.isSelected ? "bg-pine-tint" : ""}>
                              <Td>
                                <span className="font-semibold">{q.vendorName}</span>
                                <span className="block text-[12px] text-ink-3">{q.vendorPlace}</span>
                                {q.note && (
                                  <span className="mt-1 block max-w-xs text-[12.5px] italic text-ink-2">
                                    {q.note}
                                  </span>
                                )}
                              </Td>
                              <Td align="right" mono className="font-semibold">{rupees(q.amount)}</Td>
                              <Td align="right" mono className={i === 0 ? "text-pine" : "text-ink-3"}>
                                {i === 0 ? "lowest" : `+${rupees(q.amount - lowest.amount)}`}
                              </Td>
                              <Td mono>{longDate(q.receivedOn)}</Td>
                              <Td mono className="text-ink-3">{q.uploadedByMemberId}</Td>
                              <Td align="center">
                                {q.isSelected ? (
                                  <Badge tone="disbursed">Awarded</Badge>
                                ) : (
                                  <ProtoAction
                                    label="Award"
                                    variant="quiet"
                                    size="sm"
                                    title={`Award to ${q.vendorName}`}
                                    does={`Marks this quotation as awarded and moves "${p.title}" to IN_PROGRESS.`}
                                    detail={
                                      i === 0
                                        ? ["This is the lowest quotation, so no written justification is required."]
                                        : [
                                            `This is ${rupees(q.amount - lowest.amount)} above the lowest quotation. A written reason is required and will be published on the public project page beside the comparison.`,
                                            "Awarding above the lowest also requires a second Committee signature.",
                                          ]
                                    }
                                  />
                                )}
                              </Td>
                            </tr>
                          ))}
                        </tbody>
                      </Ledger>
                    </div>
                  )}
                </div>

                {/* Milestones */}
                <div>
                  <div className="flex items-center justify-between gap-3 border-b border-rule pb-2">
                    <h3 className="label label-brass">Milestones</h3>
                    <span className="num text-[12.5px] text-ink-3">
                      {p.milestones.filter((m) => m.done).length} of {p.milestones.length}
                    </span>
                  </div>

                  <ol className="mt-3">
                    {p.milestones.map((m, i) => (
                      <li key={i} className="flex items-start gap-3 border-b border-rule py-2.5">
                        <span
                          aria-hidden
                          className={`mt-1 block h-3 w-3 shrink-0 border ${m.done ? "border-pine bg-pine" : "border-rule-strong bg-paper"}`}
                        />
                        <span className={`flex-1 text-[15px] leading-snug ${m.done ? "text-ink" : "text-ink-3"}`}>
                          {m.label}
                        </span>
                        <span className="num shrink-0 text-[12.5px] text-ink-3">
                          {m.date ? longDate(m.date) : "—"}
                        </span>
                      </li>
                    ))}
                  </ol>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <ProtoAction
                      label="Mark a milestone done"
                      variant="secondary"
                      size="sm"
                      does="Marks the next open milestone complete and stamps the date and the member."
                      detail={["Completing a milestone that carries a staged payment prompts the Treasurer to release that stage — the two are linked, so work and money stay in step."]}
                    />
                    <ProtoAction
                      label="Record a payment"
                      variant="quiet"
                      size="sm"
                      does="Records a payment to the awarded vendor against this project."
                      detail={["Increases the project's spent figure and writes a disbursement row against the project head in the same transaction."]}
                    />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <Panel tone="sunk" className="mt-12">
        <div className="p-5">
          <div className="label label-maroon">Why quotations stay sealed</div>
          <p className="mt-2 max-w-3xl text-[15px] leading-[1.65] text-ink-2">
            In a village of this size the committee, the vendors and the members
            all know each other. Sealing the amounts until a minuted opening is
            not distrust of the committee — it removes the possibility of the
            question being asked at all, which is worth more to the people
            serving on it than to anyone else.
          </p>
        </div>
      </Panel>
    </>
  );
}
