import { PageHead, Container, Section, Panel, Stat, Ledger, Th, Td, SectionHead, DefRow } from "@/components/ui/primitives";
import { ProtoAction } from "@/components/proto-action";
import { FISCAL_YEAR, SOCIETY } from "@/lib/site";
import {
  TREASURY, RECEIPTS_BY_METHOD, MONTHLY_RECEIPTS, PAYMENT_LABEL,
  ZAKAT_SUMMARY, PROJECTS, DONATION_ROLL,
} from "@/lib/mock-data";
import { rupees, rupeesShort, pct } from "@/lib/format";

export const metadata = { title: "Accounts" };

const HEADS = [
  { key: "Welfare", amount: TREASURY.welfareHead,   token: "var(--color-mark-1)" },
  { key: "Development works", amount: TREASURY.developmentHead, token: "var(--color-mark-2)" },
  { key: "Relief & flash funds", amount: TREASURY.reliefHead, token: "var(--color-mark-3)" },
];

const FILINGS = [
  { year: "2025–26", filed: "12 July 2026", auditor: "S. K. Joshi & Associates, Chiplun", status: "Filed" },
  { year: "2024–25", filed: "9 July 2025", auditor: "S. K. Joshi & Associates, Chiplun", status: "Filed" },
  { year: "2023–24", filed: "18 July 2024", auditor: "S. K. Joshi & Associates, Chiplun", status: "Filed" },
  { year: "2026–27", filed: "—", auditor: "—", status: "In progress" },
];

export default function ReportsPage() {
  const maxMethod = Math.max(...RECEIPTS_BY_METHOD.map((r) => r.amount));
  const maxMonth = Math.max(...MONTHLY_RECEIPTS.map((m) => m.amount));
  const headTotal = HEADS.reduce((s, h) => s + h.amount, 0);

  return (
    <>
      <PageHead
        overline={`Accounts ${FISCAL_YEAR}`}
        title="Where the money went."
        hinglish="Paisa kahan gaya — poora hisaab"
        lede="Published as it stands today, not once a year. The audited statement for the closed year is filed with the Charity Commissioner at Ratnagiri and may be inspected by any member on request."
      />

      {/* ---------------- HEADLINE ---------------- */}
      <Section>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Opening balance" value={rupees(TREASURY.openingBalance)} sub="Carried from 2025–26" />
          <Stat label="Receipts" value={rupees(TREASURY.receiptsThisYear)} sub={`${DONATION_ROLL.entriesThisYear} entries since 1 April`} tone="pine" />
          <Stat label="Disbursements" value={rupees(TREASURY.disbursementsThisYear)} sub="All three heads" tone="maroon" />
          <Stat label="Balance in hand" value={rupees(TREASURY.balance)} sub="Bank and cash together" tone="brass" />
        </div>
      </Section>

      {/* ---------------- RECEIPTS BY METHOD ---------------- */}
      <section className="border-y-2 border-ink bg-paper-2">
        <Container className="py-14 sm:py-16">
          <SectionHead
            overline="Receipts"
            title="How the money arrived."
            lede="One bar per method, drawn to the same scale. The wire column is the largest because a third of the roll works outside India."
          />

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:gap-14">
            {/* Single hue: the labels carry identity, so colour need not. */}
            <figure>
              <figcaption className="label label-brass">
                Receipts by method · {FISCAL_YEAR} · rupees
              </figcaption>
              <div className="mt-5 space-y-4">
                {RECEIPTS_BY_METHOD.map((r) => (
                  <div key={r.method}>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-[15px] font-medium text-ink">
                        {PAYMENT_LABEL[r.method]}
                      </span>
                      <span className="num text-[14.5px] text-ink-2">
                        {rupees(r.amount)}
                        <span className="ml-2 text-ink-3">({r.count})</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-3 w-full bg-paper-3">
                      <div
                        className="h-full"
                        style={{
                          width: `${(r.amount / maxMethod) * 100}%`,
                          backgroundColor: "var(--color-mark-1)",
                        }}
                        title={`${PAYMENT_LABEL[r.method]}: ${rupees(r.amount)} over ${r.count} entries`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </figure>

            <figure>
              <figcaption className="label label-brass">
                Receipts by month · April to date · rupees
              </figcaption>
              <div className="mt-5 flex h-56 items-end gap-2 border-b-2 border-ink">
                {MONTHLY_RECEIPTS.map((m) => (
                  <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <span className="num text-[11.5px] text-ink-2">{rupeesShort(m.amount)}</span>
                    <div
                      className="w-full"
                      style={{
                        height: `${(m.amount / maxMonth) * 86}%`,
                        backgroundColor: "var(--color-mark-1)",
                      }}
                      title={`${m.month}: ${rupees(m.amount)}`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                {MONTHLY_RECEIPTS.map((m) => (
                  <div key={m.month} className="num flex-1 pt-2 text-center text-[12px] text-ink-3">
                    {m.month}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[13.5px] leading-relaxed text-ink-3">
                August is high because two flash funds ran at once. September
                covers two days only.
              </p>
            </figure>
          </div>
        </Container>
      </section>

      {/* ---------------- DISBURSEMENTS BY HEAD ---------------- */}
      <Section>
        <SectionHead
          overline="Disbursements"
          title="What it was spent on."
          lede="Three heads, kept strictly apart. Nothing from the Zakat head is ever spent on construction, and nothing from the project head on relief."
        />

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-14">
          <figure>
            <figcaption className="label label-brass">
              Disbursement by head · {FISCAL_YEAR} · rupees
            </figcaption>

            {/* Stacked, with a 2px surface gap between segments */}
            <div className="mt-5 flex h-14 w-full gap-[2px] border border-rule bg-paper">
              {HEADS.map((h) => (
                <div
                  key={h.key}
                  style={{ width: `${(h.amount / headTotal) * 100}%`, backgroundColor: h.token }}
                  title={`${h.key}: ${rupees(h.amount)} (${pct(h.amount, headTotal)}%)`}
                />
              ))}
            </div>

            {/* Legend — always present for >= 2 series, and direct-labelled */}
            <ul className="mt-5 space-y-2.5">
              {HEADS.map((h) => (
                <li key={h.key} className="flex items-center gap-3">
                  <span aria-hidden className="block h-3 w-3 shrink-0" style={{ backgroundColor: h.token }} />
                  <span className="flex-1 text-[15px] text-ink">{h.key}</span>
                  <span className="num text-[14.5px] text-ink-2">{rupees(h.amount)}</span>
                  <span className="num w-12 text-right text-[13px] text-ink-3">
                    {pct(h.amount, headTotal)}%
                  </span>
                </li>
              ))}
            </ul>
          </figure>

          <div>
            <Panel tone="sunk">
              <div className="p-6">
                <div className="label label-brass">Against the heads</div>
                <dl className="mt-4">
                  <DefRow term="Households helped">{ZAKAT_SUMMARY.householdsHelped} from {ZAKAT_SUMMARY.requestsThisYear} applications</DefRow>
                  <DefRow term="Standing stipends">{ZAKAT_SUMMARY.recurringStipends} households, {rupees(ZAKAT_SUMMARY.monthlyStipendOutgo)} a month</DefRow>
                  <DefRow term="Projects running">{PROJECTS.filter((p) => p.status !== "COMPLETED").length} of {PROJECTS.length}</DefRow>
                  <DefRow term="Backdated entries">{DONATION_ROLL.backdatedPending} awaiting auditor review</DefRow>
                </dl>
              </div>
            </Panel>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <ProtoAction
                label="Full statement (PDF)"
                variant="secondary"
                size="sm"
                fullWidth
                does="Serves the complete receipts-and-payments statement for the year to date as a PDF."
                detail={["Generated from the ledger at the moment of download, so it is never a stale copy sitting in a folder."]}
              />
              <ProtoAction
                label="Ledger as spreadsheet"
                variant="quiet"
                size="sm"
                fullWidth
                does="Exports every entry — receipt number, date, method, head, amount — as a spreadsheet."
                detail={["Donor names are included only for Committee, Admin and Auditor roles. A public export carries amounts and heads without names."]}
              />
            </div>
          </div>
        </div>
      </Section>

      {/* ---------------- AUDIT ---------------- */}
      <section className="border-t-2 border-ink bg-paper-2">
        <Container className="py-14 sm:py-16">
          <SectionHead
            overline="Audit & filing"
            title="What has been filed, and when."
            lede={`Filed with the office of the Charity Commissioner, Ratnagiri, under registration ${SOCIETY.registrationNo}.`}
          />

          <div className="mt-8">
            <Ledger>
              <thead>
                <tr>
                  <Th>Financial year</Th>
                  <Th>Auditor</Th>
                  <Th>Filed on</Th>
                  <Th align="center">Status</Th>
                  <Th align="right">Copy</Th>
                </tr>
              </thead>
              <tbody>
                {FILINGS.map((f) => (
                  <tr key={f.year}>
                    <Td mono className="font-semibold">{f.year}</Td>
                    <Td>{f.auditor}</Td>
                    <Td mono>{f.filed}</Td>
                    <Td align="center">{f.status}</Td>
                    <Td align="right">
                      {f.status === "Filed" ? (
                        <ProtoAction
                          label="Download"
                          variant="quiet"
                          size="sm"
                          does={`Serves the audited statement for ${f.year} as filed.`}
                          detail={["Held in file storage and versioned — the copy served is always the one actually filed."]}
                        />
                      ) : (
                        <span className="text-ink-3">—</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Ledger>
          </div>
        </Container>
      </section>
    </>
  );
}
