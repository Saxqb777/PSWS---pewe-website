import "server-only";
import { OWNER_PHONE, type User } from "./auth";
import type { Role } from "./labels";
import { db, logChange, num } from "./db";

/**
 * The owner's control room: every account, office and members alike, and the
 * few fixes that help someone who is stuck. Every fix is written to the
 * history, like any other change to who has access.
 */

export interface Account {
  id: number;
  name: string;
  phone: string;
  role: Role;
  post: string | null;
  member_no: string | null;
  lives_in: string | null;
  first_email: string | null;
  approver: boolean;
  active: boolean;
  has_password: boolean;
  failed_logins: number;
  locked: boolean;
  last_login_at: string | null;
  created_at: string;
}

const asAccount = (r: Record<string, unknown>): Account => ({
  id: num(r.id),
  name: String(r.name),
  phone: String(r.phone),
  role: r.role as Role,
  post: (r.post as string) ?? null,
  member_no: (r.member_no as string) ?? null,
  lives_in: (r.lives_in as string) ?? null,
  first_email: (r.first_email as string) ?? null,
  approver: !!r.approver,
  active: !!r.active,
  has_password: !!r.has_password,
  failed_logins: num(r.failed_logins),
  locked: !!r.locked,
  last_login_at: (r.last_login_at as string) ?? null,
  created_at: String(r.created_at),
});

/** Everyone but the owner: office people first, then members, each by name. */
export async function listAccounts(): Promise<Account[]> {
  const rows = await db()`
    SELECT id, name, phone, role, post, member_no, lives_in, first_email, approver, active,
           password_hash IS NOT NULL AS has_password, failed_logins, coalesce(locked_until > now(), false) AS locked,
           last_login_at, created_at
    FROM erp_user WHERE phone <> ${OWNER_PHONE} AND role <> 'accountant'
    ORDER BY role = 'member', name`;
  return rows.map(asAccount);
}

export async function getAccount(id: number): Promise<Account | null> {
  const rows = await db()`
    SELECT id, name, phone, role, post, member_no, lives_in, first_email, approver, active,
           password_hash IS NOT NULL AS has_password, failed_logins, coalesce(locked_until > now(), false) AS locked,
           last_login_at, created_at
    FROM erp_user WHERE id = ${id} AND phone <> ${OWNER_PHONE} AND role <> 'accountant'`;
  return rows[0] ? asAccount(rows[0]) : null;
}

/** Too many wrong passwords: let them try again now. */
export async function unlock(by: User, a: Account) {
  await db()`UPDATE erp_user SET failed_logins = 0, locked_until = NULL WHERE id = ${a.id}`;
  await logChange(by.id, "access", "person", a.id, `${a.name}: unlocked after wrong passwords`);
}

/** Forgot their password: it is cleared and they are signed out everywhere, so they choose a new one. */
export async function clearPassword(by: User, a: Account) {
  await db()`UPDATE erp_user SET password_hash = NULL, failed_logins = 0, locked_until = NULL WHERE id = ${a.id}`;
  await db()`DELETE FROM erp_session WHERE user_id = ${a.id}`;
  await logChange(by.id, "access", "person", a.id, `${a.name}: password cleared, to choose a new one`);
}

/** A typo in their mobile number or Gmail. The mobile number is how they sign in, so it must be nobody else's. */
export async function setContact(by: User, a: Account, phone: string, email: string | null): Promise<"ok" | "taken"> {
  const taken = await db()`SELECT 1 FROM erp_user WHERE phone = ${phone} AND id <> ${a.id}`;
  if (taken[0]) return "taken";
  await db()`UPDATE erp_user SET phone = ${phone}, first_email = ${email} WHERE id = ${a.id}`;
  const what = [phone !== a.phone && "mobile number", email !== a.first_email && "Gmail"].filter(Boolean).join(" and ");
  if (what) await logChange(by.id, "access", "person", a.id, `${a.name}: ${what} corrected`);
  return "ok";
}

/** Turned off, they cannot sign in and are signed out at once; turned on, they can again. */
export async function setActive(by: User, a: Account, on: boolean) {
  await db()`UPDATE erp_user SET active = ${on} WHERE id = ${a.id}`;
  if (!on) await db()`DELETE FROM erp_session WHERE user_id = ${a.id}`;
  await logChange(by.id, "access", "person", a.id, `${a.name}: account turned ${on ? "on" : "off"}`);
}

/** Looking at someone's portal shows their private pages, so it is written down too. */
export async function noteLooking(by: User, a: Account) {
  await logChange(by.id, "access", "person", a.id, `${a.name}: portal looked at by the website owner, to help`);
}

/** The office must always keep someone who can give access. */
export async function activeAdmins(): Promise<number> {
  const rows = await db()`SELECT count(*) AS n FROM erp_user WHERE role = 'admin' AND active AND phone <> ${OWNER_PHONE}`;
  return num(rows[0].n);
}

/* ------------------------------------------------------------ the PSWS Accountant */

export interface Accountant {
  id: number;
  /** who holds it now: null for the website owner */
  holder_id: number | null;
  holder_name: string | null;
  holder_phone: string | null;
  held_since: string | null;
  has_password: boolean;
  last_login_at: string | null;
}

export async function getAccountant(): Promise<Accountant | null> {
  const rows = await db()`
    SELECT a.id, a.held_by, h.name AS holder_name, h.phone AS holder_phone, a.held_since,
           a.password_hash IS NOT NULL AS has_password, a.last_login_at
    FROM erp_user a LEFT JOIN erp_user h ON h.id = a.held_by AND h.phone <> ${OWNER_PHONE}
    WHERE a.phone = 'accountant'`;
  const r = rows[0];
  return r
    ? {
        id: num(r.id),
        holder_id: r.holder_name ? num(r.held_by) : null,
        holder_name: (r.holder_name as string) ?? null,
        holder_phone: (r.holder_phone as string) ?? null,
        held_since: (r.held_since as string) ?? null,
        has_password: !!r.has_password,
        last_login_at: (r.last_login_at as string) ?? null,
      }
    : null;
}

/** Office people who can be handed the Accountant's account. */
export async function officePeople(): Promise<{ id: number; name: string; post: string | null }[]> {
  const rows = await db()`
    SELECT id, name, post FROM erp_user
    WHERE active AND phone <> ${OWNER_PHONE} AND role NOT IN ('member', 'accountant') ORDER BY name`;
  return rows.map((r) => ({ id: num(r.id), name: String(r.name), post: (r.post as string) ?? null }));
}

export async function noteHandOver(by: User, accountantId: number, toName: string | null) {
  await logChange(
    by.id,
    "access",
    "person",
    accountantId,
    toName ? `PSWS Accountant handed over to ${toName}` : "PSWS Accountant taken back by the website owner",
  );
}
