import Link from "next/link";
import { Seal } from "@/components/seal";
import { SOCIETY } from "@/lib/site";
import { ROLL, memberBySlug } from "@/lib/kyc";
import "./kyc.css";

export const metadata = {
  title: "Member details",
  robots: { index: false, follow: false },
};

const TROUBLE: Record<string, string> = {
  member: "Please choose your name from the list.",
  phone: "That mobile number does not look right. Ten digits, starting 6 to 9.",
  gmail: "Please give a Gmail address — it must end in @gmail.com.",
  server: "Something went wrong saving it. Please try once more.",
};

export default async function KycForm({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; error?: string; member?: string }>;
}) {
  const { done, error, member } = await searchParams;
  const saved = done ? memberBySlug(done) : undefined;

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
                Your details are with the General Secretary. If you gave the
                wrong number or address, fill the form again — the newer one
                replaces it.
              </p>
              <Link href="/kyc" className="kyc-btn kyc-btn-quiet">
                Fill it again
              </Link>
            </>
          ) : (
            <>
              <h1 className="kyc-h1">Your details, please</h1>
              <p className="kyc-p">
                The Society is putting together one list of the committee&rsquo;s
                contact details. Your <strong>Gmail</strong> address is what a
                Google Meet invitation needs, so please give that one rather
                than any other email.
              </p>

              {error && <p className="kyc-bad">{TROUBLE[error] ?? TROUBLE.server}</p>}

              <form method="POST" action="/api/kyc" className="kyc-form">
                <label className="label" htmlFor="member">Your name</label>
                <select id="member" name="member" defaultValue={member ?? ""} required>
                  <option value="" disabled>Choose your name…</option>
                  {ROLL.map((m) => (
                    <option key={m.slug} value={m.slug}>{m.name}</option>
                  ))}
                </select>

                <label className="label" htmlFor="phone">Mobile number</label>
                <input
                  id="phone" name="phone" type="tel" inputMode="numeric"
                  autoComplete="tel" placeholder="98XXXXXXXX" required
                />

                <label className="label" htmlFor="gmail">Gmail address</label>
                <input
                  id="gmail" name="gmail" type="email" inputMode="email"
                  autoComplete="email" placeholder="yourname@gmail.com" required
                />

                <button type="submit" className="kyc-btn">Send my details</button>
              </form>

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
