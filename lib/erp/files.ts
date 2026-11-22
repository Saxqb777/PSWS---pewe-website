import "server-only";
import { db, logChange, num } from "./db";
import type { User } from "./auth";

/**
 * Pictures: a member's payment screenshot, and photos on an ask. They are
 * kept in the database and only ever served to someone signed in who may see
 * them (lib/erp/files read by app/erp/file/[id]), never at a public address.
 */

export type FileKind = "proof" | "ask_photo";

const TYPES: Record<string, (b: Buffer) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP",
};

/** The phone shrinks a picture before sending it; this is the most the office keeps of one. */
const MOST = 3 * 1024 * 1024;

/** A picture from a form, checked and kept. Null when none was chosen. */
export async function savePicture(
  u: User,
  file: FormDataEntryValue | null,
  kind: FileKind,
  { askId = null, caption = null }: { askId?: number | null; caption?: string | null } = {},
): Promise<{ id: number } | { error: string } | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;
  if (file.size > MOST) return { error: "This picture is too big. A screenshot is enough." };
  const bytes = Buffer.from(await file.arrayBuffer());
  // what the file is, from its first bytes, not from its name
  const mime = Object.keys(TYPES).find((t) => TYPES[t](bytes));
  if (!mime) return { error: "Choose a photo or a screenshot (JPG or PNG)." };
  const rows = await db()`
    INSERT INTO erp_file (kind, mime, bytes, caption, ask_id, uploaded_by)
    VALUES (${kind}, ${mime}, ${bytes}, ${caption}, ${askId}, ${u.id}) RETURNING id`;
  return { id: num(rows[0].id) };
}

export interface StoredFile {
  id: number;
  kind: FileKind;
  mime: string;
  bytes: Buffer;
  ask_id: number | null;
  uploaded_by: number | null;
}

export async function readPicture(id: number): Promise<StoredFile | null> {
  const rows = await db()`
    SELECT id, kind, mime, bytes, ask_id, uploaded_by FROM erp_file WHERE id = ${id} AND removed_at IS NULL`;
  const r = rows[0];
  if (!r) return null;
  const raw = r.bytes as Buffer | Uint8Array | string;
  // the driver may hand bytea back as \x… text
  const bytes = typeof raw === "string" ? Buffer.from(raw.replace(/^\\x/, ""), "hex") : Buffer.from(raw);
  return {
    id: num(r.id),
    kind: r.kind as FileKind,
    mime: String(r.mime),
    bytes,
    ask_id: r.ask_id == null ? null : num(r.ask_id),
    uploaded_by: r.uploaded_by == null ? null : num(r.uploaded_by),
  };
}

export interface AskPhoto {
  id: number;
  caption: string | null;
  uploaded_by: number | null;
  by_name: string | null;
  /** the day it was added, in Pewe */
  uploaded_on: string;
}

/** The photos on an ask, oldest first: before, then after. */
export async function askPhotos(askId: number): Promise<AskPhoto[]> {
  const rows = await db()`
    SELECT f.id, f.caption, f.uploaded_by, u.name AS by_name,
           to_char(f.uploaded_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS uploaded_on
    FROM erp_file f LEFT JOIN erp_user u ON u.id = f.uploaded_by
    WHERE f.ask_id = ${askId} AND f.kind = 'ask_photo' AND f.removed_at IS NULL ORDER BY f.uploaded_at, f.id`;
  return rows.map((r) => ({
    id: num(r.id),
    caption: (r.caption as string) ?? null,
    uploaded_by: r.uploaded_by == null ? null : num(r.uploaded_by),
    by_name: (r.by_name as string) ?? null,
    uploaded_on: String(r.uploaded_on),
  }));
}

export async function removeAskPhoto(u: User, id: number, askId: number): Promise<boolean> {
  const rows = await db()`
    UPDATE erp_file SET removed_at = now(), removed_by = ${u.id}
    WHERE id = ${id} AND ask_id = ${askId} AND kind = 'ask_photo' AND removed_at IS NULL RETURNING id`;
  if (rows[0]) await logChange(u.id, "cancelled", "ask", askId, "A photo was taken off the ask");
  return !!rows[0];
}
