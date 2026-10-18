/**
 * The words the office screens use, in English with the Hinglish the
 * committee speaks underneath, and the small helpers every screen needs:
 * money in paise, the financial year, phone numbers and dates in Pewe.
 *
 * No server code here, so forms in the browser can use it too.
 */

type Labelled<K extends string> = Record<K, { en: string; hi: string }>;

/** What money came in for, or went out of. */
export const HEADS = {
  zakat: { en: "Zakat", hi: "Zakat" },
  donation: { en: "Donation (Sadaqah)", hi: "Sadaqah, atiya" },
  development: { en: "Village development", hi: "Gaon ke kaam" },
  other: { en: "Other", hi: "Baaki" },
} satisfies Labelled<string>;
export type Head = keyof typeof HEADS;

/** What a payment was for. */
export const PURPOSES = {
  stipend: { en: "Monthly stipend", hi: "Maheena" },
  medical: { en: "Medical", hi: "Ilaaj" },
  education: { en: "Education", hi: "Padhai" },
  livelihood: { en: "Livelihood", hi: "Rozgaar" },
  emergency: { en: "Emergency", hi: "Aafat" },
  works: { en: "Village works", hi: "Gaon ka kaam" },
  office: { en: "Office and running costs", hi: "Daftar ka kharcha" },
  bank: { en: "Bank charges", hi: "Bank charges" },
  other: { en: "Other", hi: "Baaki" },
} satisfies Labelled<string>;
export type Purpose = keyof typeof PURPOSES;

export const METHODS = {
  cash: { en: "Cash", hi: "Nakad" },
  upi: { en: "GPay / PhonePe (UPI)", hi: "UPI se" },
  bank: { en: "Bank transfer (NEFT / IMPS)", hi: "Bank se" },
  cheque: { en: "Cheque", hi: "Cheque se" },
} satisfies Labelled<string>;
export type Method = keyof typeof METHODS;

/** The same, short enough for a line in a list. */
export const METHOD_SHORT: Record<Method, string> = { cash: "Cash", upi: "UPI", bank: "Bank", cheque: "Cheque" };

/** What a family asked for. */
export const KINDS = {
  medical: { en: "Medical", hi: "Ilaaj" },
  stipend: { en: "Monthly stipend", hi: "Maheena" },
  education: { en: "Education", hi: "Padhai" },
  livelihood: { en: "Livelihood", hi: "Rozgaar" },
  emergency: { en: "Emergency", hi: "Aafat" },
  other: { en: "Other", hi: "Baaki" },
} satisfies Labelled<string>;
export type Kind = keyof typeof KINDS;

export const STATUSES = {
  waiting: { en: "Waiting for a decision", hi: "Faisla baaki" },
  approved: { en: "Approved, not yet paid", hi: "Manzoor, paisa baaki" },
  declined: { en: "Not approved", hi: "Manzoor nahi" },
  done: { en: "Paid", hi: "Paisa diya" },
} satisfies Labelled<string>;
export type Status = keyof typeof STATUSES;

export const WORK_STATUSES = {
  planned: { en: "Planned", hi: "Hone wala" },
  running: { en: "Running", hi: "Chal raha" },
  done: { en: "Finished", hi: "Ho gaya" },
} satisfies Labelled<string>;
export type WorkStatus = keyof typeof WORK_STATUSES;

export const ROLES = {
  admin: { en: "Admin", hi: "Sab kuch, aur logon ko access dena" },
  editor: { en: "Can add entries", hi: "Entry daal sakte hain" },
  viewer: { en: "Can only see", hi: "Sirf dekh sakte hain" },
} satisfies Labelled<string>;
export type Role = keyof typeof ROLES;

const RANK: Record<Role, number> = { viewer: 0, editor: 1, admin: 2 };
export const canDo = (have: Role, need: Role) => RANK[have] >= RANK[need];

/** Places in and around Pewe, offered as suggestions (anything can be typed). */
export const PLACES = ["Pewe", "Amshet Bhoiwadi", "Rab Bhoiwadi", "Pere", "Pardalewadi", "Guhagar", "Mumbai"];

export const isKey = <T extends object>(o: T, k: unknown): k is keyof T => typeof k === "string" && k in o;

/* ------------------------------------------------------------------ money */

/** "5,000", "5000.50", "₹ 5 000" → paise. Empty or nonsense → null. */
export function toPaise(raw: unknown): number | null {
  const s = String(raw ?? "")
    .replace(/[₹,\s]/g, "")
    .trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [r, p = ""] = s.split(".");
  const paise = Number(r) * 100 + Number(p.padEnd(2, "0"));
  return paise > 0 && Number.isSafeInteger(paise) ? paise : null;
}

/** paise → "₹12,50,000" (Indian grouping), with paise only when there are some. */
export function inr(paise: number | string | null | undefined): string {
  const n = Number(paise ?? 0);
  const neg = n < 0;
  const abs = Math.abs(n);
  const rupees = Math.floor(abs / 100);
  const p = abs % 100;
  const whole = String(rupees);
  const grouped =
    whole.length <= 3 ? whole : whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + whole.slice(-3);
  return `${neg ? "−" : ""}₹${grouped}${p ? "." + String(p).padStart(2, "0") : ""}`;
}

/** paise → "1.25 lakh", "2.2 crore", or the plain amount when small. */
export function inrShort(paise: number | string | null | undefined): string {
  const r = Number(paise ?? 0) / 100;
  if (Math.abs(r) >= 1e7) return `₹${+(r / 1e7).toFixed(2)} crore`;
  if (Math.abs(r) >= 1e5) return `₹${+(r / 1e5).toFixed(2)} lakh`;
  return inr(paise);
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
  "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function twoDigits(n: number) {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`;
}
function threeDigits(n: number) {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", rest ? twoDigits(rest) : ""].filter(Boolean).join(" ");
}

/** For the receipt: 125000 rupees → "One Lakh Twenty Five Thousand". */
export function rupeesInWords(paise: number): string {
  let n = Math.floor(paise / 100);
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 1e7);
  n %= 1e7;
  const lakh = Math.floor(n / 1e5);
  n %= 1e5;
  const thousand = Math.floor(n / 1e3);
  n %= 1e3;
  if (crore) parts.push(`${crore >= 100 ? threeDigits(crore) : twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (n) parts.push(threeDigits(n));
  const p = paise % 100;
  return parts.join(" ") + (p ? ` and ${twoDigits(p)} Paise` : "");
}

/* ------------------------------------------------------------------ dates */

/** Today in Pewe, as YYYY-MM-DD. */
export function todayIST(): string {
  return new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
}

/** This month in Pewe, as YYYY-MM. */
export const thisMonthIST = () => todayIST().slice(0, 7);

/** The financial year a date falls in: 2026-10-04 → "2026-27". */
export function fyOf(date: string): string {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** "2026-27" → its first and last day. */
export function fyRange(fy: string): { from: string; to: string } {
  const start = Number(fy.slice(0, 4));
  return { from: `${start}-04-01`, to: `${start + 1}-03-31` };
}

/** The twelve months of a financial year, April first. */
export function fyMonths(fy: string): string[] {
  const start = Number(fy.slice(0, 4));
  return Array.from({ length: 12 }, (_, i) => {
    const m = ((3 + i) % 12) + 1;
    const y = m >= 4 ? start : start + 1;
    return `${y}-${String(m).padStart(2, "0")}`;
  });
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-04" → "4 Oct 2026". */
export function showDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  const s = typeof d === "string" ? d : d.toISOString();
  const [y, m, day] = s.slice(0, 10).split("-");
  return `${Number(day)} ${MONTHS[Number(m) - 1]} ${y}`;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-10-18" → "Saturday 18 October", with the year only when it is not this one. */
export function showDay(d: string): string {
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  const weekday = DAYS[new Date(Date.UTC(y, m - 1, day)).getUTCDay()];
  const year = String(y) === todayIST().slice(0, 4) ? "" : ` ${y}`;
  return `${weekday} ${day} ${LONG_MONTHS[m - 1]}${year}`;
}

/** "R/2026-27/0001" → "R/0001": inside one year's list the year goes without saying. */
export const shortNo = (no: string) => no.replace(/\/\d{4}-\d{2}\//, "/");

/** "2026-10" → "October 2026". */
export function showMonth(ym: string): string {
  const long = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${long[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
}

/** A timestamp shown in Pewe time: "4 Oct 2026, 3:05 pm". */
export function showWhen(t: string | Date | null | undefined): string {
  if (!t) return "";
  const d = new Date(new Date(t).getTime() + 330 * 60000);
  const h = d.getUTCHours();
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${showDate(d.toISOString())}, ${h % 12 || 12}:${mm} ${h < 12 ? "am" : "pm"}`;
}

export const isDate = (s: unknown): s is string =>
  typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/* ------------------------------------------------------------------ phones */

/**
 * Whatever is typed → digits with the country code. A ten-digit Indian
 * mobile gets 91 in front; numbers abroad must start with + or 00.
 */
export function normalPhone(raw: unknown): string | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  let d = t.replace(/\D/g, "");
  if (t.startsWith("+")) {
    // already international
  } else if (d.startsWith("00")) {
    d = d.slice(2);
  } else if (d.length === 10 && /^[6-9]/.test(d)) {
    d = "91" + d;
  } else if (d.length === 11 && d.startsWith("0")) {
    d = "91" + d.slice(1);
  }
  return d.length >= 10 && d.length <= 15 ? d : null;
}

/** 919812345678 → "+91 98123 45678". */
export function showPhone(d: string | null | undefined): string {
  if (!d || !/^\d+$/.test(d)) return "";
  if (d.startsWith("91") && d.length === 12) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  return `+${d}`;
}

/** Short text from a form: trimmed, at most `max` characters, empty → null. */
export function clean(raw: unknown, max = 200): string | null {
  const s = String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
  return s || null;
}

/** Longer text (notes): keeps line breaks. */
export function cleanLong(raw: unknown, max = 4000): string | null {
  const s = String(raw ?? "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, max);
  return s || null;
}
