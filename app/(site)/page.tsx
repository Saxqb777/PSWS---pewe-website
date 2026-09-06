import Link from "next/link";
import { Hero } from "@/components/hero";
import { SectionNav, type NavSection } from "@/components/section-nav";
import { GiveButton } from "@/components/give-panel";
import { ProtoAction } from "@/components/proto-action";
import {
  Container, SectionHead, Onward, Panel, Stat, Badge, Progress,
} from "@/components/ui/primitives";
import {
  activeCampaigns, flashFunds, PROJECTS, ANNOUNCEMENTS, SPONSORS,
  TREASURY, MEMBER_ROLL, ZAKAT_SUMMARY, ZAKAT_CATEGORIES,
  YEARLY_COLLECTION, ELEVEN_YEARS,
} from "@/lib/mock-data";
import { rupees, rupeesShort, pct, longDate, daysUntil } from "@/lib/format";
import { FISCAL_YEAR, SOCIETY } from "@/lib/site";

const SECTIONS: NavSection[] = [
  { id: "urgent", label: "Urgent" },
  { id: "work", label: "Our work" },
  { id: "campaigns", label: "Campaigns" },
  { id: "figures", label: "Accounts" },
  { id: "projects", label: "Projects" },
  { id: "zakat", label: "Zakat" },
  { id: "notices", label: "Notices" },
  { id: "sponsors", label: "Sponsors" },
  { id: "contact", label: "Contact" },
];

export default function HomePage() {
  const flash = flashFunds();
  const campaigns = activeCampaigns().filter((c) => !c.isFlashFund);
  const running = PROJECTS.filter((p) => p.status !== "COMPLETED").slice(0, 3);
  const notices = ANNOUNCEMENTS.slice(0, 3);
  const sponsors = SPONSORS.filter((s) => s.isActive);

  return (
    <>
      <Hero />
      <SectionNav sections={SECTIONS} />

      {/* ═══════════════ 1 · URGENT ═══════════════ */}
      {flash.length > 0 && (
        <section id="urgent" className="border-b-2 border-ink bg-maroon-tint">
          <Container className="py-16 sm:py-20">
            <SectionHead
              overline="Urgent — open right now"
              title="Someone needs help this week."
              hinglish="Abhi zaroorat hai"
              lede="A flash fund is opened within a day when a household cannot wait for the next meeting, and it closes the moment the target is met."
            />

            {flash.map((c) => {
              const left = daysUntil(c.deadline!);
              return (
                <div key={c.id} className="mt-10 grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:gap-14">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge tone="flash">Flash fund</Badge>
                      <span className="num text-[13.5px] text-ink-2">
                        {left > 0 ? `${left} days remaining` : "Closing today"}
                      </span>
                      <span className="text-ink-3">·</span>
                      <span className="num text-[13.5px] text-ink-2">{c.donorCount} contributors</span>
                    </div>

                    <h3 className="display mt-4 text-[26px] leading-[1.14] sm:text-[32px]">
                      {c.title}
                    </h3>
                    <p className="mt-4 max-w-2xl text-[17px] leading-[1.72] text-ink-2">
                      {c.description}
                    </p>
                  </div>

                  <Panel className="self-start">
                    <div className="p-6">
                      <div className="label">Raised so far</div>
                      <div className="num mt-2 text-[32px] leading-none text-maroon">
                        {rupees(c.raisedAmount)}
                      </div>
                      <div className="num mt-2 text-[14.5px] text-ink-3">
                        of {rupees(c.targetAmount)} needed
                      </div>
                      <div className="mt-5">
                        <Progress value={pct(c.raisedAmount, c.targetAmount)} tone="maroon" />
                      </div>
                      <div className="mt-6">
                        <GiveButton fullWidth size="lg" purpose={c.title} label="Is fund mein dijiye" />
                      </div>
                    </div>
                  </Panel>
                </div>
              );
            })}
          </Container>
        </section>
      )}

      {/* ═══════════════ 2 · WHAT WE DO ═══════════════ */}
      <section id="work" className="border-b border-rule">
        <Container className="py-16 sm:py-20">
          <SectionHead
            overline="What the Society does"
            title="Three heads of work, one account book."
            hinglish="Hum kya karte hain"
            lede="Every rupee that comes in falls under one of three heads. It is receipted, entered against its head, and placed before the General Body once a year."
          />

          <div className="mt-12 grid gap-px bg-rule sm:grid-cols-3">
            {[
              {
                head: "Zakat & Welfare",
                hinglish: "Zakat aur madad",
                body: "Medical costs, monthly stipends for widows and the elderly, school fees, and emergencies. Applications are heard every second Friday.",
                figure: rupeesShort(ZAKAT_SUMMARY.disbursedThisYear),
                note: `${ZAKAT_SUMMARY.householdsHelped} households this year`,
                href: "#zakat",
              },
              {
                head: "Village Projects",
                hinglish: "Gaon ke kaam",
                body: "Water, the community building, the school, the burial ground, roads and street lights. Three quotations, opened before the committee, published here.",
                figure: rupeesShort(TREASURY.developmentHead),
                note: `${PROJECTS.filter((p) => p.status !== "COMPLETED").length} works running`,
                href: "#projects",
              },
              {
                head: "Flash Funds",
                hinglish: "Turant madad",
                body: "When a household needs money this week and not next month. Opened within a day, closed the moment the target is met.",
                figure: rupeesShort(TREASURY.reliefHead),
                note: `${flash.length} open right now`,
                href: "#urgent",
              },
            ].map((c) => (
              <a key={c.head} href={c.href} className="group flex flex-col bg-paper p-7 transition-colors hover:bg-paper-2">
                <h3 className="display text-[22px] leading-tight group-hover:text-maroon">{c.head}</h3>
                <p className="mt-1 text-[15px] italic text-brass">{c.hinglish}</p>
                <p className="mt-4 flex-1 text-[15px] leading-[1.68] text-ink-2">{c.body}</p>
                <div className="mt-7 border-t-2 border-ink pt-3">
                  <div className="num text-[25px] leading-none text-maroon">{c.figure}</div>
                  <div className="label mt-2">{c.note}</div>
                </div>
              </a>
            ))}
          </div>
        </Container>
      </section>

      {/* ═══════════════ 3 · CAMPAIGNS ═══════════════ */}
      <section id="campaigns" className="border-b border-rule bg-paper-2">
        <Container className="py-16 sm:py-20">
          <SectionHead
            overline="Open now"
            title="What we are raising for."
            hinglish="Abhi kis cheez ke liye"
            lede="Each campaign has a target, a published purpose, and a running total anyone may check at any time."
          />

          <div className="mt-12 grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c) => (
              <article key={c.id} className="flex flex-col bg-paper p-7">
                <h3 className="display text-[21px] leading-tight">{c.title}</h3>
                {c.titleMarathi && <p className="marathi mt-1 text-[14.5px] text-ink-3">{c.titleMarathi}</p>}
                <p className="mt-4 flex-1 text-[15px] leading-[1.68] text-ink-2">{c.summary}</p>

                <div className="mt-7">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="num text-[21px] text-ink">{rupeesShort(c.raisedAmount)}</span>
                    <span className="num text-[13.5px] text-ink-3">of {rupeesShort(c.targetAmount)}</span>
                  </div>
                  <div className="mt-3">
                    <Progress value={pct(c.raisedAmount, c.targetAmount)} tone="brass" />
                  </div>
                </div>

                <div className="mt-6 border-t border-rule pt-5">
                  <GiveButton size="sm" fullWidth purpose={c.title} label="Donate" />
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      {/* ═══════════════ 4 · THE YEAR IN FIGURES ═══════════════ */}
      <section id="figures" className="border-b-2 border-ink">
        <Container className="py-16 sm:py-20">
          <SectionHead
            overline={`Financial year ${FISCAL_YEAR}`}
            title="The year so far, in figures."
            hinglish="Saal ka hisaab"
            lede="Nothing is carried forward. What is collected in a year is spent inside that year — the balance below is only what has not yet gone out."
          />

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Collected this year" value={rupees(TREASURY.receiptsThisYear)} sub="April to date" tone="pine" provisional />
            <Stat label="Disbursed" value={rupees(TREASURY.disbursementsThisYear)} sub="Welfare, development and relief" tone="maroon" provisional />
            <Stat label="Yet to go out" value={rupees(TREASURY.balance)} sub="Nothing is carried to next year" />
            <Stat label="Members on the roll" value={String(MEMBER_ROLL.total)} sub={`${MEMBER_ROLL.basedAbroad} of them working abroad`} tone="brass" />
          </div>

          <p className="mt-10 max-w-2xl text-[17px] leading-[1.72] text-ink-2">
            Across eleven years the collection has roughly doubled — from about{" "}
            {rupeesShort(YEARLY_COLLECTION[0].amount)} in the first year to{" "}
            {rupeesShort(YEARLY_COLLECTION[YEARLY_COLLECTION.length - 1].amount)} in
            the last completed one, and{" "}
            <span className="text-ink">{rupeesShort(ELEVEN_YEARS.collected)}</span> in all.
          </p>

          <div className="mt-8">
            <Onward href="/accounts" label="Paisa kahan gaya — poora hisaab" note="Year by year, the full ledger and the audit filings" tone="maroon" />
          </div>
        </Container>
      </section>

      {/* ═══════════════ 5 · PROJECTS ═══════════════ */}
      <section id="projects" className="border-b border-rule bg-paper-2">
        <Container className="py-16 sm:py-20">
          <SectionHead
            overline="In the village"
            title="Works on the ground."
            hinglish="Gaon ke kaam"
            lede="Every project carries its quotations, its milestones and its spend against budget — visible to any member, not only the committee."
          />

          <div className="mt-12 space-y-px bg-rule">
            {running.map((p) => (
              <div key={p.id} className="grid gap-5 bg-paper p-7 lg:grid-cols-[1.7fr_1fr] lg:items-center lg:gap-10">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="display text-[21px] leading-tight">{p.title}</h3>
                    <Badge tone={p.status.toLowerCase()}>{p.status.replace("_", " ")}</Badge>
                  </div>
                  <p className="mt-3 max-w-xl text-[15px] leading-[1.65] text-ink-2">{p.description}</p>
                </div>

                <div>
                  <div className="num text-[16.5px] text-ink">
                    {rupeesShort(p.spent)}{" "}
                    <span className="text-ink-3">of {rupeesShort(p.budget)} spent</span>
                  </div>
                  <div className="mt-2.5">
                    <Progress value={pct(p.spent, p.budget)} tone="pine" showLabel={false} />
                  </div>
                  <div className="label mt-3">
                    {p.milestones.filter((m) => m.done).length} of {p.milestones.length} milestones ·{" "}
                    {p.quotations.length > 0 ? `${p.quotations.length} quotations` : "quotations awaited"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-10 max-w-2xl text-[17px] leading-[1.72] text-ink-2">
            Behind these stand eleven years of finished work — the water supply and
            its tanks at mountain level, the village roads, the street lights, the
            boundary walls, and the wells brought back into use.
          </p>

          <div className="mt-8">
            <Onward href="/projects" label="Saare kaam dekhiye" note="Everything built since 2015, with the quotation comparisons" />
          </div>
        </Container>
      </section>

      {/* ═══════════════ 6 · ZAKAT & WELFARE ═══════════════ */}
      <section id="zakat" className="border-b border-rule">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
            <div>
              <SectionHead
                overline="Zakat & Welfare"
                title="Help, on a fixed day, on a recorded ground."
                hinglish="Zakat aur madad"
                lede="You do not need to be a member to apply. You need to live in Pewe, or in the wadis the Society covers."
              />

              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
                <Stat label="Disbursed this year" value={rupees(ZAKAT_SUMMARY.disbursedThisYear)} sub={`${ZAKAT_SUMMARY.householdsHelped} households helped`} tone="maroon" />
                <Stat label="Average decision" value={`${ZAKAT_SUMMARY.averageDecisionDays} days`} sub="Application to committee decision" tone="pine" />
              </div>

              <div className="mt-8">
                <ProtoAction
                  label="Madad ke liye apply kijiye"
                  variant="primary"
                  size="lg"
                  does="Opens the welfare application form — which head, how much is sought, the circumstances, and any supporting paper."
                  detail={[
                    "On submission the system creates a request with status PENDING and a reference of the form ZR-2627-000, and notifies the Welfare Officer.",
                    "You can check that reference on this site at any time to see whether it has been heard.",
                    "You may also apply on paper through your mohalla's ward representative — the record is identical either way.",
                  ]}
                />
              </div>
            </div>

            <div>
              <div className="label label-brass border-b border-rule pb-2">
                Kis cheez ke liye — the four heads
              </div>
              <div className="mt-5 grid gap-px bg-rule sm:grid-cols-2">
                {ZAKAT_CATEGORIES.map((c) => (
                  <div key={c.key} className="bg-paper p-6">
                    <div className="display text-[20px] leading-tight">{c.label}</div>
                    <p className="mt-3 text-[15px] leading-[1.65] text-ink-2">{c.note}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-l-2 border-brass bg-paper-2 px-5 py-4">
                <p className="text-[15px] leading-[1.68] text-ink-2">
                  Applications are placed before the committee every second Friday.
                  The decision is recorded with the name of the member who took it —
                  so a refusal can always be argued with, and a sanction is never a
                  favour.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ═══════════════ 7 · NOTICES ═══════════════ */}
      <section id="notices" className="border-b border-rule bg-paper-2">
        <Container className="py-16 sm:py-20">
          <SectionHead
            overline="Notice board"
            title="What the office has put up."
            hinglish="Suchna"
            lede="Meeting notices, tender openings and work reports. A member in Dammam gets the same notice on the same day as a member in the village."
          />

          <div className="mt-12 space-y-px bg-rule">
            {notices.map((n) => (
              <article key={n.id} className={`bg-paper p-6 sm:p-7 ${n.pinned ? "border-l-2 border-maroon" : ""}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="num text-[13px] text-ink-3">{longDate(n.postedOn)}</span>
                  {n.pinned ? <Badge tone="flash">Pinned</Badge> : n.isNotice ? <Badge tone="approved">Notice</Badge> : <Badge tone="neutral">Report</Badge>}
                </div>
                <h3 className="display mt-3 text-[20px] leading-snug">{n.title}</h3>
                {n.titleMarathi && <p className="marathi mt-1 text-[14.5px] text-ink-3">{n.titleMarathi}</p>}
                <p className="mt-3 max-w-3xl text-[15px] leading-[1.7] text-ink-2">{n.body}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      {/* ═══════════════ 8 · SPONSORS ═══════════════ */}
      <section id="sponsors" className="border-b-2 border-ink">
        <Container className="py-16 sm:py-20">
          <SectionHead
            overline="Standing with us"
            title="Businesses that carry the running costs."
            hinglish="Hamare saath"
            lede="Sponsorship pays the Society's own costs — stationery, the travel to Ratnagiri for filings, the audit fee — so that money given for welfare goes wholly to welfare."
          />

          <div className="mt-12 grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-3">
            {sponsors.map((s) => (
              <div key={s.id} className="bg-paper p-6">
                <div className="display text-[19px] leading-tight">{s.businessName}</div>
                <div className="mt-2 text-[15px] text-ink-2">{s.proprietor}</div>
                <div className="mt-1 text-[14px] text-ink-3">{s.category} · {s.place}</div>
                <div className="num mt-4 text-[13px] text-brass">Since {s.supportSince}</div>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <ProtoAction
              label="Sponsor banna hai?"
              variant="secondary"
              size="md"
              does="Opens the sponsor enquiry form — business name, proprietor, category, contact number and the banner artwork."
              detail={[
                "Submissions land in the office as a pending sponsor. The banner does not appear on this page until a Committee member approves it.",
                "A sponsorship is entered in the donations ledger against its own head like any other receipt.",
              ]}
            />
          </div>
        </Container>
      </section>

      {/* ═══════════════ 9 · GIVE & CONTACT ═══════════════ */}
      <section id="contact" className="bg-ink text-paper">
        <div className="jali-band" />
        <Container className="py-16 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
            <div>
              <div className="label" style={{ color: "var(--color-brass-light)" }}>
                Donation aur sampark
              </div>
              <h2 className="display mt-3 text-[32px] leading-[1.1] text-paper sm:text-[40px]">
                Five ways to give, one receipt book.
              </h2>
              <p className="mt-3 text-[17px] italic text-brass-light">
                Paanch tareeke — hisaab ek hi
              </p>
              <p className="mt-5 max-w-xl text-[17px] leading-[1.72] text-paper/75">
                Nakad at the office, GPay or PhonePe to the Society number, a bank
                transfer, or a cheque. Every method ends in the same numbered receipt
                and the same published account. The Society takes domestic
                contributions only.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <GiveButton size="lg" variant="onDark" label="Zakat & Donation" />
                <Onward href="/about" label="About the Society" tone="onDark" />
              </div>
            </div>

            <div className="border-t-2 border-brass-light pt-6 lg:border-t-0 lg:border-l lg:border-paper/20 lg:pt-0 lg:pl-10">
              <div className="label" style={{ color: "var(--color-brass-light)" }}>
                Where to find us
              </div>
              <address className="mt-4 not-italic text-[16.5px] leading-[1.8] text-paper/85">
                {SOCIETY.address.line1}<br />
                {SOCIETY.address.line2}<br />
                {SOCIETY.address.line3}, {SOCIETY.address.state} {SOCIETY.address.pin}
              </address>

              <a href={SOCIETY.phoneHref} className="num mt-5 block text-[19px] text-brass-light hover:underline">
                {SOCIETY.phone}
              </a>

              <p className="mt-6 border-t border-paper/20 pt-4 text-[15px] leading-[1.7] text-paper/70">
                The office is the room beside the community hall. Someone is there
                most afternoons, and on Friday afternoons without fail.
              </p>

              <dl className="mt-6 space-y-2 border-t border-paper/20 pt-4 text-[14px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-paper/55">Public Trust Reg.</dt>
                  <dd className="num text-paper/90">{SOCIETY.registrationNo}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-paper/55">Society Reg.</dt>
                  <dd className="num text-paper/90">{SOCIETY.societyRegNo}</dd>
                </div>
              </dl>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
