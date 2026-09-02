import { PageHead, Container, Section, Panel, DefRow, SectionHead } from "@/components/ui/primitives";
import { ProtoAction } from "@/components/proto-action";
import { Seal } from "@/components/seal";
import { SOCIETY } from "@/lib/site";
import { OFFICE_BEARERS } from "@/lib/mock-data";

export const metadata = { title: "Contact" };

const WARDS = [
  { mohalla: "Masjid Aali", rep: "Mushtaq Ali Dalvi", memberId: "PSWS-006" },
  { mohalla: "Bazarpeth", rep: "Ibrahim Yusuf Parkar", memberId: "PSWS-002" },
  { mohalla: "Naka", rep: "Adnan Firoz Jamadar", memberId: "PSWS-031" },
  { mohalla: "Khalchi Aali", rep: "Sarfaraz Ali Ghadi", memberId: "PSWS-024" },
  { mohalla: "Varchi Aali", rep: "Ilyas Abdul Dabholkar", memberId: "PSWS-026" },
  { mohalla: "Shaikh Wadi", rep: "Zubair Ahmed Bagwan", memberId: "PSWS-011" },
];

export default function ContactPage() {
  return (
    <>
      <PageHead
        overline="Contact"
        title="Where to find us."
        lede="The office is the room beside the masjid hall. Someone is there after Asr on most days, and after Jumu'ah without fail."
      />

      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
          <div>
            <Panel tone="sunk">
              <div className="jali-band" />
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <Seal size={60} />
                  <div>
                    <div className="display text-[19px] leading-tight">{SOCIETY.name}</div>
                    <div className="marathi mt-1 text-[13px] text-ink-2">{SOCIETY.nameMarathi}</div>
                  </div>
                </div>

                <dl className="mt-6">
                  <DefRow term="Registered office">
                    {SOCIETY.address.line1}<br />
                    {SOCIETY.address.line2}<br />
                    {SOCIETY.address.line3}, {SOCIETY.address.state} {SOCIETY.address.pin}
                  </DefRow>
                  <DefRow term="Telephone">
                    <a href={SOCIETY.phoneHref} className="num hover:text-maroon">{SOCIETY.phone}</a>
                  </DefRow>
                  <DefRow term="Email">
                    <span className="num">{SOCIETY.email}</span>
                  </DefRow>
                  <DefRow term="Office hours">
                    After Asr, most days<br />
                    After Jumu'ah, without fail
                  </DefRow>
                  <DefRow term="Getting here">
                    Guhagar–Chiplun road, then the Pewe turning. About 18 km from
                    Guhagar; the last stretch is single track.
                  </DefRow>
                </dl>
              </div>
            </Panel>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <ProtoAction
                label="Open in maps"
                variant="quiet"
                size="sm"
                fullWidth
                does="Opens the village location in the visitor's map application."
                detail={["A static map tile is embedded on this page in the finished site, with the office pin and the masjid marked."]}
              />
              <ProtoAction
                label="Write to the office"
                variant="secondary"
                size="sm"
                fullWidth
                does="Opens the general enquiry form — name, contact, and message."
                detail={[
                  "Messages land in the ERP under an enquiries queue with the Secretary, not in a personal inbox, so nothing is lost when a post changes hands.",
                ]}
              />
            </div>
          </div>

          <div>
            <SectionHead
              overline="Ward representatives"
              title="Or speak to your own mohalla's man."
              lede="For a welfare application you do not need to come to the office at all. Each mohalla has a representative who can fill the form and carry it in."
            />

            <div className="mt-8 grid gap-px bg-rule sm:grid-cols-2">
              {WARDS.map((w) => (
                <div key={w.mohalla} className="bg-paper p-5">
                  <div className="label label-brass">{w.mohalla}</div>
                  <div className="display mt-2 text-[17px] leading-tight">{w.rep}</div>
                  <div className="num mt-1 text-[12px] text-ink-3">{w.memberId}</div>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <SectionHead overline="Office bearers" title="Who to ask for, by subject." />
              <ul className="mt-6 space-y-px bg-rule">
                {OFFICE_BEARERS.map((o) => (
                  <li key={o.memberId} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 bg-paper px-5 py-3.5">
                    <span className="text-[14.5px] font-semibold text-ink">{o.name}</span>
                    <span className="label">{o.post}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
