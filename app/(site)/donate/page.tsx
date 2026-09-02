import { PageHead, Container, Section, Panel, Stat, SectionHead, JaliRule } from "@/components/ui/primitives";
import { ProtoAction } from "@/components/proto-action";
import { SOCIETY } from "@/lib/site";
import { RECEIPTS_BY_METHOD, PAYMENT_LABEL, TREASURY } from "@/lib/mock-data";
import { rupees, rupeesShort } from "@/lib/format";

export const metadata = { title: "Donate" };

const METHODS = [
  {
    key: "CASH",
    head: "Cash",
    where: "At the office, or to the Treasurer at the masjid after Jumu'ah",
    detail: "A numbered receipt is written out on the spot from the counterfoil book. The counterfoil is entered the same evening.",
    note: "Best for small regular giving from within the village.",
  },
  {
    key: "UPI_GPAY",
    head: "GPay",
    where: "To the Society number — " + SOCIETY.phone,
    detail: "Send with your member ID in the note field. The Treasurer matches it against the statement and raises the receipt.",
    note: "Same number for GPay and PhonePe.",
  },
  {
    key: "UPI_PHONEPE",
    head: "PhonePe",
    where: "To the Society number — " + SOCIETY.phone,
    detail: "Send with your member ID in the note field, and the campaign name if it is for a particular appeal.",
    note: "Reaches the account the same minute.",
  },
  {
    key: "BANK_TRANSFER",
    head: "Bank Transfer",
    where: "NEFT, IMPS or RTGS to the Society's current account",
    detail: "Account particulars are given on request to any member. Quote your member ID in the remitter's narration.",
    note: "Preferred for anything above ₹50,000 from within India.",
  },
  {
    key: "INTERNATIONAL_WIRE",
    head: "International Wire",
    where: "From the Gulf, or anywhere you are working",
    detail: "The Treasurer enters the wire against the bank advice, so the receipt number and the bank reference always match in the audit trail. Allow two to three working days.",
    note: "The single largest source of the Society's receipts.",
  },
] as const;

export default function DonatePage() {
  const byMethod = Object.fromEntries(RECEIPTS_BY_METHOD.map((r) => [r.method, r]));

  return (
    <>
      <PageHead
        overline="Give"
        title="Five ways in, one receipt book."
        lede="However the money arrives, it ends in the same numbered receipt, against the same head, in the same statement that goes to the Charity Commissioner each July."
      />

      <Section>
        <div className="space-y-px bg-rule">
          {METHODS.map((m) => {
            const stats = byMethod[m.key];
            return (
              <div key={m.key} className="grid gap-6 bg-paper p-6 lg:grid-cols-[1.2fr_1.4fr_auto] lg:items-center lg:gap-10 lg:p-8">
                <div>
                  <h2 className="display text-[22px] leading-tight">{m.head}</h2>
                  <p className="mt-1.5 text-[13.5px] leading-snug text-ink-2">{m.where}</p>
                  {stats && (
                    <p className="num mt-3 text-[12px] text-brass">
                      {rupeesShort(stats.amount)} received this year over {stats.count} entries
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[14px] leading-[1.68] text-ink-2">{m.detail}</p>
                  <p className="mt-2 text-[12.5px] italic text-ink-3">{m.note}</p>
                </div>
                <ProtoAction
                  label={`Give by ${m.head}`}
                  variant={m.key === "INTERNATIONAL_WIRE" ? "primary" : "secondary"}
                  size="sm"
                  does={`Opens the ${m.head} sheet — amount, which campaign or head it is for, and your member ID.`}
                  detail={[
                    "On confirmation the system writes a Donation row with the payment method, the transaction reference and the date, then raises a numbered receipt in the same transaction so the two can never diverge.",
                    m.key === "CASH"
                      ? "Cash entries carry the counterfoil number and the name of the member who received it, because cash is the only method with no bank record behind it."
                      : "The bank or UPI reference is stored alongside the receipt number, so the audit trail runs both ways.",
                  ]}
                />
              </div>
            );
          })}
        </div>
      </Section>

      {/* ---------------- BACKDATING ---------------- */}
      <section className="border-y-2 border-ink bg-paper-2">
        <Container className="py-14 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
            <div>
              <div className="label label-brass">A note on late entries</div>
              <h2 className="display mt-3 text-[26px] leading-tight sm:text-[30px]">
                Money that arrived before it was entered.
              </h2>
              <p className="mt-4 max-w-2xl text-[15px] leading-[1.72] text-ink-2">
                A wire sent from Dammam on the 29th may not show on the Society's
                statement until the 2nd. Cash handed over at the masjid on a
                Friday may not reach the book until Sunday. Rather than pretend
                the money arrived when it was written down, the system records
                both dates and flags the entry as backdated.
              </p>
              <p className="mt-4 max-w-2xl text-[15px] leading-[1.72] text-ink-2">
                Backdated entries appear in the ledger with a marker, and the
                Internal Auditor reviews them as a set at the year end. It is a
                small thing, but it is the difference between a book that is
                tidy and a book that is true.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
              <Stat label="Receipts this year" value={rupees(TREASURY.receiptsThisYear)} sub="All methods, all heads" tone="pine" />
              <Stat label="From abroad" value={rupees(byMethod.INTERNATIONAL_WIRE?.amount ?? 0)} sub="Members working in the Gulf" tone="brass" />
            </div>
          </div>
        </Container>
      </section>

      <Section>
        <SectionHead
          overline="Before you give"
          title="Read the accounts first."
          lede="We would rather you gave having seen where last year's money went. The full statement of receipts and disbursements is published, not summarised."
          align="center"
        />
        <div className="mt-8 flex justify-center">
          <JaliRule className="w-64" />
        </div>
      </Section>
    </>
  );
}
