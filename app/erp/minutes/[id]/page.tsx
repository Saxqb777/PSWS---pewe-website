import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/erp/auth";
import { meetingMinutes } from "@/lib/erp/minutes";
import { toId } from "@/lib/erp/form-state";
import { SOCIETY } from "@/lib/site";
import { Seal } from "@/components/seal";
import { PrintSheet } from "@/components/erp/print-sheet";
import "@/app/mom/mom.css";
import "@/app/minutes/minutes.css";
import "./print.css";

export const metadata = { title: "Minutes", robots: { index: false, follow: false, nocache: true } };

/** A meeting's minutes on the Society's letterhead, for anyone signed in: members and the office. */
export default async function MinutesPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await currentUser();
  if (!u) redirect("/erp/login");
  const id = toId((await params).id);
  const m = id ? await meetingMinutes(id) : null;
  if (!m) notFound();
  const back = u.role === "member" ? { href: "/erp/me/notices", label: "← Notices" } : { href: "/erp/meetings", label: "← Meetings" };

  return (
    <div className="min-wrap">
      <div className="min-bar">
        <div className="min-bar-in">
          <span className="min-bar-id">
            <Seal size={38} />
            <span>
              <span className="min-bar-n">{SOCIETY.name}</span>
              <span className="min-bar-s">Committee record · shared by PSWS admin</span>
            </span>
          </span>
          <Link href={back.href} className="min-back">
            {back.label}
          </Link>
        </div>
      </div>

      <div className="min-head">
        <div>
          <h1 className="min-head-t">{m.title}</h1>
          <p className="min-head-d">
            {m.dateLong} · {m.held}
          </p>
        </div>
        <div className="min-tools">
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
              <div className="mom-kicker">Minutes of the committee meeting</div>
              <h2 className="mom-title">{m.title}</h2>
              <div className="mom-refrow">
                <span className="mom-ref">{m.ref}</span>
              </div>
            </div>

            <dl className="mom-particulars">
              <div>
                <dt>Date</dt>
                <dd>{m.dateLong}</dd>
              </div>
              <div>
                <dt>Held</dt>
                <dd>{m.held}</dd>
              </div>
              <div>
                <dt>Subject</dt>
                <dd>{m.subject}</dd>
              </div>
            </dl>

            <section className="mom-sec">
              <h3 className="mom-h2">
                <span className="mom-h2-n">01</span>Meeting objective
              </h3>
              <p className="mom-lede">{m.objective}</p>
            </section>

            <section className="mom-sec">
              <h3 className="mom-h2">
                <span className="mom-h2-n">02</span>Discussion
              </h3>
              <div className="mom-defs">
                {m.discussion.map(([h, p]) => (
                  <div key={h} className="mom-def">
                    <div className="mom-def-h">{h}</div>
                    <div className="mom-def-p">{p}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mom-sec mom-keep">
              <h3 className="mom-h2">
                <span className="mom-h2-n">03</span>Decisions
              </h3>
              <div className="mom-defs">
                {m.decisions.map(([h, p]) => (
                  <div key={h} className="mom-def">
                    <div className="mom-def-h">{h}</div>
                    <div className="mom-def-p">{p}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mom-sec mom-keep">
              <h3 className="mom-h2">
                <span className="mom-h2-n">04</span>Action points
              </h3>
              <table className="mom-table">
                <thead>
                  <tr>
                    <th style={{ width: 34 }}>No.</th>
                    <th>Action</th>
                    <th style={{ width: 120 }}>Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {m.actions.map(([what, who], i) => (
                    <tr key={what}>
                      <td className="mom-td-n">{String(i + 1).padStart(2, "0")}</td>
                      <td>{what}</td>
                      <td className="mom-td-who">{who}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="mom-sec mom-keep">
              <h3 className="mom-h2">
                <span className="mom-h2-n">05</span>Next steps
              </h3>
              <ul style={{ margin: "10px 0 0", paddingLeft: 16, color: "#4A4239" }}>
                {m.next.map((n) => (
                  <li key={n} style={{ padding: "2px 0" }}>
                    {n}
                  </li>
                ))}
              </ul>
            </section>

            <footer className="mom-foot">
              <div className="mom-arcade" />
              <div className="mom-foot-row">
                <span>{SOCIETY.name} · Minutes of the committee meeting · shared by PSWS admin</span>
                <span>{m.dateLong.replace(/^\w+ /, "")}</span>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
