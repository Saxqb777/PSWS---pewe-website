import Link from "next/link";
import { requireMember } from "@/lib/erp/auth";
import { feed, publicAsks, yearAtAGlance } from "@/lib/erp/portal";
import { ago, fyOf, inr, inrShort, todayIST } from "@/lib/erp/labels";
import { Meter } from "@/components/erp/portal-ui";
import { AutoRefresh } from "@/components/erp/portal-client";
import { DemoTour } from "@/components/erp/demo-tour";
import p from "@/components/erp/portal.module.css";

export const metadata = { title: "Live" };

/** For a TV or a projector at a meeting: the open asks, and what is coming in, as it comes in. */
export default async function LiveScreen() {
  await requireMember();
  const [asks, lines, year] = await Promise.all([publicAsks("live"), feed(9), yearAtAGlance()]);
  const now = Date.now();
  return (
    <div className={p.board}>
      <AutoRefresh every={4000} />
      <DemoTour />
      <header className={p.boardTop}>
        <h1 className={p.boardTitle}>
          PSWS <span>live</span>
        </h1>
        <span className={`${p.live} ${p.boardLive}`}>Updates by itself</span>
        <Link href="/erp/me" style={{ color: "inherit", opacity: 0.7 }}>
          Close
        </Link>
      </header>
      <section className={p.boardFigures} aria-label={`This year, ${fyOf(todayIST())}`}>
        <div>
          <span>Given this year</span>
          <b>{inrShort(year.given_paise)}</b>
        </div>
        <div>
          <span>People who gave</span>
          <b>{year.givers}</b>
        </div>
        <div>
          <span>Asks open</span>
          <b>{year.open}</b>
        </div>
      </section>
      <div className={p.boardGrid}>
        <section aria-label="Open asks">
          {asks.length ? (
            asks.slice(0, 5).map((a) => (
              <div key={a.id} className={p.boardAsk}>
                <h3>{a.title}</h3>
                <Meter raised={a.raised_paise} waiting={a.waiting_paise} target={a.target_paise} />
                <p className={p.raised}>
                  <span>
                    <b>{inr(a.raised_paise)}</b> {a.target_paise ? `of ${inr(a.target_paise)}` : ""}
                  </span>
                  <span>{a.givers === 1 ? "1 person" : `${a.givers} people`}</span>
                </p>
              </div>
            ))
          ) : (
            <p>Nothing is open right now.</p>
          )}
        </section>
        <section aria-label="Coming in">
          <ul className={p.boardFeed}>
            {lines.map((f) => (
              <li key={f.id}>
                {f.line}
                <time dateTime={new Date(f.at).toISOString()}>{ago(f.at, now)}</time>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
