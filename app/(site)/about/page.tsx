import { PageHead, Container, Section, Panel, Stat, DefRow, JaliRule } from "@/components/ui/primitives";
import { ProtoAction } from "@/components/proto-action";
import { Seal } from "@/components/seal";
import { SOCIETY } from "@/lib/site";
import { OFFICE_BEARERS, MEMBER_ROLL, PROJECTS, ZAKAT_SUMMARY } from "@/lib/mock-data";

export const metadata = { title: "The Society" };

const MILESTONES = [
  { year: "2015", text: "Twenty-two households of Pewe register the Society to put the village's informal relief collection on a proper footing." },
  { year: "2017", text: "First Ramzan ration distribution run against a verified household list rather than by word of mouth." },
  { year: "2018", text: "Members working in the Gulf begin remitting directly; the Overseas Coordinator's post is created." },
  { year: "2020", text: "Monthly stipends for widows and the elderly are put on a standing sanction, renewed once a year." },
  { year: "2022", text: "Committee resolves that no work above ₹1,00,000 may be awarded on fewer than three written quotations." },
  { year: "2024", text: "Accounts moved to a receipt-number system; every rupee in becomes traceable to a head and a head to a work." },
  { year: "2026", text: "Water scheme begins. The Society takes on its largest single work to date." },
];

export default function AboutPage() {
  return (
    <>
      <PageHead
        overline="The Society"
        title="A village society, run like an office."
        hinglish="Society ke baare mein"
        lede="Pewe Social Welfare Society was registered in 2015 by twenty-two households who had been collecting for funerals, illnesses and roof repairs for years without a book to show for it."
      />

      <Section>
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
          <div className="max-w-2xl space-y-5 text-[17px] leading-[1.78] text-ink-2">
            <p>
              Pewe sits inland of Guhagar, where the paddy runs up to the foot of
              the Sahyadri and the road out to the taluka town takes the better
              part of an hour. Like most villages on this coast, a good share of
              its working men are not in it — they are in Mumbai, in Bhiwandi, or
              in the Gulf, and they have been sending money home for two
              generations.
            </p>
            <p>
              What the village did not have was a record. Money was collected for
              a funeral, for a hospital bill, for the masjid roof, and it was
              spent, and that was the end of it. Nobody doubted anyone's honesty.
              But a man in Dammam who sends ₹40,000 has no way to see what became
              of it, and a widow who is refused a stipend has no way to know on
              what ground.
            </p>
            <p>
              The Society was registered to fix exactly that. Every rupee that
              comes in is receipted against a numbered head. Every work above one
              lakh goes out to three written quotations, opened before the
              committee, with the comparison published. Every welfare application
              is heard on a fixed day and the decision recorded with the name of
              the member who took it. The audited statement is filed with the
              Charity Commissioner at Ratnagiri each July, and any member may ask
              the Secretary for a copy.
            </p>
            <p>
              It is not a large organisation. It is {MEMBER_ROLL.total} members,
              one account book, and a rule that the book is open.
            </p>
          </div>

          <div>
            <Panel tone="sunk">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <Seal size={64} />
                  <div>
                    <div className="display text-[18px] leading-tight">{SOCIETY.name}</div>
                    <div className="marathi mt-1 text-[14.5px] text-ink-2">{SOCIETY.nameMarathi}</div>
                    <div dir="rtl" lang="ur" className="mt-1 text-[15.5px] text-ink-2">{SOCIETY.nameUrdu}</div>
                  </div>
                </div>

                <dl className="mt-6">
                  <DefRow term="Public Trust Reg.">{SOCIETY.registrationNo}</DefRow>
                  <DefRow term="Society Reg.">{SOCIETY.societyRegNo}</DefRow>
                  <DefRow term="Established">{SOCIETY.foundedYear}</DefRow>
                  <DefRow term="Registered office">
                    {SOCIETY.address.line1}, {SOCIETY.address.line2},<br />
                    {SOCIETY.address.line3}, {SOCIETY.address.state} {SOCIETY.address.pin}
                  </DefRow>
                  <DefRow term="Audit filed with">
                    Office of the Charity Commissioner, Ratnagiri
                  </DefRow>
                </dl>

                <div className="mt-6">
                  <ProtoAction
                    label="Download the trust deed"
                    variant="quiet"
                    size="sm"
                    fullWidth
                    does="Serves the registered trust deed and the current year's audited statement as PDFs."
                    detail={["In the finished system these are held in file storage and versioned, so the copy a member downloads is always the one last filed."]}
                  />
                </div>
              </div>
            </Panel>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
              <Stat label="Members on the roll" value={String(MEMBER_ROLL.total)} sub={`${MEMBER_ROLL.registered} registered, ${MEMBER_ROLL.unregistered} pending`} />
              <Stat label="Households helped this year" value={String(ZAKAT_SUMMARY.householdsHelped)} sub="Across all four welfare heads" tone="maroon" />
            </div>
          </div>
        </div>
      </Section>

      {/* ---------------- COMMITTEE ---------------- */}
      <section className="border-y-2 border-ink bg-paper-2">
        <Container className="py-14 sm:py-16">
          <div className="label label-brass">Office bearers</div>
          <h2 className="display mt-3 text-[28px] leading-tight sm:text-[34px]">
            Who carries which responsibility.
          </h2>
          <p className="mt-4 max-w-2xl text-[17px] leading-[1.72] text-ink-2">
            Elected by the General Body. Two posts come up for election at the
            meeting on 27 September 2026.
          </p>

          <div className="mt-10 grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-3">
            {OFFICE_BEARERS.map((o) => (
              <div key={o.memberId} className="bg-paper p-6">
                <div className="label label-maroon">{o.post}</div>
                <div className="marathi mt-1 text-[14.5px] text-ink-3">{o.postMarathi}</div>
                <div className="display mt-3 text-[18px] leading-tight">{o.name}</div>
                <div className="num mt-2 text-[13px] text-ink-3">
                  {o.memberId} · in post since {o.since}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ---------------- HOW IT GREW ---------------- */}
      <Section>
        <div className="label label-brass">How it grew</div>
        <h2 className="display mt-3 text-[28px] leading-tight sm:text-[34px]">
          Eleven years, in the order they happened.
        </h2>

        <ol className="mt-10 max-w-3xl">
          {MILESTONES.map((m) => (
            <li key={m.year} className="grid grid-cols-[auto_1fr] gap-6 border-t border-rule py-5 sm:gap-10">
              <div className="num text-[20px] leading-none text-maroon">{m.year}</div>
              <p className="text-[16.5px] leading-[1.7] text-ink-2">{m.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-2 rule-strong" />

        <div className="mt-10">
          <JaliRule className="max-w-xs" />
        </div>
      </Section>
    </>
  );
}
