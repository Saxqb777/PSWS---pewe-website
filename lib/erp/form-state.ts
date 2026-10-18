/**
 * What an office form gets back from the server when it does not move on
 * to another page: a message for the whole form, one per box, or a link to
 * send someone on WhatsApp.
 */
export type FormState = {
  error?: string;
  errors?: Record<string, string>;
  done?: string;
  share?: { url: string; text: string; phone: string | null };
} | null;

/** "12" → 12; anything else → null. For ids that come in from a form or a link. */
export function toId(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** A WhatsApp link with the text filled in, to a number when there is one. */
export function waLink(phone: string | null, text: string): string {
  return `https://wa.me/${phone ?? ""}?text=${encodeURIComponent(text)}`;
}
