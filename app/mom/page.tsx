import { notFound } from "next/navigation";
import { Seal } from "@/components/seal";
import "./mom.css";
import { SOCIETY } from "@/lib/site";

export const metadata = { robots: { index: false, follow: false } };

/**
 * Minutes of the Management Committee meeting of 13 September 2026,
 * laid out for print. Rendered to PDF with Playwright at A4. The data sits
 * at the top of the file so the next set of minutes is an edit, not a
 * rebuild.
 */

const MEETING = {
  title: "Minutes of Meeting",
  body: "Management Committee",
  date: "Sunday, 13 September 2026",
  platform: "Online meeting",
  chair: "S. M. S. G. Khan Saheb (Shafi Saheb)",
  ref: "PSWS/MOM/2026-27/01",
};

const ROLL = { total: 17, present: 13, absent: 4 };

const PRESENT = [
  "Akhtar Khan Saheb",
  "Irfan Anwar Saheb",
  "Afzal Sarguro Saheb",
  "S. M. S. G. Khan Saheb (Shafi Saheb)",
  "Aslam Khan Saheb",
  "Gayasali Khan Saheb",
  "Nisar Sarguroh Saheb",
  "Mohammad Husain Saheb",
  "Mussadiq Saheb",
  "Khalid Saheb",
  "Makbool Saheb",
  "Bilal Saheb",
  "Mubin Pewekar Saheb",
];

const IN_ATTENDANCE = [
  { name: "Abdul Wahid Saheb", note: "Joined to lead the closing dua" },
];

const ABSENT = [
  "Sadiq Latif Saheb",
  "Ibrahim Usman Saheb",
  "Abdul Qayum Saheb",
  "Shakeel Saheb",
];

const APPOINTMENTS = [
  { post: "President", name: "Akhtar Khan Saheb", note: "" },
  { post: "General Secretary", name: "Irfan Anwar Saheb", note: "" },
  { post: "Treasurer", name: "Abdul Qayum Raza Khan Saheb", note: "Appointed in absentia — subject to his acceptance" },
  { post: "Head, Zakat Committee", name: "Afzal Sarguro Saheb", note: "" },
  { post: "Head, Development Committee", name: "Mubin Mohiddin Khan Saheb", note: "" },
  { post: "Head, Advisory Committee", name: "Aslam Ahmad Khan Saheb", note: "" },
];

const DECISIONS = [
  {
    head: "Streamlined hierarchy",
    text: "The committee agreed unanimously to simplify the management hierarchy, so that responsibilities are clear and participation is active.",
  },
  {
    head: "Six core positions",
    text: "The structure will consist of President, General Secretary, Treasurer, and three Committee Heads — Zakat, Development and Advisory.",
  },
  {
    head: "Reporting",
    text: "All committee heads and members report directly to the President.",
  },
  {
    head: "Joint Secretary deferred",
    text: "The proposal for a Joint Secretary was deferred. The structure will be reviewed after one year to determine whether further roles are required.",
  },
  {
    head: "Tenure and review",
    text: "The appointed leadership serves a term of two years, with a performance review after the first year.",
  },
];

const RESPONSIBILITIES = [
  {
    head: "General administration",
    text: "The General Secretary manages all documentation, meeting notes and administrative matters, including building and maintaining the contact database.",
  },
  {
    head: "Zakat Committee",
    text: "Actively manages the collection and distribution of Zakat through the collection months, with dedicated support from the management team.",
  },
  {
    head: "Development Committee",
    text: "Manages the website, online presence and connections, and drives the automation work.",
  },
  {
    head: "Cross-committee support",
    text: "Members are encouraged to take part across more than one committee, according to their own expertise and the needs of the Society.",
  },
];

const ACTIONS = [
  { what: "Contact Abdul Qayum Saheb offline to confirm his acceptance of the Treasurer's position.", who: "Management" },
  { what: "Create a form to collect email addresses and updated contact details from all members for the official record.", who: "General Secretary" },
  { what: "Distribute these minutes to all members.", who: "General Secretary" },
  { what: "Announce the confirmed appointments in the general WhatsApp group once final approvals are secured.", who: "Management" },
];

/* ---------- small pieces ---------- */

function SectionTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="mom-h2">
      <span className="mom-h2-n">{String(n).padStart(2, "0")}</span>
      {children}
    </h2>
  );
}

export default function MomPage() {
  // Internal document — it names every member of the committee, so it must
  // not be reachable on the public site. It renders only when the flag is
  // set, which is how the PDF gets generated locally; on Vercel there is no
  // flag and the route is simply not there.
  if (!process.env.ALLOW_INTERNAL_DOCS) notFound();

  return (
    <div className="mom-sheet">
      {/* ================= LETTERHEAD ================= */}
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

      {/* ================= TITLE ================= */}
      <div className="mom-title-block">
        <div className="mom-kicker">{MEETING.body}</div>
        <h1 className="mom-title">{MEETING.title}</h1>
        <div className="mom-ref">{MEETING.ref}</div>
      </div>

      <dl className="mom-particulars">
        <div><dt>Date</dt><dd>{MEETING.date}</dd></div>
        <div><dt>Held</dt><dd>{MEETING.platform}</dd></div>
        <div><dt>In the chair</dt><dd>{MEETING.chair}</dd></div>
      </dl>

      {/* ================= 1 · ATTENDANCE ================= */}
      <section className="mom-sec">
        <SectionTitle n={1}>Attendance</SectionTitle>

        <div className="mom-counts">
          <div><span className="mom-count">{ROLL.total}</span><span className="mom-count-l">On the committee</span></div>
          <div><span className="mom-count mom-count-ok">{ROLL.present}</span><span className="mom-count-l">Present</span></div>
          <div><span className="mom-count mom-count-no">{ROLL.absent}</span><span className="mom-count-l">Absent</span></div>
          <div><span className="mom-count">{IN_ATTENDANCE.length}</span><span className="mom-count-l">In attendance</span></div>
        </div>

        <div className="mom-att">
          <div>
            <h3 className="mom-h3">Present</h3>
            <ol className="mom-list">
              {PRESENT.map((n) => <li key={n}>{n}</li>)}
            </ol>
          </div>
          <div>
            <h3 className="mom-h3">Absent</h3>
            <ol className="mom-list">
              {ABSENT.map((n) => <li key={n}>{n}</li>)}
            </ol>

            <h3 className="mom-h3 mom-h3-sp">In attendance</h3>
            <ol className="mom-list">
              {IN_ATTENDANCE.map((a) => (
                <li key={a.name}>{a.name}<span className="mom-li-note">{a.note}</span></li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ================= 2 · DECISIONS ================= */}
      <section className="mom-sec">
        <SectionTitle n={2}>Decisions and structural changes</SectionTitle>
        <div className="mom-defs">
          {DECISIONS.map((d) => (
            <div key={d.head} className="mom-def">
              <div className="mom-def-h">{d.head}</div>
              <p className="mom-def-p">{d.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= 3 · APPOINTMENTS ================= */}
      <section className="mom-sec mom-keep">
        <SectionTitle n={3}>Leadership appointments</SectionTitle>
        <p className="mom-lede">
          The following members were nominated and appointed unanimously to the
          six core positions, for a term of two years.
        </p>

        <table className="mom-table">
          <thead>
            <tr>
              <th style={{ width: "34%" }}>Position</th>
              <th style={{ width: "34%" }}>Appointed</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {APPOINTMENTS.map((a) => (
              <tr key={a.post}>
                <td className="mom-td-post">{a.post}</td>
                <td className="mom-td-name">{a.name}</td>
                <td className="mom-td-note">{a.note || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ================= 4 · RESPONSIBILITIES ================= */}
      <section className="mom-sec">
        <SectionTitle n={4}>Committee responsibilities</SectionTitle>
        <div className="mom-defs">
          {RESPONSIBILITIES.map((d) => (
            <div key={d.head} className="mom-def">
              <div className="mom-def-h">{d.head}</div>
              <p className="mom-def-p">{d.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= 5 · ACTIONS ================= */}
      <section className="mom-sec mom-keep">
        <SectionTitle n={5}>Action items</SectionTitle>
        <table className="mom-table">
          <thead>
            <tr>
              <th style={{ width: "6%" }}>#</th>
              <th>Action</th>
              <th style={{ width: "24%" }}>With</th>
            </tr>
          </thead>
          <tbody>
            {ACTIONS.map((a, i) => (
              <tr key={a.what}>
                <td className="mom-td-n">{i + 1}</td>
                <td>{a.what}</td>
                <td className="mom-td-who">{a.who}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ================= CLOSE ================= */}
      <section className="mom-sec mom-keep">
        <div className="mom-close">
          The meeting was adjourned with the closing dua, led by
          Abdul Wahid Saheb.
        </div>

        <div className="mom-sign">
          <div>
            <div className="mom-sign-line" />
            <div className="mom-sign-n">{MEETING.chair}</div>
            <div className="mom-sign-r">Chair of the meeting</div>
          </div>
          <div>
            <div className="mom-sign-line" />
            <div className="mom-sign-n">Irfan Anwar Saheb</div>
            <div className="mom-sign-r">General Secretary</div>
          </div>
        </div>
      </section>

      <footer className="mom-foot">
        <div className="mom-arcade" />
        <div className="mom-foot-row">
          <span>{SOCIETY.name} · {MEETING.ref}</span>
          <span>Reg. {SOCIETY.registrationNo}</span>
        </div>
      </footer>
    </div>
  );
}
