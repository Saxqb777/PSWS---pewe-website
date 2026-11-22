import Link from "next/link";
import { requireUser } from "@/lib/erp/auth";
import { knownYears, report, stipendLines, totals } from "@/lib/erp/data";
import { approvalsForMe, fundBalances, placeBalances } from "@/lib/erp/books";
import { membersNow } from "@/lib/erp/dashboard";
import { portalOn } from "@/lib/erp/flags";
import { officeWaiting, publicAsks } from "@/lib/erp/portal";
import { HEADS, PURPOSES, fyOf, fyRange, showMonth, thisMonthIST, todayIST } from "@/lib/erp/labels";
import { InOutByMonth } from "@/components/erp/charts";
import { full } from "@/lib/erp/money-figures";
import { Meter, Ranked, Stat } from "@/components/erp/dash";
import { PageHead, Section } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";
import d from "@/components/erp/dash.module.css";

export const metadata = { title: "Dashboard" };

/**
 * The Society at a glance: what it holds and what is waiting today, then a
 * year of money in and out, where it came from and where it went.
 */
export default async function Dashboard({ searchParams }: { searchParams: Promise<{ fy?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const today = todayIST();
  const month = thisMonthIST();
  const current = fyOf(today);
  const years = await knownYears(current);
  const fy = years.includes(String(sp.fy)) ? String(sp.fy) : current;
  const range = fyRange(fy);
  const portal = portalOn();

  const [places, funds, forMe, waiting, stipends, year, rep, members, asks] = await Promise.all([
    placeBalances(),
    fundBalances(),
    approvalsForMe(u.id),
    portal ? officeWaiting(u.id) : Promise.resolve(null),
    stipendLines(month),
    totals(range.from, range.to),
    report(fy, null),
    portal ? membersNow() : Promise.resolve(null),
    portal ? publicAsks("live") : Promise.resolve([]),
  ]);

  const zakat = funds.find((f) => f.head === "zakat");
  const toPay = stipends.filter((s) => !s.paid_voucher).length;
  const many = (n: number, one: string, more: string) => (n === 1 ? one : more);
  const todo = [
    waiting?.pledges
      ? { n: waiting.pledges, what: many(waiting.pledges, "gift for the Accountant to find in the bank", "gifts for the Accountant to find in the bank"), href: "/erp/portal" }
      : null,
    forMe.length ? { n: forMe.length, what: many(forMe.length, "change waiting for your approval", "changes waiting for your approval"), href: "/erp/approvals" } : null,
    waiting?.asks ? { n: waiting.asks, what: many(waiting.asks, "ask waiting for your yes or no", "asks waiting for your yes or no"), href: "/erp/portal" } : null,
    waiting?.messages ? { n: waiting.messages, what: many(waiting.messages, "message from a member", "messages from members"), href: "/erp/portal" } : null,
    toPay
      ? { n: toPay, what: `${many(toPay, "family", "families")} still to be paid for ${showMonth(month).split(" ")[0]}`, href: "/erp/stipends" }
      : null,
  ].filter((x): x is { n: number; what: string; href: string } => !!x);
  const net = year.in_paise - year.out_paise;
  const anyMoney = rep.byMonth.some((m) => m.in_paise || m.out_paise);

  return (
    <>
      <PageHead title="Dashboard" sub="The Society at a glance" />

      <Section title="Held now" />
      <div className={d.stats}>
        <Stat label="In the bank" value={full(places.bank)} href="/erp/accounts" />
        <Stat label="Cash in hand" value={full(places.cash)} href="/erp/accounts" />
        {zakat && <Stat label="Zakat still to give" value={full(zakat.left)} note="kept apart, for those who may receive it" />}
      </div>

      <Section title="To do" />
      {todo.length ? (
        <ul className={d.todo}>
          {todo.map((t) => (
            <li key={t.what}>
              <Link href={t.href}>
                <b>{t.n}</b> {t.what}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={d.empty}>Nothing is waiting. Every gift is found, every approval given.</p>
      )}

      {portal && members && (
        <div className={styles.split}>
          <div>
            <Section title="Open asks" link={{ href: "/erp/portal", label: "Members' portal" }} />
            {asks.length ? (
              <ul className={d.meters}>
                {asks.map((a) => (
                  <Meter
                    key={a.id}
                    name={a.title}
                    href={`/erp/portal/asks/${a.id}`}
                    part={a.raised_paise}
                    whole={a.target_paise ?? a.raised_paise}
                    figure={a.target_paise ? `${full(a.raised_paise)} of ${full(a.target_paise)}` : `${full(a.raised_paise)} so far`}
                  />
                ))}
              </ul>
            ) : (
              <p className={d.empty}>No ask is open.</p>
            )}
          </div>
          <div>
            <Section title="Members in My PSWS" />
            <ul className={d.meters}>
              <Meter name="Have signed in" part={members.joined} whole={members.all} figure={`${members.joined} of ${members.all}`} />
              <Meter
                name="Came in the last 30 days"
                part={members.recent}
                whole={members.all}
                figure={`${members.recent} of ${members.all}`}
              />
            </ul>
          </div>
        </div>
      )}

      <div className={d.filter}>
        <span>Year</span>
        <nav className={styles.tabs} aria-label="Year">
          {years.map((y) => (
            <Link key={y} href={`/erp/dashboard?fy=${y}`} aria-current={y === fy ? "page" : undefined}>
              {y}
            </Link>
          ))}
        </nav>
      </div>

      <div className={d.stats}>
        <Stat label="Came in" value={full(year.in_paise)} note={`${year.in_count} ${year.in_count === 1 ? "receipt" : "receipts"}`} href={`/erp/money?fy=${fy}`} />
        <Stat label="Went out" value={full(year.out_paise)} note={`${year.out_count} ${year.out_count === 1 ? "payment" : "payments"}`} href={`/erp/money?fy=${fy}`} />
        <Stat label={net >= 0 ? "Kept" : "Spent more than came in"} value={full(Math.abs(net))} note="what came in, less what went out" />
      </div>

      <Section title={`Month by month, ${fy}`} />
      {anyMoney ? (
        <>
          <InOutByMonth months={rep.byMonth} now={month} />
          <details className={d.table}>
            <summary>As a table</summary>
            <table>
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">Came in</th>
                  <th scope="col">Went out</th>
                </tr>
              </thead>
              <tbody>
                {rep.byMonth.map((m) => (
                  <tr key={m.month}>
                    <th scope="row">{showMonth(m.month)}</th>
                    <td>{full(m.in_paise)}</td>
                    <td>{full(m.out_paise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      ) : (
        <p className={d.empty}>No money was entered in {fy}.</p>
      )}

      <div className={styles.split}>
        <div>
          <Section title="Where it came from" />
          <Ranked tone="in" rows={rep.byHead.map((h) => ({ name: HEADS[h.head].en, paise: h.in_paise }))} />
        </div>
        <div>
          <Section title="Where it went" />
          <Ranked tone="out" rows={rep.byPurpose.map((p) => ({ name: PURPOSES[p.purpose].en, paise: p.out_paise }))} />
        </div>
      </div>
      {rep.families > 0 && (
        <p className={d.foot}>
          {rep.families} {rep.families === 1 ? "family was" : "families were"} helped in {fy}
          {rep.stipendFamilies ? `, ${rep.stipendFamilies} of them every month` : ""}.
        </p>
      )}
    </>
  );
}
