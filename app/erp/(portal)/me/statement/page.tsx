import Link from "next/link";
import { requireMember } from "@/lib/erp/auth";
import { collections, myPledges, passbook } from "@/lib/erp/portal";
import { fyOf, fyRange, inr, showDate, todayIST } from "@/lib/erp/labels";
import { PrintButton } from "@/components/erp/shell";
import { Passbook } from "@/components/erp/portal-ui";
import { SOCIETY } from "@/lib/site";
import styles from "@/components/erp/erp.module.css";
import p from "@/components/erp/portal.module.css";
import { DateInput } from "@/components/erp/date-input";

export const metadata = { title: "My statement" };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const real = (d: string | undefined) => (d && DAY.test(d) && !Number.isNaN(Date.parse(d)) ? d : null);

/** A statement for any two dates the member picks: printed, or saved as a PDF to send on. */
export default async function Statement({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const u = await requireMember();
  const sp = await searchParams;
  const today = todayIST();
  const thisYear = fyRange(fyOf(today));
  const lastYear = fyRange(fyOf(`${Number(thisYear.from.slice(0, 4)) - 1}-06-01`));
  let from = real(sp.from);
  let to = real(sp.to);
  if (from && to && from > to) [from, to] = [to, from];
  const chosen = from && to ? { from, to } : null;

  const picks = [
    { label: `This year (${fyOf(today)})`, from: thisYear.from, to: today },
    { label: `Last year (${fyOf(lastYear.from)})`, from: lastYear.from, to: lastYear.to },
    { label: "Everything", from: "2015-01-01", to: today },
  ];

  const [lines, gathered] = chosen ? await Promise.all([passbook(u.id, chosen), collections(u.id, chosen)]) : [[], []];
  const gave = lines.filter((l) => l.dir === "gave").reduce((s, l) => s + l.amount_paise, 0);
  const got = lines.filter((l) => l.dir === "received").reduce((s, l) => s + l.amount_paise, 0);
  const handedIn = gathered.reduce((s, l) => s + l.amount_paise, 0);
  // sent in these dates but not found in the bank yet: not counted, and said so
  const waiting = chosen
    ? (await myPledges(u.id))
        .filter((x) => x.status === "waiting" && x.sent_on >= chosen.from && x.sent_on <= chosen.to)
        .reduce((s, x) => s + (x.amount_paise ?? 0), 0)
    : 0;

  return (
    <>
      <div className={styles.noPrint}>
        <Link href="/erp/me/passbook" className={p.back}>
          ← My passbook
        </Link>
        <h1 className={p.h1}>My statement</h1>
        <p className={p.lead}>Choose two dates. Everything you gave and received between them is listed, ready to print or save as a PDF.</p>

        <form className={p.pick} method="get">
          <label>
            <span>From</span>
            <DateInput name="from" defaultValue={from ?? thisYear.from} max={today} required />
          </label>
          <label>
            <span>To</span>
            <DateInput name="to" defaultValue={to ?? today} max={today} required />
          </label>
          <button type="submit" className={styles.btn}>
            Show
          </button>
        </form>
        <p className={p.quick}>
          {picks.map((q) => (
            <Link key={q.label} href={`/erp/me/statement?from=${q.from}&to=${q.to}`}>
              {q.label}
            </Link>
          ))}
        </p>
      </div>

      {chosen && (
        <>
          <div className={`${p.docActions} ${styles.noPrint}`}>
            <PrintButton label="Print or save as PDF" />
          </div>
          <article className={p.stmt} aria-label="Statement">
            <header className={p.stmtHead}>
              <p className={p.stmtSociety}>{SOCIETY.name}</p>
              <p className={p.stmtSmall}>
                {SOCIETY.nameMarathi}
                <br />
                {SOCIETY.address.line1}, Tal. Guhagar, Dist. Ratnagiri · Reg. {SOCIETY.societyRegNo} · {SOCIETY.registrationNo}
              </p>
            </header>
            <h2 className={p.stmtTitle}>Statement</h2>
            <dl className={p.stmtWho}>
              <div>
                <dt>Name</dt>
                <dd>{u.name}</dd>
              </div>
              <div>
                <dt>Member no.</dt>
                <dd>{u.member_no}</dd>
              </div>
              <div>
                <dt>From</dt>
                <dd>{showDate(chosen.from)}</dd>
              </div>
              <div>
                <dt>To</dt>
                <dd>{showDate(chosen.to)}</dd>
              </div>
            </dl>

            <div className={p.sums}>
              <div>
                <span>Given</span>
                <b>{inr(gave)}</b>
              </div>
              <div>
                <span>Received</span>
                <b>{inr(got)}</b>
              </div>
            </div>
            {waiting > 0 && (
              <p className={p.waitingSum}>
                <span>Sent, waiting for the Accountant (not counted yet)</span>
                <b>{inr(waiting)}</b>
              </p>
            )}

            {lines.length ? (
              <Passbook lines={lines} />
            ) : (
              <p className={styles.note} style={{ marginTop: 14 }}>
                Nothing between these dates.
              </p>
            )}

            {gathered.length > 0 && (
              <>
                <h3 className={p.stmtSub}>Collected from others and handed in: {inr(handedIn)}</h3>
                <p className={p.stmtSmall}>This counts for the appeal it was for, not as your own gift.</p>
                <table className={p.pass}>
                  <tbody>
                    {gathered.map((c) => (
                      <tr key={c.id}>
                        <td className={p.date}>{showDate(c.on_date)}</td>
                        <td>
                          {c.what}
                          <small>
                            {c.no}
                            {c.people ? ` · from ${c.people} ${c.people === 1 ? "person" : "people"}` : ""}
                          </small>
                        </td>
                        <td className={p.amt}>{inr(c.amount_paise).replace("₹", "")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <footer className={p.stmtFoot}>
              <span>
                Made on {showDate(today)} from the {SOCIETY.shortName} books. Each gift here has its own receipt with the
                same number.
              </span>
              <b>For {SOCIETY.shortName}</b>
            </footer>
          </article>
        </>
      )}
    </>
  );
}
