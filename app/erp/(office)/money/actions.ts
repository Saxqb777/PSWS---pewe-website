"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import {
  addFamily,
  addMoneyIn,
  addMoneyOut,
  cancelMoneyIn,
  cancelMoneyOut,
  getFamily,
  getMoneyIn,
  getMoneyOut,
  getRequest,
  getWork,
  updateMoneyIn,
  updateMoneyOut,
  type MoneyInFields,
  type MoneyOutFields,
} from "@/lib/erp/data";
import {
  HEADS,
  METHODS,
  PURPOSES,
  clean,
  cleanLong,
  isDate,
  isKey,
  normalPhone,
  fyOf,
  todayIST,
  toPaise,
  type Purpose,
} from "@/lib/erp/labels";
import { toId, type FormState } from "@/lib/erp/form-state";

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

export async function saveMoneyIn(id: number | null, _: FormState, data: FormData): Promise<FormState> {
  const u = await requireUser("editor");
  const { f, errors } = readMoneyIn(data);
  if (Object.keys(errors).length) return { errors };
  if (id) {
    const was = await getMoneyIn(id);
    if (!was || was.cancelled_at) return { error: "This receipt was cancelled, so it cannot be changed." };
    if (fyOf(f.on_date) !== was.fy) return { errors: { on_date: SAME_YEAR } };
    await updateMoneyIn(u, id, f);
    redirect(`/erp/money/in/${id}?saved=1`);
  }
  const r = await addMoneyIn(u, f);
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

export async function saveMoneyOut(id: number | null, _: FormState, data: FormData): Promise<FormState> {
  const u = await requireUser("editor");
  const { f, errors, newFamily } = await readMoneyOut(data);
  if (Object.keys(errors).length) return { errors };
  if (id) {
    const was = await getMoneyOut(id);
    if (!was || was.cancelled_at) return { error: "This payment was cancelled, so it cannot be changed." };
    if (fyOf(f.on_date) !== was.fy) return { errors: { on_date: SAME_YEAR } };
  }
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
  if (id) {
    await updateMoneyOut(u, id, f);
    redirect(`/erp/money/out/${id}?saved=1`);
  }
  const r = await addMoneyOut(u, f);
  redirect(`/erp/money/out/${r.id}?new=1`);
}

export async function cancelEntry(dir: "in" | "out", id: number, _: FormState, data: FormData): Promise<FormState> {
  const u = await requireUser("editor");
  const reason = clean(data.get("reason"), 300);
  if (!reason) return { errors: { reason: "Say why, so the history makes sense. (Kyun cancel kiya?)" } };
  if (dir === "in") await cancelMoneyIn(u, id, reason);
  else await cancelMoneyOut(u, id, reason);
  revalidatePath("/erp", "layout");
  return { done: "Cancelled. It no longer counts in any total, and the history keeps a note of it." };
}
