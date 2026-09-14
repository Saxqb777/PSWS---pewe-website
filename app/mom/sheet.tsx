import { Seal } from "@/components/seal";
import { SOCIETY } from "@/lib/site";
import type { MomContent } from "./content";
import "./mom.css";

export function MomSheet({ c }: { c: MomContent }) {
  return (
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
        <div className="mom-kicker">{c.meeting.kicker}</div>
        <h1 className="mom-title">{c.meeting.title}</h1>
        <div className="mom-refrow">
          <span className="mom-ref">{c.meeting.ref}</span>
          <span className="mom-lang">{c.langLabel}</span>
        </div>
      </div>

      <dl className="mom-particulars">
        <div><dt>{c.meeting.dateLabel}</dt><dd>{c.meeting.date}</dd></div>
        <div><dt>{c.meeting.heldLabel}</dt><dd>{c.meeting.held}</dd></div>
        <div><dt>{c.meeting.chairLabel}</dt><dd>{c.meeting.chair}</dd></div>
      </dl>

      {/* ---------------- 1 · ATTENDANCE ---------------- */}
      <section className="mom-sec">
        <h2 className="mom-h2"><span className="mom-h2-n">01</span>{c.headings.attendance}</h2>

        <div className="mom-counts mom-counts-3">
          <div><span className="mom-count">{c.roll.total}</span><span className="mom-count-l">{c.rollLabels.total}</span></div>
          <div><span className="mom-count mom-count-ok">{c.roll.present}</span><span className="mom-count-l">{c.rollLabels.present}</span></div>
          <div><span className="mom-count mom-count-no">{c.roll.absent}</span><span className="mom-count-l">{c.rollLabels.absent}</span></div>
        </div>

        <div className="mom-att">
          <div>
            <h3 className="mom-h3">{c.headings.present}</h3>
            <ol className="mom-list">
              {c.present.map((p) => (
                <li key={p.name}>{p.name}
                  {p.note && <span className="mom-li-note">{p.note}</span>}</li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className="mom-h3">{c.headings.absent}</h3>
            <ol className="mom-list">
              {c.absent.map((p) => (
                <li key={p.name}>{p.name}
                  {p.note && <span className="mom-li-note">{p.note}</span>}</li>
              ))}
            </ol>

            <h3 className="mom-h3 mom-h3-sp">{c.headings.open}</h3>
            <div className="mom-open">
              {c.openQuestions.map((q) => (
                <div key={q.head} className="mom-open-i">
                  <div className="mom-open-h">{q.head}</div>
                  <p className="mom-open-p">{q.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 2 · DECISIONS ---------------- */}
      <section className="mom-sec">
        <h2 className="mom-h2"><span className="mom-h2-n">02</span>{c.headings.decisions}</h2>
        <div className="mom-defs">
          {c.decisions.map((d) => (
            <div key={d.head} className="mom-def">
              <div className="mom-def-h">{d.head}</div>
              <p className="mom-def-p">{d.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- 3 · APPOINTMENTS ---------------- */}
      <section className="mom-sec mom-keep">
        <h2 className="mom-h2"><span className="mom-h2-n">03</span>{c.headings.appointments}</h2>
        <p className="mom-lede">{c.appointmentsLede}</p>
        <table className="mom-table">
          <thead>
            <tr>
              <th style={{ width: "32%" }}>{c.appointmentsCols.post}</th>
              <th style={{ width: "32%" }}>{c.appointmentsCols.name}</th>
              <th>{c.appointmentsCols.note}</th>
            </tr>
          </thead>
          <tbody>
            {c.appointments.map((a) => (
              <tr key={a.post}>
                <td className="mom-td-post">{a.post}</td>
                <td className="mom-td-name">{a.name}</td>
                <td className="mom-td-note">{a.note ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ---------------- 4 · RESPONSIBILITIES ---------------- */}
      <section className="mom-sec">
        <h2 className="mom-h2"><span className="mom-h2-n">04</span>{c.headings.responsibilities}</h2>
        <div className="mom-defs">
          {c.responsibilities.map((d) => (
            <div key={d.head} className="mom-def">
              <div className="mom-def-h">{d.head}</div>
              <p className="mom-def-p">{d.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- 5 · ACTIONS ---------------- */}
      <section className="mom-sec mom-keep">
        <h2 className="mom-h2"><span className="mom-h2-n">05</span>{c.headings.actions}</h2>
        <table className="mom-table">
          <thead>
            <tr>
              <th style={{ width: "6%" }}>{c.actionsCols.n}</th>
              <th>{c.actionsCols.what}</th>
              <th style={{ width: "24%" }}>{c.actionsCols.who}</th>
            </tr>
          </thead>
          <tbody>
            {c.actions.map((a, i) => (
              <tr key={a.what} className={a.done ? "mom-tr-done" : ""}>
                <td className="mom-td-n">{a.done ? "✓" : i + 1}</td>
                <td>{a.what}</td>
                <td className="mom-td-who">{a.who}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ---------------- CLOSE ---------------- */}
      <section className="mom-sec mom-keep">
        <div className="mom-close">{c.close}</div>
        <div className="mom-sign">
          <div>
            <div className="mom-sign-line" />
            <div className="mom-sign-n">{c.meeting.chair}</div>
            <div className="mom-sign-r">{c.signRoles.chair}</div>
          </div>
          <div>
            <div className="mom-sign-line" />
            <div className="mom-sign-n">Irfan Anwar Saheb</div>
            <div className="mom-sign-r">{c.signRoles.secretary}</div>
          </div>
        </div>
      </section>

      <footer className="mom-foot">
        <div className="mom-arcade" />
        <div className="mom-foot-row">
          <span>{SOCIETY.name} · {c.meeting.ref}</span>
          <span>Reg. {SOCIETY.registrationNo}</span>
        </div>
      </footer>
    </div>
  );
}
