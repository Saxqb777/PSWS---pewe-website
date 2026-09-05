import { ErpHead } from "@/components/erp/page-head";
import { ProtoAction } from "@/components/proto-action";
import { Badge, Ledger, Th, Td, Stat, Panel } from "@/components/ui/primitives";
import { SPONSORS } from "@/lib/mock-data";

export const metadata = { title: "Sponsors" };

export default function ErpSponsorsPage() {
  const active = SPONSORS.filter((s) => s.isActive);

  return (
    <>
      <ErpHead
        title="Sponsors"
        lede="Businesses carrying the Society's own running costs, so that money given for welfare goes wholly to welfare."
        actions={
          <ProtoAction
            label="Add a sponsor"
            variant="primary"
            size="sm"
            does="Opens the sponsor sheet — business name, proprietor, category, place, contact and banner artwork."
            detail={[
              "Banner artwork goes to file storage, not the database, so a large image never slows the public pages.",
              "A sponsor added here does not appear publicly until a Committee member marks it active.",
            ]}
          />
        }
      />

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Sponsors" value={`${active.length} of ${SPONSORS.length}`} sub="Currently active" />
        <Stat label="Longest standing" value={String(Math.min(...SPONSORS.map((s) => s.supportSince)))} sub="Guhagar Hardware & Cement" tone="brass" />
        <Stat label="Overseas" value={String(SPONSORS.filter((s) => s.place.includes(",")).length)} sub="A member's firm in the Gulf" tone="pine" />
        <Stat label="Lapsed" value={String(SPONSORS.length - active.length)} sub="Kept listed with thanks" tone="maroon" />
      </div>

      <div className="mt-10">
        <Ledger>
          <thead>
            <tr>
              <Th>Business</Th>
              <Th>Proprietor</Th>
              <Th>Category</Th>
              <Th>Place</Th>
              <Th>Contact</Th>
              <Th align="center">Since</Th>
              <Th align="center">Status</Th>
              <Th align="right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {SPONSORS.map((s) => (
              <tr key={s.id} className={!s.isActive ? "bg-paper-2" : ""}>
                <Td className="font-semibold whitespace-nowrap">{s.businessName}</Td>
                <Td className="whitespace-nowrap">{s.proprietor}</Td>
                <Td>{s.category}</Td>
                <Td>{s.place}</Td>
                <Td mono className="whitespace-nowrap text-ink-2">{s.contactPhone}</Td>
                <Td align="center" mono>{s.supportSince}</Td>
                <Td align="center">
                  {s.isActive ? <Badge tone="disbursed">Active</Badge> : <Badge tone="rejected">Lapsed</Badge>}
                </Td>
                <Td align="right">
                  <div className="flex justify-end gap-2">
                    <ProtoAction
                      label="Banner"
                      variant="quiet"
                      size="sm"
                      title={`${s.businessName} — banner`}
                      does="Opens the banner artwork for replacement."
                      detail={["Accepts a landscape image. The public sponsor card is generated at three sizes so a phone does not download the print-resolution file."]}
                    />
                    <ProtoAction
                      label={s.isActive ? "Mark lapsed" : "Reactivate"}
                      variant="quiet"
                      size="sm"
                      does={s.isActive
                        ? "Removes the banner from the public site and moves the sponsor to the past-sponsors list."
                        : "Restores the sponsor to the public page."}
                      detail={["Lapsed sponsors are never deleted — they stay listed with thanks, and the years they supported stay on the record."]}
                    />
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Ledger>
      </div>

      <Panel tone="sunk" className="mt-8">
        <div className="p-5">
          <div className="label label-brass">Sponsorship is a receipt like any other</div>
          <p className="mt-2 max-w-3xl text-[15px] leading-[1.65] text-ink-2">
            A sponsorship is entered in the donations ledger against its own head
            and appears in the audited statement. Nothing about a banner on the
            website exempts it from the book.
          </p>
        </div>
      </Panel>
    </>
  );
}
