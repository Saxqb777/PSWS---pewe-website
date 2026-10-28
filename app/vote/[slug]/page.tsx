import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { VOTER_COOKIE, getPoll, myChoice, type Option, type Poll } from "@/lib/vote";
import { ShareVote, StayLive } from "@/components/vote/live";
import v from "@/components/vote/vote.module.css";
import { vote } from "./actions";

export const metadata: Metadata = {
  title: "Vote: when should the water come?",
  description: "PSWS members: tap 9 to 10 am or 10 to 11 am. One vote per phone.",
  robots: { index: false, follow: false },
};

const hours = (o: Option) => `${o.from} – ${o.to} am`;

/** A tank of water, filled to this option's share of the votes. */
function Tank({ o, poll, mine }: { o: Option; poll: Poll; mine: boolean }) {
  const n = poll.counts[o.id] ?? 0;
  const pct = poll.total ? Math.round((n / poll.total) * 100) : 0;
  const lead = poll.leader === o.id;
  return (
    <div className={`${v.tank} ${lead ? v.tankLead : ""}`}>
      <div className={v.glass} aria-hidden="true">
        <div className={v.water} style={{ height: `${Math.max(pct, 3)}%` }}>
          <svg className={v.wave} viewBox="0 0 240 20" preserveAspectRatio="none">
            <path d="M0 10 Q 30 0 60 10 T 120 10 T 180 10 T 240 10 V 20 H 0 Z" />
          </svg>
        </div>
        <span className={`${v.pct} ${pct >= 50 ? v.pctOnWater : ""}`}>{pct}%</span>
      </div>
      <p className={v.tankHours}>
        {o.from}–{o.to} <small>am</small>
      </p>
      <p className={v.tankCount}>
        {n === 1 ? "1 vote" : `${n} votes`}
        {mine && <span className={v.mine}>your vote</span>}
      </p>
    </div>
  );
}

export default async function VotePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ thanks?: string; change?: string }>;
}) {
  await connection();
  const { slug } = await params;
  const poll = await getPoll(slug);
  if (!poll) notFound();
  const sp = await searchParams;
  const token = (await cookies()).get(VOTER_COOKIE)?.value;
  const mine = await myChoice(slug, token);
  const choosing = !poll.closed && (!mine || sp.change === "1");
  const leader = poll.options.find((o) => o.id === poll.leader);
  const chosen = poll.options.find((o) => o.id === mine);
  const share = "PSWS vote: when should the water come, 9 to 10 am or 10 to 11 am? Tap to vote:";

  return (
    <main className={v.page}>
      <div className={v.col}>
        <p className={v.eyebrow}>Pewe Social Welfare Society · Members&apos; vote</p>
        <h1 className={v.title}>When should the water come?</h1>
        <p className={v.hi}>Paani kab aaye? Subah ka samay chuniye.</p>

        {choosing ? (
          <>
            <p className={v.lead}>Tap the hour that suits your home. One vote per phone.</p>
            <form action={vote.bind(null, slug)} className={v.ballot}>
              {poll.options.map((o) => (
                <button key={o.id} type="submit" name="choice" value={o.id} className={v.option}>
                  <span className={v.optionWater} aria-hidden="true">
                    <svg className={v.wave} viewBox="0 0 240 20" preserveAspectRatio="none">
                      <path d="M0 10 Q 30 0 60 10 T 120 10 T 180 10 T 240 10 V 20 H 0 Z" />
                    </svg>
                  </span>
                  <span className={v.optionHours}>
                    {o.from}–{o.to}
                  </span>
                  <span className={v.optionAm}>am · subah</span>
                  <span className={v.optionTap}>{mine === o.id ? "Your vote now" : "Vote for this"}</span>
                </button>
              ))}
            </form>
            {mine && (
              <p className={v.small}>
                You chose {hours(chosen!)}. Tap the other one to change it, or{" "}
                <a href={`/vote/${slug}`} className={v.link}>
                  keep your vote
                </a>
                .
              </p>
            )}
          </>
        ) : (
          <>
            <StayLive />
            {poll.closed ? (
              <section className={v.verdict}>
                <p className={v.verdictLabel}>Voting has closed</p>
                <p className={v.verdictText}>
                  {leader ? `The water will come ${hours(leader)}.` : "It ended level."}
                </p>
              </section>
            ) : (
              <section className={v.thanks} aria-live="polite">
                <svg className={v.drop} viewBox="0 0 24 32" aria-hidden="true">
                  <path d="M12 1 C 12 1 2 13 2 20 a 10 10 0 0 0 20 0 C 22 13 12 1 12 1 Z" />
                </svg>
                <div>
                  <p className={v.thanksTitle}>Thank you for your vote</p>
                  <p className={v.thanksText}>
                    Shukriya. You chose <b>{hours(chosen!)}</b>.
                  </p>
                </div>
              </section>
            )}

            <p className={v.standing}>
              {poll.total === 0
                ? "No votes yet."
                : leader
                  ? `${poll.closed ? "Won" : "Leading"}: ${hours(leader)}`
                  : "Level for now"}
              <span>
                {poll.total} {poll.total === 1 ? "vote" : "votes"}
                {poll.closed ? "" : " · updates by itself"}
              </span>
            </p>
            <div className={v.tanks}>
              {poll.options.map((o) => (
                <Tank key={o.id} o={o} poll={poll} mine={mine === o.id} />
              ))}
            </div>

            {!poll.closed && (
              <>
                <h2 className={v.h2}>Ask others to vote</h2>
                <ShareVote path={`/vote/${slug}`} text={share} />
                <p className={v.small}>
                  Changed your mind?{" "}
                  <a href={`/vote/${slug}?change=1`} className={v.link}>
                    Change my vote
                  </a>
                </p>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
