import { Seal } from "@/components/seal";
import { SOCIETY } from "@/lib/site";

export const metadata = { robots: { index: false, follow: false } };

/**
 * Build-time only. Rendered at 1200x630 and screenshotted into
 * public/og.jpg, which is what link previews actually serve. Kept in the
 * tree so the card can be regenerated when the wording or photo changes.
 */
export default function OgPreview() {
  return (
    <div
      style={{ width: 1200, height: 630 }}
      className="relative overflow-hidden bg-ink"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero/hero-right.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: "center 42%" }}
      />
      <div className="absolute inset-0" style={{ background: "linear-gradient(100deg, rgba(28,24,21,0.96) 0%, rgba(28,24,21,0.92) 40%, rgba(28,24,21,0.62) 72%, rgba(28,24,21,0.22) 100%)" }} />

      <div className="jali-band absolute inset-x-0 top-0" style={{ opacity: 0.85 }} />

      <div className="absolute inset-0 flex flex-col justify-center px-16">
        <div className="flex items-center gap-5">
          <span className="bg-paper p-1.5">
            <Seal size={72} />
          </span>
          <div>
            <div
              className="label"
              style={{ color: "var(--color-brass-light)", fontSize: 15, letterSpacing: "0.16em" }}
            >
              Reg. {SOCIETY.registrationNo} · Est. {SOCIETY.foundedYear}
            </div>
            <div className="label mt-1.5" style={{ color: "rgba(244,239,230,0.7)", fontSize: 15, letterSpacing: "0.14em" }}>
              At &amp; Post Pewe · Taluka Guhagar · Dist. Ratnagiri
            </div>
          </div>
        </div>

        <h1
          className="display mt-8"
          style={{ fontSize: 70, lineHeight: 1.04, maxWidth: 760, color: "#F4EFE6" }}
        >
          Pewe Social Welfare Society
        </h1>

        <p className="marathi mt-3" style={{ fontSize: 28, color: "rgba(244,239,230,0.72)" }}>
          {SOCIETY.nameMarathi}
        </p>

        <p
          className="mt-7"
          style={{ fontSize: 23, lineHeight: 1.5, maxWidth: 700, color: "rgba(244,239,230,0.9)" }}
        >
          Village projects, Zakat and welfare — and a published account of
          every rupee.
        </p>
      </div>

      <div className="arcade-band absolute inset-x-0 bottom-0" style={{ opacity: 0.9 }} />
    </div>
  );
}
