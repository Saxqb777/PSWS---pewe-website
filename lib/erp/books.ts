import "server-only";
import { db, logChange, num } from "./db";
import type { User } from "./auth";
import {
  addFamily,
  cancelMoneyIn,
  cancelMoneyOut,
  getFamily,
  getMember,
  getMoneyIn,
  getMoneyOut,
  getWork,
  updateMoneyIn,
  updateMoneyOut,
  type MoneyIn,
  type MoneyInFields,
  type MoneyOut,
  type MoneyOutFields,
} from "./data";
import {
  HEADS,
  METHODS,
  PURPOSES,
  fyOf,
  inr,
  labelOf,
  showDate,
  showMonth,
  showPhone,
  todayIST,
  type Head,
} from "./labels";

/**
 * The office's books, kept the way the Society's accountant would want:
 *
 * - every fund (Zakat, Donation, Village work, Other) has a balance, and
 *   cash in hand and money in the bank have one too, counted from the
 *   starting balances;
 * - a month is closed once it agrees with the bank statement and the cash
 *   counted, and nothing new goes into a closed month;
 * - deleting or changing a receipt or payment, removing a family, member
 *   or work, and reopening a month all wait for every approver, for seven
 *   days at most; an approved change or deletion leaves a correction line
 *   in the cash book on the day it was approved.
 */

const APPROVAL_DAYS = 7;

/* ================================================================== months */

export const monthOf = (date: string) => date.slice(0, 7);

const lastDay = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};

export async function isClosed(date: string): Promise<boolean> {
  const rows = await db()`SELECT 1 FROM erp_month WHERE month = ${monthOf(date)} AND status = 'closed'`;
  return rows.length > 0;
}

/** null when the date's month is open; otherwise what to tell the person. */
export async function closedMessage(date: string): Promise<string | null> {
  return (await isClosed(date))
    ? `${showMonth(monthOf(date))} is closed. To add to it, ask to reopen it on the Accounts page (needs the approvers).`
    : null;
}

export interface MonthRow {
  month: string;
  status: "closed" | "open";
  cash_book_paise: number;
  bank_book_paise: number;
  cash_counted_paise: number;
  bank_statement_paise: number;
  note: string | null;
  closed_by_name: string | null;
  closed_at: string;
  reopened_at: string | null;
}

export async function listMonths(): Promise<Map<string, MonthRow>> {
  const rows = await db()`
    SELECT m.*, CASE WHEN u.phone = 'owner' THEN 'Office' ELSE u.name END AS closed_by_name
    FROM erp_month m LEFT JOIN erp_user u ON u.id = m.closed_by`;
  return new Map(
    rows.map((r) => [
      String(r.month),
      {
        ...r,
        cash_book_paise: num(r.cash_book_paise),
        bank_book_paise: num(r.bank_book_paise),
        cash_counted_paise: num(r.cash_counted_paise),
        bank_statement_paise: num(r.bank_statement_paise),
      } as MonthRow,
    ]),
  );
}

/** What the books say at the end of a month: cash in hand and money in the bank. */
export async function monthFigures(month: string) {
  return placeBalances(lastDay(month));
}

export async function closeMonth(
  u: User,
  month: string,
  f: { cash_counted_paise: number; bank_statement_paise: number; note: string | null },
) {
  const b = await monthFigures(month);
  await db()`
    INSERT INTO erp_month (month, status, cash_book_paise, bank_book_paise, cash_counted_paise, bank_statement_paise, note, closed_by)
    VALUES (${month}, 'closed', ${b.cash}, ${b.bank}, ${f.cash_counted_paise}, ${f.bank_statement_paise}, ${f.note}, ${u.id})
    ON CONFLICT (month) DO UPDATE SET status = 'closed', cash_book_paise = EXCLUDED.cash_book_paise,
      bank_book_paise = EXCLUDED.bank_book_paise, cash_counted_paise = EXCLUDED.cash_counted_paise,
      bank_statement_paise = EXCLUDED.bank_statement_paise, note = EXCLUDED.note, closed_by = EXCLUDED.closed_by,
      closed_at = now(), reopened_at = NULL`;
  await logChange(u.id, "changed", "month", null,
    `Closed ${showMonth(month)}: cash ${inr(f.cash_counted_paise)} counted (books ${inr(b.cash)}), bank ${inr(f.bank_statement_paise)} on the statement (books ${inr(b.bank)})${f.note ? ". " + f.note : ""}`);
}

/* ================================================================== starting balances */

export interface Opening {
  on_date: string;
  cash_paise: number;
  bank_paise: number;
  zakat_paise: number;
  donation_paise: number;
  development_paise: number;
  other_paise: number;
}

export async function getOpening(): Promise<Opening | null> {
  const rows = await db()`
    SELECT to_char(on_date, 'YYYY-MM-DD') AS on_date, cash_paise, bank_paise, zakat_paise, donation_paise, development_paise,
           other_paise FROM erp_opening WHERE id = 1`;
  const r = rows[0];
  return r
    ? {
        on_date: String(r.on_date),
        cash_paise: num(r.cash_paise),
        bank_paise: num(r.bank_paise),
        zakat_paise: num(r.zakat_paise),
        donation_paise: num(r.donation_paise),
        development_paise: num(r.development_paise),
        other_paise: num(r.other_paise),
      }
    : null;
}

const openingLine = (o: Opening) =>
  `cash ${inr(o.cash_paise)}, bank ${inr(o.bank_paise)}; Zakat ${inr(o.zakat_paise)}, Donation ${inr(o.donation_paise)}, Village work ${inr(o.development_paise)}, Other ${inr(o.other_paise)}`;

/** The first time only. Afterwards a change goes through the approvers. */
export async function setOpening(u: User, o: Opening): Promise<boolean> {
  const rows = await db()`
    INSERT INTO erp_opening (id, on_date, cash_paise, bank_paise, zakat_paise, donation_paise, development_paise, other_paise, set_by)
    VALUES (1, ${o.on_date}, ${o.cash_paise}, ${o.bank_paise}, ${o.zakat_paise}, ${o.donation_paise}, ${o.development_paise},
            ${o.other_paise}, ${u.id})
    ON CONFLICT (id) DO NOTHING RETURNING id`;
  if (!rows[0]) return false;
  await logChange(u.id, "added", "opening", null, `Starting balances on ${showDate(o.on_date)}: ${openingLine(o)}`);
  return true;
}

/* ================================================================== balances */

export interface Places {
  cash: number;
  bank: number;
  since: string | null;
}

/** Cash in hand and money in the bank, from the starting balances, up to a date (or today). */
export async function placeBalances(asOf: string | null = null): Promise<Places> {
  const rows = await db()`
    WITH o AS (SELECT on_date, cash_paise, bank_paise FROM erp_opening WHERE id = 1),
         since AS (SELECT coalesce((SELECT on_date FROM o), DATE '1900-01-01') AS d)
    SELECT
      (SELECT to_char(on_date, 'YYYY-MM-DD') FROM o) AS since,
      coalesce((SELECT cash_paise FROM o), 0) AS cash0,
      coalesce((SELECT bank_paise FROM o), 0) AS bank0,
      (SELECT coalesce(sum(amount_paise), 0) FROM erp_money_in WHERE cancelled_at IS NULL AND method = 'cash'
         AND on_date >= (SELECT d FROM since) AND (${asOf}::date IS NULL OR on_date <= ${asOf}::date)) AS cash_in,
      (SELECT coalesce(sum(amount_paise), 0) FROM erp_money_in WHERE cancelled_at IS NULL AND method <> 'cash'
         AND on_date >= (SELECT d FROM since) AND (${asOf}::date IS NULL OR on_date <= ${asOf}::date)) AS bank_in,
      (SELECT coalesce(sum(amount_paise), 0) FROM erp_money_out WHERE cancelled_at IS NULL AND method = 'cash'
         AND on_date >= (SELECT d FROM since) AND (${asOf}::date IS NULL OR on_date <= ${asOf}::date)) AS cash_out,
      (SELECT coalesce(sum(amount_paise), 0) FROM erp_money_out WHERE cancelled_at IS NULL AND method <> 'cash'
         AND on_date >= (SELECT d FROM since) AND (${asOf}::date IS NULL OR on_date <= ${asOf}::date)) AS bank_out,
      (SELECT coalesce(sum(amount_paise), 0) FROM erp_transfer WHERE cancelled_at IS NULL AND direction = 'to_bank'
         AND on_date >= (SELECT d FROM since) AND (${asOf}::date IS NULL OR on_date <= ${asOf}::date)) AS to_bank,
      (SELECT coalesce(sum(amount_paise), 0) FROM erp_transfer WHERE cancelled_at IS NULL AND direction = 'to_cash'
         AND on_date >= (SELECT d FROM since) AND (${asOf}::date IS NULL OR on_date <= ${asOf}::date)) AS to_cash`;
  const r = rows[0];
  return {
    since: (r.since as string) ?? null,
    cash: num(r.cash0) + num(r.cash_in) - num(r.cash_out) - num(r.to_bank) + num(r.to_cash),
    bank: num(r.bank0) + num(r.bank_in) - num(r.bank_out) + num(r.to_bank) - num(r.to_cash),
  };
}

export interface Fund {
  head: Head;
  start: number;
  in_paise: number;
  out_paise: number;
  left: number;
}

/** What is left in each fund: what it started with, plus what came in for it, less what was paid from it. */
export async function fundBalances(exceptOut: number | null = null): Promise<Fund[]> {
  const o = await getOpening();
  const since = o?.on_date ?? "1900-01-01";
  const rows = await db()`
    SELECT h AS head,
      (SELECT coalesce(sum(amount_paise), 0) FROM erp_money_in WHERE cancelled_at IS NULL AND head = h AND on_date >= ${since}::date) AS in_paise,
      (SELECT coalesce(sum(amount_paise), 0) FROM erp_money_out WHERE cancelled_at IS NULL AND head = h AND on_date >= ${since}::date
         AND (${exceptOut}::bigint IS NULL OR id <> ${exceptOut}::bigint)) AS out_paise
    FROM unnest(${Object.keys(HEADS)}::text[]) AS h`;
  const start: Record<Head, number> = {
    zakat: o?.zakat_paise ?? 0,
    donation: o?.donation_paise ?? 0,
    development: o?.development_paise ?? 0,
    other: o?.other_paise ?? 0,
  };
  return rows.map((r) => {
    const head = r.head as Head;
    const fund = { head, start: start[head], in_paise: num(r.in_paise), out_paise: num(r.out_paise), left: 0 };
    fund.left = fund.start + fund.in_paise - fund.out_paise;
    return fund;
  });
}

/* ================================================================== cash to bank, bank to cash */

export interface Transfer {
  id: number;
  transfer_no: string;
  fy: string;
  on_date: string;
  direction: "to_bank" | "to_cash";
  amount_paise: number;
  note: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_by_name: string | null;
}

export const TRANSFER_LABEL = { to_bank: "Cash deposited in bank", to_cash: "Cash taken from bank" } as const;

export async function addTransfer(
  u: User,
  f: { on_date: string; direction: "to_bank" | "to_cash"; amount_paise: number; note: string | null },
): Promise<number> {
  const fy = fyOf(f.on_date);
  const rows = await db()`
    WITH n AS (
      INSERT INTO erp_counter (kind, fy, last_no) VALUES ('T', ${fy}, 1)
      ON CONFLICT (kind, fy) DO UPDATE SET last_no = erp_counter.last_no + 1
      RETURNING last_no
    )
    INSERT INTO erp_transfer (transfer_no, fy, on_date, direction, amount_paise, note, created_by)
    SELECT 'T/' || ${fy} || '/' || lpad(n.last_no::text, 4, '0'), ${fy}, ${f.on_date}, ${f.direction}, ${f.amount_paise},
           ${f.note}, ${u.id}
    FROM n RETURNING id, transfer_no`;
  const id = num(rows[0].id);
  await logChange(u.id, "added", "transfer", id, `${rows[0].transfer_no}: ${TRANSFER_LABEL[f.direction]}, ${inr(f.amount_paise)}`);
  return id;
}

export async function getTransfer(id: number): Promise<Transfer | null> {
  const rows = await db()`
    SELECT t.id, t.transfer_no, t.fy, to_char(t.on_date, 'YYYY-MM-DD') AS on_date, t.direction, t.amount_paise, t.note,
           t.cancelled_at, t.cancel_reason, CASE WHEN u.phone = 'owner' THEN 'Office' ELSE u.name END AS created_by_name
    FROM erp_transfer t LEFT JOIN erp_user u ON u.id = t.created_by WHERE t.id = ${id}`;
  return rows[0] ? ({ ...rows[0], id: num(rows[0].id), amount_paise: num(rows[0].amount_paise) } as Transfer) : null;
}

/* ================================================================== corrections in the cash book */

export interface Correction {
  id: number;
  on_date: string;
  dir: "in" | "out" | "transfer";
  entity_id: number;
  no: string;
  what: string;
  before_paise: number;
  after_paise: number;
}

async function addCorrection(c: Omit<Correction, "id" | "on_date"> & { approval_id: number }) {
  await db()`
    INSERT INTO erp_correction (on_date, dir, entity_id, no, what, before_paise, after_paise, approval_id)
    VALUES (${todayIST()}, ${c.dir}, ${c.entity_id}, ${c.no}, ${c.what}, ${c.before_paise}, ${c.after_paise}, ${c.approval_id})`;
}

export async function listCorrections(fy: string, month: string | null): Promise<Correction[]> {
  const rows = await db()`
    SELECT id, to_char(on_date, 'YYYY-MM-DD') AS on_date, dir, entity_id, no, what, before_paise, after_paise
    FROM erp_correction
    WHERE on_date BETWEEN ${fy.slice(0, 4) + "-04-01"}::date AND ${Number(fy.slice(0, 4)) + 1 + "-03-31"}::date
      AND (${month}::text IS NULL OR to_char(on_date, 'YYYY-MM') = ${month})
    ORDER BY on_date DESC, id DESC`;
  return rows.map(
    (r) =>
      ({
        ...r,
        id: num(r.id),
        entity_id: num(r.entity_id),
        before_paise: num(r.before_paise),
        after_paise: num(r.after_paise),
      }) as Correction,
  );
}

/* ================================================================== approvals */

export type ApprovalAction = "delete" | "change" | "remove" | "reopen";

export interface ApprovalVote {
  user_id: number;
  name: string;
  vote: "yes" | "no" | null;
  note: string | null;
  at: string | null;
}

export interface Approval {
  id: number;
  entity: string;
  entity_id: number | null;
  entity_key: string;
  action: ApprovalAction;
  summary: string;
  change_lines: string | null;
  reason: string;
  asked_by: number | null;
  asked_by_name: string;
  asked_at: string;
  expires_at: string;
  status: "waiting" | "approved" | "expired" | "withdrawn";
  closed_at: string | null;
  yes: number;
  no: number;
  needed: number;
  votes: ApprovalVote[];
}

export const ACTION_LABEL: Record<ApprovalAction, string> = {
  delete: "Delete",
  change: "Change",
  remove: "Remove",
  reopen: "Reopen",
};

/** Where an approval's subject lives in the office. */
export function approvalHref(a: Pick<Approval, "entity" | "entity_id" | "entity_key">): string | null {
  const id = a.entity_id;
  switch (a.entity) {
    case "money_in":
      return `/erp/money/in/${id}`;
    case "money_out":
      return `/erp/money/out/${id}`;
    case "transfer":
      return `/erp/money/transfer/${id}`;
    case "family":
      return `/erp/families/${id}`;
    case "member":
      return `/erp/members/${id}`;
    case "work":
      return `/erp/works/${id}`;
    case "month":
      return `/erp/accounts/close/${a.entity_key.slice(6)}`;
    default:
      return "/erp/accounts";
  }
}

export async function approverIds(): Promise<number[]> {
  const rows = await db()`SELECT id FROM erp_user WHERE approver AND active ORDER BY id`;
  return rows.map((r) => num(r.id));
}

export async function isApprover(userId: number): Promise<boolean> {
  return (await approverIds()).includes(userId);
}

export async function approverNames(): Promise<string[]> {
  const rows = await db()`SELECT name FROM erp_user WHERE approver AND active ORDER BY name`;
  return rows.map((r) => String(r.name));
}

/** Requests older than seven days end without being carried out. */
async function expireOld() {
  const rows = await db()`
    UPDATE erp_approval SET status = 'expired', closed_at = now()
    WHERE status = 'waiting' AND expires_at < now() RETURNING id, summary, action`;
  for (const r of rows)
    await db()`INSERT INTO erp_audit (user_id, action, entity, entity_id, summary)
               VALUES (NULL, 'decided', 'approval', ${r.id},
                       ${`Not approved in ${APPROVAL_DAYS} days, so nothing was done: ${ACTION_LABEL[r.action as ApprovalAction].toLowerCase()} ${r.summary}`})`;
}

const SELECT_APPROVAL = `
  SELECT a.id, a.entity, a.entity_id, a.entity_key, a.action, a.summary, a.change_lines, a.changes, a.reason, a.approvers,
         a.asked_by, CASE WHEN u.phone = 'owner' THEN 'Office' ELSE coalesce(u.name, 'Office') END AS asked_by_name,
         a.asked_at, a.expires_at, a.status, a.closed_at,
         (SELECT count(*) FROM erp_approval_vote v WHERE v.approval_id = a.id AND v.vote = 'yes' AND v.user_id = ANY(a.approvers)) AS yes,
         (SELECT count(*) FROM erp_approval_vote v WHERE v.approval_id = a.id AND v.vote = 'no' AND v.user_id = ANY(a.approvers)) AS no,
         cardinality(a.approvers) AS needed
  FROM erp_approval a LEFT JOIN erp_user u ON u.id = a.asked_by`;

function asApproval(r: Record<string, unknown>, votes: ApprovalVote[] = []): Approval & { changes: unknown; approvers: number[] } {
  return {
    ...(r as unknown as Approval),
    id: num(r.id),
    entity_id: r.entity_id == null ? null : num(r.entity_id),
    asked_by: r.asked_by == null ? null : num(r.asked_by),
    yes: num(r.yes),
    no: num(r.no),
    needed: num(r.needed),
    approvers: ((r.approvers as unknown[]) ?? []).map(num),
    changes: r.changes,
    votes,
  };
}

export async function listApprovals(open: boolean): Promise<Approval[]> {
  await expireOld();
  const rows = open
    ? await db().query(`${SELECT_APPROVAL} WHERE a.status = 'waiting' ORDER BY a.asked_at DESC LIMIT 200`)
    : await db().query(`${SELECT_APPROVAL} WHERE a.status <> 'waiting' ORDER BY a.closed_at DESC NULLS LAST LIMIT 100`);
  return rows.map((r) => asApproval(r));
}

export async function getApproval(id: number) {
  await expireOld();
  const rows = await db().query(`${SELECT_APPROVAL} WHERE a.id = $1`, [id]);
  if (!rows[0]) return null;
  const votes = await db()`
    SELECT u.id AS user_id, u.name, v.vote, v.note, v.at
    FROM erp_approval a CROSS JOIN LATERAL unnest(a.approvers) WITH ORDINALITY AS x(uid, n)
      JOIN erp_user u ON u.id = x.uid
      LEFT JOIN erp_approval_vote v ON v.approval_id = a.id AND v.user_id = u.id
    WHERE a.id = ${id} ORDER BY x.n`;
  return asApproval(
    rows[0],
    votes.map((v) => ({
      user_id: num(v.user_id),
      name: String(v.name),
      vote: (v.vote as "yes" | "no") ?? null,
      note: (v.note as string) ?? null,
      at: (v.at as string) ?? null,
    })),
  );
}

/** The open request about a thing, if there is one: for the banner on its page. */
export async function openApproval(entityKey: string) {
  await expireOld();
  const rows = await db().query(`${SELECT_APPROVAL} WHERE a.entity_key = $1 AND a.status = 'waiting'`, [entityKey]);
  return rows[0] ? asApproval(rows[0]) : null;
}

/** The open requests still waiting for this person's approval. */
export async function approvalsForMe(userId: number): Promise<Approval[]> {
  await expireOld();
  const rows = await db().query(
    `${SELECT_APPROVAL} WHERE a.status = 'waiting' AND $1::bigint = ANY(a.approvers)
       AND NOT EXISTS (SELECT 1 FROM erp_approval_vote v WHERE v.approval_id = a.id AND v.user_id = $1 AND v.vote = 'yes')
     ORDER BY a.asked_at`,
    [userId],
  );
  return rows.map((r) => asApproval(r));
}

/** How many open requests still need this person's approval. */
export async function waitingForMe(userId: number): Promise<number> {
  const rows = await db()`
    SELECT count(*) AS n FROM erp_approval a
    WHERE a.status = 'waiting' AND a.expires_at > now() AND ${userId}::bigint = ANY(a.approvers)
      AND NOT EXISTS (SELECT 1 FROM erp_approval_vote v WHERE v.approval_id = a.id AND v.user_id = ${userId} AND v.vote = 'yes')`;
  return num(rows[0].n);
}

export interface AskInput {
  entity: string;
  entity_id: number | null;
  entity_key: string;
  action: ApprovalAction;
  summary: string;
  change_lines?: string | null;
  changes?: unknown;
  reason: string;
}

/** Asks the approvers. Returns the request's id, or why it could not be asked. */
export async function askApproval(u: User, a: AskInput): Promise<{ id: number } | { error: string }> {
  await expireOld();
  const approvers = await approverIds();
  if (!approvers.length) return { error: "No approvers are set yet. Ask the website owner to set them." };
  const rows = await db()`
    INSERT INTO erp_approval (entity, entity_id, entity_key, action, summary, change_lines, changes, reason, approvers, asked_by,
                              expires_at)
    VALUES (${a.entity}, ${a.entity_id}, ${a.entity_key}, ${a.action}, ${a.summary}, ${a.change_lines ?? null},
            ${a.changes === undefined ? null : JSON.stringify(a.changes)}::jsonb, ${a.reason}, ${approvers}::bigint[], ${u.id},
            now() + make_interval(days => ${APPROVAL_DAYS}))
    ON CONFLICT (entity_key) WHERE status = 'waiting' DO NOTHING
    RETURNING id`;
  if (!rows[0]) return { error: "A request about this is already waiting for approval. See Approvals." };
  const id = num(rows[0].id);
  await logChange(u.id, "added", "approval", id, `Asked to ${a.action} ${a.summary}. Reason: ${a.reason}`);
  // asking, when you are one of the approvers, counts as your approval
  if (approvers.includes(u.id)) await vote(u, id, true, "Asked for it", true);
  return { id };
}

/** An approver's yes or no. Once every approver has said yes, it is carried out. */
export async function vote(u: User, id: number, yes: boolean, note: string | null, quiet = false): Promise<string | null> {
  const a = await getApproval(id);
  if (!a || a.status !== "waiting") return "This request is closed.";
  if (!a.approvers.includes(u.id)) return "Only the approvers can approve this.";
  await db()`
    INSERT INTO erp_approval_vote (approval_id, user_id, vote, note) VALUES (${id}, ${u.id}, ${yes ? "yes" : "no"}, ${note})
    ON CONFLICT (approval_id, user_id) DO UPDATE SET vote = EXCLUDED.vote, note = EXCLUDED.note, at = now()`;
  if (!quiet)
    await logChange(u.id, "decided", "approval", id,
      `${yes ? "Approved" : "Said no to"}: ${a.action} ${a.summary}${note ? `. Note: ${note}` : ""}`);
  const yesNow = await db()`
    SELECT count(*) AS n FROM erp_approval_vote WHERE approval_id = ${id} AND vote = 'yes' AND user_id = ANY(${a.approvers}::bigint[])`;
  if (num(yesNow[0].n) < a.approvers.length) return null;
  // everyone has said yes: claim it, so it is carried out once only
  const claimed = await db()`
    UPDATE erp_approval SET status = 'approved', closed_at = now() WHERE id = ${id} AND status = 'waiting' RETURNING id`;
  if (!claimed[0]) return null;
  await carryOut(u, a);
  return null;
}

export async function withdraw(u: User, id: number): Promise<string | null> {
  const rows = await db()`
    UPDATE erp_approval SET status = 'withdrawn', closed_at = now()
    WHERE id = ${id} AND status = 'waiting' AND asked_by = ${u.id} RETURNING action, summary`;
  if (!rows[0]) return "Only the person who asked can withdraw it, and only while it is waiting.";
  await logChange(u.id, "decided", "approval", id, `Withdrew the request to ${rows[0].action} ${rows[0].summary}`);
  return null;
}

/** Does what every approver agreed to. */
async function carryOut(by: User, a: Approval & { changes: unknown }) {
  const all = `with the approval of all ${a.needed}`;
  const id = a.entity_id!;
  switch (`${a.entity}:${a.action}`) {
    case "money_in:delete": {
      const m = await getMoneyIn(id);
      if (!m || m.cancelled_at) break;
      await cancelMoneyIn(by, id, `Deleted ${all}. Reason: ${a.reason}`);
      await addCorrection({ dir: "in", entity_id: id, no: m.receipt_no, what: "Deleted", before_paise: m.amount_paise, after_paise: 0, approval_id: a.id });
      break;
    }
    case "money_out:delete": {
      const m = await getMoneyOut(id);
      if (!m || m.cancelled_at) break;
      await cancelMoneyOut(by, id, `Deleted ${all}. Reason: ${a.reason}`);
      await addCorrection({ dir: "out", entity_id: id, no: m.voucher_no, what: "Deleted", before_paise: m.amount_paise, after_paise: 0, approval_id: a.id });
      break;
    }
    case "transfer:delete": {
      const t = await getTransfer(id);
      if (!t || t.cancelled_at) break;
      await db()`UPDATE erp_transfer SET cancelled_at = now(), cancelled_by = ${by.id}, cancel_reason = ${`Deleted ${all}. Reason: ${a.reason}`}
                 WHERE id = ${id} AND cancelled_at IS NULL`;
      await addCorrection({ dir: "transfer", entity_id: id, no: t.transfer_no, what: "Deleted", before_paise: t.amount_paise, after_paise: 0, approval_id: a.id });
      break;
    }
    case "money_in:change": {
      const m = await getMoneyIn(id);
      if (!m || m.cancelled_at) break;
      const f = a.changes as MoneyInFields;
      await updateMoneyIn(by, id, f);
      await addCorrection({ dir: "in", entity_id: id, no: m.receipt_no, what: a.change_lines ?? "Changed", before_paise: m.amount_paise, after_paise: f.amount_paise, approval_id: a.id });
      break;
    }
    case "money_out:change": {
      const m = await getMoneyOut(id);
      if (!m || m.cancelled_at) break;
      const c = a.changes as { f: MoneyOutFields; newFamily: { name: string; place: string | null } | null };
      if (c.newFamily)
        c.f.family_id = await addFamily(by, {
          name: c.newFamily.name,
          place: c.newFamily.place,
          phone: null,
          people: null,
          notes: null,
          stipend_paise: null,
          stipend_active: false,
          active: true,
        });
      await updateMoneyOut(by, id, c.f);
      await addCorrection({ dir: "out", entity_id: id, no: m.voucher_no, what: a.change_lines ?? "Changed", before_paise: m.amount_paise, after_paise: c.f.amount_paise, approval_id: a.id });
      break;
    }
    case "family:remove":
      await db()`UPDATE erp_family SET active = false, updated_at = now(), updated_by = ${by.id} WHERE id = ${id}`;
      break;
    case "member:remove":
      await db()`UPDATE erp_member SET active = false, updated_at = now(), updated_by = ${by.id} WHERE id = ${id}`;
      break;
    case "work:remove":
      await db()`UPDATE erp_work SET removed_at = now(), updated_at = now(), updated_by = ${by.id} WHERE id = ${id}`;
      break;
    case "month:reopen":
      await db()`UPDATE erp_month SET status = 'open', reopened_at = now() WHERE month = ${a.entity_key.slice(6)}`;
      break;
    case "opening:change": {
      const o = a.changes as Opening;
      await db()`UPDATE erp_opening SET on_date = ${o.on_date}, cash_paise = ${o.cash_paise}, bank_paise = ${o.bank_paise},
                   zakat_paise = ${o.zakat_paise}, donation_paise = ${o.donation_paise}, development_paise = ${o.development_paise},
                   other_paise = ${o.other_paise}, set_by = ${by.id}, set_at = now() WHERE id = 1`;
      break;
    }
  }
  await logChange(by.id, "decided", "approval", a.id, `Approved by all ${a.needed}, so done: ${a.action} ${a.summary}`);
}

/* ================================================================== what a request is about, in words */

export const inSummaryLine = (m: MoneyIn) =>
  `receipt ${m.receipt_no}: ${inr(m.amount_paise)} from ${m.from_name}, ${labelOf(HEADS, m.head, m.head_other)}, ${showDate(m.on_date)}`;

export const outSummaryLine = (m: MoneyOut) =>
  `payment ${m.voucher_no}: ${inr(m.amount_paise)} to ${m.paid_to}, ${labelOf(PURPOSES, m.purpose, m.purpose_other)}, ${showDate(m.on_date)}`;

export const transferSummaryLine = (t: Transfer) =>
  `${t.transfer_no}: ${TRANSFER_LABEL[t.direction].toLowerCase()}, ${inr(t.amount_paise)}, ${showDate(t.on_date)}`;

function lines(pairs: [string, string, string][]): string | null {
  const changed = pairs.filter(([, a, b]) => a !== b).map(([k, a, b]) => `${k}: ${a || "(empty)"} → ${b || "(empty)"}`);
  return changed.length ? changed.join("\n") : null;
}

export function moneyInChanges(m: MoneyIn, f: MoneyInFields): string | null {
  return lines([
    ["Date", showDate(m.on_date), showDate(f.on_date)],
    ["From", m.from_name, f.from_name],
    ["Amount", inr(m.amount_paise), inr(f.amount_paise)],
    ["For", labelOf(HEADS, m.head, m.head_other), labelOf(HEADS, f.head, f.head_other)],
    ["How", METHODS[m.method].en, METHODS[f.method].en],
    ["Number", m.reference ?? "", f.reference ?? ""],
    ["Place", m.from_place ?? "", f.from_place ?? ""],
    ["Mobile", showPhone(m.from_phone), showPhone(f.from_phone)],
    ["Note", m.note ?? "", f.note ?? ""],
  ]);
}

export async function moneyOutChanges(
  m: MoneyOut,
  f: MoneyOutFields,
  newFamily: { name: string } | null,
): Promise<string | null> {
  const famName = newFamily ? `${newFamily.name} (new)` : f.family_id ? ((await getFamily(f.family_id))?.name ?? "") : "";
  const workName = f.work_id ? ((await getWork(f.work_id))?.name ?? "") : "";
  return lines([
    ["Date", showDate(m.on_date), showDate(f.on_date)],
    ["Paid to", m.paid_to, f.paid_to],
    ["Amount", inr(m.amount_paise), inr(f.amount_paise)],
    ["For", labelOf(PURPOSES, m.purpose, m.purpose_other), labelOf(PURPOSES, f.purpose, f.purpose_other)],
    ["From which money", labelOf(HEADS, m.head, m.head_other), labelOf(HEADS, f.head, f.head_other)],
    ["How", METHODS[m.method].en, METHODS[f.method].en],
    ["Number", m.reference ?? "", f.reference ?? ""],
    ["Family", m.family_name ?? "", famName],
    ["Work", m.work_name ?? "", workName],
    ["Note", m.note ?? "", f.note ?? ""],
  ]);
}

export function openingChanges(o: Opening, n: Opening): string | null {
  return lines([
    ["From", showDate(o.on_date), showDate(n.on_date)],
    ["Cash in hand", inr(o.cash_paise), inr(n.cash_paise)],
    ["In bank", inr(o.bank_paise), inr(n.bank_paise)],
    ["Zakat", inr(o.zakat_paise), inr(n.zakat_paise)],
    ["Donation", inr(o.donation_paise), inr(n.donation_paise)],
    ["Village work", inr(o.development_paise), inr(n.development_paise)],
    ["Other", inr(o.other_paise), inr(n.other_paise)],
  ]);
}

export async function memberLine(id: number) {
  const m = await getMember(id);
  return m ? `member ${m.name}${m.lives_in ? ", " + m.lives_in : ""}` : null;
}
