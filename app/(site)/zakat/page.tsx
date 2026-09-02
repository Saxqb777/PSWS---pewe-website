import { PageHead, Container, Section, Panel, Badge, Stat, Ledger, Th, Td, SectionHead } from "@/components/ui/primitives";
import { ProtoAction } from "@/components/proto-action";
import { ZAKAT_CATEGORIES, ZAKAT_REQUESTS, ZAKAT_SUMMARY } from "@/lib/mock-data";
import { rupees, rupeesShort, longDate } from "@/lib/format";

export const metadata = { title: "Zakat & Welfare" };

const STEPS = [
  { n: "1", head: "Apply", text: "To the Welfare Officer, or to any ward representative in your mohalla. In writing or in person — the representative fills the form if you cannot." },
  { n: "2", head: "Verified", text: "The ward representative confirms the household's circumstances. For medical heads the hospital paper is seen. Nothing is taken on hearsay." },
  { n: "3", head: "Heard", text: "Applications are placed before the committee every second Friday. The decision is recorded with the name of the member who took it." },
  { n: "4", head: "Disbursed", text: "Paid to the applicant or direct to the hospital, school or supplier, whichever the committee directs. Entered against the Zakat head the same day." },
];

export default function ZakatPage() {
  const decided = ZAKAT_REQUESTS.filter((r) => r.status !== "PENDING");

  return (
    <>
      <PageHead
        overline="Zakat & Welfare"
        title="Help, on a fixed day, on a recorded ground."
        lede="The Society holds Zakat and general welfare in a separate head from projects. Nothing from this head is ever spent on construction, and nothing from the project head is ever spent on relief."
      />

      {/* ---------------- FOUR HEADS ---------------- */}
      <Section>
        <SectionHead
          overline="What may be applied for"
          title="Four heads."
          lede="If your need does not fall under one of these, come and say so anyway — the committee may open a fresh head, and has done before."
        />

        <div className="mt-10 grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-4">
          {ZAKAT_CATEGORIES.map((c) => (
            <div key={c.key} className="bg-paper p-6">
              <div className="display text-[20px] leading-tight">{c.label}</div>
              <p className="mt-3 text-[13.5px] leading-[1.65] text-ink-2">{c.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Disbursed this year" value={rupees(ZAKAT_SUMMARY.disbursedThisYear)} sub="All four heads together" tone="maroon" />
          <Stat label="Households helped" value={String(ZAKAT_SUMMARY.householdsHelped)} sub={`From ${ZAKAT_SUMMARY.requestsThisYear} applications heard`} />
          <Stat label="Standing stipends" value={String(ZAKAT_SUMMARY.recurringStipends)} sub={`${rupeesShort(ZAKAT_SUMMARY.monthlyStipendOutgo)} a month`} tone="brass" />
          <Stat label="Average decision" value={`${ZAKAT_SUMMARY.averageDecisionDays} days`} sub="From application to committee decision" tone="pine" />
        </div>
      </Section>

      {/* ---------------- HOW TO APPLY ---------------- */}
      <section id="apply" className="border-y-2 border-ink bg-paper-2">
        <Container className="py-14 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
            <div>
              <div className="label label-brass">How to apply</div>
              <h2 className="display mt-3 text-[28px] leading-tight sm:text-[32px]">
                Four steps, and none of them cost anything.
              </h2>
              <p className="mt-4 text-[15px] leading-[1.72] text-ink-2">
                You do not need to be a member of the Society to apply. You need
                to be a resident of Pewe or of the wadis the Society covers.
              </p>
              <div className="mt-7">
                <ProtoAction
                  label="Start an application"
                  variant="primary"
                  size="md"
                  does="Opens the welfare application form — head, amount sought, circumstances, and any supporting paper."
                  detail={[
                    "On submission the system creates a ZakatRequest with status PENDING and a reference of the form ZR-2627-000, and notifies the Welfare Officer.",
                    "The applicant can check the reference on this site at any time to see whether it has been heard.",
                    "Applications may also be filled in on paper by a ward representative and entered by the office — the record is identical either way.",
                  ]}
                />
              </div>
            </div>

            <ol className="grid gap-px bg-rule sm:grid-cols-2">
              {STEPS.map((s) => (
                <li key={s.n} className="bg-paper p-6">
                  <div className="num text-[26px] leading-none text-brass">{s.n}</div>
                  <div className="display mt-3 text-[18px] leading-tight">{s.head}</div>
                  <p className="mt-2 text-[13.5px] leading-[1.65] text-ink-2">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      {/* ---------------- DECIDED APPLICATIONS ---------------- */}
      <Section>
        <SectionHead
          overline="The record"
          title="Applications decided this year."
          lede="Published without names of dependants and without medical particulars. The head, the amount and the decision are public; the family's circumstances are not."
        />

        <div className="mt-8">
          <Ledger>
            <thead>
              <tr>
                <Th>Reference</Th>
                <Th>Head</Th>
                <Th>Mohalla</Th>
                <Th align="right">Amount</Th>
                <Th>Applied</Th>
                <Th>Decided</Th>
                <Th align="center">Outcome</Th>
              </tr>
            </thead>
            <tbody>
              {decided.map((r) => (
                <tr key={r.id}>
                  <Td mono className="font-semibold">{r.reference}</Td>
                  <Td>
                    {ZAKAT_CATEGORIES.find((c) => c.key === r.category)?.label}
                    {r.isRecurring && <span className="ml-2 text-[11px] text-ink-3">(standing)</span>}
                  </Td>
                  <Td>{r.mohalla}</Td>
                  <Td align="right" mono>{rupees(r.amount)}</Td>
                  <Td mono>{longDate(r.submittedOn)}</Td>
                  <Td mono>{r.decidedOn ? longDate(r.decidedOn) : "—"}</Td>
                  <Td align="center"><Badge tone={r.status.toLowerCase()}>{r.status}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </Ledger>
        </div>

        <Panel tone="sunk" className="mt-8">
          <div className="p-5">
            <div className="label label-maroon">On the one refusal above</div>
            <p className="mt-2 max-w-3xl text-[14px] leading-[1.7] text-ink-2">
              ZR-2627-054 was refused because the amount sought exceeded what the
              Zakat head could carry without stopping every standing stipend for
              four months. The committee instead opened a flash fund for the same
              family, which is the correct instrument for a sum of that size. A
              refusal is recorded with its ground, and the ground is published.
            </p>
          </div>
        </Panel>
      </Section>
    </>
  );
}
