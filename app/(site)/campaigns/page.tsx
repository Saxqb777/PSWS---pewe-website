import { PageHead, Container, Section, Panel, Badge, Progress, SectionHead } from "@/components/ui/primitives";
import { ProtoAction } from "@/components/proto-action";
import { CAMPAIGNS } from "@/lib/mock-data";
import { rupees, pct, longDate, daysUntil } from "@/lib/format";

export const metadata = { title: "Campaigns" };

export default function CampaignsPage() {
  const flash = CAMPAIGNS.filter((c) => c.isFlashFund);
  const standing = CAMPAIGNS.filter((c) => !c.isFlashFund && c.status === "ACTIVE");
  const closed = CAMPAIGNS.filter((c) => !c.isFlashFund && c.status !== "ACTIVE");

  return (
    <>
      <PageHead
        overline="Campaigns"
        title="What we are raising for."
        lede="Two kinds of appeal. A flash fund is opened within a day when a household cannot wait, and closes the moment it is met. A standing campaign runs against a budgeted work until it is paid for."
      />

      {/* ---------------- FLASH FUNDS ---------------- */}
      <section id="flash" className="border-b-2 border-ink bg-maroon-tint">
        <Container className="py-14 sm:py-16">
          <div className="label label-maroon">Flash funds</div>
          <h2 className="display mt-3 text-[26px] leading-tight sm:text-[32px]">
            Opened in a day, closed on the target.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.7] text-ink-2">
            A flash fund needs two committee signatures to open and carries a
            hard deadline. Any surplus is carried to the general relief head with
            the committee's approval, and that decision is minuted.
          </p>

          <div className="mt-10 space-y-px bg-rule">
            {flash.map((c) => {
              const left = c.deadline ? daysUntil(c.deadline) : 0;
              const open = c.status === "ACTIVE";
              return (
                <article key={c.id} className="grid gap-6 bg-paper p-6 lg:grid-cols-[1.6fr_1fr] lg:gap-10 lg:p-8">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge tone="flash">Flash fund</Badge>
                      <Badge tone={c.status.toLowerCase()}>{c.status}</Badge>
                      <span className="num text-[11.5px] text-ink-3">
                        Opened {longDate(c.openedOn)}
                      </span>
                    </div>
                    <h3 className="display mt-3 text-[24px] leading-tight">{c.title}</h3>
                    <p className="mt-3 text-[14.5px] leading-[1.7] text-ink-2">{c.description}</p>
                  </div>

                  <Panel tone="sunk" className="self-start">
                    <div className="p-5">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="num text-[24px] leading-none text-maroon">
                          {rupees(c.raisedAmount)}
                        </span>
                        <span className="num text-[12px] text-ink-3">
                          of {rupees(c.targetAmount)}
                        </span>
                      </div>
                      <div className="mt-3">
                        <Progress value={pct(c.raisedAmount, c.targetAmount)} tone="maroon" />
                      </div>
                      <dl className="mt-4 space-y-1.5 border-t border-rule pt-3 text-[12.5px]">
                        <div className="flex justify-between gap-3">
                          <dt className="text-ink-3">Contributors</dt>
                          <dd className="num text-ink">{c.donorCount}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-ink-3">Deadline</dt>
                          <dd className="num text-ink">
                            {c.deadline ? longDate(c.deadline) : "—"}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-ink-3">Status</dt>
                          <dd className="num text-ink">
                            {open ? (left > 0 ? `${left} days left` : "Closing today") : "Closed"}
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-5">
                        <ProtoAction
                          label={open ? "Contribute" : "See the accounts"}
                          variant={open ? "primary" : "quiet"}
                          size="sm"
                          fullWidth
                          does={open
                            ? "Opens the payment sheet for this flash fund with all five methods the Society accepts."
                            : "Opens the closed-fund statement: every receipt against this fund, what was spent, and what the surplus was carried to."}
                          detail={open
                            ? ["A numbered receipt is raised on confirmation and the fund total updates in the same write. When the target is reached the fund closes itself and stops accepting entries."]
                            : ["Closed funds stay published permanently. A member who gave to it can always come back and see what it bought."]}
                        />
                      </div>
                    </div>
                  </Panel>
                </article>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ---------------- STANDING CAMPAIGNS ---------------- */}
      <Section>
        <SectionHead
          overline="Open now"
          title="Standing campaigns."
          lede="Each of these is tied to a budgeted work. Follow the link on any of them through to the project to see the quotations and the spend."
        />

        <div className="mt-10 grid gap-px bg-rule md:grid-cols-2 lg:grid-cols-3">
          {standing.map((c) => (
            <article key={c.id} className="flex flex-col bg-paper p-6">
              <h3 className="display text-[19px] leading-tight">{c.title}</h3>
              {c.titleMarathi && <p className="marathi mt-1 text-[13px] text-ink-3">{c.titleMarathi}</p>}
              <p className="mt-3 flex-1 text-[13.5px] leading-[1.65] text-ink-2">{c.description}</p>

              <div className="mt-6">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="num text-[19px] text-ink">{rupees(c.raisedAmount)}</span>
                  <span className="num text-[11.5px] text-ink-3">of {rupees(c.targetAmount)}</span>
                </div>
                <div className="mt-2.5">
                  <Progress value={pct(c.raisedAmount, c.targetAmount)} tone="brass" />
                </div>
                <div className="num mt-2 text-[11.5px] text-ink-3">
                  {c.donorCount} contributors · opened {longDate(c.openedOn)}
                </div>
              </div>

              <div className="mt-5 border-t border-rule pt-4">
                <ProtoAction
                  label="Contribute"
                  variant="secondary"
                  size="sm"
                  does={`Opens the payment sheet for "${c.title}".`}
                  detail={["Cash, GPay, PhonePe, bank transfer or international wire — all five end in the same numbered receipt against this campaign."]}
                />
              </div>
            </article>
          ))}
        </div>
      </Section>

      {/* ---------------- CLOSED ---------------- */}
      <section className="border-t-2 border-ink bg-paper-2">
        <Container className="py-14 sm:py-16">
          <SectionHead
            overline="Closed"
            title="Campaigns already met."
            lede="Kept published so that anyone who gave can see what became of it."
          />

          <div className="mt-8 space-y-px bg-rule">
            {closed.map((c) => (
              <div key={c.id} className="grid gap-4 bg-paper p-5 sm:grid-cols-[1.6fr_1fr_auto] sm:items-center sm:gap-8">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="display text-[17px] leading-tight">{c.title}</h3>
                    <Badge tone={c.status.toLowerCase()}>{c.status}</Badge>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-[1.6] text-ink-2">{c.summary}</p>
                </div>
                <div className="num text-[14px] text-ink">
                  {rupees(c.raisedAmount)}{" "}
                  <span className="text-ink-3">raised of {rupees(c.targetAmount)}</span>
                </div>
                <div className="num text-[12px] text-ink-3 sm:text-right">
                  {c.donorCount} contributors
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
