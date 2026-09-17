import { Seal } from "@/components/seal";
import { PrintButton } from "./print-button";
import { SOCIETY } from "@/lib/site";
import { ROLL, allSubmissions, isConfigured, formatPhone, type Submission } from "@/lib/kyc";
import "@/app/mom/mom.css";
import "./report.css";

export const metadata = {
  title: "Member details — record",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "long", year: "numeric",
});

export default async function KycReport() {
  let rows: Submission[] = [];
  let failed = false;
  if (isConfigured()) {
    try { rows = await allSubmissions(); } catch { failed = true; }
  } else {
    failed = true;
  }

  const bySlug = new Map(rows.map((r) => [r.member_slug, r]));
  const done = ROLL.filter((m) => bySlug.has(m.slug));
  const pending = ROLL.filter((m) => !bySlug.has(m.slug));

  return (
    <div className="rep-page">
      <div className="rep-tools no-print">
        <a className="rep-back" href="/erp">← Office</a>
        <PrintButton />
      </div>

      <div className="rep-paper">
        <div className="mom-sheet">
          {/* ---------------- LETTERHEAD ---------------- */}
          <header className="mom-head">
            <div className="mom-jali" />
            <div className="mom-head-row">
              <Seal size={78} />
              <div className="mom-head-id">
                <div className="mom-name">{SOCIETY.name}</div>
                <div className="mom-name-mr">{SOCIETY.nameMarathi}</div>
                <div className="mom-name-ur" dir="rtl" lang="ur">{SOCIETY.nameUrdu}</div>
              </div>
              <div className="mom-head-reg">
                <div><span>Public Trust</span> {SOCIETY.registrationNo}</div>
                <div><span>Society</span> {SOCIETY.societyRegNo}</div>
                <div><span>Established</span> {SOCIETY.foundedYear}</div>
              </div>
            </div>
            <div className="mom-head-addr">
              {SOCIETY.address.line1}, {SOCIETY.address.line2}, {SOCIETY.address.line3},
              {" "}{SOCIETY.address.state} {SOCIETY.address.pin}
              <span className="mom-dot">·</span>{SOCIETY.phone}
              <span className="mom-dot">·</span>{SOCIETY.website}
            </div>
            <div className="mom-rule-strong" />
          </header>

          {/* ---------------- TITLE ---------------- */}
          <div className="mom-title-block">
            <div className="mom-kicker">Management Committee</div>
            <h1 className="mom-title">Member Contact Record</h1>
            <div className="mom-refrow">
              <span className="mom-ref">PSWS/KYC/2026-27</span>
              <span className="mom-lang">As at {DATE.format(new Date())}</span>
            </div>
          </div>

          {failed ? (
            <p className="rep-warn">
              The record cannot be read — DATABASE_URL is not set on this
              deployment, so nothing has been stored yet.
            </p>
          ) : (
            <>
              <section className="mom-sec">
                <h2 className="mom-h2"><span className="mom-h2-n">01</span>Returns</h2>
                <div className="mom-counts mom-counts-3">
                  <div>
                    <span className="mom-count">{ROLL.length}</span>
                    <span className="mom-count-l">On the committee</span>
                  </div>
                  <div>
                    <span className="mom-count mom-count-ok">{done.length}</span>
                    <span className="mom-count-l">Given their details</span>
                  </div>
                  <div>
                    <span className="mom-count mom-count-no">{pending.length}</span>
                    <span className="mom-count-l">Still to give</span>
                  </div>
                </div>
              </section>

              <section className="mom-sec">
                <h2 className="mom-h2"><span className="mom-h2-n">02</span>Details held</h2>
                {done.length === 0 ? (
                  <p className="mom-lede">Nobody has filled the form yet.</p>
                ) : (
                  <table className="mom-table">
                    <thead>
                      <tr>
                        <th style={{ width: "4%" }}>#</th>
                        <th style={{ width: "24%" }}>Member</th>
                        <th style={{ width: "15%" }}>Mobile</th>
                        <th>Gmail</th>
                        <th style={{ width: "13%" }}>City</th>
                        <th style={{ width: "13%" }}>Country</th>
                      </tr>
                    </thead>
                    <tbody>
                      {done.map((m, i) => {
                        const r = bySlug.get(m.slug)!;
                        return (
                          <tr key={m.slug}>
                            <td className="mom-td-n">{i + 1}</td>
                            <td className="mom-td-post">{m.name}</td>
                            <td className="rep-num">{formatPhone(r.phone, r.phone_cc)}</td>
                            <td className="rep-mail">{r.gmail}</td>
                            <td className="rep-place">{r.work_city || "—"}</td>
                            <td className="rep-place">{r.work_country || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </section>

              {pending.length > 0 && (
                <section className="mom-sec mom-keep">
                  <h2 className="mom-h2"><span className="mom-h2-n">03</span>Still to give</h2>
                  <p className="mom-lede">
                    These members have not filled the form. The General Secretary
                    is to follow them up.
                  </p>
                  <ol className="mom-list rep-pending">
                    {pending.map((m) => <li key={m.slug}>{m.name}</li>)}
                  </ol>
                </section>
              )}
            </>
          )}

          <section className="mom-sec mom-keep">
            <div className="mom-close">
              Held for the Society&rsquo;s own record and for sending meeting
              invitations. Not published anywhere on the site.
            </div>
          </section>

          <footer className="mom-foot">
            <div className="mom-arcade" />
          </footer>
        </div>
      </div>
    </div>
  );
}
