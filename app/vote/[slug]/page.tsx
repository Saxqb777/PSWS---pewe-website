import type { Metadata } from "next";
import { Baloo_2, Mukta } from "next/font/google";
import Image from "next/image";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { VOTER_COOKIE, getPoll, myChoice, type Option, type Poll } from "@/lib/vote";
import { SOCIETY } from "@/lib/site";
import { Seal } from "@/components/seal";
import { ShareVote, StayLive } from "@/components/vote/live";
import v from "@/components/vote/vote.module.css";
import { vote } from "./actions";

/** Rounded and friendly for the question and the hours, plain and clear for the rest. */
const baloo = Baloo_2({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-baloo", display: "swap" });
const mukta = Mukta({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-mukta", display: "swap" });

export const metadata: Metadata = {
  title: "Vote: when should the water come?",
  description: "PSWS members: tap 9 to 10 am or 10 to 11 am. One vote per phone.",
  robots: { index: false, follow: false },
};

const hours = (o: Option) => `${o.from} – ${o.to} am`;

/** Water standing in a tank, to a given height. */
function Water({ level }: { level: number }) {
  return (
    <span className={v.water} style={{ height: `${level}%` }} aria-hidden="true">
      <svg className={v.wave} viewBox="0 0 240 20" preserveAspectRatio="none">
        <path d="M0 10 Q 30 0 60 10 T 120 10 T 180 10 T 240 10 V 20 H 0 Z" />
      </svg>
    </span>
  );
}

/** An overhead water tank on its stand: a lid, ribs round the body, a tap; the water inside is the level. */
function Tank({ level, children }: { level: number; children: React.ReactNode }) {
  return (
    <span className={v.tank}>
      <span className={v.lid} aria-hidden="true" />
      <span className={v.body}>
        <Water level={level} />
        {children}
      </span>
      <span className={v.tap} aria-hidden="true" />
      <span className={v.stand} aria-hidden="true" />
    </span>
  );
}

/** A tank filled to this option's share of the votes. */
function Result({ o, poll, mine }: { o: Option; poll: Poll; mine: boolean }) {
  const n = poll.counts[o.id] ?? 0;
  const pct = poll.total ? Math.round((n / poll.total) * 100) : 0;
  const lead = poll.leader === o.id;
  const level = Math.max(pct, 3);
  // the number floats just above the water, or once the tank is mostly full, just under its surface
  const onWater = level > 62;
  const at = onWater ? { top: `calc(${100 - level}% + 14px)` } : { bottom: `calc(${level}% + 10px)` };
  return (
    <div className={`${v.result} ${lead ? v.lead : ""}`}>
      <Tank level={level}>
        <span className={`${v.pct} ${onWater ? v.pctOnWater : ""}`} style={at}>
          {pct}%
        </span>
      </Tank>
      <p className={v.resultHours}>
        {o.from}–{o.to} <small>am</small>
      </p>
      <p className={v.resultCount}>
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
    <main className={`${v.page} ${baloo.variable} ${mukta.variable}`}>
      <header className={v.hero}>
        <Image
          src="/images/hero/hero-right.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className={v.heroPhoto}
        />
        <div className="jali-band" />
        <div className={v.heroText}>
          <div className={v.society}>
            <span className={v.sealChip}>
              <Seal size={40} />
            </span>
            <p>
              <span className={v.label}>Members&apos; vote</span>
              <span className={v.societyName}>{SOCIETY.name}</span>
            </p>
          </div>
          <h1 className={v.title}>When should the water come?</h1>
          <p className={v.hi}>Paani kab aaye? Subah ka samay chuniye.</p>
        </div>
        <div className="arcade-band" />
      </header>

      <div className={v.col}>

        {choosing ? (
          <>
            <p className={v.intro}>Tap the hour that suits your home. One vote per phone.</p>
            <form action={vote.bind(null, slug)} className={v.pair}>
              {poll.options.map((o) => (
                <button key={o.id} type="submit" name="choice" value={o.id} className={v.option}>
                  <Tank level={24}>
                    <span className={v.optionHours}>
                      {o.from}–{o.to}
                    </span>
                    <span className={v.optionAm}>am · subah</span>
                  </Tank>
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
              <section className={v.thanks}>
                <p className={v.label}>Voting has closed</p>
                <p className={v.thanksTitle}>
                  {leader ? `The water will come ${hours(leader)}.` : "It ended level."}
                </p>
              </section>
            ) : (
              <section className={v.thanks} aria-live="polite">
                <p className={v.label}>Shukriya</p>
                <p className={v.thanksTitle}>Thank you for your vote</p>
                <p className={v.thanksText}>
                  You chose <b>{hours(chosen!)}</b>.
                </p>
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
            <div className={v.pair}>
              {poll.options.map((o) => (
                <Result key={o.id} o={o} poll={poll} mine={mine === o.id} />
              ))}
            </div>

            {!poll.closed && (
              <>
                <h2 className={`${v.label} ${v.h2}`}>Ask others to vote</h2>
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

      <footer className={v.foot}>
        <div className="jali-band" />
        <p>
          {SOCIETY.name} · Reg. {SOCIETY.registrationNo} · Est. {SOCIETY.foundedYear}
        </p>
        <p className={v.marathi}>{SOCIETY.nameMarathi}</p>
      </footer>
    </main>
  );
}
