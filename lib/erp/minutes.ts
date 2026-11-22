import "server-only";
import { db } from "./db";

/**
 * Minutes of committee meetings, shown on the Society's letterhead to
 * everyone signed in. They are kept with the meeting in the database
 * (erp_meeting.minutes), never in the code: what the committee discussed is
 * for the members, not for anyone reading the website's source.
 */

export interface Minutes {
  dateLong: string;
  held: string;
  subject: string;
  title: string;
  ref: string;
  objective: string;
  discussion: [string, string][];
  decisions: [string, string][];
  actions: [string, string][];
  next: string[];
}

const pairs = (v: unknown): [string, string][] =>
  Array.isArray(v) ? v.filter((x) => Array.isArray(x) && x.length === 2).map((x) => [String(x[0]), String(x[1])]) : [];

/** The minutes of one meeting, or null when it has none. */
export async function meetingMinutes(meetingId: number): Promise<Minutes | null> {
  const rows = await db()`SELECT minutes FROM erp_meeting WHERE id = ${meetingId} AND kind = 'meeting' AND minutes IS NOT NULL`;
  const raw = rows[0]?.minutes as Record<string, unknown> | undefined;
  if (!raw || typeof raw !== "object") return null;
  const s = (k: string) => String(raw[k] ?? "");
  return {
    dateLong: s("dateLong"),
    held: s("held"),
    subject: s("subject"),
    title: s("title"),
    ref: s("ref"),
    objective: s("objective"),
    discussion: pairs(raw.discussion),
    decisions: pairs(raw.decisions),
    actions: pairs(raw.actions),
    next: Array.isArray(raw.next) ? raw.next.map(String) : [],
  };
}
