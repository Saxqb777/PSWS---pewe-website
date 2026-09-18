import Link from "next/link";
import { Seal } from "@/components/seal";
import { SOCIETY } from "@/lib/site";
import { ROLL, memberBySlug, takenSlugs, isConfigured } from "@/lib/kyc";
import { KycForm } from "./fields";
import "./kyc.css";

export const metadata = {
  title: "Member details",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const TROUBLE: Record<string, string> = {
  member: "Please select your name from the drop-down list.",
  already: "Those details are already with the office. Ask the General Secretary to change them.",
  country: "Please choose your country from the list.",
  state: "Please choose your state from the list.",
  phone: "That mobile number does not look right. Ten digits, starting 6 to 9.",
  phonecc: "That number does not match the country you chose.",
  gmail: "Please give a Gmail address — it must end in @gmail.com.",
  city: "Please give your city or town.",
  server: "Something went wrong saving it. Please try once more.",
};

export default async function KycPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { done, error } = await searchParams;
  const saved = done ? memberBySlug(done) : undefined;

  // Whoever has already given their details is not offered again.
  let taken = new Set<string>();
  if (isConfigured()) {
    try { taken = await takenSlugs(); } catch { /* fall back to the whole roll */ }
  }
  const available = ROLL.filter((m) => !taken.has(m.slug));

  return (
    <div className="kyc-wrap">
      <div className="kyc-card">
        <div className="jali-band" />

        <div className="kyc-body">
          <div className="kyc-head">
            <Seal size={54} />
            <div>
              <div className="label label-brass">Management Committee</div>
              <div className="kyc-soc">{SOCIETY.name}</div>
            </div>
          </div>

          {saved ? (
            <>
              <h1 className="kyc-h1">Thank you, {saved.name.split(" ")[0]}.</h1>
              <p className="kyc-p">
                Your details are with the General Secretary. If anything needs
                changing, tell him — the form will not take them twice.
              </p>
              <Link href="/" className="kyc-btn kyc-btn-quiet">
                Go to the website
              </Link>
            </>
          ) : available.length === 0 ? (
            <>
              <h1 className="kyc-h1">All seventeen are in.</h1>
              <p className="kyc-p">
                Every member of the committee has given their details. Nothing
                further is needed here.
              </p>
            </>
          ) : (
            <>
              <h1 className="kyc-h1">Your details, please</h1>
              <p className="kyc-p">Please select your name from the drop-down list.</p>

              {error && error !== "member" && (
                <p className="kyc-bad">{TROUBLE[error] ?? TROUBLE.server}</p>
              )}

              <KycForm available={available} error={error} />

              <p className="kyc-foot">
                Seen only by the Society&rsquo;s office. Not shown anywhere on
                the public site.
              </p>
            </>
          )}
        </div>

        <div className="arcade-band" />
      </div>
    </div>
  );
}
