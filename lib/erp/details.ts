import "server-only";
import { CURRENCIES, clean, isCountry, type Method } from "./labels";

/**
 * The fuller details of how money came or went, read the same way from a
 * member's "I have sent it", the Accountant's receipt and the Accountant's
 * payment: what "Other" was, the bank, the country it was sent from, and the
 * currency when it was not rupees.
 */

export interface MoneyDetail {
  method_other: string | null;
  bank_name: string | null;
  /** empty: India */
  country: string | null;
  /** empty: rupees */
  currency: string | null;
  /** the amount in that currency */
  sent_amount: number | null;
}

/** "1,250.50" → 1250.5. Up to two decimals, more than nothing. */
export function toAmount(raw: unknown): number | null {
  const t = String(raw ?? "").replace(/[,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const n = Number(t);
  return n > 0 && n < 1e10 ? n : null;
}

export function readDetail(
  data: FormData,
  method: Method | null,
  errors: Record<string, string>,
  { abroad = true }: { abroad?: boolean } = {},
): MoneyDetail {
  const method_other = method === "other" ? clean(data.get("method_other"), 120) : null;
  if (method === "other" && !method_other) errors.method_other = "Say how it was paid. (Kaise?)";
  const bank_name = method === "bank" ? clean(data.get("bank_name"), 80) : null;
  if (!abroad) return { method_other, bank_name, country: null, currency: null, sent_amount: null };

  const picked = clean(data.get("country"), 60);
  if (picked && !isCountry(picked)) errors.country = "Pick the country from the list.";
  const country = picked && picked !== "India" && isCountry(picked) ? picked : null;
  const code = String(data.get("currency") ?? "INR").trim().toUpperCase();
  if (!(code in CURRENCIES)) errors.currency = "Pick the currency.";
  const currency = code !== "INR" && code in CURRENCIES ? code : null;
  const sent_amount = currency ? toAmount(data.get("sent_amount")) : null;
  if (currency && !sent_amount) errors.sent_amount = `How much, in ${currency}? Numbers only, e.g. 500.`;
  return { method_other, bank_name, country, currency, sent_amount };
}

export interface Givers {
  people: number | null;
  /** their names, one by one, as typed; may be fewer than the people */
  givers: string[];
  givers_hidden: boolean;
}

/** The people a member collected from: how many, and as many names as they typed. */
export function readGivers(data: FormData, errors: Record<string, string>): Givers {
  const raw = clean(data.get("people"), 6);
  let people = raw ? Number(raw) : null;
  if (raw && !(Number.isInteger(people) && people! > 0 && people! < 10000)) errors.people = "A number, e.g. 5.";
  const givers = data
    .getAll("giver")
    .map((g) => clean(g, 80))
    .filter((g): g is string => !!g)
    .slice(0, 60);
  if (people && givers.length > people) errors.people = `You typed ${givers.length} names for ${people} people.`;
  if (!people && givers.length) people = givers.length;
  return { people, givers, givers_hidden: data.get("givers_hidden") === "on" };
}
