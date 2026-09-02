import { ErpHead } from "@/components/erp/page-head";
import { ProtoAction } from "@/components/proto-action";
import { Stat, Badge, Ledger, Th, Td, Panel } from "@/components/ui/primitives";
import {
  TREASURY, RECEIPTS_BY_METHOD, MONTHLY_RECEIPTS, PAYMENT_LABEL,
  DONATIONS, DONATION_ROLL, ZAKAT_SUMMARY, PROJECTS,
} from "@/lib/mock-data";
import { rupees, rupeesShort, pct, longDate, shortDate } from "@/lib/format";
import { FISCAL_YEAR, SOCIETY } from "@/lib/site";

export const metadata = { title: "Reports & audit" };

const HEADS = [
  { key: "Zakat & welfare", amount: TREASURY.zakatHead, token: "var(--color-mark-1)" },
  { key: "Village projects", amount: TREASURY.projectHead, token: "var(--color-mark-2)" },
  { key: "Relief & flash funds", amount: TREASURY.reliefHead, token: "var(--color-mark-3)" },
];

const AUDIT_TRAIL = [
  { at: "2026-08-31", who: "PSWS-006", what: "Receipt R-2627-0412 raised", detail: "₹1,85,000 international wire, value date 30 Aug" },
  { at: "2026-08-31", who: "PSWS-006", what: "Backdating flag raised", detail: "R-2627-0400 — value date 29 Jul precedes entry date 19 Aug" },
  { at: "2026-08-29", who: "PSWS-008", what: "Campaign closed", detail: "Monsoon Roof Repair — surplus ₹0, target met exactly" },
  { at: "2026-08-28", who: "PSWS-003", what: "Notice published", detail: "Quotations for masjid roof to be opened on 8 September" },
  { at: "2026-08-21", who: "PSWS-008", what: "Welfare approved", detail: "ZR-2627-058 — ₹55,000, Emergency head" },
  { at: "2026-08-20", who: "PSWS-002", what: "Milestone completed", detail: "Water scheme — tank foundation cast" },
  { at: "2026-08-16", who: "PSWS-008", what: "Welfare disbursed", detail: "ZR-2627-057 — ₹24,000 paid direct to the eye camp" },
];

export default function ErpReportsPage() {
  const headTotal = HEADS.reduce((s, h) => s + h.amount, 0);
  const maxMonth = Math.max(...MONTHLY_RECEIPTS.map((m) => m.amount));
  const maxMethod = Math.max(...RECEIPTS_BY_METHOD.map((r) => r.amount));
  const backdated = DONATIONS.filter((d) => d.isBackdated);

  return (
    <>
      <ErpHead
        title={`Reports & audit — ${FISCAL_YEAR}`}
        lede={`Everything the Internal Auditor and the Charity Commissioner will want, drawn from the ledger rather than typed up separately.`}
        actions={
          <>
            <ProtoAction
              label="Generate the statement"
              variant="primary"
              size="sm"
              does="Produces the receipts-and-payments statement for the period as a PDF, drawn live from the ledger."
              detail={[
                "Generated at the moment of download, so it is never a stale copy sitting in a folder.",
                "Carries the Society seal, the registration numbers, and the range of receipt numbers it covers — which is what makes it checkable against the counterfoil books.",
              ]}
            />
            <ProtoAction
              label="Export everything"
              variant="quiet"
              size="sm"
              does="Exports the full ledger, the welfare register and the project spend as one spreadsheet workbook, a sheet each."
              detail={["This is the file that goes to the auditor at Chiplun each year."]}
            />
          </>
        }
      />

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Opening balance" value={rupees(TREASURY.openingBalance)} sub="Carried from 2025–26" />
        <Stat label="Receipts" value={rupees(TREASURY.receiptsThisYear)} sub={`${DONATION_ROLL.entriesThisYear} entries`} tone="pine" />
        <Stat label="Disbursements" value={rupees(TREASURY.disbursementsThisYear)} sub="Three heads" tone="maroon" />
        <Stat label="Balance in hand" value={rupees(TREASURY.balance)} sub="Bank and cash" tone="brass" />
      </div>

      {/* ---------------- CHARTS ---------------- */}
      <section className="mt-12 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        <figure>
          <figcaption className="label label-brass border-b border-rule pb-2">
            Receipts by month · rupees
          </figcaption>
          <div className="mt-5 flex h-48 items-end gap-2 border-b-2 border-ink">
            {MONTHLY_RECEIPTS.map((m) => (
              <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="num text-[10px] text-ink-2">{rupeesShort(m.amount)}</span>
                <div
                  className="w-full"
                  style={{ height: `${(m.amount / maxMonth) * 86}%`, backgroundColor: "var(--color-mark-1)" }}
                  title={`${m.month}: ${rupees(m.amount)}`}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {MONTHLY_RECEIPTS.map((m) => (
              <div key={m.month} className="num flex-1 pt-2 text-center text-[11px] text-ink-3">{m.month}</div>
            ))}
          </div>
        </figure>

        <figure>
          <figcaption className="label label-brass border-b border-rule pb-2">
            Receipts by method · rupees
          </figcaption>
          <div className="mt-5 space-y-3.5">
            {RECEIPTS_BY_METHOD.map((r) => (
              <div key={r.method}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[13px] text-ink">{PAYMENT_LABEL[r.method]}</span>
                  <span className="num text-[12.5px] text-ink-2">
                    {rupees(r.amount)} <span className="text-ink-3">({r.count})</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 w-full bg-paper-3">
                  <div
                    className="h-full"
                    style={{ width: `${(r.amount / maxMethod) * 100}%`, backgroundColor: "var(--color-mark-1)" }}
                    title={`${PAYMENT_LABEL[r.method]}: ${rupees(r.amount)}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </figure>
      </section>

      {/* ---------------- HEADS ---------------- */}
      <section className="mt-12">
        <figure>
          <figcaption className="label label-brass border-b border-rule pb-2">
            Disbursement by head · rupees
          </figcaption>
          <div className="mt-5 flex h-12 w-full gap-[2px] border border-rule bg-paper">
            {HEADS.map((h) => (
              <div
                key={h.key}
                style={{ width: `${(h.amount / headTotal) * 100}%`, backgroundColor: h.token }}
                title={`${h.key}: ${rupees(h.amount)} (${pct(h.amount, headTotal)}%)`}
              />
            ))}
          </div>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-3">
            {HEADS.map((h) => (
              <li key={h.key} className="flex items-center gap-2.5">
                <span aria-hidden className="block h-3 w-3 shrink-0" style={{ backgroundColor: h.token }} />
                <span className="flex-1 text-[13px] text-ink">{h.key}</span>
                <span className="num text-[12.5px] text-ink-2">{rupees(h.amount)}</span>
              </li>
            ))}
          </ul>
        </figure>
      </section>

      {/* ---------------- BACKDATING REVIEW ---------------- */}
      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-2">
          <h2 className="display text-[19px] leading-tight">Backdating review</h2>
          <Badge tone="pending">{DONATION_ROLL.backdatedPending} awaiting the auditor</Badge>
        </div>

        <p className="mt-4 max-w-3xl text-[13.5px] leading-[1.65] text-ink-2">
          An entry is flagged when the value date precedes the entry date — a wire
          sent on the 29th that clears on the 2nd, or cash handed over on a Friday
          and entered on Sunday. The flag is raised by the system and can only be
          cleared by the Internal Auditor.
        </p>

        <div className="mt-5">
          <Ledger>
            <thead>
              <tr>
                <Th>Receipt</Th>
                <Th>Donor</Th>
                <Th>Method</Th>
                <Th align="right">Amount</Th>
                <Th>Value date</Th>
                <Th>Entered</Th>
                <Th align="right">Gap</Th>
                <Th align="right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {backdated.map((d) => {
                const gap = Math.round(
                  (new Date(d.enteredOn).getTime() - new Date(d.transactionDate).getTime()) / 86400000
                );
                return (
                  <tr key={d.id} className="bg-rust-tint/50">
                    <Td mono className="font-semibold">{d.receiptNo}</Td>
                    <Td className="whitespace-nowrap">{d.donorName}</Td>
                    <Td>{PAYMENT_LABEL[d.paymentMethod]}</Td>
                    <Td align="right" mono>{rupees(d.amount)}</Td>
                    <Td mono>{shortDate(d.transactionDate)}</Td>
                    <Td mono>{shortDate(d.enteredOn)}</Td>
                    <Td align="right" mono className="text-rust">{gap} days</Td>
                    <Td align="right">
                      <ProtoAction
                        label="Clear"
                        variant="quiet"
                        size="sm"
                        title={`Clear ${d.receiptNo}`}
                        does="Marks the backdated entry as reviewed and accepted by the Internal Auditor."
                        detail={[
                          "Clearing writes the auditor's member ID and the date onto the row. It does not change the value date or the entry date — both stay as they were.",
                          "Only the Internal Auditor may clear. A Committee member or Admin who tries is refused, and the attempt is written to the audit trail.",
                        ]}
                      />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Ledger>
        </div>
      </section>

      {/* ---------------- AUDIT TRAIL ---------------- */}
      <section className="mt-12">
        <h2 className="display border-b-2 border-ink pb-2 text-[19px] leading-tight">
          Audit trail
        </h2>
        <p className="mt-4 max-w-3xl text-[13.5px] leading-[1.65] text-ink-2">
          Every act that moves money, decides an application or changes what the
          public sees. Append-only — no row here can be edited or removed by
          anybody, including Admin.
        </p>

        <div className="mt-5">
          <Ledger>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Member</Th>
                <Th>Action</Th>
                <Th>Particulars</Th>
              </tr>
            </thead>
            <tbody>
              {AUDIT_TRAIL.map((t, i) => (
                <tr key={i}>
                  <Td mono className="whitespace-nowrap">{longDate(t.at)}</Td>
                  <Td mono className="text-ink-2">{t.who}</Td>
                  <Td className="font-semibold whitespace-nowrap">{t.what}</Td>
                  <Td className="text-ink-2">{t.detail}</Td>
                </tr>
              ))}
            </tbody>
          </Ledger>
        </div>
      </section>

      <Panel tone="sunk" className="mt-12">
        <div className="p-5">
          <div className="label label-brass">Filed with</div>
          <p className="mt-2 max-w-3xl text-[13.5px] leading-[1.65] text-ink-2">
            Office of the Charity Commissioner, Ratnagiri, under registration{" "}
            <span className="num">{SOCIETY.registrationNo}</span>. Audited by
            S. K. Joshi &amp; Associates, Chiplun. The statement for 2025–26 was
            filed on 12 July 2026; {ZAKAT_SUMMARY.householdsHelped} households and{" "}
            {PROJECTS.length} works are covered by the current year's account.
          </p>
        </div>
      </Panel>
    </>
  );
}
