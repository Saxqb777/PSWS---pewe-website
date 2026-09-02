import { PageHead, Section, Panel, Badge, SectionHead } from "@/components/ui/primitives";
import { ProtoAction } from "@/components/proto-action";
import { SPONSORS } from "@/lib/mock-data";

export const metadata = { title: "Sponsors" };

export default function SponsorsPage() {
  const active = SPONSORS.filter((s) => s.isActive);
  const past = SPONSORS.filter((s) => !s.isActive);

  return (
    <>
      <PageHead
        overline="Sponsors"
        title="Businesses that carry a share of the running costs."
        lede="Sponsorship pays the Society's own costs — stationery, travel to Ratnagiri for filings, the audit fee — so that money given for welfare goes wholly to welfare."
      />

      <Section>
        <div className="grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-3">
          {active.map((s) => (
            <article key={s.id} className="flex flex-col bg-paper">
              {/* Banner slot — the real artwork drops in here */}
              <div className="jali-column border-b border-rule bg-paper-2 px-6 py-10 text-center opacity-90">
                <div className="display text-[19px] leading-tight text-ink">{s.businessName}</div>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <div className="label label-brass">{s.category}</div>
                <div className="mt-2 text-[14px] text-ink-2">{s.proprietor}</div>
                <div className="mt-1 text-[13px] text-ink-3">{s.place}</div>
                <div className="num mt-4 flex-1 text-[12px] text-ink-3">{s.contactPhone}</div>
                <div className="mt-4 border-t border-rule pt-3">
                  <Badge tone="approved">Supporting since {s.supportSince}</Badge>
                </div>
              </div>
            </article>
          ))}
        </div>

        {past.length > 0 && (
          <div className="mt-14">
            <SectionHead overline="Past sponsors" title="With thanks." />
            <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-2">
              {past.map((s) => (
                <li key={s.id} className="text-[14px] text-ink-3">
                  {s.businessName} <span className="num text-[12px]">({s.supportSince})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Panel className="mt-14">
          <div className="jali-band" />
          <div className="grid gap-6 p-8 lg:grid-cols-[1.6fr_1fr] lg:items-center lg:gap-12">
            <div>
              <h2 className="display text-[24px] leading-tight sm:text-[28px]">
                Sponsor a year of the Society's running costs.
              </h2>
              <p className="mt-3 max-w-2xl text-[15px] leading-[1.72] text-ink-2">
                A sponsorship is entered as any other receipt, against its own
                head, and appears in the audited statement like everything else.
                Your banner goes up on this page and on the notice board at the
                masjid.
              </p>
            </div>
            <ProtoAction
              label="Enquire about sponsoring"
              variant="primary"
              size="md"
              fullWidth
              does="Opens the sponsor enquiry form — business name, proprietor, category, contact number and banner artwork."
              detail={[
                "Submissions land in the ERP as a pending sponsor. The banner does not appear on this page until a Committee member approves it.",
                "Banner artwork is held in file storage, not in the database, so a large image never slows the public pages down.",
              ]}
            />
          </div>
        </Panel>
      </Section>
    </>
  );
}
