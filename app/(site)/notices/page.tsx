import { PageHead, Section, Badge, JaliRule } from "@/components/ui/primitives";
import { ANNOUNCEMENTS } from "@/lib/mock-data";
import { longDate } from "@/lib/format";

export const metadata = { title: "Notices" };

export default function NoticesPage() {
  const pinned = ANNOUNCEMENTS.filter((a) => a.pinned);
  const rest = ANNOUNCEMENTS.filter((a) => !a.pinned);

  return (
    <>
      <PageHead
        overline="Notice board"
        title="What the office has put up."
        lede="Meeting notices, tender openings, work reports and renewals. Members abroad get the same notice on the same day as members in the village."
      />

      <Section>
        {pinned.length > 0 && (
          <div className="mb-14">
            <div className="label label-maroon">Pinned</div>
            <div className="mt-4 space-y-px bg-rule">
              {pinned.map((a) => (
                <article key={a.id} className="border-l-2 border-maroon bg-paper p-6 sm:p-8">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="num text-[12px] text-ink-3">{longDate(a.postedOn)}</span>
                    <Badge tone="flash">Notice</Badge>
                  </div>
                  <h2 className="display mt-2.5 text-[22px] leading-snug sm:text-[25px]">{a.title}</h2>
                  {a.titleMarathi && <p className="marathi mt-1 text-[14px] text-ink-3">{a.titleMarathi}</p>}
                  <p className="mt-4 max-w-3xl text-[15px] leading-[1.75] text-ink-2">{a.body}</p>
                </article>
              ))}
            </div>
          </div>
        )}

        <div className="label label-brass">Earlier</div>
        <div className="mt-4 space-y-px bg-rule">
          {rest.map((a) => (
            <article key={a.id} className="bg-paper p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="num text-[12px] text-ink-3">{longDate(a.postedOn)}</span>
                {a.isNotice ? <Badge tone="approved">Notice</Badge> : <Badge tone="neutral">Report</Badge>}
              </div>
              <h2 className="display mt-2.5 text-[20px] leading-snug sm:text-[22px]">{a.title}</h2>
              {a.titleMarathi && <p className="marathi mt-1 text-[13.5px] text-ink-3">{a.titleMarathi}</p>}
              <p className="mt-3 max-w-3xl text-[14.5px] leading-[1.72] text-ink-2">{a.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-12">
          <JaliRule className="max-w-xs" />
        </div>
      </Section>
    </>
  );
}
