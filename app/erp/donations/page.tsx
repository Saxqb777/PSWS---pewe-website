import { ErpHead } from "@/components/erp/page-head";
import { ProtoAction } from "@/components/proto-action";
import { Stat, Badge, Ledger, Th, Td, Panel } from "@/components/ui/primitives";
import { DONATIONS, DONATION_ROLL, PAYMENT_LABEL, TREASURY, CAMPAIGNS } from "@/lib/mock-data";
import { rupees, longDate, shortDate } from "@/lib/format";
import { FISCAL_YEAR } from "@/lib/site";

export const metadata = { title: "Donations ledger" };

export default function DonationsPage() {
  const sample = DONATIONS.reduce((s, d) => s + d.amount, 0);
  const backdated = DONATIONS.filter((d) => d.isBackdated);
  const title = (slug?: string) => CAMPAIGNS.find((c) => c.slug === slug)?.title;

  return (
    <>
      <ErpHead
        title="Donations ledger"
        lede={`Every receipt raised in ${FISCAL_YEAR}, in the order it was entered. A receipt number is never reused and never deleted — a wrong entry is reversed, not removed.`}
        actions={
          <>
            <ProtoAction
              label="Enter a receipt"
              variant="primary"
              size="sm"
              does="Opens the receipt-entry sheet — donor, amount, method, transaction reference, value date and head."
              detail={[
                "Writes the Donation row and raises the next receipt number in a single transaction.",
                "If the value date precedes today, the row is flagged backdated automatically. The entry clerk cannot clear that flag; only the Internal Auditor can.",
                "Cash entries additionally require the counterfoil number and the name of the member who received the money.",
              ]}
            />
            <ProtoAction
              label="Reverse an entry"
              variant="danger"
              size="sm"
              does="Opens the reversal sheet for a receipt already raised."
              detail={[
                "A reversal writes a second, negative row referencing the first. Nothing is ever deleted from the ledger.",
                "Requires a written reason and a second Committee signature. Both are published on the audit trail.",
              ]}
            />
            <ProtoAction
              label="Export"
              variant="quiet"
              size="sm"
              does="Exports the filtered ledger as a spreadsheet, with the current filters applied."
            />
          </>
        }
      />

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Receipts this year" value={rupees(TREASURY.receiptsThisYear)} sub={`${DONATION_ROLL.entriesThisYear} entries`} tone="pine" />
        <Stat label="In this sample" value={rupees(sample)} sub={`${DONATIONS.length} most recent entries`} />
        <Stat label="Backdated" value={String(backdated.length)} sub="Awaiting auditor review" tone="maroon" />
        <Stat label="Largest single entry" value={rupees(Math.max(...DONATIONS.map((d) => d.amount)))} sub="International wire" tone="brass" />
      </div>

      {/* Filter row — sits above the table, as filters should */}
      <Panel tone="sunk" className="mt-8">
        <div className="flex flex-wrap items-center gap-2.5 p-4">
          <span className="label mr-2">Filter</span>
          {["All methods", "Cash only", "Wires only", "Backdated only", "This month", "By campaign"].map((f) => (
            <ProtoAction
              key={f}
              label={f}
              variant="quiet"
              size="sm"
              title={`Filter — ${f}`}
              does={`Narrows the ledger to "${f}" and carries the filter through to any export.`}
              detail={["Filters are held in the URL, so a committee member can send another the exact view they are looking at."]}
            />
          ))}
        </div>
      </Panel>

      <div className="mt-6">
        <Ledger>
          <thead>
            <tr>
              <Th>Receipt no.</Th>
              <Th>Donor</Th>
              <Th>Method</Th>
              <Th>Bank / txn reference</Th>
              <Th align="right">Amount</Th>
              <Th>Value date</Th>
              <Th>Entered</Th>
              <Th>Against</Th>
              <Th>By</Th>
              <Th align="right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {DONATIONS.map((d) => (
              <tr key={d.id} className={d.isBackdated ? "bg-rust-tint/50" : ""}>
                <Td mono className="whitespace-nowrap font-semibold">{d.receiptNo}</Td>
                <Td className="whitespace-nowrap">
                  {d.donorName}
                  <span className="num block text-[12px] text-ink-3">{d.donorMemberId}</span>
                </Td>
                <Td className="whitespace-nowrap">{PAYMENT_LABEL[d.paymentMethod]}</Td>
                <Td mono className="text-ink-2">{d.transactionRef ?? <span className="text-ink-3">counterfoil</span>}</Td>
                <Td align="right" mono className="font-semibold">{rupees(d.amount)}</Td>
                <Td mono className="whitespace-nowrap">
                  {shortDate(d.transactionDate)}
                  {d.isBackdated && <Badge tone="pending">Backdated</Badge>}
                </Td>
                <Td mono className="whitespace-nowrap text-ink-3">{shortDate(d.enteredOn)}</Td>
                <Td className="max-w-[14rem] text-ink-2">{title(d.campaignSlug) ?? "General fund"}</Td>
                <Td mono className="text-ink-3">{d.enteredBy}</Td>
                <Td align="right">
                  <ProtoAction
                    label="View"
                    variant="quiet"
                    size="sm"
                    title={`Receipt ${d.receiptNo}`}
                    does="Opens the receipt — the printable counterfoil, the bank advice if there is one, and the full audit trail for the row."
                    detail={[
                      `Entered by ${d.enteredBy} on ${longDate(d.enteredOn)} against a value date of ${longDate(d.transactionDate)}.`,
                      d.isBackdated
                        ? "This row is flagged backdated because the value date precedes the entry date. It sits in the Internal Auditor's review set until cleared."
                        : "Value date and entry date agree, so no backdating flag was raised.",
                    ]}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </Ledger>
      </div>

      <p className="mt-4 text-[13.5px] text-ink-3">
        Showing {DONATION_ROLL.shownInPrototype} of {DONATION_ROLL.entriesThisYear} entries for {FISCAL_YEAR}.
      </p>
    </>
  );
}
