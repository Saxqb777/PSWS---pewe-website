import { ErpHead } from "@/components/erp/page-head";
import { ProtoAction } from "@/components/proto-action";
import { Stat, Badge, Progress, Ledger, Th, Td } from "@/components/ui/primitives";
import { CAMPAIGNS } from "@/lib/mock-data";
import { rupees, pct, longDate, daysUntil } from "@/lib/format";

export const metadata = { title: "Campaigns" };

export default function ErpCampaignsPage() {
  const active = CAMPAIGNS.filter((c) => c.status === "ACTIVE");
  const raised = CAMPAIGNS.reduce((s, c) => s + c.raisedAmount, 0);
  const target = CAMPAIGNS.reduce((s, c) => s + c.targetAmount, 0);

  return (
    <>
      <ErpHead
        title="Campaigns"
        lede="Every appeal the Society has opened, live and closed. A flash fund needs two Committee signatures to open and closes itself on the target."
        actions={
          <>
            <ProtoAction
              label="Open a campaign"
              variant="primary"
              size="sm"
              does="Opens the campaign sheet — title, purpose, target amount, and whether it is a flash fund with a deadline."
              detail={[
                "A standing campaign goes live on approval by one Committee member. A flash fund requires two signatures because it bypasses the usual notice period.",
                "The campaign's public page is generated from this record, so what donors read is what the committee wrote — there is no second copy to fall out of date.",
              ]}
            />
            <ProtoAction
              label="Close a campaign"
              variant="danger"
              size="sm"
              does="Stops the campaign accepting entries and moves it to COMPLETED or EXPIRED."
              detail={[
                "Any surplus must be assigned to a head before the campaign can close — it cannot be left floating.",
                "Closed campaigns stay published permanently so a contributor can always come back and see what their money bought.",
              ]}
            />
          </>
        }
      />

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Campaigns" value={`${active.length} of ${CAMPAIGNS.length}`} sub="Currently open" />
        <Stat label="Raised across all" value={rupees(raised)} sub={`Against ${rupees(target)} sought`} tone="pine" />
        <Stat label="Flash funds" value={String(CAMPAIGNS.filter((c) => c.isFlashFund).length)} sub={`${CAMPAIGNS.filter((c) => c.isFlashFund && c.status === "ACTIVE").length} open now`} tone="maroon" />
        <Stat label="Contributors" value={String(CAMPAIGNS.reduce((s, c) => s + c.donorCount, 0))} sub="Entries across all campaigns" tone="brass" />
      </div>

      <div className="mt-10">
        <Ledger>
          <thead>
            <tr>
              <Th>Campaign</Th>
              <Th align="center">Kind</Th>
              <Th align="right">Target</Th>
              <Th align="right">Raised</Th>
              <Th>Progress</Th>
              <Th align="right">Givers</Th>
              <Th>Opened</Th>
              <Th>Deadline</Th>
              <Th align="center">Status</Th>
              <Th align="right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {CAMPAIGNS.map((c) => {
              const p = pct(c.raisedAmount, c.targetAmount);
              const left = c.deadline ? daysUntil(c.deadline) : null;
              return (
                <tr key={c.id}>
                  <Td className="max-w-[18rem]">
                    <span className="font-semibold">{c.title}</span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-3">{c.summary}</span>
                  </Td>
                  <Td align="center">
                    {c.isFlashFund ? <Badge tone="flash">Flash</Badge> : <Badge tone="neutral">Standing</Badge>}
                  </Td>
                  <Td align="right" mono>{rupees(c.targetAmount)}</Td>
                  <Td align="right" mono className="font-semibold">{rupees(c.raisedAmount)}</Td>
                  <Td className="min-w-[9rem]">
                    <Progress value={p} tone={c.isFlashFund ? "maroon" : "brass"} showLabel={false} />
                    <span className="num mt-1 block text-[11px] text-ink-3">{p}%</span>
                  </Td>
                  <Td align="right" mono>{c.donorCount}</Td>
                  <Td mono className="whitespace-nowrap">{longDate(c.openedOn)}</Td>
                  <Td mono className="whitespace-nowrap">
                    {c.deadline ? (
                      <>
                        {longDate(c.deadline)}
                        {c.status === "ACTIVE" && left !== null && (
                          <span className={`block text-[11px] ${left <= 7 ? "text-maroon" : "text-ink-3"}`}>
                            {left > 0 ? `${left} days left` : "closing today"}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-ink-3">—</span>
                    )}
                  </Td>
                  <Td align="center"><Badge tone={c.status.toLowerCase()}>{c.status}</Badge></Td>
                  <Td align="right">
                    <ProtoAction
                      label="Open"
                      variant="quiet"
                      size="sm"
                      title={c.title}
                      does="Opens the campaign record — every receipt against it, the public page text, and the surplus decision if it has closed."
                      detail={[
                        c.raisedAmount > c.targetAmount
                          ? `This campaign closed ${rupees(c.raisedAmount - c.targetAmount)} above target. The surplus was carried to the general relief head by committee resolution.`
                          : `${rupees(Math.max(0, c.targetAmount - c.raisedAmount))} short of target.`,
                        "Editing the public text writes a revision, so what donors read at the time they gave can always be recovered.",
                      ]}
                    />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Ledger>
      </div>
    </>
  );
}
