"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import { addFamily, addRequest, decideRequest, getFamily, getRequest, payStipends, updateFamily, type FamilyFields } from "@/lib/erp/data";
import {
  HEADS,
  KINDS,
  METHODS,
  clean,
  cleanLong,
  inr,
  isDate,
  isKey,
  normalPhone,
  todayIST,
  toPaise,
} from "@/lib/erp/labels";
import { toId, type FormState } from "@/lib/erp/form-state";

export async function saveFamily(id: number | null, _: FormState, data: FormData): Promise<FormState> {
  const u = await requireUser("editor");
  const errors: Record<string, string> = {};
  const name = clean(data.get("name"), 120);
  if (!name) errors.name = "Type the name of the person the help goes to.";
  const phoneRaw = clean(data.get("phone"), 30);
  const phone = phoneRaw ? normalPhone(phoneRaw) : null;
  if (phoneRaw && !phone) errors.phone = "This does not look like a phone number.";
  const peopleRaw = clean(data.get("people"), 4);
  const people = peopleRaw ? Number(peopleRaw) : null;
  if (people !== null && (!Number.isInteger(people) || people < 1 || people > 60))
    errors.people = "How many people live in the house? A number, e.g. 5.";
  const stipend_active = data.get("stipend_active") === "on";
  const stipend_paise = toPaise(data.get("stipend"));
  if (stipend_active && !stipend_paise) errors.stipend = "How much each month? (Har maheene kitna?)";
  if (Object.keys(errors).length) return { errors };
  const f: FamilyFields = {
    name: name!,
    place: clean(data.get("place"), 80),
    phone,
    people,
    notes: cleanLong(data.get("notes"), 2000),
    stipend_paise: stipend_paise,
    stipend_active,
    active: data.get("inactive") !== "on",
  };
  if (id) {
    if (!(await getFamily(id))) return { error: "This family is not in the office any more." };
    await updateFamily(u, id, f);
    redirect(`/erp/families/${id}?saved=1`);
  }
  const newId = await addFamily(u, f);
  redirect(`/erp/families/${newId}?new=1`);
}

export async function addFamilyRequest(familyId: number, _: FormState, data: FormData): Promise<FormState> {
  const u = await requireUser("editor");
  const errors: Record<string, string> = {};
  const kind = data.get("kind");
  if (!isKey(KINDS, kind)) errors.kind = "What do they need? (Kis cheez ki zaroorat?)";
  const kindOther = kind === "other" ? clean(data.get("kind_other"), 120) : null;
  if (kind === "other" && !kindOther) errors.kind_other = "Type what they need. (Kya chahiye?)";
  const asked_on = String(data.get("asked_on") ?? "");
  if (!isDate(asked_on) || asked_on > todayIST()) errors.asked_on = "Pick the date they asked.";
  const askedRaw = clean(data.get("asked"), 20);
  const asked_paise = askedRaw ? toPaise(askedRaw) : null;
  if (askedRaw && !asked_paise) errors.asked = "Numbers only, e.g. 25000. Leave empty if not known.";
  if (Object.keys(errors).length) return { errors };
  if (!(await getFamily(familyId))) return { error: "This family is not in the office any more." };
  await addRequest(u, {
    family_id: familyId,
    kind: kind as keyof typeof KINDS,
    kind_other: kindOther,
    asked_on,
    asked_paise,
    details: cleanLong(data.get("details"), 2000),
  });
  revalidatePath("/erp", "layout");
  return { done: "Request saved. It now waits for the committee's decision." };
}

export async function decideFamilyRequest(requestId: number, _: FormState, data: FormData): Promise<FormState> {
  const u = await requireUser("editor");
  const req = await getRequest(requestId);
  if (!req) return { error: "This request is not in the office any more." };
  const approve = data.get("decision") === "approve";
  const errors: Record<string, string> = {};
  const approvedRaw = clean(data.get("approved"), 20);
  const approved_paise = approvedRaw ? toPaise(approvedRaw) : null;
  if (approve && approvedRaw && !approved_paise) errors.approved = "Numbers only, e.g. 25000.";
  if (approve && req.kind === "stipend" && !approved_paise) errors.approved = "How much each month? (Har maheene kitna?)";
  const decided_on = String(data.get("decided_on") ?? "");
  if (!isDate(decided_on) || decided_on > todayIST()) errors.decided_on = "Pick the date of the decision.";
  if (Object.keys(errors).length) return { errors };
  await decideRequest(u, requestId, { approve, approved_paise, decided_on, note: clean(data.get("note"), 300) });
  revalidatePath("/erp", "layout");
  return {
    done: approve
      ? req.kind === "stipend"
        ? `Approved. ${req.family_name} now gets monthly help of ${inr(approved_paise)}.`
        : "Approved. Record the payment when the money is given."
      : "Saved as not approved.",
  };
}

export async function runStipends(month: string, _: FormState, data: FormData): Promise<FormState> {
  const u = await requireUser("editor");
  const errors: Record<string, string> = {};
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "Pick the month first." };
  const on_date = String(data.get("on_date") ?? "");
  if (!isDate(on_date) || on_date > todayIST()) errors.on_date = "Pick the date the money was sent.";
  const head = data.get("head");
  if (!isKey(HEADS, head)) errors.head = "Paid out of which money?";
  const headOther = head === "other" ? clean(data.get("head_other"), 120) : null;
  if (head === "other" && !headOther) errors.head_other = "Type which money it came out of.";
  const method = data.get("method");
  if (!isKey(METHODS, method)) errors.method = "How was it paid?";
  const lines: { family_id: number; amount_paise: number }[] = [];
  for (const raw of data.getAll("pay")) {
    const family_id = toId(raw);
    if (!family_id) continue;
    const amount = toPaise(data.get(`amount_${family_id}`));
    if (!amount) errors[`amount_${family_id}`] = "Amount?";
    else lines.push({ family_id, amount_paise: amount });
  }
  if (!lines.length && !Object.keys(errors).length) errors.pay = "Tick at least one family to pay.";
  if (Object.keys(errors).length) return { errors };
  const n = await payStipends(u, month, lines, {
    on_date,
    head: head as keyof typeof HEADS,
    head_other: headOther,
    method: method as keyof typeof METHODS,
    reference: clean(data.get("reference"), 120),
  });
  revalidatePath("/erp", "layout");
  return {
    done: n
      ? `Paid ${n} ${n === 1 ? "family" : "families"}. Each has its own payment number in Money.`
      : "Nothing new to pay: everyone ticked was already paid for this month.",
  };
}
