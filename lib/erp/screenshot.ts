import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

/**
 * Reading a payment screenshot, so a member types nothing: the amount, the
 * date, the 12-digit UPI number, who paid and from which bank, and whether it
 * went to PSWS. The picture is read by Claude (Anthropic's API) with the key in
 * ANTHROPIC_API_KEY; without a key, the form simply asks the member to type.
 * PSWS's own bank details never go to the reader: it reports what the
 * screenshot shows for the payee, and the comparison happens here.
 */

const Seen = z.object({
  is_payment: z.boolean().describe("true when this is a payment confirmation or receipt screen"),
  status: z.enum(["success", "failed", "pending", "unknown"]).describe("success for Completed / Paid successfully / Success; failed for Failed / Declined; pending for Pending / Processing"),
  amount_rupees: z.number().nullable().describe("the amount paid, in rupees, as a number; null if not visible"),
  date: z.string().nullable().describe("the payment date as YYYY-MM-DD; a two-digit year is 20xx; null if not visible"),
  time: z.string().nullable().describe("the payment time as HH:MM in 24-hour form; null if not visible"),
  upi_transaction_id: z.string().nullable().describe("the 12-digit number labelled UPI transaction ID, UPI Ref No, UTR, Transaction ID, Txn ID or Tr. ID; digits only; null if not visible"),
  other_reference: z.string().nullable().describe("any other reference printed, such as a Google transaction ID or bank reference; null if none"),
  payer_name: z.string().nullable().describe("the person who paid: the 'From' name, or the name before 'paid'; null if not visible"),
  payer_bank: z.string().nullable().describe("the payer's bank as printed, e.g. Punjab National Bank; null if not visible"),
  payer_account_type: z.enum(["nro", "nre", "other", "unknown"]).describe("nro or nre only if the screenshot says so next to the payer's account"),
  payee_name: z.string().nullable().describe("who was paid: the 'To' name or merchant name as printed; null if not visible"),
  payee_account_digits: z.string().nullable().describe("the payee's account number or masked digits as printed, e.g. '0479' or '1411 2011 0000 479'; null if none"),
  payee_upi_id: z.string().nullable().describe("the payee's UPI ID if printed, e.g. name@bank; null if none"),
  app: z.string().nullable().describe("the app that made the payment, e.g. Google Pay, PhonePe, Paytm, CRED, BHIM, ICICI iMobile, SBI YONO; null if unclear"),
  method: z.enum(["upi", "bank", "unknown"]).describe("upi when paid by UPI; bank for NEFT / IMPS / RTGS from a bank app"),
});
export type Seen = z.infer<typeof Seen>;

const PROMPT = `You read screenshots of Indian payment confirmations: UPI apps (Google Pay, PhonePe, Paytm, CRED, BHIM, Amazon Pay) and bank apps (ICICI iMobile, SBI YONO, HDFC, Kotak and others).
Report exactly what is printed. Never guess: when something is not visible, return null.
Amounts are in rupees. The small number under a bank name (like 1122) is the payer's account's last digits, not an amount.
Dates: many apps print '22 Nov '26' or '22 NOV 2026'; return 2026-11-22.
The UPI transaction ID is 12 digits. A Google transaction ID (letters) is an other_reference.
'To' is the payee; 'From' is the payer. A name followed by 'paid' is the payer.`;

const MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Whether the reader is switched on: the key is set in the website's settings. */
export const readerOn = () => !!process.env.ANTHROPIC_API_KEY;

/** What the screenshot shows, or null when it could not be read. Throws nothing. */
export async function seePayment(bytes: Buffer, mime: string): Promise<Seen | null> {
  if (!readerOn() || !MIME.has(mime)) return null;
  const client = new Anthropic({ timeout: 25_000, maxRetries: 1 });
  try {
    const res = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: zodOutputFormat(Seen) },
      system: PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mime as "image/jpeg" | "image/png" | "image/webp", data: bytes.toString("base64") } },
            { type: "text", text: "Read this payment screenshot." },
          ],
        },
      ],
    });
    if (res.stop_reason === "refusal") return null;
    return res.parsed_output ?? null;
  } catch (e) {
    // a slow or failing reader never blocks the member: the form just asks them to type
    if (e instanceof Anthropic.APIError) console.error("screenshot reader", e.status, e.message);
    else console.error("screenshot reader", e);
    return null;
  }
}

/** Did the money go to PSWS? From what the screenshot shows for the payee, against PSWS's own details here. */
export function paidToPsws(s: Seen): "psws" | "other" | "unknown" {
  const acct = (process.env.PSWS_BANK_ACCOUNT_NO ?? "").replace(/\D/g, "");
  const upi = process.env.PSWS_UPI_ID?.trim().toLowerCase();
  const digits = (s.payee_account_digits ?? "").replace(/\D/g, "");
  const name = (s.payee_name ?? "").toUpperCase().replace(/[^A-Z]/g, "");
  if (name.includes("PEWESOCIAL") || name === "PSWS") return "psws";
  if (acct && digits.length >= 4 && acct.endsWith(digits.slice(-4)) && (digits.length <= 4 || acct.endsWith(digits))) return "psws";
  if (upi && s.payee_upi_id?.trim().toLowerCase() === upi) return "psws";
  if (digits || s.payee_upi_id || name) return "other";
  return "unknown";
}

/** Two names for the same person, allowing for order and middle names: "Khan Musadique Munir" and "Musadique Khan". */
export function sameName(a: string | null | undefined, b: string | null | undefined): boolean {
  const words = (s: string | null | undefined) =>
    (s ?? "").toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length > 1);
  const x = words(a), y = words(b);
  if (!x.length || !y.length) return false;
  const shared = x.filter((w) => y.includes(w)).length;
  return shared >= 2 || (shared === 1 && (x.length === 1 || y.length === 1));
}
