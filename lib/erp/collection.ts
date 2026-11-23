import "server-only";
import { db, logChange, num } from "./db";
import type { User } from "./auth";
import { inr } from "./labels";

/**
 * A collection drive, such as the Ramadan Zakat collection, as the committee
 * tracks it: what is in the bank, what members said they sent and the
 * Accountant is checking, and what is promised but not sent yet; by region,
 * and members' own against what others gave through them.
 */

/* ================================================================== promised, not sent yet */

export interface PromiseLine {
  id: number;
  ask_id: number;
  /** empty: the member's own promise */
  giver_name: string | null;
  country: string | null;
  amount_paise: number;
  note: string | null;
  status: "open" | "sent" | "dropped";
  created_at: string;
}

const asPromise = (r: Record<string, unknown>) =>
  ({
    ...r,
    id: num(r.id),
    ask_id: num(r.ask_id),
    amount_paise: num(r.amount_paise),
  }) as PromiseLine;

/** A member's promises to an appeal, open ones first. */
export async function myPromises(memberId: number, askId: number): Promise<PromiseLine[]> {
  const rows = await db()`
    SELECT id, ask_id, giver_name, country, amount_paise, note, status, created_at
    FROM erp_promise WHERE member_id = ${memberId} AND ask_id = ${askId} AND status <> 'dropped'
    ORDER BY (status = 'open') DESC, created_at DESC LIMIT 100`;
  return rows.map(asPromise);
}

export async function addPromise(
  u: User,
  f: { ask_id: number; giver_name: string | null; country: string | null; amount_paise: number; note: string | null },
): Promise<number> {
  const rows = await db()`
    INSERT INTO erp_promise (ask_id, member_id, giver_name, country, amount_paise, note)
    VALUES (${f.ask_id}, ${u.id}, ${f.giver_name}, ${f.country}, ${f.amount_paise}, ${f.note})
    RETURNING id, (SELECT title FROM erp_ask WHERE id = ${f.ask_id}) AS title`;
  const id = num(rows[0].id);
  await logChange(u.id, "added", "promise", id,
    `Promised ${inr(f.amount_paise)}${f.giver_name ? ` for ${f.giver_name}` : ""} to ${rows[0].title}`);
  return id;
}

/** Not coming after all: it stops counting as promised. Only the member who recorded it, while it is open. */
export async function dropPromise(u: User, id: number) {
  const rows = await db()`
    UPDATE erp_promise SET status = 'dropped', closed_at = now()
    WHERE id = ${id} AND member_id = ${u.id} AND status = 'open' RETURNING amount_paise, giver_name`;
  if (rows[0])
    await logChange(u.id, "cancelled", "promise", id,
      `Dropped a promise of ${inr(num(rows[0].amount_paise))}${rows[0].giver_name ? ` for ${rows[0].giver_name}` : ""}`);
}

/** The money for a promise was sent and recorded: it now counts as sent, not promised. */
export async function keepPromise(memberId: number, promiseId: number, askId: number, pledgeId: number): Promise<boolean> {
  const rows = await db()`
    UPDATE erp_promise SET status = 'sent', pledge_id = ${pledgeId}, closed_at = now()
    WHERE id = ${promiseId} AND member_id = ${memberId} AND ask_id = ${askId} AND status = 'open' RETURNING id`;
  return !!rows[0];
}

/** An open promise of this member's, for this appeal, or null. */
export async function openPromise(memberId: number, promiseId: number, askId: number): Promise<PromiseLine | null> {
  const rows = await db()`
    SELECT id, ask_id, giver_name, country, amount_paise, note, status, created_at
    FROM erp_promise WHERE id = ${promiseId} AND member_id = ${memberId} AND ask_id = ${askId} AND status = 'open'`;
  return rows[0] ? asPromise(rows[0]) : null;
}

/** The record of a promised gift was taken back: the promise is open again. */
export async function reopenPromiseOf(pledgeId: number) {
  await db()`UPDATE erp_promise SET status = 'open', pledge_id = NULL, closed_at = NULL WHERE pledge_id = ${pledgeId} AND status = 'sent'`;
}

/* ================================================================== the status, as the committee reads it */

export interface Part {
  inBank: number;
  checking: number;
  promised: number;
  total: number;
  gifts: number;
}

export interface CollectionStatus extends Part {
  target: number | null;
  /** what is still to be raised; 0 once the target is met */
  balance: number | null;
  /** of the target, counting everything promised */
  pct: number | null;
  regions: (Part & { region: string })[];
  own: Part;
  others: Part;
}

const empty = (): Part => ({ inBank: 0, checking: 0, promised: 0, total: 0, gifts: 0 });

function add(p: Part, state: string, paise: number, gifts: number) {
  if (state === "bank") p.inBank += paise;
  else if (state === "checking") p.checking += paise;
  else p.promised += paise;
  p.total += paise;
  p.gifts += gifts;
}

/**
 * Everything given or promised to an appeal. Where a gift came from is where
 * the giver lives (India when not said). Members' own gifts are told apart
 * from what others gave through a member, or straight to the office.
 */
export async function collectionStatus(askId: number, targetPaise: number | null): Promise<CollectionStatus> {
  const rows = await db()`
    SELECT coalesce(nullif(country, ''), 'India') AS region, 'bank' AS state, (member_id IS NOT NULL) AS own,
           amount_paise, coalesce(people, 1) AS gifts
    FROM erp_money_in WHERE ask_id = ${askId} AND cancelled_at IS NULL
    UNION ALL
    SELECT coalesce(nullif(country, ''), 'India'), 'checking', NOT collected, coalesce(amount_paise, 0), coalesce(people, 1)
    FROM erp_pledge WHERE ask_id = ${askId} AND status = 'waiting'
    UNION ALL
    SELECT coalesce(nullif(country, ''), 'India'), 'promised', giver_name IS NULL, amount_paise, 1
    FROM erp_promise WHERE ask_id = ${askId} AND status = 'open'`;
  const all = empty();
  const own = empty();
  const others = empty();
  const byRegion = new Map<string, Part>();
  for (const r of rows) {
    const paise = num(r.amount_paise);
    const gifts = num(r.gifts);
    const state = String(r.state);
    const region = String(r.region);
    add(all, state, paise, gifts);
    add(r.own ? own : others, state, paise, gifts);
    if (!byRegion.has(region)) byRegion.set(region, empty());
    add(byRegion.get(region)!, state, paise, gifts);
  }
  const regions = [...byRegion.entries()]
    .map(([region, p]) => ({ region, ...p }))
    .sort((a, b) => b.total - a.total || a.region.localeCompare(b.region));
  return {
    ...all,
    target: targetPaise,
    balance: targetPaise ? Math.max(targetPaise - all.total, 0) : null,
    pct: targetPaise ? (all.total / targetPaise) * 100 : null,
    regions,
    own,
    others,
  };
}
