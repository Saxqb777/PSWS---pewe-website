import Link from "next/link";
import { Hero } from "@/components/hero";
import { ProtoAction } from "@/components/proto-action";
import {
  Container, Section, SectionHead, Panel, Stat, Badge, Progress,
  JaliRule, ArcadeRule,
} from "@/components/ui/primitives";
import {
  activeCampaigns, flashFunds, PROJECTS, ANNOUNCEMENTS, SPONSORS,
  TREASURY, MEMBER_ROLL, ZAKAT_SUMMARY,
} from "@/lib/mock-data";
import { rupees, rupeesShort, pct, longDate, daysUntil } from "@/lib/format";
import { FISCAL_YEAR } from "@/lib/site";

export default function HomePage() {
  const flash = flashFunds();
  const campaigns = activeCampaigns().filter((c) => !c.isFlashFund);
  const running = PROJECTS.filter((p) => p.status !== "COMPLETED").slice(0, 3);
  const notices = ANNOUNCEMENTS.slice(0, 3);

  return (
    <>
      <Hero />

      {/* ---------------- THE THREE HEADS OF WORK ---------------- */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_1.6fr] lg:gap-16">
          <SectionHead
            overline="What the Society does"
            title="Three heads of work, one account book."
            lede="Everything the Society raises falls under one of three heads. Each rupee is receipted, entered against a head, and placed before the General Body once a year."
          />

          <div className="grid gap-px bg-rule sm:grid-cols-3">
            {[
              {
                head: "Zakat & Welfare",
                body: "Medical costs, monthly stipends for widows and the elderly, school fees, and emergencies. Applications are heard every second Friday.",
                figure: rupeesShort(ZAKAT_SUMMARY.disbursedThisYear),
                note: `${ZAKAT_SUMMARY.householdsHelped} households this year`,
                href: "/zakat",
              },
              {
                head: "Village Projects",
                body: "Water, the masjid, the Urdu school, the burial ground, roads and lights. Three quotations, opened before the committee, published here.",
                figure: rupeesShort(TREASURY.projectHead),
                note: `${PROJECTS.filter((p) => p.status !== "COMPLETED").length} projects running`,
                href: "/projects",
              },
              {
                head: "Flash Funds",
                body: "When a household needs money this week and not next month. Opened within a day, closed the moment the target is met.",
                figure: rupeesShort(TREASURY.reliefHead),
                note: `${flash.length} open right now`,
                href: "/campaigns#flash",
              },
            ].map((c) => (
              <Link
                key={c.head}
                href={c.href}
                className="group flex flex-col bg-paper p-6 transition-colors hover:bg-paper-2"
              >
                <h3 className="display text-[20px] leading-tight group-hover:text-maroon">
                  {c.head}
                </h3>
                <p className="mt-3 flex-1 text-[13.5px] leading-[1.65] text-ink-2">{c.body}</p>
                <div className="mt-6 border-t-2 border-ink pt-3">
                  <div className="num text-[22px] leading-none text-maroon">{c.figure}</div>
                  <div className="label mt-2">{c.note}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </Section>

      {/* ---------------- FLASH FUND ---------------- */}
      {flash.length > 0 && (
        <section id="flash" className="border-y-2 border-ink bg-maroon-tint">
          <Container className="py-14 sm:py-16">
            <div className="label label-maroon">Urgent — open now</div>

            {flash.map((c) => {
              const left = daysUntil(c.deadline!);
              return (
                <div key={c.id} className="mt-5 grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:gap-14">
                  <div>
                    <h2 className="display text-[28px] leading-[1.14] sm:text-[34px]">
                      {c.title}
                    </h2>
                    <p className="mt-4 max-w-2xl text-[15.5px] leading-[1.72] text-ink-2">
                      {c.description}
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <Badge tone="flash">Flash fund</Badge>
                      <span className="num text-[12.5px] text-ink-2">
                        {left > 0 ? `${left} days remaining` : "Closing today"}
                      </span>
                      <span className="text-ink-3">·</span>
                      <span className="num text-[12.5px] text-ink-2">
                        {c.donorCount} contributors
                      </span>
                    </div>
                  </div>

                  <Panel className="self-start">
                    <div className="p-6">
                      <div className="label">Raised so far</div>
                      <div className="num mt-2 text-[30px] leading-none text-maroon">
                        {rupees(c.raisedAmount)}
                      </div>
                      <div className="num mt-2 text-[13px] text-ink-3">
                        of {rupees(c.targetAmount)} needed
                      </div>
                      <div className="mt-5">
                        <Progress value={pct(c.raisedAmount, c.targetAmount)} tone="maroon" />
                      </div>
                      <div className="mt-6">
                        <ProtoAction
                          label="Contribute to this fund"
                          variant="primary"
                          size="md"
                          fullWidth
                          does="Opens the payment sheet — Cash at the office, GPay or PhonePe to the Society number, bank transfer, or an international wire for members abroad."
                          detail={[
                            "On confirmation the system writes a Donation row against this campaign, raises a numbered receipt, and adds the amount to the raised total within the same transaction.",
                            "Wires from abroad are entered by the Treasurer against the bank advice, so the receipt number and the bank reference always match in the audit trail.",
                          ]}
                        />
                      </div>
                    </div>
                  </Panel>
                </div>
              );
            })}
          </Container>
        </section>
      )}

      {/* ---------------- CAMPAIGNS ---------------- */}
      <Section>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead
            overline="Open campaigns"
            title="What we are raising for."
            lede="Each campaign has a target, a published purpose, and a running total that anyone may check."
          />
          <Link
            href="/campaigns"
            className="border border-ink px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            All campaigns
          </Link>
        </div>

        <div className="mt-10 grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <article key={c.id} className="flex flex-col bg-paper p-6">
              <h3 className="display text-[19px] leading-tight">{c.title}</h3>
              {c.titleMarathi && (
                <p className="marathi mt-1 text-[13px] text-ink-3">{c.titleMarathi}</p>
              )}
              <p className="mt-3 flex-1 text-[13.5px] leading-[1.65] text-ink-2">{c.summary}</p>

              <div className="mt-6">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="num text-[19px] text-ink">{rupeesShort(c.raisedAmount)}</span>
                  <span className="num text-[12px] text-ink-3">
                    of {rupeesShort(c.targetAmount)}
                  </span>
                </div>
                <div className="mt-2.5">
                  <Progress value={pct(c.raisedAmount, c.targetAmount)} tone="brass" />
                </div>
              </div>

              <div className="mt-5 border-t border-rule pt-4">
                <ProtoAction
                  label="Contribute"
                  variant="secondary"
                  size="sm"
                  does={`Opens the payment sheet for "${c.title}" with all five methods the Society accepts.`}
                  detail={[
                    "A numbered receipt is raised on confirmation and the campaign total updates in the same write.",
                  ]}
                />
              </div>
            </article>
          ))}
        </div>
      </Section>

      {/* ---------------- THE YEAR IN FIGURES ---------------- */}
      <section className="border-y-2 border-ink bg-paper-2">
        <Container className="py-14 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHead
              overline={`Financial year ${FISCAL_YEAR}`}
              title="The year so far, in figures."
              lede="Updated as entries are made. The audited statement is filed with the Charity Commissioner, Ratnagiri, each July."
            />
            <Link
              href="/reports"
              className="border border-ink px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:bg-ink hover:text-paper"
            >
              Full accounts
            </Link>
          </div>

          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Receipts" value={rupees(TREASURY.receiptsThisYear)} sub="All heads, since 1 April" tone="pine" />
            <Stat label="Disbursements" value={rupees(TREASURY.disbursementsThisYear)} sub="Welfare, projects and relief" tone="maroon" />
            <Stat label="Balance in hand" value={rupees(TREASURY.balance)} sub="Bank and cash together" />
            <Stat label="Members on the roll" value={String(MEMBER_ROLL.total)} sub={`${MEMBER_ROLL.basedAbroad} of them working abroad`} tone="brass" />
          </div>
        </Container>
      </section>

      {/* ---------------- PROJECTS ---------------- */}
      <Section>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead
            overline="In the village"
            title="Projects on the ground."
            lede="Every project carries its quotations, its milestones and its spend against budget — visible to any member, not only the committee."
          />
          <Link
            href="/projects"
            className="border border-ink px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            All projects
          </Link>
        </div>

        <div className="mt-10 space-y-px bg-rule">
          {running.map((p) => (
            <Link
              key={p.id}
              href="/projects"
              className="group grid gap-4 bg-paper p-6 transition-colors hover:bg-paper-2 sm:grid-cols-[1.7fr_1fr_auto] sm:items-center sm:gap-8"
            >
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="display text-[19px] leading-tight group-hover:text-maroon">
                    {p.title}
                  </h3>
                  <Badge tone={p.status.toLowerCase()}>{p.status.replace("_", " ")}</Badge>
                </div>
                <p className="mt-2 max-w-xl text-[13.5px] leading-[1.6] text-ink-2">
                  {p.description}
                </p>
              </div>

              <div>
                <div className="num text-[15px] text-ink">
                  {rupeesShort(p.spent)}{" "}
                  <span className="text-ink-3">of {rupeesShort(p.budget)} spent</span>
                </div>
                <div className="mt-2">
                  <Progress value={pct(p.spent, p.budget)} tone="pine" showLabel={false} />
                </div>
                <div className="label mt-2">
                  {p.milestones.filter((m) => m.done).length} of {p.milestones.length} milestones
                </div>
              </div>

              <div className="num text-[12px] text-ink-3 sm:text-right">
                {p.quotations.length > 0
                  ? `${p.quotations.length} quotation${p.quotations.length > 1 ? "s" : ""}`
                  : "Quotations awaited"}
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* ---------------- NOTICES & SPONSORS ---------------- */}
      <Section tone="sunk">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
          <div>
            <div className="flex items-end justify-between gap-6">
              <SectionHead overline="Notice board" title="Latest notices." />
              <Link
                href="/notices"
                className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-maroon hover:underline"
              >
                All notices
              </Link>
            </div>

            <div className="mt-8 space-y-px bg-rule">
              {notices.map((n) => (
                <article key={n.id} className="bg-paper p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="num text-[11.5px] text-ink-3">{longDate(n.postedOn)}</span>
                    {n.isNotice && <Badge tone="approved">Notice</Badge>}
                    {n.pinned && <Badge tone="flash">Pinned</Badge>}
                  </div>
                  <h3 className="display mt-2 text-[17px] leading-snug">{n.title}</h3>
                  {n.titleMarathi && (
                    <p className="marathi mt-1 text-[13px] text-ink-3">{n.titleMarathi}</p>
                  )}
                  <p className="mt-2 line-clamp-2 text-[13.5px] leading-[1.6] text-ink-2">
                    {n.body}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div>
            <SectionHead overline="Standing with us" title="Sponsors." />
            <p className="mt-4 text-[14px] leading-[1.7] text-ink-2">
              Local businesses and members' firms who carry a share of the
              Society's costs each year.
            </p>

            <ul className="mt-8 space-y-px bg-rule">
              {SPONSORS.filter((s) => s.isActive).map((s) => (
                <li key={s.id} className="bg-paper px-5 py-4">
                  <div className="text-[14.5px] font-semibold text-ink">{s.businessName}</div>
                  <div className="mt-0.5 text-[12.5px] text-ink-3">
                    {s.category} · {s.place}
                  </div>
                  <div className="num mt-1 text-[11px] text-brass">Since {s.supportSince}</div>
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <ProtoAction
                label="Become a sponsor"
                variant="secondary"
                size="sm"
                does="Opens the sponsor enquiry form — business name, proprietor, category, contact number and the banner artwork."
                detail={[
                  "Submissions land in the ERP as a pending sponsor for the committee to approve before the banner appears on the public site.",
                ]}
              />
            </div>
          </div>
        </div>
      </Section>

      {/* ---------------- DONATE ---------------- */}
      <section className="border-t-2 border-ink bg-ink text-paper">
        <div className="jali-band" />
        <Container className="py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-center lg:gap-16">
            <div>
              <div className="label" style={{ color: "var(--color-brass-light)" }}>
                Give
              </div>
              <h2 className="display mt-3 text-[30px] leading-[1.1] text-paper sm:text-[38px]">
                Five ways to give, one receipt book.
              </h2>
              <p className="mt-5 max-w-xl text-[15.5px] leading-[1.72] text-paper/75">
                Cash at the office, GPay or PhonePe to the Society number, a bank
                transfer, or an international wire from wherever you are working.
                Every method ends in the same numbered receipt and the same
                published account.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/donate"
                className="inline-flex items-center justify-center border border-brass-light bg-brass-light px-7 py-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:bg-brass hover:border-brass"
              >
                See the ways to give
              </Link>
              <Link
                href="/reports"
                className="inline-flex items-center justify-center border border-paper/40 px-7 py-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-paper transition-colors hover:bg-paper hover:text-ink"
              >
                Read the accounts first
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
