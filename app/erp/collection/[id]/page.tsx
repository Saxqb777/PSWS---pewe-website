import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/erp/auth";
import { askCollectors, getAsk, isPublicKind } from "@/lib/erp/portal";
import { collectionStatus, type CollectionStatus } from "@/lib/erp/collection";
import { HEADS, inr, showWhen } from "@/lib/erp/labels";
import { toId } from "@/lib/erp/form-state";
import { SOCIETY } from "@/lib/site";
import { Seal } from "@/components/seal";
import { PrintSheet } from "@/components/erp/print-sheet";
import "@/app/mom/mom.css";
import "@/app/minutes/minutes.css";
import "./status.css";

export const metadata = { title: "Collection status", robots: { index: false, follow: false, nocache: true } };

const pctOf = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "–");

/** The status as a WhatsApp message, the way the committee shares it. */
function shareText(title: string, asOf: string, s: CollectionStatus): string {
  return [
    SOCIETY.name.toUpperCase(),
    `Collection status: ${title}`,
    `As of ${asOf}`,
    "",
    ...(s.target ? [`Target: ${inr(s.target)}`] : []),
    `In the bank: ${inr(s.inBank)}`,
    `Being checked: ${inr(s.checking)}`,
    `Committed: ${inr(s.promised)}`,
    `Total: ${inr(s.total)}${s.target ? ` (${pctOf(s.total, s.target)})` : ""}`,
    ...(s.balance != null ? [`Still to raise: ${inr(s.balance)}`] : []),
    "",
    "By region:",
    ...s.regions.map((r) => `${r.region}: ${inr(r.total)}`),
  ].join("\n");
}

/**
 * A collection drive's status on the Society's letterhead, live: the target,
 * what is in the bank, being checked and committed, by region, and members' own
 * gifts against what others gave through them. For anyone signed in.
 */
export default async function CollectionStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await currentUser();
  if (!u) redirect("/erp/login");
  const id = toId((await params).id);
  const a = id ? await getAsk(id) : null;
  if (!a || !isPublicKind(a.kind) || (a.status !== "live" && a.status !== "closed")) notFound();
  const [s, collectors] = await Promise.all([collectionStatus(a.id, a.target_paise), askCollectors(a.id)]);
  const asOf = showWhen(new Date());
  const back = u.role === "member" ? { href: `/erp/me/asks/${a.id}`, label: "← The appeal" } : { href: `/erp/portal/asks/${a.id}`, label: "← The appeal" };

  return (
    <div className="min-wrap">
      <div className="min-bar">
        <div className="min-bar-in">
          <span className="min-bar-id">
            <Seal size={38} />
            <span>
              <span className="min-bar-n">{SOCIETY.name}</span>
              <span className="min-bar-s">Collection status · live from the members&apos; portal</span>
            </span>
          </span>
          <Link href={back.href} className="min-back">
            {back.label}
          </Link>
        </div>
      </div>

      <div className="min-head">
        <div>
          <h1 className="min-head-t">{a.title}</h1>
          <p className="min-head-d">As of {asOf}</p>
        </div>
        <div className="min-tools">
          <a
            className="min-print cs-wa"
            href={`https://wa.me/?text=${encodeURIComponent(shareText(a.title, asOf, s))}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Send on WhatsApp
          </a>
          <PrintSheet />
        </div>
      </div>

      <div className="min-paper-out">
        <div className="min-paper">
          <div className="mom-sheet">
            <header className="mom-head">
              <div className="mom-jali" />
              <div className="mom-head-row">
                <Seal size={78} />
                <div className="mom-head-id">
                  <div className="mom-name">{SOCIETY.name}</div>
                  <div className="mom-name-mr">{SOCIETY.nameMarathi}</div>
                  <div className="mom-name-ur" dir="rtl" lang="ur">
                    {SOCIETY.nameUrdu}
                  </div>
                </div>
                <div className="mom-head-reg">
                  <div>
                    <span>Society</span> {SOCIETY.societyRegNo}
                  </div>
                  <div>
                    <span>Reg.</span> {SOCIETY.registrationNo}
                  </div>
                  <div>
                    <span>Established</span> {SOCIETY.foundedYear}
                  </div>
                </div>
              </div>
              <div className="mom-head-addr">
                {SOCIETY.address.line1}, {SOCIETY.address.line2}, {SOCIETY.address.line3}, {SOCIETY.address.state} {SOCIETY.address.pin}
                <span className="mom-dot">·</span>
                {SOCIETY.phone}
                <span className="mom-dot">·</span>
                {SOCIETY.website}
              </div>
              <div className="mom-rule-strong" />
            </header>

            <div className="mom-title-block">
              <div className="mom-kicker">Collection status · {HEADS[a.head].en}</div>
              <h2 className="mom-title">{a.title}</h2>
              <div className="mom-refrow">
                <span className="mom-ref">As of {asOf}</span>
              </div>
            </div>

            <dl className="mom-particulars">
              <div>
                <dt>Target</dt>
                <dd className="cs-big">{s.target ? inr(s.target) : "Not set"}</dd>
              </div>
              <div>
                <dt>Raised and committed</dt>
                <dd className="cs-big">
                  {inr(s.total)}
                  {s.target ? <span className="cs-pct"> {pctOf(s.total, s.target)}</span> : null}
                </dd>
              </div>
              <div>
                <dt>Still to raise</dt>
                <dd className={`cs-big ${s.balance ? "cs-due" : ""}`}>{s.balance != null ? inr(s.balance) : "–"}</dd>
              </div>
            </dl>

            <section className="mom-sec">
              <h3 className="mom-h2">
                <span className="mom-h2-n">01</span>Where it stands
              </h3>
              <table className="mom-table cs-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th className="cs-n">Amount (₹)</th>
                    <th className="cs-n">% of total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>In the bank</td>
                    <td className="cs-n">{inr(s.inBank)}</td>
                    <td className="cs-n">{pctOf(s.inBank, s.total)}</td>
                  </tr>
                  <tr>
                    <td>Sent, being checked by the Accountant</td>
                    <td className="cs-n">{inr(s.checking)}</td>
                    <td className="cs-n">{pctOf(s.checking, s.total)}</td>
                  </tr>
                  <tr>
                    <td>Committed, not sent yet</td>
                    <td className="cs-n">{inr(s.promised)}</td>
                    <td className="cs-n">{pctOf(s.promised, s.total)}</td>
                  </tr>
                  <tr className="cs-total">
                    <td>Total · {s.gifts} {s.gifts === 1 ? "gift" : "gifts"}</td>
                    <td className="cs-n">{inr(s.total)}</td>
                    <td className="cs-n">{s.total ? "100%" : "–"}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="mom-sec mom-keep">
              <h3 className="mom-h2">
                <span className="mom-h2-n">02</span>By region
              </h3>
              {s.regions.length ? (
                <table className="mom-table cs-table">
                  <thead>
                    <tr>
                      <th>Where the giver lives</th>
                      <th className="cs-n">In the bank</th>
                      <th className="cs-n">Being checked</th>
                      <th className="cs-n">Committed</th>
                      <th className="cs-n">Total</th>
                      <th className="cs-n">Gifts</th>
                      <th className="cs-n">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.regions.map((r) => (
                      <tr key={r.region}>
                        <td>{r.region}</td>
                        <td className="cs-n">{inr(r.inBank)}</td>
                        <td className="cs-n">{inr(r.checking)}</td>
                        <td className="cs-n">{inr(r.promised)}</td>
                        <td className="cs-n cs-strong">{inr(r.total)}</td>
                        <td className="cs-n">{r.gifts}</td>
                        <td className="cs-n">{pctOf(r.total, s.total)}</td>
                      </tr>
                    ))}
                    <tr className="cs-total">
                      <td>Total</td>
                      <td className="cs-n">{inr(s.inBank)}</td>
                      <td className="cs-n">{inr(s.checking)}</td>
                      <td className="cs-n">{inr(s.promised)}</td>
                      <td className="cs-n">{inr(s.total)}</td>
                      <td className="cs-n">{s.gifts}</td>
                      <td className="cs-n">100%</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p className="cs-empty">Nothing given or committed yet.</p>
              )}
            </section>

            <section className="mom-sec mom-keep">
              <h3 className="mom-h2">
                <span className="mom-h2-n">03</span>Members and others
              </h3>
              <table className="mom-table cs-table">
                <thead>
                  <tr>
                    <th>Given by</th>
                    <th className="cs-n">Gifts</th>
                    <th className="cs-n">Amount (₹)</th>
                    <th className="cs-n">%</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Members, their own gifts</td>
                    <td className="cs-n">{s.own.gifts}</td>
                    <td className="cs-n">{inr(s.own.total)}</td>
                    <td className="cs-n">{pctOf(s.own.total, s.total)}</td>
                  </tr>
                  <tr>
                    <td>Others, through members or the office</td>
                    <td className="cs-n">{s.others.gifts}</td>
                    <td className="cs-n">{inr(s.others.total)}</td>
                    <td className="cs-n">{pctOf(s.others.total, s.total)}</td>
                  </tr>
                  <tr className="cs-total">
                    <td>Total</td>
                    <td className="cs-n">{s.gifts}</td>
                    <td className="cs-n">{inr(s.total)}</td>
                    <td className="cs-n">{s.total ? "100%" : "–"}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            {collectors.length > 0 && (
              <section className="mom-sec mom-keep">
                <h3 className="mom-h2">
                  <span className="mom-h2-n">04</span>Brought in by
                </h3>
                <table className="mom-table cs-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th className="cs-n">People</th>
                      <th className="cs-n">In the bank (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collectors.map((c) => (
                      <tr key={c.name}>
                        <td>{c.name}</td>
                        <td className="cs-n">{c.people || "–"}</td>
                        <td className="cs-n">{inr(c.amount_paise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            <div className="mom-foot">
              <div className="mom-rule-strong" />
              <div className="mom-foot-row">
                <span>Shared by PSWS admin · live from the members&apos; portal</span>
                <span>As of {asOf}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
