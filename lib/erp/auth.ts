import "server-only";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, num } from "./db";
import { canDo, type Role } from "./labels";

/**
 * Who is using the office, and what they may do.
 *
 * Everyone has their own login: their phone number and a password they set
 * themselves from a link an admin sends them on WhatsApp. Passwords are kept
 * only as scrypt hashes, sessions and links only as SHA-256 hashes, so the
 * database never holds anything that would let someone in.
 */

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, keylen: number, opts: object) => Promise<Buffer>;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export const SESSION_COOKIE = "psws_office";
const SESSION_DAYS = 30;
const INVITE_DAYS = 7;
const MAX_TRIES = 5;
const LOCK_MINUTES = 15;

export interface User {
  id: number;
  name: string;
  phone: string;
  role: Role;
  post: string | null;
}

/* ------------------------------------------------------------ passwords */

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("base64")}$${key.toString("base64")}`;
}

async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, salt, key] = stored.split("$");
  if (algo !== "scrypt") return false;
  const want = Buffer.from(key, "base64");
  const got = await scrypt(pw, Buffer.from(salt, "base64"), want.length, { N: Number(n), r: Number(r), p: Number(p) });
  return got.length === want.length && timingSafeEqual(got, want);
}

export const passwordProblem = (pw: string) =>
  pw.length < 8 ? "Use at least 8 letters or numbers. (Kam se kam 8 akshar.)" : null;

/* ------------------------------------------------------------ sessions */

async function startSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db()`INSERT INTO erp_session (token_hash, user_id, expires_at) VALUES (${sha(token)}, ${userId}, ${expires})`;
  await db()`UPDATE erp_user SET last_login_at = now(), failed_logins = 0, locked_until = NULL WHERE id = ${userId}`;
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/erp",
    expires,
  });
}

/** The person signed in on this browser, or null. */
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db()`
    SELECT u.id, u.name, u.phone, u.role, u.post
    FROM erp_session s JOIN erp_user u ON u.id = s.user_id
    WHERE s.token_hash = ${sha(token)} AND s.expires_at > now() AND u.active`;
  const u = rows[0];
  return u ? { id: num(u.id), name: String(u.name), phone: String(u.phone), role: u.role as Role, post: (u.post as string) ?? null } : null;
}

/** For every page and every action: signed in, and allowed to do this. */
export async function requireUser(need: Role = "viewer"): Promise<User> {
  const u = await currentUser();
  if (!u) redirect("/erp/login");
  if (!canDo(u.role, need)) redirect("/erp?denied=1");
  return u;
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db()`DELETE FROM erp_session WHERE token_hash = ${sha(token)}`;
  jar.delete({ name: SESSION_COOKIE, path: "/erp" });
}

/* ------------------------------------------------------------ signing in */

export type LoginResult = "ok" | "bad" | "locked" | "no-password";

export async function tryLogin(phone: string, password: string): Promise<LoginResult> {
  const rows = await db()`
    SELECT id, password_hash, failed_logins, locked_until > now() AS locked
    FROM erp_user WHERE phone = ${phone} AND active`;
  const u = rows[0];
  if (!u) {
    // same work as a real check, so a wrong number cannot be told apart by speed
    await verifyPassword(password, `scrypt$16384$8$1$${"A".repeat(24)}$${"A".repeat(88)}`).catch(() => false);
    return "bad";
  }
  if (u.locked) return "locked";
  if (!u.password_hash) return "no-password";
  if (await verifyPassword(password, String(u.password_hash))) {
    await startSession(num(u.id));
    return "ok";
  }
  const tries = num(u.failed_logins) + 1;
  if (tries >= MAX_TRIES) {
    await db()`UPDATE erp_user SET failed_logins = 0, locked_until = now() + make_interval(mins => ${LOCK_MINUTES}) WHERE id = ${u.id}`;
    return "locked";
  }
  await db()`UPDATE erp_user SET failed_logins = ${tries} WHERE id = ${u.id}`;
  return "bad";
}

/* ------------------------------------------------------------ the first sign-in, with the Gmail on record */

export type FirstResult = "ok" | "bad" | "locked" | "done" | "no-email";

/**
 * A committee member's first time: their mobile number and the Gmail they
 * gave in the members' details form, then a password of their own. Wrong
 * tries count towards the same lock as wrong passwords.
 */
export async function firstSignIn(phone: string, email: string, password: string): Promise<FirstResult> {
  const rows = await db()`
    SELECT id, first_email, password_hash IS NOT NULL AS has_password, failed_logins, locked_until > now() AS locked
    FROM erp_user WHERE phone = ${phone} AND active`;
  const u = rows[0];
  if (!u) return "bad";
  if (u.locked) return "locked";
  if (u.has_password) return "done";
  if (!u.first_email) return "no-email";
  if (String(u.first_email) !== email.trim().toLowerCase()) {
    const tries = num(u.failed_logins) + 1;
    if (tries >= MAX_TRIES) {
      await db()`UPDATE erp_user SET failed_logins = 0, locked_until = now() + make_interval(mins => ${LOCK_MINUTES}) WHERE id = ${u.id}`;
      return "locked";
    }
    await db()`UPDATE erp_user SET failed_logins = ${tries} WHERE id = ${u.id}`;
    return "bad";
  }
  const hash = await hashPassword(password);
  // only if still unset, so two tries at once cannot both win
  const set = await db()`UPDATE erp_user SET password_hash = ${hash} WHERE id = ${u.id} AND password_hash IS NULL RETURNING id`;
  if (!set[0]) return "done";
  await startSession(num(u.id));
  await db()`INSERT INTO erp_audit (user_id, action, entity, entity_id, summary)
             VALUES (${u.id}, 'access', 'person', ${u.id}, 'Signed in for the first time and chose a password')`;
  return "ok";
}

/** This site's address, for links sent on WhatsApp. */
export async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "psws-pewe-website.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/* ------------------------------------------------------------ links to set a password */

/** A fresh link for someone to set (or reset) their password. Older unused links stop working. */
export async function makeInvite(userId: number, by: number): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  await db()`DELETE FROM erp_invite WHERE user_id = ${userId} AND used_at IS NULL`;
  await db()`INSERT INTO erp_invite (token_hash, user_id, expires_at, created_by)
             VALUES (${sha(token)}, ${userId}, now() + make_interval(days => ${INVITE_DAYS}), ${by})`;
  return token;
}

export async function readInvite(token: string): Promise<{ userId: number; name: string } | null> {
  if (!token) return null;
  const rows = await db()`
    SELECT u.id, u.name FROM erp_invite i JOIN erp_user u ON u.id = i.user_id
    WHERE i.token_hash = ${sha(token)} AND i.used_at IS NULL AND i.expires_at > now() AND u.active`;
  return rows[0] ? { userId: num(rows[0].id), name: String(rows[0].name) } : null;
}

export async function redeemInvite(token: string, password: string): Promise<boolean> {
  const inv = await readInvite(token);
  if (!inv) return false;
  const hash = await hashPassword(password);
  await db()`UPDATE erp_invite SET used_at = now() WHERE token_hash = ${sha(token)}`;
  await db()`UPDATE erp_user SET password_hash = ${hash}, failed_logins = 0, locked_until = NULL WHERE id = ${inv.userId}`;
  await db()`DELETE FROM erp_session WHERE user_id = ${inv.userId}`;
  await startSession(inv.userId);
  return true;
}

/** For changing a password: is this the person's current one? */
export async function checkPassword(userId: number, password: string): Promise<boolean> {
  const rows = await db()`SELECT password_hash FROM erp_user WHERE id = ${userId} AND active`;
  return rows[0]?.password_hash ? verifyPassword(password, String(rows[0].password_hash)) : false;
}

/** A new password, and every other browser signed in as this person is signed out. */
export async function changePassword(userId: number, password: string) {
  const hash = await hashPassword(password);
  await db()`UPDATE erp_user SET password_hash = ${hash} WHERE id = ${userId}`;
  await db()`DELETE FROM erp_session WHERE user_id = ${userId}`;
  await startSession(userId);
}

/* ------------------------------------------------------------ the very first admin */

/**
 * The office starts with nobody in it. The first admin is made once, with
 * the setup code given to the website's owner. Only the code's digest is
 * kept here; ERP_SETUP_CODE in Vercel replaces it without a commit.
 */
const FALLBACK_SETUP_DIGEST = "227508b935427162a4834801453b3de429d779610299557f3a97976cf8f8f4fc";

export function setupCodeOk(code: string): boolean {
  const want = process.env.ERP_SETUP_CODE ? sha(process.env.ERP_SETUP_CODE) : FALLBACK_SETUP_DIGEST;
  const got = sha(code.trim());
  return got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

/** Whether anyone from the committee has been given access (the owner's private link does not count). */
export async function hasAnyone(): Promise<boolean> {
  const rows = await db()`SELECT 1 FROM erp_user WHERE phone <> ${OWNER_PHONE} LIMIT 1`;
  return rows.length > 0;
}

export async function createFirstAdmin(name: string, phone: string, post: string | null, password: string): Promise<boolean> {
  const hash = await hashPassword(password);
  // only when the office is still empty, in one statement so two tries cannot both win
  const rows = await db()`
    INSERT INTO erp_user (name, phone, role, post, password_hash)
    SELECT ${name}, ${phone}, 'admin', ${post}, ${hash}
    WHERE NOT EXISTS (SELECT 1 FROM erp_user WHERE phone <> ${OWNER_PHONE})
    RETURNING id`;
  if (!rows[0]) return false;
  await startSession(num(rows[0].id));
  return true;
}

/* ------------------------------------------------------------ the owner's private link */

/**
 * The website's owner gets in with a private link instead of a password:
 * /erp/key#<key>. The key travels after the #, so it never reaches the
 * server's logs; the page hands it to the server once. Only its digest is
 * kept here; ERP_OWNER_KEY in Vercel replaces it without a commit.
 *
 * The owner is an admin who does not appear in the office: not under People
 * with access, and as "Office" in the history and on entries. Changing
 * ERP_OWNER_KEY in Vercel switches the link off.
 */
export const OWNER_PHONE = "owner";
const OWNER_DIGEST = "0830b63bec76e8cea778cdc3c7ff6988c2877eb9bc8aa87126bff0cbfecef53f";

function ownerKeyOk(key: string): boolean {
  const want = process.env.ERP_OWNER_KEY ? sha(process.env.ERP_OWNER_KEY) : OWNER_DIGEST;
  const got = sha(key.trim());
  return timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

export async function ownerSignIn(key: string): Promise<"ok" | "bad" | "off"> {
  if (!ownerKeyOk(key)) return "bad";
  // made the first time the link is used; it has no phone and no password, so only the link opens it
  await db()`INSERT INTO erp_user (name, phone, role, post) VALUES ('Saaqib', ${OWNER_PHONE}, 'admin', 'Website owner')
             ON CONFLICT (phone) DO NOTHING`;
  const rows = await db()`SELECT id, active FROM erp_user WHERE phone = ${OWNER_PHONE}`;
  if (!rows[0]?.active) return "off";
  const id = num(rows[0].id);
  // not written to the history: the owner looks over the office without appearing in it
  await startSession(id);
  return "ok";
}
