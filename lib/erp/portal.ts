import "server-only";
import { db, logChange, num } from "./db";
import type { User } from "./auth";
import { addMoneyIn } from "./data";
import { approverIds, closedMessage } from "./books";
import {
  ASK_KINDS,
  HEADS,
  PURPOSES,
  fyOf,
  fyRange,
  inr,
  labelOf,
  todayIST,
  type AskKind,
  type AskStatus,
  type Head,
  type Method,
  type PledgeStatus,
} from "./labels";

/**
 * The members' portal: every member's own page. What they gave and what
 * they received, the asks everyone can give to, their own asks, and what is
 * happening across PSWS as it happens.
 *
 * Three rules hold everywhere here:
 *  - money for an ask goes to PSWS's own bank or UPI, never to the member who asked;
 *  - an ask is seen by members only once two approvers say yes;
 *  - giving is seen: the feed says "Akhtar Khan gave ₹50,000 for …" unless
 *    the giver chose to keep their name hidden ("Received ₹50,000 for …");
 *    a member's passbook, and what they received, stay between them and the
 *    office, and a Zakat appeal or an ask for help never shows who it is for.
 */

/** How many approvers must say yes before an ask is seen by everyone (or say no before it is turned down). */
export const ASK_YES_NEEDED = 2;

/* ================================================================== me */

export interface Me {
  id: number;
  name: string;
  member_no: string;
  phone: string;
  post: string | null;
  role: string;
  lives_in: string | null;
  member_since: string | null;
  email: string | null;
}

export async function getMe(id: number): Promise<Me | null> {
  const rows = await db()`
    SELECT id, name, member_no, phone, post, role, lives_in, to_char(member_since, 'YYYY-MM-DD') AS member_since,
           first_email AS email
    FROM erp_user WHERE id = ${id}`;
  return rows[0] ? ({ ...rows[0], id: num(rows[0].id) } as Me) : null;
}

/* ================================================================== the passbook */

export interface PassLine {
  dir: "gave" | "received";
  id: number;
  on_date: string;
  no: string;
  what: string;
  amount_paise: number;
  method: Method;
}

/** Every rupee a member gave PSWS, and every rupee of help they or their family received. Newest first. */
export async function passbook(memberId: number, fy: string | null = null): Promise<PassLine[]> {
  const range = fy ? fyRange(fy) : { from: "1900-01-01", to: "9999-12-31" };
  const rows = await db()`
    SELECT 'gave' AS dir, m.id, to_char(m.on_date, 'YYYY-MM-DD') AS on_date, m.receipt_no AS no, m.amount_paise, m.method,
           m.head AS key, m.head_other AS other, a.title AS ask_title
    FROM erp_money_in m LEFT JOIN erp_ask a ON a.id = m.ask_id
    WHERE m.member_id = ${memberId} AND m.cancelled_at IS NULL AND m.on_date BETWEEN ${range.from} AND ${range.to}
    UNION ALL
    SELECT 'received', o.id, to_char(o.on_date, 'YYYY-MM-DD'), o.voucher_no, o.amount_paise, o.method,
           o.purpose, o.purpose_other, a.title
    FROM erp_money_out o LEFT JOIN erp_ask a ON a.id = o.ask_id LEFT JOIN erp_family f ON f.id = o.family_id
    WHERE (o.member_id = ${memberId} OR f.member_id = ${memberId}) AND o.cancelled_at IS NULL
      AND o.on_date BETWEEN ${range.from} AND ${range.to}
    ORDER BY on_date DESC, no DESC`;
  return rows.map((r) => ({
    dir: r.dir as PassLine["dir"],
    id: num(r.id),
    on_date: String(r.on_date),
    no: String(r.no),
    amount_paise: num(r.amount_paise),
    method: r.method as Method,
    what: r.ask_title
      ? String(r.ask_title)
      : r.dir === "gave"
        ? labelOf(HEADS, String(r.key), r.other as string | null)
        : labelOf(PURPOSES, String(r.key), r.other as string | null),
  }));
}

/* ================================================================== asks */

export interface Ask {
  id: number;
  kind: AskKind;
  title: string;
  story: string | null;
  private_note: string | null;
  target_paise: number | null;
  head: Head;
  closes_on: string | null;
  status: AskStatus;
  asked_by: number | null;
  asked_by_name: string;
  asked_at: string;
  live_at: string | null;
  closed_at: string | null;
  closing_note: string | null;
  raised_paise: number;
  givers: number;
  waiting_paise: number;
  yes: number;
  no: number;
}

const SELECT_ASK = `
  SELECT a.id, a.kind, a.title, a.story, a.private_note, a.target_paise, a.head,
         to_char(a.closes_on, 'YYYY-MM-DD') AS closes_on, a.status, a.asked_by,
         CASE WHEN u.phone = 'owner' THEN 'Office' ELSE coalesce(u.name, 'Office') END AS asked_by_name,
         a.asked_at, a.live_at, a.closed_at, a.closing_note,
         coalesce((SELECT sum(m.amount_paise) FROM erp_money_in m WHERE m.ask_id = a.id AND m.cancelled_at IS NULL), 0) AS raised_paise,
         (SELECT count(DISTINCT coalesce(m.member_id::text, m.from_name)) FROM erp_money_in m
           WHERE m.ask_id = a.id AND m.cancelled_at IS NULL) AS givers,
         coalesce((SELECT sum(p.amount_paise) FROM erp_pledge p WHERE p.ask_id = a.id AND p.status = 'waiting'), 0) AS waiting_paise,
         (SELECT count(*) FROM erp_ask_vote v WHERE v.ask_id = a.id AND v.vote = 'yes') AS yes,
         (SELECT count(*) FROM erp_ask_vote v WHERE v.ask_id = a.id AND v.vote = 'no') AS no
  FROM erp_ask a LEFT JOIN erp_user u ON u.id = a.asked_by`;

function asAsk(r: Record<string, unknown>): Ask {
  return {
    ...(r as unknown as Ask),
    id: num(r.id),
    asked_by: r.asked_by == null ? null : num(r.asked_by),
    target_paise: r.target_paise == null ? null : num(r.target_paise),
    raised_paise: num(r.raised_paise),
    givers: num(r.givers),
    waiting_paise: num(r.waiting_paise),
    yes: num(r.yes),
    no: num(r.no),
  };
}

/** Collections and Zakat appeals are for everyone once approved; an ask for help stays between the member and the office. */
export const isPublicKind = (k: AskKind) => k !== "help";

/** The asks every member sees: approved collections and Zakat appeals, open ones first. */
export async function publicAsks(which: "live" | "closed" | "all" = "live"): Promise<Ask[]> {
  const status = which === "all" ? ["live", "closed"] : [which];
  const rows = await db().query(
    `${SELECT_ASK} WHERE a.kind <> 'help' AND a.status = ANY($1::text[])
     ORDER BY (a.status = 'live') DESC, coalesce(a.closed_at, a.live_at) DESC LIMIT 100`,
    [status],
  );
  return rows.map(asAsk);
}

/** The asks this member put out themselves, in any state. */
export async function myAsks(memberId: number): Promise<Ask[]> {
  const rows = await db().query(`${SELECT_ASK} WHERE a.asked_by = $1 ORDER BY a.asked_at DESC LIMIT 100`, [memberId]);
  return rows.map(asAsk);
}

/** For the office: every ask in these states. */
export async function officeAsks(status: AskStatus[]): Promise<Ask[]> {
  const rows = await db().query(`${SELECT_ASK} WHERE a.status = ANY($1::text[]) ORDER BY a.asked_at DESC LIMIT 200`, [status]);
  return rows.map(asAsk);
}

export async function getAsk(id: number): Promise<Ask | null> {
  const rows = await db().query(`${SELECT_ASK} WHERE a.id = $1`, [id]);
  return rows[0] ? asAsk(rows[0]) : null;
}

/** May this member open this ask? The office and the approvers see every ask. */
export function memberMaySee(a: Ask, memberId: number, office: boolean): boolean {
  if (office || a.asked_by === memberId) return true;
  return isPublicKind(a.kind) && (a.status === "live" || a.status === "closed");
}

export interface AskVote {
  user_id: number;
  name: string;
  post: string | null;
  vote: "yes" | "no" | null;
  note: string | null;
}

/** Each approver, and what they said. */
export async function askVotes(askId: number): Promise<AskVote[]> {
  const ids = await approverIds();
  const rows = await db()`
    SELECT u.id AS user_id, u.name, u.post, v.vote, v.note
    FROM erp_user u LEFT JOIN erp_ask_vote v ON v.ask_id = ${askId} AND v.user_id = u.id
    WHERE u.id = ANY(${ids}::bigint[]) ORDER BY u.name`;
  return rows.map((r) => ({
    user_id: num(r.user_id),
    name: String(r.name),
    post: (r.post as string) ?? null,
    vote: (r.vote as AskVote["vote"]) ?? null,
    note: (r.note as string) ?? null,
  }));
}

/** Asks still waiting for this approver. */
export async function asksForApprover(userId: number): Promise<Ask[]> {
  const rows = await db().query(
    `${SELECT_ASK} WHERE a.status = 'waiting'
       AND NOT EXISTS (SELECT 1 FROM erp_ask_vote v WHERE v.ask_id = a.id AND v.user_id = $1)
     ORDER BY a.asked_at`,
    [userId],
  );
  return (await approverIds()).includes(userId) ? rows.map(asAsk) : [];
}

export interface AskFields {
  kind: AskKind;
  title: string;
  story: string | null;
  private_note: string | null;
  target_paise: number | null;
  head: Head;
  closes_on: string | null;
}

/** A member puts out an ask. It waits for the approvers; an approver asking counts as their own yes. */
export async function addAsk(u: User, f: AskFields): Promise<number> {
  const rows = await db()`
    INSERT INTO erp_ask (kind, title, story, private_note, target_paise, head, closes_on, asked_by)
    VALUES (${f.kind}, ${f.title}, ${f.story}, ${f.private_note}, ${f.target_paise}, ${f.head}, ${f.closes_on}, ${u.id})
    RETURNING id`;
  const id = num(rows[0].id);
  await logChange(u.id, "added", "ask", id, `${ASK_KINDS[f.kind].en}: ${f.title}${f.target_paise ? `, ${inr(f.target_paise)}` : ""}`);
  if ((await approverIds()).includes(u.id)) await voteAsk(u, id, true, "Asked for it");
  return id;
}

/** An approver's yes or no. Two yeses and everyone sees it; two noes and it is turned down. */
export async function voteAsk(u: User, id: number, yes: boolean, note: string | null): Promise<string | null> {
  if (!(await approverIds()).includes(u.id)) return "Only the approvers can approve an ask.";
  const a = await getAsk(id);
  if (!a || a.status !== "waiting") return "This ask has already been decided.";
  await db()`
    INSERT INTO erp_ask_vote (ask_id, user_id, vote, note) VALUES (${id}, ${u.id}, ${yes ? "yes" : "no"}, ${note})
    ON CONFLICT (ask_id, user_id) DO UPDATE SET vote = EXCLUDED.vote, note = EXCLUDED.note, at = now()`;
  await logChange(u.id, "decided", "ask", id, `${yes ? "Approved" : "Said no to"} the ask: ${a.title}${note ? `. Note: ${note}` : ""}`);
  const counts = await db()`
    SELECT count(*) FILTER (WHERE vote = 'yes') AS yes, count(*) FILTER (WHERE vote = 'no') AS no
    FROM erp_ask_vote WHERE ask_id = ${id}`;
  if (num(counts[0].yes) >= ASK_YES_NEEDED) {
    const opened = await db()`
      UPDATE erp_ask SET status = 'live', live_at = now() WHERE id = ${id} AND status = 'waiting' RETURNING id`;
    if (opened[0] && isPublicKind(a.kind))
      await addFeed("live", id,
        `New ${a.kind === "zakat" ? "Zakat appeal" : "collection"}: ${a.title}${a.target_paise ? `, for ${inr(a.target_paise)}` : ""}`);
  } else if (num(counts[0].no) >= ASK_YES_NEEDED) {
    await db()`UPDATE erp_ask SET status = 'declined', closed_at = now() WHERE id = ${id} AND status = 'waiting'`;
  }
  return null;
}

/** The member who asked can take it back while it waits. */
export async function withdrawAsk(u: User, id: number): Promise<string | null> {
  const rows = await db()`
    UPDATE erp_ask SET status = 'withdrawn', closed_at = now()
    WHERE id = ${id} AND asked_by = ${u.id} AND status = 'waiting' RETURNING title`;
  if (!rows[0]) return "Only the person who asked can take it back, and only while it waits for approval.";
  await logChange(u.id, "decided", "ask", id, `Took back the ask: ${rows[0].title}`);
  return null;
}

/** The office closes an ask, and says how the money was spent: everyone reads this. */
export async function closeAsk(u: User, id: number, note: string): Promise<string | null> {
  const a = await getAsk(id);
  if (!a || a.status !== "live") return "Only an open ask can be closed.";
  await db()`
    UPDATE erp_ask SET status = 'closed', closed_at = now(), closed_by = ${u.id}, closing_note = ${note}
    WHERE id = ${id} AND status = 'live'`;
  await logChange(u.id, "decided", "ask", id, `Closed the ask: ${a.title}, ${inr(a.raised_paise)} raised. ${note}`);
  if (isPublicKind(a.kind)) await addFeed("closed", id, `Closed: ${a.title}. ${inr(a.raised_paise)} raised. ${note}`);
  return null;
}

/* ================================================================== "I sent" */

export interface Pledge {
  id: number;
  member_id: number;
  member_name: string;
  member_no: string | null;
  ask_id: number | null;
  ask_title: string | null;
  amount_paise: number;
  head: Head;
  method: Method;
  reference: string | null;
  sent_on: string;
  show_name: boolean;
  status: PledgeStatus;
  receipt_no: string | null;
  check_note: string | null;
  created_at: string;
}

const SELECT_PLEDGE = `
  SELECT p.id, p.member_id, u.name AS member_name, u.member_no, p.ask_id, a.title AS ask_title, p.amount_paise, p.head,
         p.method, p.reference, to_char(p.sent_on, 'YYYY-MM-DD') AS sent_on, p.show_name, p.status, m.receipt_no,
         p.check_note, p.created_at
  FROM erp_pledge p JOIN erp_user u ON u.id = p.member_id
    LEFT JOIN erp_ask a ON a.id = p.ask_id LEFT JOIN erp_money_in m ON m.id = p.money_in_id`;

const asPledge = (r: Record<string, unknown>): Pledge => ({
  ...(r as unknown as Pledge),
  id: num(r.id),
  member_id: num(r.member_id),
  ask_id: r.ask_id == null ? null : num(r.ask_id),
  amount_paise: num(r.amount_paise),
});

export async function myPledges(memberId: number): Promise<Pledge[]> {
  const rows = await db().query(`${SELECT_PLEDGE} WHERE p.member_id = $1 ORDER BY p.created_at DESC LIMIT 100`, [memberId]);
  return rows.map(asPledge);
}

export async function pledgesToCheck(): Promise<Pledge[]> {
  const rows = await db().query(`${SELECT_PLEDGE} WHERE p.status = 'waiting' ORDER BY p.created_at`);
  return rows.map(asPledge);
}

export async function getPledge(id: number): Promise<Pledge | null> {
  const rows = await db().query(`${SELECT_PLEDGE} WHERE p.id = $1`, [id]);
  return rows[0] ? asPledge(rows[0]) : null;
}

export interface PledgeFields {
  ask_id: number | null;
  amount_paise: number;
  head: Head;
  method: Method;
  reference: string | null;
  sent_on: string;
  show_name: boolean;
}

/** A member says they paid. Nothing counts until the Treasurer finds it. */
export async function addPledge(u: User, f: PledgeFields): Promise<number> {
  const rows = await db()`
    INSERT INTO erp_pledge (member_id, ask_id, amount_paise, head, method, reference, sent_on, show_name)
    VALUES (${u.id}, ${f.ask_id}, ${f.amount_paise}, ${f.head}, ${f.method}, ${f.reference}, ${f.sent_on}, ${f.show_name})
    RETURNING id`;
  const id = num(rows[0].id);
  await logChange(u.id, "added", "pledge", id, `Said they sent ${inr(f.amount_paise)} (${f.method.toUpperCase()}${f.reference ? ` ${f.reference}` : ""})`);
  return id;
}

export async function withdrawPledge(u: User, id: number): Promise<string | null> {
  const rows = await db()`
    UPDATE erp_pledge SET status = 'withdrawn' WHERE id = ${id} AND member_id = ${u.id} AND status = 'waiting' RETURNING id`;
  return rows[0] ? null : "This can only be taken back while it waits for the Treasurer.";
}

/** "Akhtar Khan gave ₹50,000", or without the name when they chose to keep it hidden. */
const gaveLine = (name: string | null, paise: number, forWhat: string) =>
  `${name ? `${name.trim()} gave` : "Received"} ${inr(paise)} for ${forWhat}`;

/** A gift has come in for an ask: say so on everyone's screen, and when it reaches its target. */
export async function noteGift(askId: number, amountPaise: number, shownName: string | null) {
  const a = await getAsk(askId);
  if (!a || !isPublicKind(a.kind)) return;
  await addFeed("gift", askId, gaveLine(shownName, amountPaise, a.title));
  if (a.target_paise && a.raised_paise >= a.target_paise && a.raised_paise - amountPaise < a.target_paise)
    await addFeed("target", askId, `${a.title} reached its target of ${inr(a.target_paise)}`);
}

/** A member's gift to a fund rather than to an ask, on everyone's screen too. */
export async function noteFundGift(head: Head, amountPaise: number, shownName: string | null) {
  await addFeed("gift", null, gaveLine(shownName, amountPaise, HEADS[head].en));
}

/** The Treasurer found it in the bank: it becomes a numbered receipt, and counts. */
export async function confirmPledge(u: User, id: number): Promise<{ receipt_no: string } | { error: string }> {
  const p = await getPledge(id);
  if (!p || p.status !== "waiting") return { error: "This has already been checked." };
  const closed = await closedMessage(p.sent_on);
  if (closed) return { error: closed };
  // claim it first, so it is turned into a receipt once only
  const claimed = await db()`
    UPDATE erp_pledge SET status = 'confirmed', checked_by = ${u.id}, checked_at = now()
    WHERE id = ${id} AND status = 'waiting' RETURNING id`;
  if (!claimed[0]) return { error: "This has already been checked." };
  const member = await getMe(p.member_id);
  let r: { id: number; receipt_no: string };
  try {
    r = await addMoneyIn(u, {
      on_date: p.sent_on,
      from_name: member?.name ?? p.member_name,
      from_phone: member?.phone && /^\d+$/.test(member.phone) ? member.phone : null,
      from_place: member?.lives_in ?? null,
      amount_paise: p.amount_paise,
      head: p.head,
      head_other: null,
      method: p.method,
      reference: p.reference,
      note: p.ask_title ? `For: ${p.ask_title}` : "Given through the members' portal",
      member_id: p.member_id,
      ask_id: p.ask_id,
    });
  } catch (e) {
    // no receipt was made, so it goes back to waiting
    await db()`UPDATE erp_pledge SET status = 'waiting', checked_by = NULL, checked_at = NULL WHERE id = ${id}`;
    throw e;
  }
  await db()`UPDATE erp_pledge SET money_in_id = ${r.id} WHERE id = ${id}`;
  await logChange(u.id, "decided", "pledge", id, `Found ${inr(p.amount_paise)} from ${p.member_name} in the bank: receipt ${r.receipt_no}`);
  if (p.ask_id) await noteGift(p.ask_id, p.amount_paise, p.show_name ? p.member_name : null);
  else await noteFundGift(p.head, p.amount_paise, p.show_name ? p.member_name : null);
  return { receipt_no: r.receipt_no };
}

/** Not in the bank (yet): the member sees why, and can ask the Treasurer. */
export async function pledgeNotFound(u: User, id: number, note: string): Promise<string | null> {
  const rows = await db()`
    UPDATE erp_pledge SET status = 'not_found', checked_by = ${u.id}, checked_at = now(), check_note = ${note}
    WHERE id = ${id} AND status = 'waiting' RETURNING amount_paise`;
  if (!rows[0]) return "This has already been checked.";
  await logChange(u.id, "decided", "pledge", id, `Could not find ${inr(num(rows[0].amount_paise))} in the bank: ${note}`);
  return null;
}

/* ================================================================== what is happening */

export interface FeedLine {
  id: number;
  at: string;
  kind: "live" | "gift" | "target" | "closed" | "notice";
  ask_id: number | null;
  line: string;
}

export async function addFeed(kind: FeedLine["kind"], askId: number | null, line: string) {
  await db()`INSERT INTO erp_feed (kind, ask_id, line) VALUES (${kind}, ${askId}, ${line})`;
}

export async function feed(limit = 20): Promise<FeedLine[]> {
  const rows = await db()`SELECT id, at, kind, ask_id, line FROM erp_feed ORDER BY at DESC, id DESC LIMIT ${limit}`;
  return rows.map((r) => ({ ...(r as unknown as FeedLine), id: num(r.id), ask_id: r.ask_id == null ? null : num(r.ask_id) }));
}

/** This year across PSWS: given through asks and by how many people. For the live screen. */
export async function yearAtAGlance(): Promise<{ given_paise: number; givers: number; open: number }> {
  const range = fyRange(fyOf(todayIST()));
  const rows = await db()`
    SELECT coalesce(sum(m.amount_paise), 0) AS given_paise,
           count(DISTINCT coalesce(m.member_id::text, m.from_name)) AS givers,
           (SELECT count(*) FROM erp_ask WHERE status = 'live' AND kind <> 'help') AS open
    FROM erp_money_in m WHERE m.cancelled_at IS NULL AND m.on_date BETWEEN ${range.from} AND ${range.to}`;
  return { given_paise: num(rows[0].given_paise), givers: num(rows[0].givers), open: num(rows[0].open) };
}

/* ================================================================== members, for the office */

export interface PortalMember {
  id: number;
  name: string;
  member_no: string | null;
  phone: string;
  role: string;
  post: string | null;
  lives_in: string | null;
  active: boolean;
  has_password: boolean;
  last_login_at: string | null;
  gave_paise: number;
}

/** Everyone with a PSWS number: the office's people and the members with only a portal. */
export async function listPortalMembers(): Promise<PortalMember[]> {
  const fy = fyRange(fyOf(todayIST()));
  const rows = await db()`
    SELECT u.id, u.name, u.member_no, u.phone, u.role, u.post, u.lives_in, u.active, u.password_hash IS NOT NULL AS has_password,
           u.last_login_at,
           coalesce((SELECT sum(m.amount_paise) FROM erp_money_in m
                     WHERE m.member_id = u.id AND m.cancelled_at IS NULL AND m.on_date BETWEEN ${fy.from} AND ${fy.to}), 0) AS gave_paise
    FROM erp_user u WHERE u.phone <> 'owner' ORDER BY u.active DESC, u.name`;
  return rows.map((r) => ({ ...(r as unknown as PortalMember), id: num(r.id), gave_paise: num(r.gave_paise) }));
}

/** A member with a portal and nothing in the office. They choose their password the first time with mobile and Gmail. */
export async function addPortalMember(
  u: User,
  m: { name: string; phone: string; first_email: string | null; lives_in: string | null },
): Promise<number | null> {
  const rows = await db()`
    INSERT INTO erp_user (name, phone, role, first_email, lives_in, created_by)
    VALUES (${m.name}, ${m.phone}, 'member', ${m.first_email}, ${m.lives_in}, ${u.id})
    ON CONFLICT (phone) DO NOTHING RETURNING id`;
  if (!rows[0]) return null;
  const id = num(rows[0].id);
  await logChange(u.id, "access", "person", id, `Gave ${m.name} a member's portal`);
  return id;
}

/* ================================================================== messages to the office */

export interface MemberMessage {
  id: number;
  member_id: number;
  member_name: string;
  member_no: string | null;
  body: string;
  at: string;
  done_at: string | null;
}

export async function addMessage(u: User, body: string) {
  await db()`INSERT INTO erp_member_message (member_id, body) VALUES (${u.id}, ${body})`;
}

export async function openMessages(): Promise<MemberMessage[]> {
  const rows = await db()`
    SELECT g.id, g.member_id, u.name AS member_name, u.member_no, g.body, g.at, g.done_at
    FROM erp_member_message g JOIN erp_user u ON u.id = g.member_id WHERE g.done_at IS NULL ORDER BY g.at`;
  return rows.map((r) => ({ ...(r as unknown as MemberMessage), id: num(r.id), member_id: num(r.member_id) }));
}

export async function myMessages(memberId: number): Promise<MemberMessage[]> {
  const rows = await db()`
    SELECT g.id, g.member_id, u.name AS member_name, u.member_no, g.body, g.at, g.done_at
    FROM erp_member_message g JOIN erp_user u ON u.id = g.member_id WHERE g.member_id = ${memberId}
    ORDER BY g.at DESC LIMIT 20`;
  return rows.map((r) => ({ ...(r as unknown as MemberMessage), id: num(r.id), member_id: num(r.member_id) }));
}

export async function messageDone(u: User, id: number) {
  await db()`UPDATE erp_member_message SET done_at = now(), done_by = ${u.id} WHERE id = ${id} AND done_at IS NULL`;
}

/** For the office's home page and menu: what the portal is waiting on the office for. */
export async function officeWaiting(userId: number): Promise<{ pledges: number; asks: number; messages: number }> {
  const rows = await db()`
    SELECT (SELECT count(*) FROM erp_pledge WHERE status = 'waiting') AS pledges,
           (SELECT count(*) FROM erp_member_message WHERE done_at IS NULL) AS messages`;
  return {
    pledges: num(rows[0].pledges),
    asks: (await asksForApprover(userId)).length,
    messages: num(rows[0].messages),
  };
}

/** For the office: the receipts that count towards an ask, with who gave. */
export async function askReceipts(askId: number) {
  const rows = await db()`
    SELECT m.id, m.receipt_no, to_char(m.on_date, 'YYYY-MM-DD') AS on_date, m.from_name, m.amount_paise, m.method, u.member_no
    FROM erp_money_in m LEFT JOIN erp_user u ON u.id = m.member_id
    WHERE m.ask_id = ${askId} AND m.cancelled_at IS NULL ORDER BY m.on_date DESC, m.id DESC`;
  return rows.map((r) => ({
    id: num(r.id),
    receipt_no: String(r.receipt_no),
    on_date: String(r.on_date),
    from_name: String(r.from_name),
    amount_paise: num(r.amount_paise),
    method: r.method as Method,
    member_no: (r.member_no as string) ?? null,
  }));
}
