import { handlesMoney, type Role } from "./labels";

/**
 * The people PSWS helps with Zakat are private. Their name, place and mobile
 * are seen only by the PSWS Accountant, the website owner and the Head of the
 * Zakat Committee. Everyone else in the office sees a code, such as
 * "Family Z-0012", with what is needed and how much, so the committee can
 * still decide. Givers' names are not private.
 *
 * Masking happens on the server, before a page is sent, so a hidden name never
 * reaches anyone's phone. Words written to the history and to approval
 * requests use the code, never the name.
 */

export const ZAKAT_HEAD = "Head, Zakat Committee";

const norm = (s: string | null | undefined) => (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();

/** The post that sees the names. Only the website owner gives or takes it. */
export const isZakatHeadPost = (post: string | null | undefined) => norm(post) === norm(ZAKAT_HEAD);

type Viewer = { role: Role; phone: string; post: string | null };

/** The Accountant, the website owner and the Head of the Zakat Committee. */
export const seesNames = (u: Viewer) => handlesMoney(u) || isZakatHeadPost(u.post);

/** Says who may see names, for the notes on the pages. */
export const WHO_SEES = "the Accountant, the website owner and the Head of the Zakat Committee";

/** A family's code: the same for as long as the family is in the office. */
export const familyCode = (id: number) => `Family Z-${String(id).padStart(4, "0")}`;

/** "Z-12", "z-0012" or "Family Z-0012", as typed in a search: the family's id, or null. */
export function codeInSearch(q: string | null): number | null {
  const m = q?.match(/^\s*(?:family\s*)?z\s*-?\s*0*(\d{1,9})\s*$/i);
  return m ? Number(m[1]) : null;
}

/** A Zakat payment not tied to a family. */
export const ZAKAT_RECIPIENT = "Zakat recipient";

interface Payment {
  paid_to: string;
  family_id: number | null;
  head: string;
  /** the help request it pays, if any: a medical one names the hospital */
  req_kind?: string | null;
  req_hospital?: string | null;
}

/** Help for a family, or anything paid out of Zakat. */
export const aboutRecipient = (p: { family_id: number | null; head: string }) => p.family_id != null || p.head === "zakat";

/**
 * Whether who was paid is private. Medical help goes straight to the hospital
 * on the bill, and a hospital's name gives nobody away, so it stays.
 */
export function privatePayee(p: Payment): boolean {
  if (!aboutRecipient(p)) return false;
  return !(p.req_kind === "medical" && p.req_hospital && norm(p.req_hospital) === norm(p.paid_to));
}

/** Who was paid, in words anyone in the office may read. */
export const payeeCode = (p: Payment) => (privatePayee(p) ? (p.family_id != null ? familyCode(p.family_id) : ZAKAT_RECIPIENT) : p.paid_to);

/* ================================================================== hiding names for one viewer */

export function maskFamily<T extends { id: number; name: string; place: string | null; phone: string | null; notes: string | null }>(
  f: T,
  sees: boolean,
): T {
  return sees ? f : { ...f, name: familyCode(f.id), place: null, phone: null, notes: null };
}

export function maskRequest<T extends { family_id: number; family_name: string }>(r: T, sees: boolean): T {
  return sees ? r : { ...r, family_name: familyCode(r.family_id) };
}

export function maskStipendLine<T extends { family_id: number; name: string; place: string | null }>(l: T, sees: boolean): T {
  return sees ? l : { ...l, name: familyCode(l.family_id), place: null };
}

/** A line in a list of money: only a payment's "who" can be private. */
export function maskMoneyRow<T extends { dir: string; who: string; family_id: number | null; private: boolean }>(r: T, sees: boolean): T {
  if (sees || r.dir !== "out" || !r.private) return r;
  return { ...r, who: r.family_id != null ? familyCode(r.family_id) : ZAKAT_RECIPIENT };
}

/** One payment: who was paid, the family, and the note, which may name them. */
export function maskMoneyOut<
  T extends Payment & { family_name: string | null; note: string | null },
>(m: T, sees: boolean): T & { noteHidden: boolean } {
  if (sees) return { ...m, noteHidden: false };
  const hide = aboutRecipient(m) && !!m.note;
  return {
    ...m,
    paid_to: payeeCode(m),
    family_name: m.family_id != null ? familyCode(m.family_id) : null,
    note: hide ? null : m.note,
    noteHidden: hide,
  };
}
