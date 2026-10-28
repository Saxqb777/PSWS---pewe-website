import "server-only";
import { createHash } from "node:crypto";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

/**
 * A simple vote by link: members tap one option, once per phone, and see
 * how it stands. It keeps its own small database (VOTE_DATABASE_URL), apart
 * from the office's books; without one, there is no vote here.
 */
let client: NeonQueryFunction<false, false> | null = null;
function db(): NeonQueryFunction<false, false> | null {
  const url = process.env.VOTE_DATABASE_URL;
  if (!url) return null;
  client ??= neon(url);
  return client;
}

export interface Option {
  id: string;
  from: string;
  to: string;
}

export interface Poll {
  slug: string;
  question: string;
  options: Option[];
  closed: boolean;
  counts: Record<string, number>;
  total: number;
  /** the option ahead, or null when nobody has voted or it is level */
  leader: string | null;
}

/** Each phone's own random id, so it votes once; voting again changes its vote. */
export const VOTER_COOKIE = "psws_voter";

/** The phone's own id is kept only as a digest, so the database never holds it. */
export const voterKey = (token: string) => createHash("sha256").update(token).digest("hex");

export async function getPoll(slug: string): Promise<Poll | null> {
  const sql = db();
  if (!sql) return null;
  const rows = await sql`SELECT slug, question, options, closed_at IS NOT NULL AS closed FROM vote_poll WHERE slug = ${slug}`;
  if (!rows[0]) return null;
  const tally = await sql`SELECT choice, count(*)::int AS n FROM vote_ballot WHERE slug = ${slug} GROUP BY choice`;
  const options = rows[0].options as Option[];
  const counts: Record<string, number> = Object.fromEntries(options.map((o) => [o.id, 0]));
  for (const t of tally) if (t.choice in counts) counts[String(t.choice)] = Number(t.n);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const top = Math.max(...Object.values(counts));
  const ahead = options.filter((o) => counts[o.id] === top);
  return {
    slug,
    question: String(rows[0].question),
    options,
    closed: rows[0].closed === true,
    counts,
    total,
    leader: total && ahead.length === 1 ? ahead[0].id : null,
  };
}

export async function myChoice(slug: string, token: string | undefined): Promise<string | null> {
  const sql = db();
  if (!sql || !token) return null;
  const rows = await sql`SELECT choice FROM vote_ballot WHERE slug = ${slug} AND voter = ${voterKey(token)}`;
  return rows[0] ? String(rows[0].choice) : null;
}

/** One vote per phone; voting again while it is open changes it. */
export async function cast(slug: string, token: string, choice: string): Promise<boolean> {
  const sql = db();
  if (!sql) return false;
  const rows = await sql`
    INSERT INTO vote_ballot (slug, voter, choice)
    SELECT p.slug, ${voterKey(token)}, ${choice} FROM vote_poll p
    WHERE p.slug = ${slug} AND p.closed_at IS NULL AND p.options @> ${JSON.stringify([{ id: choice }])}::jsonb
    ON CONFLICT (slug, voter) DO UPDATE SET choice = EXCLUDED.choice, at = now()
    RETURNING choice`;
  return rows.length > 0;
}
