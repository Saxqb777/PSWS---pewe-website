import Link from "next/link";
import { SOCIETY } from "@/lib/site";
import { Seal } from "@/components/seal";
import { GiveButton } from "@/components/give-panel";

const COLUMNS = [
  {
    title: "The Society",
    hinglish: "Society",
    links: [
      { href: "/about", label: "About & Committee" },
      { href: "/accounts", label: "Accounts & Audit" },
      { href: "/projects", label: "Village Projects" },
      { href: "/login", label: "Members' Portal" },
    ],
  },
  {
    title: "Our Work",
    hinglish: "Kaam",
    links: [
      { href: "/#urgent", label: "Flash Funds" },
      { href: "/#campaigns", label: "Campaigns" },
      { href: "/#zakat", label: "Zakat & Welfare" },
      { href: "/#notices", label: "Notices" },
    ],
  },
  {
    title: "Take Part",
    hinglish: "Saath dijiye",
    links: [
      { href: "/#zakat", label: "Apply for Help" },
      { href: "/#sponsors", label: "Sponsors" },
      { href: "/#contact", label: "Contact" },
      { href: "/#figures", label: "This Year's Figures" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t-2 border-ink bg-paper-2">
      <div className="jali-band" />

      <div className="mx-auto max-w-[1320px] px-4 py-14 sm:px-8 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Identity, in all three scripts as on the seal */}
          <div>
            <div className="flex items-start gap-4">
              <Seal size={58} />
              <div>
                <div className="display text-[20px] leading-tight">{SOCIETY.name}</div>
                <div className="marathi mt-1 text-[14.5px] text-ink-2">{SOCIETY.nameMarathi}</div>
                <div dir="rtl" lang="ur" className="mt-1 text-[15.5px] text-ink-2">{SOCIETY.nameUrdu}</div>
              </div>
            </div>

            <address className="mt-6 not-italic text-[15px] leading-[1.78] text-ink-2">
              {SOCIETY.address.line1}, {SOCIETY.address.line2}
              <br />
              {SOCIETY.address.line3}, {SOCIETY.address.state} {SOCIETY.address.pin}
              <br />
              <a href={SOCIETY.phoneHref} className="num mt-1 inline-block hover:text-maroon">
                {SOCIETY.phone}
              </a>
            </address>

            <div className="mt-6">
              <GiveButton size="md" label="Sadaqah dijiye · Give" />
            </div>

            <dl className="mt-7 space-y-1.5 border-t border-rule pt-4">
              <div className="flex gap-3">
                <dt className="label w-40 shrink-0">Public Trust Reg.</dt>
                <dd className="num text-[14px] text-ink">{SOCIETY.registrationNo}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="label w-40 shrink-0">Society Reg.</dt>
                <dd className="num text-[14px] text-ink">{SOCIETY.societyRegNo}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="label w-40 shrink-0">Established</dt>
                <dd className="num text-[14px] text-ink">{SOCIETY.foundedYear}</dd>
              </div>
            </dl>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="label label-brass border-b border-rule pb-2">{col.title}</h3>
              <p className="mt-2 text-[13.5px] italic text-ink-3">{col.hinglish}</p>
              <ul className="mt-3 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href} className="text-[15px] text-ink-2 hover:text-maroon">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-rule pt-6 text-[13.5px] text-ink-3 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {SOCIETY.foundedYear}–2026 {SOCIETY.name}. Registered under the
            Bombay Public Trusts Act and the Societies Registration Act.
          </p>
          <p className="num">{SOCIETY.website}</p>
        </div>

        <p className="mt-4 border border-rule-strong bg-paper px-4 py-3 text-[13.5px] leading-relaxed text-ink-2">
          <strong className="font-semibold">This is a working prototype.</strong>{" "}
          Every member, amount, receipt and request shown here is invented sample
          data used to demonstrate the layout. No live records, payments or
          personal information are held on this site.
        </p>
      </div>
    </footer>
  );
}
