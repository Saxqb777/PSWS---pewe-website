import Link from "next/link";
import { SOCIETY } from "@/lib/site";
import { Seal } from "@/components/seal";

const COLUMNS = [
  {
    title: "The Society",
    links: [
      { href: "/about", label: "About & Committee" },
      { href: "/reports", label: "Accounts & Audit" },
      { href: "/notices", label: "Notice Board" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Our Work",
    links: [
      { href: "/campaigns", label: "Campaigns" },
      { href: "/campaigns#flash", label: "Flash Funds" },
      { href: "/projects", label: "Village Projects" },
      { href: "/zakat", label: "Zakat & Welfare" },
    ],
  },
  {
    title: "Take Part",
    links: [
      { href: "/donate", label: "Donate" },
      { href: "/zakat#apply", label: "Apply for Help" },
      { href: "/sponsors", label: "Sponsors" },
      { href: "/login", label: "Members' Portal" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t-2 border-ink bg-paper-2">
      <div className="jali-band" />

      <div className="mx-auto max-w-[1320px] px-5 py-12 sm:px-8 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Identity block, in all three scripts as on the seal */}
          <div>
            <div className="flex items-start gap-4">
              <Seal size={58} />
              <div>
                <div className="display text-[19px] leading-tight">{SOCIETY.name}</div>
                <div className="marathi mt-1 text-[13px] text-ink-2">{SOCIETY.nameMarathi}</div>
                <div dir="rtl" lang="ur" className="mt-1 text-[14px] text-ink-2">
                  {SOCIETY.nameUrdu}
                </div>
              </div>
            </div>

            <address className="mt-6 not-italic text-[13.5px] leading-[1.75] text-ink-2">
              {SOCIETY.address.line1}, {SOCIETY.address.line2}
              <br />
              {SOCIETY.address.line3}, {SOCIETY.address.state} {SOCIETY.address.pin}
              <br />
              <a href={SOCIETY.phoneHref} className="num mt-1 inline-block hover:text-maroon">
                {SOCIETY.phone}
              </a>
            </address>

            <dl className="mt-6 space-y-1.5 border-t border-rule pt-4">
              <div className="flex gap-3">
                <dt className="label w-40 shrink-0">Public Trust Reg.</dt>
                <dd className="num text-[12.5px] text-ink">{SOCIETY.registrationNo}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="label w-40 shrink-0">Society Reg.</dt>
                <dd className="num text-[12.5px] text-ink">{SOCIETY.societyRegNo}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="label w-40 shrink-0">Established</dt>
                <dd className="num text-[12.5px] text-ink">{SOCIETY.foundedYear}</dd>
              </div>
            </dl>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="label label-brass border-b border-rule pb-2">{col.title}</h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href} className="text-[13.5px] text-ink-2 hover:text-maroon">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-rule pt-6 text-[12px] text-ink-3 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {SOCIETY.foundedYear}–2026 {SOCIETY.name}. Registered under the
            Bombay Public Trusts Act and the Societies Registration Act.
          </p>
          <p className="num">{SOCIETY.website}</p>
        </div>

        <p className="mt-4 border border-rule-strong bg-paper px-4 py-3 text-[12px] leading-relaxed text-ink-2">
          <strong className="font-semibold">This is a working prototype.</strong>{" "}
          Every member, amount, receipt and request shown on this site is invented
          sample data used to demonstrate the layout. No live records, payments or
          personal information are held here.
        </p>
      </div>
    </footer>
  );
}
