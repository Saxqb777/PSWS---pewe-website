import Link from "next/link";
import { ErpHead } from "@/components/erp/page-head";
import { ProtoAction } from "@/components/proto-action";
import { Stat, Panel, Badge, Progress, Ledger, Th, Td } from "@/components/ui/primitives";
import {
  TREASURY, MEMBER_ROLL, ZAKAT_SUMMARY, DONATION_ROLL, MONTHLY_RECEIPTS,
  RECEIPTS_BY_METHOD, PAYMENT_LABEL, pendingZakat, flashFunds, PROJECTS,
  DONATIONS, ZAKAT_CATEGORIES,
} from "@/lib/mock-data";
import { rupees, rupeesShort, pct, longDate, shortDate, daysUntil } from "@/lib/format";
import { FISCAL_YEAR } from "@/lib/site";

export default function ErpDashboard() {
  const pending = pendingZakat();
  const flash = flashFunds();
  const maxMonth = Math.max(...MONTHLY_RECEIPTS.map((m) => m.amount));
  const maxMethod = Math.max(...RECEIPTS_BY_METHOD.map((r) => r.amount));
  const recent = DONATIONS.slice(0, 8);
  const tendering = PROJECTS.filter((p) => p.status === "TENDERING");

  return (
    <>
      <ErpHead
        title={`Dashboard — ${FISCAL_YEAR}`}
        lede="What needs a decision today, and how the year stands."
        actions={
          <>
            <ProtoAction
              label="Enter a receipt"
              variant="primary"
              size="sm"
              does="Opens the receipt-entry sheet — donor, amount, method, reference, date and head."
              detail={[
                "Writes a Donation row and raises the next receipt number in one transaction, so the book can never have a receipt without an entry or an entry without a receipt.",
                "If the transaction date is earlier than today, the entry is flagged backdated and goes into the auditor's review set.",
              ]}
            />
            <ProtoAction
              label="Open a flash fund"
              variant="secondary"
              size="sm"
              does="Opens the flash-fund sheet — title, purpose, target, and hard deadline."
              detail={[
                "Requires two Committee signatures before it goes live on the public site.",
                "The fund stops accepting entries the moment the target is met, and the surplus decision is recorded against the minute.",
              ]}
            />
          </>
        }
      />

      {/* ---------------- HEADLINE ---------------- */}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Receipts to date" value={rupees(TREASURY.receiptsThisYear)} sub={`${DONATION_ROLL.entriesThisYear} entries`} tone="pine" />
        <Stat label="Disbursements" value={rupees(TREASURY.disbursementsThisYear)} sub="All three heads" tone="maroon" />
        <Stat label="Balance in hand" value={rupees(TREASURY.balance)} sub="Bank and cash" tone="brass" />
        <Stat label="Members on the roll" value={String(MEMBER_ROLL.total)} sub={`${MEMBER_ROLL.total - MEMBER_ROLL.duesPaidThisYear} yet to pay dues`} />
      </div>

      {/* ---------------- NEEDS A DECISION ---------------- */}
      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-3">
          <h2 className="display text-[20px] leading-tight">Waiting on the committee</h2>
          <span className="label">{pending.length + tendering.length} items</span>
        </div>

        <div className="mt-5 grid gap-px bg-rule lg:grid-cols-2">
          {/* Welfare queue */}
          <div className="bg-paper p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="label label-maroon">Welfare applications pending</h3>
              <Link href="/erp/zakat" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-maroon hover:underline">
                Open queue
              </Link>
            </div>

            <ul className="mt-4 space-y-px bg-rule">
              {pending.map((r) => (
                <li key={r.id} className="bg-paper py-3">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-ink">{r.applicantName}</div>
                      <div className="num text-[11.5px] text-ink-3">
                        {r.reference} · {r.mohalla} · applied {shortDate(r.submittedOn)}
                      </div>
                    </div>
                    <div className="num shrink-0 text-[14px] text-ink">{rupees(r.amount)}</div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone="pending">
                      {ZAKAT_CATEGORIES.find((c) => c.key === r.category)?.label}
                    </Badge>
                    {r.isRecurring && <Badge tone="neutral">Standing renewal</Badge>}
                    <span className="num text-[11px] text-ink-3">
                      {daysUntil(r.submittedOn, "2026-09-02") * -1} days waiting
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Quotations to open */}
          <div className="bg-paper p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="label label-maroon">Quotations to be opened</h3>
              <Link href="/erp/projects" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-maroon hover:underline">
                Open works
              </Link>
            </div>

            {tendering.map((p) => (
              <div key={p.id} className="mt-4">
                <div className="text-[14.5px] font-semibold text-ink">{p.title}</div>
                <div className="num mt-0.5 text-[11.5px] text-ink-3">
                  Budget {rupees(p.budget)} · {p.quotations.length} quotations in hand
                </div>

                <div className="mt-3">
                  <Ledger>
                    <thead>
                      <tr>
                        <Th>Vendor</Th>
                        <Th align="right">Amount</Th>
                        <Th align="right">vs lowest</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...p.quotations].sort((a, b) => a.amount - b.amount).map((q, i, arr) => (
                        <tr key={q.id}>
                          <Td>
                            {q.vendorName}
                            <span className="block text-[11px] text-ink-3">{q.vendorPlace}</span>
                          </Td>
                          <Td align="right" mono>{rupees(q.amount)}</Td>
                          <Td align="right" mono className={i === 0 ? "text-pine" : "text-ink-3"}>
                            {i === 0 ? "lowest" : `+${rupees(q.amount - arr[0].amount)}`}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Ledger>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <ProtoAction
                    label="Record the opening"
                    variant="primary"
                    size="sm"
                    does="Marks the quotations as formally opened before the committee and stamps the minute date."
                    detail={[
                      "Until this is done the amounts are sealed — no member, including Admin, can see a vendor's price. That is what stops a second vendor being told what to beat.",
                      "Opening is irreversible and is written to the audit trail with the names of the members present.",
                    ]}
                  />
                  <ProtoAction
                    label="Award to lowest"
                    variant="secondary"
                    size="sm"
                    does="Marks the selected quotation as awarded and moves the project from TENDERING to IN_PROGRESS."
                    detail={[
                      "Awarding to anything other than the lowest quotation requires a written reason, which is published on the public project page beside the comparison.",
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- MONEY ---------------- */}
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
              <div key={m.month} className="num flex-1 pt-2 text-center text-[11px] text-ink-3">
                {m.month}
              </div>
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

      {/* ---------------- FLASH + RECENT ---------------- */}
      <section className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-12">
        <div>
          <h2 className="display border-b border-rule pb-2 text-[18px] leading-tight">
            Flash funds open
          </h2>
          {flash.map((c) => (
            <Panel key={c.id} className="mt-4">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="display text-[16px] leading-tight">{c.title}</h3>
                  <Badge tone="flash">
                    {c.deadline && daysUntil(c.deadline) > 0 ? `${daysUntil(c.deadline)}d` : "today"}
                  </Badge>
                </div>
                <div className="num mt-3 text-[20px] leading-none text-maroon">
                  {rupees(c.raisedAmount)}
                </div>
                <div className="num mt-1 text-[11.5px] text-ink-3">of {rupees(c.targetAmount)}</div>
                <div className="mt-3">
                  <Progress value={pct(c.raisedAmount, c.targetAmount)} tone="maroon" />
                </div>
                <div className="num mt-2 text-[11.5px] text-ink-3">
                  {c.donorCount} contributors · short by {rupees(c.targetAmount - c.raisedAmount)}
                </div>
              </div>
            </Panel>
          ))}

          <Panel tone="sunk" className="mt-5">
            <div className="p-5">
              <div className="label label-maroon">Auditor's attention</div>
              <p className="mt-2 text-[13px] leading-[1.6] text-ink-2">
                {DONATION_ROLL.backdatedPending} backdated entries are awaiting
                review. Both are wires whose value date preceded the entry date.
              </p>
              <div className="mt-3">
                <ProtoAction
                  label="Review backdated entries"
                  variant="quiet"
                  size="sm"
                  fullWidth
                  does="Filters the ledger to entries where the transaction date precedes the entry date."
                  detail={["The Internal Auditor clears these as a set at the year end. Clearing writes the auditor's member ID and the date to each row."]}
                />
              </div>
            </div>
          </Panel>
        </div>

        <div>
          <div className="flex items-end justify-between gap-4 border-b border-rule pb-2">
            <h2 className="display text-[18px] leading-tight">Latest entries</h2>
            <Link href="/erp/donations" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-maroon hover:underline">
              Full ledger
            </Link>
          </div>

          <div className="mt-4">
            <Ledger>
              <thead>
                <tr>
                  <Th>Receipt</Th>
                  <Th>Donor</Th>
                  <Th>Method</Th>
                  <Th align="right">Amount</Th>
                  <Th>Date</Th>
                </tr>
              </thead>
              <tbody>
                {recent.map((d) => (
                  <tr key={d.id}>
                    <Td mono className="font-semibold">{d.receiptNo}</Td>
                    <Td>
                      {d.donorName}
                      <span className="num block text-[11px] text-ink-3">{d.donorMemberId}</span>
                    </Td>
                    <Td>{PAYMENT_LABEL[d.paymentMethod]}</Td>
                    <Td align="right" mono>{rupees(d.amount)}</Td>
                    <Td mono>
                      {shortDate(d.transactionDate)}
                      {d.isBackdated && (
                        <span className="ml-1.5 text-[10px] font-semibold text-rust">BD</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Ledger>
          </div>
        </div>
      </section>
    </>
  );
}
