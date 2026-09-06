import { PageHead, Container, Section, Panel, Badge, Progress, Ledger, Th, Td, SectionHead, Provisional } from "@/components/ui/primitives";
import { ProtoAction } from "@/components/proto-action";
import { PROJECTS, COMPLETED_WORKS } from "@/lib/mock-data";
import { rupees, pct, longDate } from "@/lib/format";

export const metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <>
      <PageHead
        overline="Village projects"
        title="Works on the ground, with their paperwork attached."
        hinglish="Gaon ke kaam — poora kaagaz ke saath"
        lede="No work above one lakh is awarded on fewer than three written quotations, opened before the committee. The comparison sheet is published here — including the quotations that lost, and why."
      />

      {/* ---------------- ELEVEN YEARS OF FINISHED WORK ---------------- */}
      <section className="border-b-2 border-ink bg-paper-2">
        <Container className="py-14 sm:py-16">
          <SectionHead
            overline="Already built"
            title="What eleven years has built."
            hinglish="Ab tak kya bana"
            lede="The record of works finished or still running since 2015. Costs are the office's own approximations until the audited statements are in."
          />

          <div className="mt-10 grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-3">
            {COMPLETED_WORKS.map((w) => (
              <article key={w.id} className="flex flex-col bg-paper p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="display text-[20px] leading-tight">{w.title}</h3>
                  {w.ongoing && <Badge tone="in_progress">Ongoing</Badge>}
                </div>
                <p className="mt-1 text-[15px] italic text-brass">{w.hinglish}</p>
                <p className="mt-3 flex-1 text-[15px] leading-[1.68] text-ink-2">{w.detail}</p>

                <div className="mt-6 border-t border-rule pt-3">
                  {w.approxCost ? (
                    <>
                      <div className="num text-[20px] leading-none text-maroon">
                        {rupees(w.approxCost)}
                      </div>
                      <Provisional />
                    </>
                  ) : (
                    <div className="text-[14.5px] text-ink-3">
                      Cost carried across several years
                    </div>
                  )}
                  <div className="label mt-2">{w.period}</div>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      {/* ---------------- CURRENT WORKS, WITH THEIR PAPERWORK ---------------- */}
      <Section>
        <SectionHead
          overline="Running now"
          title="Current works and their quotations."
          hinglish="Abhi ke kaam"
          lede="Each one with its budget, its milestones, and every quotation received — including the ones that lost."
        />

        <div className="mt-12 space-y-16">
          {PROJECTS.map((p) => (
            <article key={p.id} className="border-t-2 border-ink pt-8">
              <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:gap-12">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge tone={p.status.toLowerCase()}>{p.status.replace("_", " ")}</Badge>
                    <span className="num text-[12.5px] text-ink-3">
                      Started {longDate(p.startedOn)}
                      {p.targetCompletion && ` · target ${longDate(p.targetCompletion)}`}
                    </span>
                  </div>

                  <h2 className="display mt-3 text-[26px] leading-tight sm:text-[30px]">{p.title}</h2>
                  {p.titleMarathi && <p className="marathi mt-1 text-[15.5px] text-ink-3">{p.titleMarathi}</p>}
                  <p className="mt-4 max-w-2xl text-[16.5px] leading-[1.72] text-ink-2">{p.description}</p>

                  {/* Milestones */}
                  <div className="mt-8">
                    <div className="label label-brass">Milestones</div>
                    <ol className="mt-3 border-t border-rule">
                      {p.milestones.map((m, i) => (
                        <li key={i} className="flex items-start gap-4 border-b border-rule py-2.5">
                          <span
                            aria-hidden
                            className={`mt-1 block h-3 w-3 shrink-0 border ${m.done ? "border-pine bg-pine" : "border-rule-strong bg-paper"}`}
                          />
                          <span className={`flex-1 text-[15.5px] leading-snug ${m.done ? "text-ink" : "text-ink-3"}`}>
                            {m.label}
                          </span>
                          <span className="num shrink-0 text-[13px] text-ink-3">
                            {m.date ? longDate(m.date) : "—"}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                {/* Money */}
                <div>
                  <Panel tone="sunk">
                    <div className="p-5">
                      <div className="label">Budget & spend</div>
                      <div className="num mt-2 text-[24px] leading-none text-ink">{rupees(p.budget)}</div>
                      <div className="num mt-1.5 text-[13.5px] text-ink-3">
                        {rupees(p.spent)} spent to date
                      </div>
                      <div className="mt-4">
                        <Progress value={pct(p.spent, p.budget)} tone="pine" />
                      </div>
                      <div className="mt-5 border-t border-rule pt-4">
                        <ProtoAction
                          label="Contribute to this work"
                          variant="primary"
                          size="sm"
                          fullWidth
                          does={`Opens the payment sheet against the campaign funding "${p.title}".`}
                          detail={["Project spend and campaign receipts are two sides of the same head, so a contribution here moves both figures."]}
                        />
                      </div>
                    </div>
                  </Panel>
                </div>
              </div>

              {/* Quotations */}
              <div className="mt-10">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <div className="label label-brass">Quotations</div>
                    <p className="mt-1.5 max-w-xl text-[15px] leading-[1.6] text-ink-2">
                      {p.quotations.length === 0
                        ? "None received yet. The work has not gone out to quotation."
                        : p.quotations.length < 3
                        ? `${p.quotations.length} received. The committee will not open a comparison until three are in hand.`
                        : `${p.quotations.length} received and opened before the committee.`}
                    </p>
                  </div>
                  <ProtoAction
                    label="Upload a quotation"
                    variant="quiet"
                    size="sm"
                    does="Opens the upload form — vendor name, place, amount, and the scanned quotation document."
                    detail={[
                      "Only Committee and Admin members may upload. The uploader's member ID is stamped on the record and cannot be edited afterwards.",
                      "Quotations stay sealed until the committee formally opens them on the minuted date, so no vendor can be shown another's price.",
                    ]}
                  />
                </div>

                {p.quotations.length > 0 && (
                  <div className="mt-5">
                    <Ledger>
                      <thead>
                        <tr>
                          <Th>Vendor</Th>
                          <Th>Place</Th>
                          <Th align="right">Amount</Th>
                          <Th>Received</Th>
                          <Th>Document</Th>
                          <Th>Committee note</Th>
                          <Th align="center">Selected</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.quotations.map((q) => (
                          <tr key={q.id} className={q.isSelected ? "bg-pine-tint" : ""}>
                            <Td className="font-semibold">{q.vendorName}</Td>
                            <Td>{q.vendorPlace}</Td>
                            <Td align="right" mono>{rupees(q.amount)}</Td>
                            <Td mono>{longDate(q.receivedOn)}</Td>
                            <Td>
                              <span className="text-ink-3 underline decoration-rule underline-offset-2">
                                {q.documentName}
                              </span>
                            </Td>
                            <Td className="max-w-xs text-ink-2">{q.note ?? "—"}</Td>
                            <Td align="center">
                              {q.isSelected ? <Badge tone="disbursed">Awarded</Badge> : <span className="text-ink-3">—</span>}
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Ledger>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </Section>
    </>
  );
}
