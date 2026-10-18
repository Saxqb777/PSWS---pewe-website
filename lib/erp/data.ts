import "server-only";
import { db, logChange, num } from "./db";
import type { User } from "./auth";
import { OFFICE_BEARERS } from "../committee";
import {
  HEADS,
  KINDS,
  METHODS,
  PURPOSES,
  labelOf,
  fyOf,
  fyRange,
  inr,
  showMonth,
  type Head,
  type Kind,
  type Method,
  type Purpose,
  type Role,
  type Status,
  type WorkStatus,
} from "./labels";

/**
 * Everything the office screens read and write. Dates come back as
 * YYYY-MM-DD text (never JS dates, so nothing shifts by a time zone) and
 * money as paise numbers. Every change leaves a line in the history.
 */

/* ================================================================== numbering */

/** The next receipt (R) or payment (P) number in a financial year, in the same statement as the insert. */
const pad = (n: number) => String(n).padStart(4, "0");

/* ================================================================== money in */

export interface MoneyIn {
  id: number;
  receipt_no: string;
  fy: string;
  on_date: string;
  from_name: string;
  from_phone: string | null;
  from_place: string | null;
  amount_paise: number;
  head: Head;
  head_other: string | null;
  method: Method;
  reference: string | null;
  note: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_by_name: string | null;
  created_at: string;
}

export interface MoneyInFields {
  on_date: string;
  from_name: string;
  from_phone: string | null;
  from_place: string | null;
  amount_paise: number;
  head: Head;
  head_other: string | null;
  method: Method;
  reference: string | null;
  note: string | null;
}

const inSummary = (no: string, f: MoneyInFields) =>
  `Receipt ${no}: ${inr(f.amount_paise)} from ${f.from_name}, ${labelOf(HEADS, f.head, f.head_other)}, ${METHODS[f.method].en}`;

export async function addMoneyIn(u: User, f: MoneyInFields): Promise<{ id: number; receipt_no: string }> {
  const fy = fyOf(f.on_date);
  const rows = await db()`
    WITH n AS (
      INSERT INTO erp_counter (kind, fy, last_no) VALUES ('R', ${fy}, 1)
      ON CONFLICT (kind, fy) DO UPDATE SET last_no = erp_counter.last_no + 1
      RETURNING last_no
    )
    INSERT INTO erp_money_in
      (receipt_no, fy, on_date, from_name, from_phone, from_place, amount_paise, head, head_other, method, reference, note,
       created_by)
    SELECT 'R/' || ${fy} || '/' || lpad(n.last_no::text, 4, '0'), ${fy}, ${f.on_date}, ${f.from_name}, ${f.from_phone},
           ${f.from_place}, ${f.amount_paise}, ${f.head}, ${f.head_other}, ${f.method}, ${f.reference}, ${f.note}, ${u.id}
    FROM n
    RETURNING id, receipt_no`;
  const r = { id: num(rows[0].id), receipt_no: String(rows[0].receipt_no) };
  await logChange(u.id, "added", "money_in", r.id, inSummary(r.receipt_no, f));
  return r;
}

export async function updateMoneyIn(u: User, id: number, f: MoneyInFields) {
  const rows = await db()`
    UPDATE erp_money_in SET on_date = ${f.on_date}, from_name = ${f.from_name}, from_phone = ${f.from_phone},
      from_place = ${f.from_place}, amount_paise = ${f.amount_paise}, head = ${f.head}, head_other = ${f.head_other},
      method = ${f.method},
      reference = ${f.reference}, note = ${f.note}, updated_at = now(), updated_by = ${u.id}
    WHERE id = ${id} AND cancelled_at IS NULL
    RETURNING receipt_no`;
  if (rows[0]) await logChange(u.id, "changed", "money_in", id, inSummary(String(rows[0].receipt_no), f));
}

export async function cancelMoneyIn(u: User, id: number, reason: string) {
  const rows = await db()`
    UPDATE erp_money_in SET cancelled_at = now(), cancelled_by = ${u.id}, cancel_reason = ${reason}
    WHERE id = ${id} AND cancelled_at IS NULL RETURNING receipt_no, amount_paise, from_name`;
  if (rows[0])
    await logChange(u.id, "cancelled", "money_in", id,
      `Receipt ${rows[0].receipt_no} (${inr(num(rows[0].amount_paise))} from ${rows[0].from_name}) cancelled: ${reason}`);
}

export async function getMoneyIn(id: number): Promise<MoneyIn | null> {
  const rows = await db()`
    SELECT m.id, m.receipt_no, m.fy, to_char(m.on_date, 'YYYY-MM-DD') AS on_date, m.from_name, m.from_phone, m.from_place,
           m.amount_paise, m.head, m.head_other, m.method, m.reference, m.note, m.cancelled_at, m.cancel_reason, m.created_at,
           CASE WHEN u.phone = 'owner' THEN 'Office' ELSE u.name END AS created_by_name
    FROM erp_money_in m LEFT JOIN erp_user u ON u.id = m.created_by WHERE m.id = ${id}`;
  return rows[0] ? ({ ...rows[0], id: num(rows[0].id), amount_paise: num(rows[0].amount_paise) } as MoneyIn) : null;
}

/* ================================================================== money out */

export interface MoneyOut {
  id: number;
  voucher_no: string;
  fy: string;
  on_date: string;
  paid_to: string;
  amount_paise: number;
  head: Head;
  head_other: string | null;
  purpose: Purpose;
  purpose_other: string | null;
  method: Method;
  reference: string | null;
  family_id: number | null;
  family_name: string | null;
  request_id: number | null;
  work_id: number | null;
  work_name: string | null;
  stipend_month: string | null;
  note: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_by_name: string | null;
  created_at: string;
}

export interface MoneyOutFields {
  on_date: string;
  paid_to: string;
  amount_paise: number;
  head: Head;
  head_other: string | null;
  purpose: Purpose;
  purpose_other: string | null;
  method: Method;
  reference: string | null;
  family_id: number | null;
  request_id: number | null;
  work_id: number | null;
  note: string | null;
}

const outSummary = (
  no: string,
  f: { paid_to: string; amount_paise: number; purpose: Purpose; purpose_other?: string | null; method: Method },
) => `Payment ${no}: ${inr(f.amount_paise)} to ${f.paid_to}, ${labelOf(PURPOSES, f.purpose, f.purpose_other)}, ${METHODS[f.method].en}`;

export async function addMoneyOut(u: User, f: MoneyOutFields): Promise<{ id: number; voucher_no: string }> {
  const fy = fyOf(f.on_date);
  const rows = await db()`
    WITH n AS (
      INSERT INTO erp_counter (kind, fy, last_no) VALUES ('P', ${fy}, 1)
      ON CONFLICT (kind, fy) DO UPDATE SET last_no = erp_counter.last_no + 1
      RETURNING last_no
    )
    INSERT INTO erp_money_out
      (voucher_no, fy, on_date, paid_to, amount_paise, head, head_other, purpose, purpose_other, method, reference,
       family_id, request_id, work_id, note, created_by)
    SELECT 'P/' || ${fy} || '/' || lpad(n.last_no::text, 4, '0'), ${fy}, ${f.on_date}, ${f.paid_to}, ${f.amount_paise},
           ${f.head}, ${f.head_other}, ${f.purpose}, ${f.purpose_other}, ${f.method}, ${f.reference}, ${f.family_id},
           ${f.request_id}, ${f.work_id}, ${f.note}, ${u.id}
    FROM n
    RETURNING id, voucher_no`;
  const r = { id: num(rows[0].id), voucher_no: String(rows[0].voucher_no) };
  if (f.request_id) {
    await db()`UPDATE erp_request SET status = 'done', updated_at = now(), updated_by = ${u.id}
               WHERE id = ${f.request_id} AND status IN ('waiting', 'approved')`;
  }
  await logChange(u.id, "added", "money_out", r.id, outSummary(r.voucher_no, f));
  return r;
}

export async function updateMoneyOut(u: User, id: number, f: MoneyOutFields) {
  const rows = await db()`
    UPDATE erp_money_out SET on_date = ${f.on_date}, paid_to = ${f.paid_to}, amount_paise = ${f.amount_paise},
      head = ${f.head}, head_other = ${f.head_other}, purpose = ${f.purpose}, purpose_other = ${f.purpose_other},
      method = ${f.method}, reference = ${f.reference},
      family_id = ${f.family_id}, request_id = ${f.request_id}, work_id = ${f.work_id}, note = ${f.note},
      updated_at = now(), updated_by = ${u.id}
    WHERE id = ${id} AND cancelled_at IS NULL
    RETURNING voucher_no`;
  if (rows[0]) await logChange(u.id, "changed", "money_out", id, outSummary(String(rows[0].voucher_no), f));
}

export async function cancelMoneyOut(u: User, id: number, reason: string) {
  const rows = await db()`
    UPDATE erp_money_out SET cancelled_at = now(), cancelled_by = ${u.id}, cancel_reason = ${reason}
    WHERE id = ${id} AND cancelled_at IS NULL RETURNING voucher_no, amount_paise, paid_to`;
  if (rows[0])
    await logChange(u.id, "cancelled", "money_out", id,
      `Payment ${rows[0].voucher_no} (${inr(num(rows[0].amount_paise))} to ${rows[0].paid_to}) cancelled: ${reason}`);
}

export async function getMoneyOut(id: number): Promise<MoneyOut | null> {
  const rows = await db()`
    SELECT m.id, m.voucher_no, m.fy, to_char(m.on_date, 'YYYY-MM-DD') AS on_date, m.paid_to, m.amount_paise, m.head,
           m.head_other, m.purpose, m.purpose_other, m.method, m.reference, m.family_id, f.name AS family_name, m.request_id, m.work_id,
           w.name AS work_name, m.stipend_month, m.note, m.cancelled_at, m.cancel_reason, m.created_at,
           CASE WHEN u.phone = 'owner' THEN 'Office' ELSE u.name END AS created_by_name
    FROM erp_money_out m
      LEFT JOIN erp_user u ON u.id = m.created_by
      LEFT JOIN erp_family f ON f.id = m.family_id
      LEFT JOIN erp_work w ON w.id = m.work_id
    WHERE m.id = ${id}`;
  const r = rows[0];
  return r
    ? ({
        ...r,
        id: num(r.id),
        amount_paise: num(r.amount_paise),
        family_id: r.family_id == null ? null : num(r.family_id),
        request_id: r.request_id == null ? null : num(r.request_id),
        work_id: r.work_id == null ? null : num(r.work_id),
      } as MoneyOut)
    : null;
}

/* ================================================================== money lists */

export interface MoneyRow {
  dir: "in" | "out";
  id: number;
  no: string;
  on_date: string;
  who: string;
  amount_paise: number;
  head: Head;
  method: Method;
  purpose: Purpose | null;
  head_other: string | null;
  purpose_other: string | null;
  /** for a payment towards a village work, the work's name */
  work_name: string | null;
  cancelled: boolean;
}

export interface MoneyFilter {
  fy: string;
  month: string | null;
  dir: "all" | "in" | "out";
  q: string | null;
}

export async function listMoney(f: MoneyFilter): Promise<MoneyRow[]> {
  const like = f.q ? `%${f.q}%` : null;
  const rows = await db()`
    SELECT * FROM (
      SELECT 'in' AS dir, id, receipt_no AS no, to_char(on_date, 'YYYY-MM-DD') AS on_date, from_name AS who,
             amount_paise, head, method, NULL::text AS purpose, head_other, NULL::text AS purpose_other, NULL::text AS work_name,
             cancelled_at IS NOT NULL AS cancelled
      FROM erp_money_in
      WHERE fy = ${f.fy} AND ${f.dir} IN ('all', 'in')
        AND (${f.month}::text IS NULL OR to_char(on_date, 'YYYY-MM') = ${f.month})
        AND (${like}::text IS NULL OR from_name ILIKE ${like} OR receipt_no ILIKE ${like} OR coalesce(reference, '') ILIKE ${like}
             OR coalesce(note, '') ILIKE ${like})
      UNION ALL
      SELECT 'out', o.id, voucher_no, to_char(on_date, 'YYYY-MM-DD'), paid_to, amount_paise, head, method, purpose,
             o.head_other, o.purpose_other, w.name, cancelled_at IS NOT NULL
      FROM erp_money_out o LEFT JOIN erp_work w ON w.id = o.work_id
      WHERE fy = ${f.fy} AND ${f.dir} IN ('all', 'out')
        AND (${f.month}::text IS NULL OR to_char(on_date, 'YYYY-MM') = ${f.month})
        AND (${like}::text IS NULL OR paid_to ILIKE ${like} OR voucher_no ILIKE ${like} OR coalesce(reference, '') ILIKE ${like}
             OR coalesce(note, '') ILIKE ${like})
    ) x
    ORDER BY on_date DESC, no DESC
    LIMIT 500`;
  return rows.map((r) => ({ ...r, id: num(r.id), amount_paise: num(r.amount_paise) }) as MoneyRow);
}

/** The names already used, for the "who" box to suggest. */
export async function knownNames(dir: "in" | "out"): Promise<string[]> {
  const rows =
    dir === "in"
      ? await db()`SELECT from_name AS n, max(on_date) d FROM erp_money_in GROUP BY 1 ORDER BY d DESC LIMIT 300`
      : await db()`SELECT paid_to AS n, max(on_date) d FROM erp_money_out GROUP BY 1 ORDER BY d DESC LIMIT 300`;
  return rows.map((r) => String(r.n));
}

/** The financial years that have entries, plus the current one. */
export async function knownYears(current: string): Promise<string[]> {
  const rows = await db()`SELECT fy FROM erp_money_in UNION SELECT fy FROM erp_money_out`;
  return [...new Set([current, ...rows.map((r) => String(r.fy))])].sort().reverse();
}

/* ================================================================== families */

export interface Family {
  id: number;
  name: string;
  place: string | null;
  phone: string | null;
  people: number | null;
  notes: string | null;
  stipend_paise: number | null;
  stipend_active: boolean;
  active: boolean;
}

export interface FamilyRow extends Family {
  waiting: number;
  helped_this_year: number;
  last_help: string | null;
}

export interface FamilyFields {
  name: string;
  place: string | null;
  phone: string | null;
  people: number | null;
  notes: string | null;
  stipend_paise: number | null;
  stipend_active: boolean;
  active: boolean;
}

const asFamily = (r: Record<string, unknown>) => ({
  ...r,
  id: num(r.id),
  people: r.people == null ? null : num(r.people),
  stipend_paise: r.stipend_paise == null ? null : num(r.stipend_paise),
});

export async function listFamilies(fy: string, q: string | null, only: "all" | "stipend" | "waiting"): Promise<FamilyRow[]> {
  const like = q ? `%${q}%` : null;
  const rows = await db()`
    SELECT f.id, f.name, f.place, f.phone, f.people, f.notes, f.stipend_paise, f.stipend_active, f.active,
      (SELECT count(*) FROM erp_request r WHERE r.family_id = f.id AND r.status IN ('waiting', 'approved')) AS waiting,
      (SELECT coalesce(sum(amount_paise), 0) FROM erp_money_out m
         WHERE m.family_id = f.id AND m.fy = ${fy} AND m.cancelled_at IS NULL) AS helped_this_year,
      (SELECT to_char(max(on_date), 'YYYY-MM-DD') FROM erp_money_out m WHERE m.family_id = f.id AND m.cancelled_at IS NULL) AS last_help
    FROM erp_family f
    WHERE (${like}::text IS NULL OR f.name ILIKE ${like} OR coalesce(f.place, '') ILIKE ${like} OR coalesce(f.phone, '') ILIKE ${like})
    ORDER BY f.active DESC, f.name
    LIMIT 1000`;
  return rows
    .map((r) => ({ ...asFamily(r), waiting: num(r.waiting), helped_this_year: num(r.helped_this_year) }) as FamilyRow)
    .filter((r) => (only === "stipend" ? r.stipend_active : only === "waiting" ? r.waiting > 0 : true));
}

export async function getFamily(id: number): Promise<Family | null> {
  const rows = await db()`SELECT id, name, place, phone, people, notes, stipend_paise, stipend_active, active
                          FROM erp_family WHERE id = ${id}`;
  return rows[0] ? (asFamily(rows[0]) as Family) : null;
}

const familySummary = (f: FamilyFields) =>
  `Family ${f.name}${f.place ? ", " + f.place : ""}${f.stipend_active && f.stipend_paise ? `, monthly help ${inr(f.stipend_paise)}` : ""}`;

export async function addFamily(u: User, f: FamilyFields): Promise<number> {
  const rows = await db()`
    INSERT INTO erp_family (name, place, phone, people, notes, stipend_paise, stipend_active, active, created_by)
    VALUES (${f.name}, ${f.place}, ${f.phone}, ${f.people}, ${f.notes}, ${f.stipend_paise}, ${f.stipend_active}, true, ${u.id})
    RETURNING id`;
  const id = num(rows[0].id);
  await logChange(u.id, "added", "family", id, familySummary(f));
  return id;
}

export async function updateFamily(u: User, id: number, f: FamilyFields) {
  await db()`
    UPDATE erp_family SET name = ${f.name}, place = ${f.place}, phone = ${f.phone}, people = ${f.people}, notes = ${f.notes},
      stipend_paise = ${f.stipend_paise}, stipend_active = ${f.stipend_active}, active = ${f.active},
      updated_at = now(), updated_by = ${u.id}
    WHERE id = ${id}`;
  await logChange(u.id, "changed", "family", id, familySummary(f));
}

export async function familyNames(): Promise<{ id: number; name: string; place: string | null }[]> {
  const rows = await db()`SELECT id, name, place FROM erp_family WHERE active ORDER BY name`;
  return rows.map((r) => ({ id: num(r.id), name: String(r.name), place: (r.place as string) ?? null }));
}

/* ================================================================== help requests */

export interface Request {
  id: number;
  family_id: number;
  family_name: string;
  kind: Kind;
  kind_other: string | null;
  asked_on: string;
  asked_paise: number | null;
  details: string | null;
  status: Status;
  approved_paise: number | null;
  decided_on: string | null;
  decision_note: string | null;
  paid_paise: number;
}

const asRequest = (r: Record<string, unknown>) =>
  ({
    ...r,
    id: num(r.id),
    family_id: num(r.family_id),
    asked_paise: r.asked_paise == null ? null : num(r.asked_paise),
    approved_paise: r.approved_paise == null ? null : num(r.approved_paise),
    paid_paise: num(r.paid_paise),
  }) as Request;

export async function listRequests(opts: { familyId?: number; open?: boolean }): Promise<Request[]> {
  const fam = opts.familyId ?? null;
  const open = !!opts.open;
  const rows = await db()`
    SELECT r.id, r.family_id, f.name AS family_name, r.kind, r.kind_other, to_char(r.asked_on, 'YYYY-MM-DD') AS asked_on, r.asked_paise,
           r.details, r.status, r.approved_paise, to_char(r.decided_on, 'YYYY-MM-DD') AS decided_on, r.decision_note,
           (SELECT coalesce(sum(amount_paise), 0) FROM erp_money_out m WHERE m.request_id = r.id AND m.cancelled_at IS NULL) AS paid_paise
    FROM erp_request r JOIN erp_family f ON f.id = r.family_id
    WHERE (${fam}::bigint IS NULL OR r.family_id = ${fam})
      AND (NOT ${open} OR r.status IN ('waiting', 'approved'))
    ORDER BY (r.status = 'waiting') DESC, r.asked_on DESC, r.id DESC
    LIMIT 500`;
  return rows.map(asRequest);
}

export async function getRequest(id: number): Promise<Request | null> {
  const rows = await db()`
    SELECT r.id, r.family_id, f.name AS family_name, r.kind, r.kind_other, to_char(r.asked_on, 'YYYY-MM-DD') AS asked_on, r.asked_paise,
           r.details, r.status, r.approved_paise, to_char(r.decided_on, 'YYYY-MM-DD') AS decided_on, r.decision_note,
           (SELECT coalesce(sum(amount_paise), 0) FROM erp_money_out m WHERE m.request_id = r.id AND m.cancelled_at IS NULL) AS paid_paise
    FROM erp_request r JOIN erp_family f ON f.id = r.family_id WHERE r.id = ${id}`;
  return rows[0] ? asRequest(rows[0]) : null;
}

export async function addRequest(
  u: User,
  f: {
    family_id: number;
    kind: Kind;
    kind_other: string | null;
    asked_on: string;
    asked_paise: number | null;
    details: string | null;
  },
): Promise<number> {
  const rows = await db()`
    INSERT INTO erp_request (family_id, kind, kind_other, asked_on, asked_paise, details, created_by)
    VALUES (${f.family_id}, ${f.kind}, ${f.kind_other}, ${f.asked_on}, ${f.asked_paise}, ${f.details}, ${u.id})
    RETURNING id, (SELECT name FROM erp_family WHERE id = ${f.family_id}) AS family_name`;
  const id = num(rows[0].id);
  await logChange(u.id, "added", "request", id,
    `Request from ${rows[0].family_name}: ${labelOf(KINDS, f.kind, f.kind_other)}${f.asked_paise ? ", asked " + inr(f.asked_paise) : ""}`);
  return id;
}

export async function decideRequest(
  u: User,
  id: number,
  d: { approve: boolean; approved_paise: number | null; decided_on: string; note: string | null },
) {
  const rows = await db()`
    UPDATE erp_request SET status = ${d.approve ? "approved" : "declined"}, approved_paise = ${d.approve ? d.approved_paise : null},
      decided_on = ${d.decided_on}, decision_note = ${d.note}, updated_at = now(), updated_by = ${u.id}
    WHERE id = ${id} AND status IN ('waiting', 'approved')
    RETURNING kind, family_id, (SELECT name FROM erp_family WHERE id = erp_request.family_id) AS family_name`;
  if (!rows[0]) return;
  // a monthly stipend, once approved, is paid from then on by the stipend run
  if (d.approve && rows[0].kind === "stipend" && d.approved_paise) {
    await db()`UPDATE erp_family SET stipend_active = true, stipend_paise = ${d.approved_paise}, updated_at = now(),
               updated_by = ${u.id} WHERE id = ${rows[0].family_id}`;
  }
  await logChange(u.id, "decided", "request", id,
    `Request from ${rows[0].family_name} ${d.approve ? `approved${d.approved_paise ? " for " + inr(d.approved_paise) : ""}` : "not approved"}`);
}

/* ================================================================== the monthly stipend run */

export interface StipendLine {
  family_id: number;
  name: string;
  place: string | null;
  stipend_paise: number;
  paid_voucher: string | null;
  paid_paise: number | null;
}

export async function stipendLines(month: string): Promise<StipendLine[]> {
  const rows = await db()`
    SELECT f.id AS family_id, f.name, f.place, f.stipend_paise, m.voucher_no AS paid_voucher, m.amount_paise AS paid_paise
    FROM erp_family f
      LEFT JOIN erp_money_out m ON m.family_id = f.id AND m.stipend_month = ${month} AND m.cancelled_at IS NULL
    WHERE f.active AND (f.stipend_active OR m.id IS NOT NULL)
    ORDER BY f.name`;
  return rows.map((r) => ({
    family_id: num(r.family_id),
    name: String(r.name),
    place: (r.place as string) ?? null,
    stipend_paise: num(r.stipend_paise),
    paid_voucher: (r.paid_voucher as string) ?? null,
    paid_paise: r.paid_paise == null ? null : num(r.paid_paise),
  }));
}

/** Pays the chosen families their stipend for the month: one payment each, numbered together. */
export async function payStipends(
  u: User,
  month: string,
  lines: { family_id: number; amount_paise: number }[],
  common: { on_date: string; head: Head; head_other: string | null; method: Method; reference: string | null },
): Promise<number> {
  if (!lines.length) return 0;
  // leave out anyone already paid for this month
  const paid = await db()`SELECT family_id FROM erp_money_out WHERE stipend_month = ${month} AND cancelled_at IS NULL`;
  const already = new Set(paid.map((r) => num(r.family_id)));
  const todo = lines.filter((l) => !already.has(l.family_id));
  if (!todo.length) return 0;
  const names = await db()`SELECT id, name FROM erp_family WHERE id = ANY(${todo.map((l) => l.family_id)}::bigint[])`;
  const nameOf = new Map(names.map((r) => [num(r.id), String(r.name)]));

  const fy = fyOf(common.on_date);
  const reserved = await db()`
    INSERT INTO erp_counter (kind, fy, last_no) VALUES ('P', ${fy}, ${todo.length})
    ON CONFLICT (kind, fy) DO UPDATE SET last_no = erp_counter.last_no + ${todo.length}
    RETURNING last_no`;
  const last = num(reserved[0].last_no);
  const first = last - todo.length + 1;
  const vouchers = todo.map((_, i) => `P/${fy}/${pad(first + i)}`);
  const note = `Monthly help for ${showMonth(month)}`;

  const rows = await db()`
    INSERT INTO erp_money_out
      (voucher_no, fy, on_date, paid_to, amount_paise, head, head_other, purpose, method, reference, family_id, stipend_month,
       note, created_by)
    SELECT v, ${fy}, ${common.on_date}, n, a, ${common.head}, ${common.head_other}, 'stipend', ${common.method}, ${common.reference},
           f, ${month},
           ${note}, ${u.id}
    FROM unnest(${vouchers}::text[], ${todo.map((l) => nameOf.get(l.family_id) ?? "")}::text[],
                ${todo.map((l) => l.amount_paise)}::bigint[], ${todo.map((l) => l.family_id)}::bigint[]) AS t(v, n, a, f)
    ON CONFLICT (family_id, stipend_month) WHERE stipend_month IS NOT NULL AND cancelled_at IS NULL DO NOTHING
    RETURNING amount_paise`;
  const total = rows.reduce((s, r) => s + num(r.amount_paise), 0);
  // an approved request for a stipend is settled by its first payment
  await db()`UPDATE erp_request SET status = 'done', updated_at = now(), updated_by = ${u.id}
             WHERE kind = 'stipend' AND status = 'approved' AND family_id = ANY(${todo.map((l) => l.family_id)}::bigint[])`;
  await logChange(u.id, "paid", "stipend", null,
    `Monthly help for ${showMonth(month)}: ${rows.length} families, ${inr(total)} (${vouchers[0]} to ${vouchers[vouchers.length - 1]})`);
  return rows.length;
}

/* ================================================================== works */

export interface Work {
  id: number;
  name: string;
  place: string | null;
  status: WorkStatus;
  started_on: string | null;
  finished_on: string | null;
  budget_paise: number | null;
  notes: string | null;
  spent_paise: number;
}

export interface WorkFields {
  name: string;
  place: string | null;
  status: WorkStatus;
  started_on: string | null;
  finished_on: string | null;
  budget_paise: number | null;
  notes: string | null;
}

const asWork = (r: Record<string, unknown>) =>
  ({
    ...r,
    id: num(r.id),
    budget_paise: r.budget_paise == null ? null : num(r.budget_paise),
    spent_paise: num(r.spent_paise),
  }) as Work;

export async function listWorks(): Promise<Work[]> {
  const rows = await db()`
    SELECT w.id, w.name, w.place, w.status, to_char(w.started_on, 'YYYY-MM-DD') AS started_on,
           to_char(w.finished_on, 'YYYY-MM-DD') AS finished_on, w.budget_paise, w.notes,
           (SELECT coalesce(sum(amount_paise), 0) FROM erp_money_out m WHERE m.work_id = w.id AND m.cancelled_at IS NULL) AS spent_paise
    FROM erp_work w
    ORDER BY array_position(ARRAY['running', 'planned', 'done'], w.status), w.started_on DESC NULLS LAST, w.name`;
  return rows.map(asWork);
}

export async function getWork(id: number): Promise<Work | null> {
  const rows = await db()`
    SELECT w.id, w.name, w.place, w.status, to_char(w.started_on, 'YYYY-MM-DD') AS started_on,
           to_char(w.finished_on, 'YYYY-MM-DD') AS finished_on, w.budget_paise, w.notes,
           (SELECT coalesce(sum(amount_paise), 0) FROM erp_money_out m WHERE m.work_id = w.id AND m.cancelled_at IS NULL) AS spent_paise
    FROM erp_work w WHERE w.id = ${id}`;
  return rows[0] ? asWork(rows[0]) : null;
}

export async function addWork(u: User, f: WorkFields): Promise<number> {
  const rows = await db()`
    INSERT INTO erp_work (name, place, status, started_on, finished_on, budget_paise, notes, created_by)
    VALUES (${f.name}, ${f.place}, ${f.status}, ${f.started_on}, ${f.finished_on}, ${f.budget_paise}, ${f.notes}, ${u.id})
    RETURNING id`;
  const id = num(rows[0].id);
  await logChange(u.id, "added", "work", id, `Work ${f.name}${f.budget_paise ? ", planned cost " + inr(f.budget_paise) : ""}`);
  return id;
}

export async function updateWork(u: User, id: number, f: WorkFields) {
  await db()`
    UPDATE erp_work SET name = ${f.name}, place = ${f.place}, status = ${f.status}, started_on = ${f.started_on},
      finished_on = ${f.finished_on}, budget_paise = ${f.budget_paise}, notes = ${f.notes}, updated_at = now(), updated_by = ${u.id}
    WHERE id = ${id}`;
  await logChange(u.id, "changed", "work", id, `Work ${f.name}: ${f.status}${f.budget_paise ? ", planned cost " + inr(f.budget_paise) : ""}`);
}

export async function workNames(): Promise<{ id: number; name: string }[]> {
  const rows = await db()`SELECT id, name FROM erp_work WHERE status <> 'done' OR finished_on > now() - interval '1 year' ORDER BY name`;
  return rows.map((r) => ({ id: num(r.id), name: String(r.name) }));
}

/* ================================================================== payments for a family or a work */

export async function paymentsFor(where: { familyId?: number; workId?: number }): Promise<MoneyRow[]> {
  const fam = where.familyId ?? null;
  const work = where.workId ?? null;
  const rows = await db()`
    SELECT 'out' AS dir, o.id, voucher_no AS no, to_char(on_date, 'YYYY-MM-DD') AS on_date, paid_to AS who, amount_paise,
           head, method, purpose, o.head_other, o.purpose_other, w.name AS work_name, cancelled_at IS NOT NULL AS cancelled
    FROM erp_money_out o LEFT JOIN erp_work w ON w.id = o.work_id
    WHERE (${fam}::bigint IS NOT NULL AND o.family_id = ${fam}) OR (${work}::bigint IS NOT NULL AND o.work_id = ${work})
    ORDER BY on_date DESC, voucher_no DESC LIMIT 500`;
  return rows.map((r) => ({ ...r, id: num(r.id), amount_paise: num(r.amount_paise) }) as MoneyRow);
}

/* ================================================================== members */

export interface Member {
  id: number;
  name: string;
  phone: string | null;
  lives_in: string | null;
  post: string | null;
  notes: string | null;
  active: boolean;
}

export type MemberFields = Omit<Member, "id">;

export async function listMembers(q: string | null): Promise<Member[]> {
  const like = q ? `%${q}%` : null;
  const rows = await db()`
    SELECT id, name, phone, lives_in, post, notes, active FROM erp_member
    WHERE (${like}::text IS NULL OR name ILIKE ${like} OR coalesce(lives_in, '') ILIKE ${like} OR coalesce(phone, '') ILIKE ${like})
    ORDER BY active DESC, (post IS NULL), name LIMIT 2000`;
  return rows.map((r) => ({ ...r, id: num(r.id) }) as Member);
}

export async function getMember(id: number): Promise<Member | null> {
  const rows = await db()`SELECT id, name, phone, lives_in, post, notes, active FROM erp_member WHERE id = ${id}`;
  return rows[0] ? ({ ...rows[0], id: num(rows[0].id) } as Member) : null;
}

export async function addMember(u: User, f: MemberFields): Promise<number> {
  const rows = await db()`
    INSERT INTO erp_member (name, phone, lives_in, post, notes, active, created_by)
    VALUES (${f.name}, ${f.phone}, ${f.lives_in}, ${f.post}, ${f.notes}, true, ${u.id}) RETURNING id`;
  const id = num(rows[0].id);
  await logChange(u.id, "added", "member", id, `Member ${f.name}${f.lives_in ? ", " + f.lives_in : ""}`);
  return id;
}

export async function updateMember(u: User, id: number, f: MemberFields) {
  await db()`
    UPDATE erp_member SET name = ${f.name}, phone = ${f.phone}, lives_in = ${f.lives_in}, post = ${f.post}, notes = ${f.notes},
      active = ${f.active}, updated_at = now(), updated_by = ${u.id}
    WHERE id = ${id}`;
  await logChange(u.id, "changed", "member", id, `Member ${f.name}${f.active ? "" : " (marked no longer a member)"}`);
}

/** The committee's own contact details, from the form they filled in (read only here). */
export async function committeeDetails(): Promise<
  { name: string; phone: string; gmail: string; works_in: string }[]
> {
  try {
    const rows = await db()`
      SELECT member_name, phone_cc, phone, gmail, work_city, work_state, work_country FROM kyc_submission ORDER BY member_name`;
    return rows.map((r) => ({
      name: String(r.member_name),
      phone: `+${r.phone_cc} ${r.phone}`,
      gmail: String(r.gmail),
      works_in: [r.work_city, r.work_state, r.work_country].filter(Boolean).join(", "),
    }));
  } catch {
    return [];
  }
}

/* ================================================================== meetings and notices */

export interface Meeting {
  id: number;
  on_date: string;
  kind: "meeting" | "notice";
  title: string;
  body: string | null;
  for_website: boolean;
  created_by_name: string | null;
}

export type MeetingFields = Omit<Meeting, "id" | "created_by_name">;

export async function listMeetings(): Promise<Meeting[]> {
  const rows = await db()`
    SELECT m.id, to_char(m.on_date, 'YYYY-MM-DD') AS on_date, m.kind, m.title, m.body, m.for_website,
           CASE WHEN u.phone = 'owner' THEN 'Office' ELSE u.name END AS created_by_name
    FROM erp_meeting m LEFT JOIN erp_user u ON u.id = m.created_by ORDER BY m.on_date DESC, m.id DESC LIMIT 500`;
  return rows.map((r) => ({ ...r, id: num(r.id) }) as Meeting);
}

export async function getMeeting(id: number): Promise<Meeting | null> {
  const rows = await db()`
    SELECT m.id, to_char(m.on_date, 'YYYY-MM-DD') AS on_date, m.kind, m.title, m.body, m.for_website,
           CASE WHEN u.phone = 'owner' THEN 'Office' ELSE u.name END AS created_by_name
    FROM erp_meeting m LEFT JOIN erp_user u ON u.id = m.created_by WHERE m.id = ${id}`;
  return rows[0] ? ({ ...rows[0], id: num(rows[0].id) } as Meeting) : null;
}

export async function addMeeting(u: User, f: MeetingFields): Promise<number> {
  const rows = await db()`
    INSERT INTO erp_meeting (on_date, kind, title, body, for_website, created_by)
    VALUES (${f.on_date}, ${f.kind}, ${f.title}, ${f.body}, ${f.for_website}, ${u.id}) RETURNING id`;
  const id = num(rows[0].id);
  await logChange(u.id, "added", "meeting", id, `${f.kind === "meeting" ? "Meeting" : "Notice"}: ${f.title}`);
  return id;
}

export async function updateMeeting(u: User, id: number, f: MeetingFields) {
  await db()`
    UPDATE erp_meeting SET on_date = ${f.on_date}, kind = ${f.kind}, title = ${f.title}, body = ${f.body},
      for_website = ${f.for_website}, updated_at = now(), updated_by = ${u.id}
    WHERE id = ${id}`;
  await logChange(u.id, "changed", "meeting", id, `${f.kind === "meeting" ? "Meeting" : "Notice"}: ${f.title}`);
}

/* ================================================================== the home page and reports */

export interface Totals {
  in_paise: number;
  out_paise: number;
  in_count: number;
  out_count: number;
}

export async function totals(from: string, to: string): Promise<Totals> {
  const rows = await db()`
    SELECT
      (SELECT coalesce(sum(amount_paise), 0) FROM erp_money_in WHERE cancelled_at IS NULL AND on_date BETWEEN ${from} AND ${to}) AS in_paise,
      (SELECT count(*) FROM erp_money_in WHERE cancelled_at IS NULL AND on_date BETWEEN ${from} AND ${to}) AS in_count,
      (SELECT coalesce(sum(amount_paise), 0) FROM erp_money_out WHERE cancelled_at IS NULL AND on_date BETWEEN ${from} AND ${to}) AS out_paise,
      (SELECT count(*) FROM erp_money_out WHERE cancelled_at IS NULL AND on_date BETWEEN ${from} AND ${to}) AS out_count`;
  const r = rows[0];
  return { in_paise: num(r.in_paise), out_paise: num(r.out_paise), in_count: num(r.in_count), out_count: num(r.out_count) };
}

export interface Report {
  byHead: { head: Head; in_paise: number; out_paise: number }[];
  byPurpose: { purpose: Purpose; out_paise: number; count: number }[];
  byMonth: { month: string; in_paise: number; out_paise: number }[];
  byMethod: { method: Method; in_paise: number; out_paise: number }[];
  families: number;
  stipendFamilies: number;
}

export async function report(fy: string, month: string | null): Promise<Report> {
  const { from, to } = fyRange(fy);
  const m = month;
  const [heads, purposes, months, methods, fam] = await Promise.all([
    db()`
      SELECT h AS head,
        (SELECT coalesce(sum(amount_paise), 0) FROM erp_money_in WHERE cancelled_at IS NULL AND head = h AND fy = ${fy}
           AND (${m}::text IS NULL OR to_char(on_date, 'YYYY-MM') = ${m})) AS in_paise,
        (SELECT coalesce(sum(amount_paise), 0) FROM erp_money_out WHERE cancelled_at IS NULL AND head = h AND fy = ${fy}
           AND (${m}::text IS NULL OR to_char(on_date, 'YYYY-MM') = ${m})) AS out_paise
      FROM unnest(${Object.keys(HEADS)}::text[]) AS h`,
    db()`
      SELECT purpose, coalesce(sum(amount_paise), 0) AS out_paise, count(*) AS count FROM erp_money_out
      WHERE cancelled_at IS NULL AND fy = ${fy} AND (${m}::text IS NULL OR to_char(on_date, 'YYYY-MM') = ${m})
      GROUP BY purpose`,
    db()`
      SELECT to_char(d, 'YYYY-MM') AS month,
        (SELECT coalesce(sum(amount_paise), 0) FROM erp_money_in WHERE cancelled_at IS NULL
           AND to_char(on_date, 'YYYY-MM') = to_char(d, 'YYYY-MM')) AS in_paise,
        (SELECT coalesce(sum(amount_paise), 0) FROM erp_money_out WHERE cancelled_at IS NULL
           AND to_char(on_date, 'YYYY-MM') = to_char(d, 'YYYY-MM')) AS out_paise
      FROM generate_series(${from}::date, ${to}::date, interval '1 month') AS d`,
    db()`
      SELECT k AS method,
        (SELECT coalesce(sum(amount_paise), 0) FROM erp_money_in WHERE cancelled_at IS NULL AND method = k AND fy = ${fy}
           AND (${m}::text IS NULL OR to_char(on_date, 'YYYY-MM') = ${m})) AS in_paise,
        (SELECT coalesce(sum(amount_paise), 0) FROM erp_money_out WHERE cancelled_at IS NULL AND method = k AND fy = ${fy}
           AND (${m}::text IS NULL OR to_char(on_date, 'YYYY-MM') = ${m})) AS out_paise
      FROM unnest(${Object.keys(METHODS)}::text[]) AS k`,
    db()`
      SELECT count(DISTINCT family_id) AS families,
             count(DISTINCT family_id) FILTER (WHERE purpose = 'stipend') AS stipend_families
      FROM erp_money_out WHERE cancelled_at IS NULL AND family_id IS NOT NULL AND fy = ${fy}
        AND (${m}::text IS NULL OR to_char(on_date, 'YYYY-MM') = ${m})`,
  ]);
  const byPurposeMap = new Map(purposes.map((r) => [String(r.purpose), r]));
  return {
    byHead: heads.map((r) => ({ head: r.head as Head, in_paise: num(r.in_paise), out_paise: num(r.out_paise) })),
    byPurpose: (Object.keys(PURPOSES) as Purpose[]).map((p) => ({
      purpose: p,
      out_paise: num(byPurposeMap.get(p)?.out_paise),
      count: num(byPurposeMap.get(p)?.count),
    })),
    byMonth: months.map((r) => ({ month: String(r.month), in_paise: num(r.in_paise), out_paise: num(r.out_paise) })),
    byMethod: methods.map((r) => ({ method: r.method as Method, in_paise: num(r.in_paise), out_paise: num(r.out_paise) })),
    families: num(fam[0].families),
    stipendFamilies: num(fam[0].stipend_families),
  };
}

/* ================================================================== people with access */

export interface Person {
  id: number;
  name: string;
  phone: string;
  role: Role;
  post: string | null;
  active: boolean;
  has_password: boolean;
  /** can choose a password the first time with the Gmail on record */
  has_first_email: boolean;
  last_login_at: string | null;
}

export async function listPeople(): Promise<Person[]> {
  const rows = await db()`
    SELECT id, name, phone, role, post, active, password_hash IS NOT NULL AS has_password,
           first_email IS NOT NULL AS has_first_email, last_login_at
    FROM erp_user WHERE phone <> 'owner'
    ORDER BY active DESC, array_position(ARRAY['admin', 'editor', 'viewer'], role), name`;
  return rows.map((r) => ({ ...r, id: num(r.id) }) as Person);
}

export async function getPerson(id: number): Promise<Person | null> {
  const rows = await db()`
    SELECT id, name, phone, role, post, active, password_hash IS NOT NULL AS has_password,
           first_email IS NOT NULL AS has_first_email, last_login_at
    FROM erp_user WHERE id = ${id} AND phone <> 'owner'`;
  return rows[0] ? ({ ...rows[0], id: num(rows[0].id) } as Person) : null;
}

export async function addPerson(
  u: User,
  p: { name: string; phone: string; role: Role; post: string | null; first_email: string | null },
): Promise<number | null> {
  const rows = await db()`
    INSERT INTO erp_user (name, phone, role, post, first_email, created_by)
    VALUES (${p.name}, ${p.phone}, ${p.role}, ${p.post}, ${p.first_email}, ${u.id})
    ON CONFLICT (phone) DO NOTHING RETURNING id`;
  if (!rows[0]) return null;
  const id = num(rows[0].id);
  await logChange(u.id, "access", "person", id, `Gave ${p.name} access`);
  return id;
}

export async function updatePerson(u: User, id: number, p: { name: string; role: Role; post: string | null; active: boolean }) {
  await db()`UPDATE erp_user SET name = ${p.name}, role = ${p.role}, post = ${p.post}, active = ${p.active} WHERE id = ${id}`;
  if (!p.active) await db()`DELETE FROM erp_session WHERE user_id = ${id}`;
  await logChange(u.id, "access", "person", id, `${p.name}: ${p.active ? "details changed" : "access removed"}`);
}

export async function adminCount(): Promise<number> {
  const rows = await db()`SELECT count(*) AS n FROM erp_user WHERE role = 'admin' AND active AND phone <> 'owner'`;
  return num(rows[0].n);
}

/* ================================================================== history */

export interface HistoryLine {
  id: number;
  at: string;
  who: string | null;
  action: string;
  entity: string;
  entity_id: number | null;
  summary: string;
}

export async function history(limit = 300, entity: string | null = null): Promise<HistoryLine[]> {
  const rows = await db()`
    SELECT a.id, a.at, CASE WHEN u.phone = 'owner' THEN 'Office' ELSE u.name END AS who, a.action, a.entity, a.entity_id, a.summary
    FROM erp_audit a LEFT JOIN erp_user u ON u.id = a.user_id
    WHERE (${entity}::text IS NULL OR a.entity = ${entity})
      -- the website owner's private-link sign-ins are not part of the office's record
      AND NOT (coalesce(u.phone, '') = 'owner' AND a.summary = 'Signed in with the private link')
    ORDER BY a.at DESC, a.id DESC LIMIT ${limit}`;
  return rows.map((r) => ({ ...r, id: num(r.id), entity_id: r.entity_id == null ? null : num(r.entity_id) }) as HistoryLine);
}


/* ================================================================== downloads for Excel */

export type Sheet = { columns: string[]; rows: (string | number | null)[][] };

const rupees = (p: unknown) => (p == null ? null : (Number(p) / 100).toFixed(2));

/** Phone numbers with a space in them, so Excel keeps them as text instead of 9.19812E+11. */
const csvPhone = (d: unknown) => {
  const s = d == null ? "" : String(d);
  if (!s) return null;
  return s.startsWith("91") && s.length === 12 ? `${s.slice(2, 7)} ${s.slice(7)}` : `00 ${s}`;
};

/** Every row of one kind, for a CSV that opens in Excel. Money for a financial year (and month). */
export async function sheet(kind: string, fy: string, month: string | null): Promise<Sheet | null> {
  const m = month;
  switch (kind) {
    case "money-in": {
      const rows = await db()`
        SELECT receipt_no, to_char(on_date, 'YYYY-MM-DD') AS d, from_name, from_place, from_phone, amount_paise, head, head_other, method,
               reference, note, CASE WHEN u.phone = 'owner' THEN 'Office' ELSE u.name END AS entered_by, cancelled_at IS NOT NULL AS cancelled, cancel_reason
        FROM erp_money_in i LEFT JOIN erp_user u ON u.id = i.created_by
        WHERE fy = ${fy} AND (${m}::text IS NULL OR to_char(on_date, 'YYYY-MM') = ${m}) ORDER BY on_date, receipt_no`;
      return {
        columns: ["Receipt no", "Date", "From", "Place", "Mobile", "Amount (Rs)", "For", "How", "Number", "Note", "Entered by", "Cancelled", "Why cancelled"],
        rows: rows.map((r) => [r.receipt_no, r.d, r.from_name, r.from_place, csvPhone(r.from_phone), rupees(r.amount_paise),
          labelOf(HEADS, r.head as string, r.head_other as string | null), METHODS[r.method as Method]?.en ?? r.method, r.reference, r.note, r.entered_by,
          r.cancelled ? "Yes" : "", r.cancel_reason]),
      };
    }
    case "money-out": {
      const rows = await db()`
        SELECT voucher_no, to_char(on_date, 'YYYY-MM-DD') AS d, paid_to, amount_paise, purpose, o.purpose_other, head, o.head_other, method, reference,
               f.name AS family, w.name AS work, stipend_month, note,
               CASE WHEN u.phone = 'owner' THEN 'Office' ELSE u.name END AS entered_by,
               o.cancelled_at IS NOT NULL AS cancelled, cancel_reason
        FROM erp_money_out o LEFT JOIN erp_user u ON u.id = o.created_by LEFT JOIN erp_family f ON f.id = o.family_id
          LEFT JOIN erp_work w ON w.id = o.work_id
        WHERE fy = ${fy} AND (${m}::text IS NULL OR to_char(on_date, 'YYYY-MM') = ${m}) ORDER BY on_date, voucher_no`;
      return {
        columns: ["Payment no", "Date", "Paid to", "Amount (Rs)", "For", "Out of", "How", "Number", "Family", "Work", "Monthly help for", "Note", "Entered by", "Cancelled", "Why cancelled"],
        rows: rows.map((r) => [r.voucher_no, r.d, r.paid_to, rupees(r.amount_paise), labelOf(PURPOSES, r.purpose as string, r.purpose_other as string | null),
          labelOf(HEADS, r.head as string, r.head_other as string | null), METHODS[r.method as Method]?.en ?? r.method, r.reference, r.family, r.work,
          r.stipend_month, r.note, r.entered_by, r.cancelled ? "Yes" : "", r.cancel_reason]),
      };
    }
    case "families": {
      const rows = await listFamilies(fy, null, "all");
      return {
        columns: ["Name", "Place", "Mobile", "People", "Monthly help", "Monthly help (Rs)", `Received in ${fy} (Rs)`, "Last helped", "Requests open", "Still helped", "Notes"],
        rows: rows.map((r) => [r.name, r.place, csvPhone(r.phone), r.people, r.stipend_active ? "Yes" : "", rupees(r.stipend_paise),
          rupees(r.helped_this_year), r.last_help, r.waiting, r.active ? "Yes" : "No", r.notes]),
      };
    }
    case "requests": {
      const rows = await listRequests({});
      return {
        columns: ["Family", "Need", "Asked on", "Asked (Rs)", "Decision", "Decided on", "Approved (Rs)", "Paid (Rs)", "Details", "Note"],
        rows: rows.map((r) => [r.family_name, labelOf(KINDS, r.kind, r.kind_other), r.asked_on, rupees(r.asked_paise), r.status, r.decided_on,
          rupees(r.approved_paise), rupees(r.paid_paise), r.details, r.decision_note]),
      };
    }
    case "works": {
      const rows = await listWorks();
      return {
        columns: ["Work", "Place", "Status", "Started", "Finished", "Planned cost (Rs)", "Spent (Rs)", "Notes"],
        rows: rows.map((r) => [r.name, r.place, r.status, r.started_on, r.finished_on, rupees(r.budget_paise), rupees(r.spent_paise), r.notes]),
      };
    }
    case "members": {
      const rows = await listMembers(null);
      return {
        columns: ["Name", "Mobile", "Lives in", "Post", "Notes", "Member now"],
        rows: rows.map((r) => [r.name, csvPhone(r.phone), r.lives_in, r.post, r.notes, r.active ? "Yes" : "No"]),
      };
    }
    case "meetings": {
      const rows = await listMeetings();
      return {
        columns: ["Date", "Kind", "Title", "Text", "Written by"],
        rows: rows.map((r) => [r.on_date, r.kind, r.title, r.body, r.created_by_name]),
      };
    }
    case "history": {
      const rows = await history(10000, null);
      return {
        columns: ["When", "Who", "Did", "What"],
        rows: rows.map((r) => [new Date(r.at).toISOString(), r.who, r.action, r.summary]),
      };
    }
  }
  return null;
}

/* ================================================================== the committee, from the members' details form */

/** Committee members who filled in the details form but have no office login yet. */
export async function committeeWithoutAccess(): Promise<string[]> {
  try {
    const rows = await db()`
      SELECT k.member_name FROM kyc_submission k
      WHERE NOT EXISTS (SELECT 1 FROM erp_user e WHERE e.phone = k.phone_cc || k.phone)
      ORDER BY k.member_name`;
    return rows.map((r) => String(r.member_name));
  } catch {
    return [];
  }
}

/**
 * One office login for every committee member in the details form, with
 * their mobile number, their post, and their Gmail for the first sign-in.
 * Anyone who already has a login is left as they are.
 */
export async function giveCommitteeAccess(u: User): Promise<number> {
  const names = OFFICE_BEARERS.map((o) => o.name);
  const posts = OFFICE_BEARERS.map((o) => o.post);
  // everyone on the committee has full access
  const rows = await db()`
    INSERT INTO erp_user (name, phone, role, post, first_email, created_by)
    SELECT k.member_name, k.phone_cc || k.phone, 'admin', coalesce(ob.post, 'Committee member'), lower(trim(k.gmail)), ${u.id}
    FROM kyc_submission k
      LEFT JOIN unnest(${names}::text[], ${posts}::text[]) AS ob(name, post) ON ob.name = k.member_name
    WHERE (k.phone_cc || k.phone) ~ '^[0-9]{10,15}$'
    ON CONFLICT (phone) DO NOTHING
    RETURNING id, name, role`;
  for (const r of rows) await logChange(u.id, "access", "person", num(r.id), `Gave ${r.name} access from the members' form`);
  return rows.length;
}
