"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import {
  addFamily,
  addMoneyIn,
  addMoneyOut,
  getFamily,
  getMoneyIn,
  getMoneyOut,
  getRequest,
  getWork,
  type MoneyInFields,
  type MoneyOutFields,
} from "@/lib/erp/data";
import {
  askApproval,
  closedMessage,
  fundBalances,
  getOpening,
  getTransfer,
  inSummaryLine,
  moneyInChanges,
  moneyOutChanges,
  outSummaryLine,
  transferSummaryLine,
} from "@/lib/erp/books";
import {
  HEADS,
  METHODS,
  PURPOSES,
  clean,
  cleanLong,
  isDate,
  inr,
  isKey,
  labelOf,
  normalMemberNo,
  normalPhone,
  fyOf,
  todayIST,
  toPaise,
  type Purpose,
} from "@/lib/erp/labels";
import { toId, type FormState } from "@/lib/erp/form-state";
import { portalOn } from "@/lib/erp/flags";
import { getAsk, isPublicKind, noteGift } from "@/lib/erp/portal";
import { db, num } from "@/lib/erp/db";

/** What someone typed for "Other"; required when Other is picked. */
function readOther(data: FormData, field: string, picked: unknown, errors: Record<string, string>, ask: string) {
  if (picked !== "other") return null;
  const v = clean(data.get(`${field}_other`), 120);
  if (!v) errors[`${field}_other`] = ask;
  return v;
}

const SAME_YEAR =
  "The number belongs to its financial year. To move it to another year, cancel this one and add it again there.";

function readDate(raw: unknown, errors: Record<string, string>): string {
  const d = String(raw ?? "");
  if (!isDate(d)) errors.on_date = "Pick the date. (Tareekh chuniye.)";
  else if (d > todayIST()) errors.on_date = "The date cannot be after today.";
  return d;
}

function readMoneyIn(data: FormData): { f: MoneyInFields; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const on_date = readDate(data.get("on_date"), errors);
  const from_name = clean(data.get("from_name"), 120);
  if (!from_name) errors.from_name = "Who gave the money? (Kisne diya?)";
  const phoneRaw = clean(data.get("from_phone"), 30);
  const from_phone = phoneRaw ? normalPhone(phoneRaw) : null;
  if (phoneRaw && !from_phone) errors.from_phone = "This does not look like a phone number. Leave it empty if unsure.";
  const amount = toPaise(data.get("amount"));
  if (!amount) errors.amount = "Type the amount in numbers, e.g. 5000.";
  const head = data.get("head");
  if (!isKey(HEADS, head)) errors.head = "What is this money for? (Kis cheez ke liye?)";
  const head_other = readOther(data, "head", head, errors, "Type what it is for. (Kis liye?)");
  const method = data.get("method");
  if (!isKey(METHODS, method)) errors.method = "How did it come? (Kaise aaya?)";
  return {
    errors,
    f: {
      on_date,
      from_name: from_name ?? "",
      from_phone,
      from_place: clean(data.get("from_place"), 80),
      amount_paise: amount ?? 0,
      head: head as MoneyInFields["head"],
      head_other,
      method: method as MoneyInFields["method"],
      reference: clean(data.get("reference"), 120),
      note: cleanLong(data.get("note"), 1000),
    },
  };
}

/** Why a saved entry should change: the approvers read this. */
function readReason(data: FormData, errors: Record<string, string>, ask: string) {
  const reason = clean(data.get("reason"), 300);
  if (!reason) errors.reason = ask;
  return reason ?? "";
}

/**
 * A new receipt is saved at once. A change to a saved one is put to the
 * approvers, with the reason, and only made once every one of them agrees.
 */
export async function saveMoneyIn(id: number | null, _: FormState, data: FormData): Promise<FormState> {
  const u = await requireUser("editor");
  const { f, errors } = readMoneyIn(data);
  const reason = id ? readReason(data, errors, "Say why it needs changing. The approvers read this. (Kyun?)") : "";
  if (Object.keys(errors).length) return { errors };
  if (id) {
    const was = await getMoneyIn(id);
    if (!was || was.cancelled_at) return { error: "This receipt was deleted, so it cannot be changed." };
    if (fyOf(f.on_date) !== was.fy) return { errors: { on_date: SAME_YEAR } };
    const change_lines = moneyInChanges(was, f);
    if (!change_lines) return { error: "Nothing is different from the saved receipt." };
    const r = await askApproval(u, {
      entity: "money_in",
      entity_id: id,
      entity_key: `money_in:${id}`,
      action: "change",
      summary: inSummaryLine(was),
      change_lines,
      changes: f,
      reason,
    });
    if ("error" in r) return { error: r.error };
    redirect(`/erp/approvals/${r.id}?new=1`);
  }
  const closed = await closedMessage(f.on_date);
  if (closed) return { errors: { on_date: closed } };
  if (portalOn()) {
    // optional: the member who gave it, so it is in their passbook, and the ask it was for
    const linkErrors: Record<string, string> = {};
    const noRaw = clean(data.get("member_no"), 20);
    if (noRaw) {
      const no = normalMemberNo(noRaw);
      const rows = no ? await db()`SELECT id FROM erp_user WHERE member_no = ${no} AND active` : [];
      if (rows[0]) f.member_id = num(rows[0].id);
      else linkErrors.member_no = "No member has this PSWS number. Check it, or leave it empty.";
    }
    const askId = toId(data.get("ask_id"));
    if (askId) {
      const a = await getAsk(askId);
      if (!a || a.status !== "live" || !isPublicKind(a.kind)) linkErrors.ask_id = "This ask is not open any more.";
      else {
        f.ask_id = a.id;
        // the money belongs to the ask's fund
        f.head = a.head;
        f.head_other = null;
      }
    }
    if (Object.keys(linkErrors).length) return { errors: linkErrors };
  }
  const r = await addMoneyIn(u, f);
  if (f.ask_id) await noteGift(f.ask_id, f.amount_paise, null);
  redirect(`/erp/money/in/${r.id}?new=1`);
}

/**
 * A payment: who it went to, how much, and what for. Linking it to a family
 * or a village work is optional, so nobody is stuck before the family or
 * the work has been added.
 */
async function readMoneyOut(data: FormData): Promise<{
  f: MoneyOutFields;
  errors: Record<string, string>;
  newFamily: { name: string; place: string | null } | null;
}> {
  const errors: Record<string, string> = {};
  const on_date = readDate(data.get("on_date"), errors);
  const purpose = data.get("purpose");
  if (!isKey(PURPOSES, purpose)) errors.purpose = "What was it for? (Kis kaam ke liye?)";
  const purpose_other = readOther(data, "purpose", purpose, errors, "Type what it was for. (Kis liye?)");
  const amount = toPaise(data.get("amount"));
  if (!amount) errors.amount = "Type the amount in numbers, e.g. 5000.";
  const head = data.get("head");
  if (!isKey(HEADS, head)) errors.head = "Which money did it come out of? (Kis paise se?)";
  const head_other = readOther(data, "head", head, errors, "Type which money it came out of.");
  const method = data.get("method");
  if (!isKey(METHODS, method)) errors.method = "How was it paid? (Kaise diya?)";

  let paid_to = clean(data.get("paid_to"), 120);
  let family_id: number | null = null;
  let request_id: number | null = null;
  let newFamily: { name: string; place: string | null } | null = null;

  const famRaw = String(data.get("family_id") ?? "");
  if (famRaw === "new") {
    const name = clean(data.get("new_family_name"), 120);
    if (!name) errors.new_family_name = "Type the name of the person the help went to.";
    else newFamily = { name, place: clean(data.get("new_family_place"), 80) };
    paid_to = paid_to ?? name;
  } else if (famRaw) {
    family_id = toId(famRaw);
    const fam = family_id ? await getFamily(family_id) : null;
    if (!fam) errors.family_id = "This family is not in the office any more. Pick another, or leave it empty.";
    else paid_to = paid_to ?? fam.name;
    request_id = toId(data.get("request_id"));
    if (request_id) {
      const req = await getRequest(request_id);
      if (!req || req.family_id !== family_id) request_id = null;
    }
  }

  const work_id = toId(data.get("work_id"));
  if (work_id && !(await getWork(work_id))) errors.work_id = "This work is not in the office any more.";
  if (!paid_to) errors.paid_to = "Who was the money given to? (Kisko diya?)";

  return {
    errors,
    newFamily,
    f: {
      on_date,
      paid_to: paid_to ?? "",
      amount_paise: amount ?? 0,
      head: head as MoneyOutFields["head"],
      head_other,
      purpose: purpose as Purpose,
      purpose_other,
      method: method as MoneyOutFields["method"],
      reference: clean(data.get("reference"), 120),
      family_id,
      request_id,
      work_id,
      note: cleanLong(data.get("note"), 1000),
    },
  };
}

/** Paying more out of a fund than it has left needs a tick to say so. Only once starting balances are set. */
async function fundProblem(f: MoneyOutFields, exceptId: number | null, data: FormData): Promise<string | null> {
  if (data.get("over") === "on" || !(await getOpening())) return null;
  const fund = (await fundBalances(exceptId)).find((x) => x.head === f.head);
  if (!fund || f.amount_paise <= fund.left) return null;
  return `The ${labelOf(HEADS, f.head)} fund has only ${inr(Math.max(fund.left, 0))} left. Tick “Pay anyway” below if this is right.`;
}

export async function saveMoneyOut(id: number | null, _: FormState, data: FormData): Promise<FormState> {
  const u = await requireUser("editor");
  const { f, errors, newFamily } = await readMoneyOut(data);
  const reason = id ? readReason(data, errors, "Say why it needs changing. The approvers read this. (Kyun?)") : "";
  if (Object.keys(errors).length) return { errors };
  const over = await fundProblem(f, id, data);
  if (over) return { errors: { head: over } };
  if (id) {
    const was = await getMoneyOut(id);
    if (!was || was.cancelled_at) return { error: "This payment was deleted, so it cannot be changed." };
    if (fyOf(f.on_date) !== was.fy) return { errors: { on_date: SAME_YEAR } };
    const change_lines = await moneyOutChanges(was, f, newFamily);
    if (!change_lines) return { error: "Nothing is different from the saved payment." };
    const r = await askApproval(u, {
      entity: "money_out",
      entity_id: id,
      entity_key: `money_out:${id}`,
      action: "change",
      summary: outSummaryLine(was),
      change_lines,
      changes: { f, newFamily },
      reason,
    });
    if ("error" in r) return { error: r.error };
    redirect(`/erp/approvals/${r.id}?new=1`);
  }
  const closed = await closedMessage(f.on_date);
  if (closed) return { errors: { on_date: closed } };
  if (newFamily) {
    f.family_id = await addFamily(u, {
      name: newFamily.name,
      place: newFamily.place,
      phone: null,
      people: null,
      notes: null,
      stipend_paise: null,
      stipend_active: false,
      active: true,
    });
  }
  const r = await addMoneyOut(u, f);
  redirect(`/erp/money/out/${r.id}?new=1`);
}

/** Deleting a receipt, a payment or a move between cash and bank: asked, never done straight away. */
export async function askDelete(dir: "in" | "out" | "transfer", id: number, _: FormState, data: FormData): Promise<FormState> {
  const u = await requireUser("editor");
  const errors: Record<string, string> = {};
  const reason = readReason(data, errors, "Say why it should be deleted. The approvers read this. (Kyun?)");
  if (Object.keys(errors).length) return { errors };
  let summary: string | null = null;
  if (dir === "in") {
    const m = await getMoneyIn(id);
    if (m && !m.cancelled_at) summary = inSummaryLine(m);
  } else if (dir === "out") {
    const m = await getMoneyOut(id);
    if (m && !m.cancelled_at) summary = outSummaryLine(m);
  } else {
    const t = await getTransfer(id);
    if (t && !t.cancelled_at) summary = transferSummaryLine(t);
  }
  if (!summary) return { error: "This has already been deleted." };
  const entity = dir === "in" ? "money_in" : dir === "out" ? "money_out" : "transfer";
  const r = await askApproval(u, { entity, entity_id: id, entity_key: `${entity}:${id}`, action: "delete", summary, reason });
  if ("error" in r) return { error: r.error };
  revalidatePath("/erp", "layout");
  redirect(`/erp/approvals/${r.id}?new=1`);
}
