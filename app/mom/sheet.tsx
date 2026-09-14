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

      {/* ---------------- 01 · ATTENDANCE ---------------- */}
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
          </div>
        </div>
      </section>

      {/* ---------------- 02 · DECISIONS ---------------- */}
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

      {/* ---------------- 03 · OFFICE BEARERS ---------------- */}
      <section className="mom-sec mom-keep">
        <h2 className="mom-h2"><span className="mom-h2-n">03</span>{c.headings.appointments}</h2>
        <p className="mom-lede">{c.appointmentsLede}</p>
        <table className="mom-table">
          <thead>
            <tr>
              <th style={{ width: "42%" }}>{c.appointmentsCols.post}</th>
              <th>{c.appointmentsCols.name}</th>
            </tr>
          </thead>
          <tbody>
            {c.appointments.map((a) => (
              <tr key={a.post}>
                <td className="mom-td-post">{a.post}</td>
                <td className="mom-td-name">{a.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ---------------- 04 · THE THREE COMMITTEES ---------------- */}
      <section className="mom-sec mom-keep">
        <h2 className="mom-h2"><span className="mom-h2-n">04</span>{c.headings.committees}</h2>
        <p className="mom-lede">{c.committeesLede}</p>

        <div className="mom-comms">
          {c.committees.map((k) => (
            <div key={k.head} className="mom-comm">
              <div className="mom-comm-h">{k.head}</div>
              <div className="mom-comm-lead">{k.lead}</div>
              {k.members.length > 0 && (
                <ul className="mom-comm-m">
                  {k.members.map((m) => <li key={m}>{m}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="mom-members">
          <div className="mom-comm-h">{c.membersBlock.head}</div>
          <ul className="mom-comm-m mom-members-m">
            {c.membersBlock.names.map((m) => <li key={m}>{m}</li>)}
          </ul>
        </div>
      </section>

      {/* ---------------- 05 · RESPONSIBILITIES ---------------- */}
      <section className="mom-sec">
        <h2 className="mom-h2"><span className="mom-h2-n">05</span>{c.headings.responsibilities}</h2>
        <div className="mom-defs">
          {c.responsibilities.map((d) => (
            <div key={d.head} className="mom-def">
              <div className="mom-def-h">{d.head}</div>
              <p className="mom-def-p">{d.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- 06 · ACTIONS ---------------- */}
      <section className="mom-sec mom-keep">
        <h2 className="mom-h2"><span className="mom-h2-n">06</span>{c.headings.actions}</h2>
        <table className="mom-table">
          <thead>
            <tr>
              <th style={{ width: "6%" }}>{c.actionsCols.n}</th>
              <th>{c.actionsCols.what}</th>
              <th style={{ width: "26%" }}>{c.actionsCols.who}</th>
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
      </section>

      {/* ---------------- ANNEXURE · THE ELECTION ---------------- */}
      <section className="mom-sec mom-annex">
        <h2 className="mom-h2"><span className="mom-h2-n">A</span>{c.headings.election}</h2>
        <p className="mom-lede">{c.election.lede}</p>

        <div className="mom-elec-stats">
          {c.election.stats.map((st) => (
            <div key={st.l}>
              <span className="mom-elec-v">{st.v}</span>
              <span className="mom-elec-l">{st.l}</span>
            </div>
          ))}
        </div>

        <table className="mom-table mom-elec-t">
          <thead>
            <tr>
              <th style={{ width: "7%" }}>{c.election.cols.n}</th>
              <th>{c.election.cols.name}</th>
              <th style={{ width: "13%" }} className="mom-th-r">{c.election.cols.votes}</th>
              <th style={{ width: "22%" }}>{c.election.cols.share}</th>
            </tr>
          </thead>
          <tbody>
            {c.elected.map((e) => (
              <tr key={e.n}>
                <td className="mom-td-n">{e.n}</td>
                <td>
                  {e.name}
                  {e.isNew && <span className="mom-new">{c.election.newTag}</span>}
                </td>
                <td className="mom-td-num">{e.votes}</td>
                <td>
                  <span className="mom-barwrap">
                    <span className="mom-bar" style={{ width: `${e.pct}%` }} />
                  </span>
                  <span className="mom-bar-v">{e.pct}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

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
