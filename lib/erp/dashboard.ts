import "server-only";
import { db, num } from "./db";

/** Who can open My PSWS, how many have, and how many came in the last 30 days. */
export async function membersNow(): Promise<{ all: number; joined: number; recent: number }> {
  const rows = await db()`
    SELECT count(*) AS all_,
           count(*) FILTER (WHERE password_hash IS NOT NULL) AS joined,
           count(*) FILTER (WHERE last_login_at > now() - interval '30 days') AS recent
    FROM erp_user WHERE active AND member_no IS NOT NULL AND phone NOT IN ('owner', 'accountant')`;
  return { all: num(rows[0].all_), joined: num(rows[0].joined), recent: num(rows[0].recent) };
}
