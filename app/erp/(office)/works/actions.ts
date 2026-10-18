"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import { addWork, getWork, updateWork, type WorkFields } from "@/lib/erp/data";
import { WORK_STATUSES, clean, cleanLong, isDate, isKey, toPaise } from "@/lib/erp/labels";
import type { FormState } from "@/lib/erp/form-state";

export async function saveWork(id: number | null, _: FormState, data: FormData): Promise<FormState> {
  const u = await requireUser("editor");
  const errors: Record<string, string> = {};
  const name = clean(data.get("name"), 160);
  if (!name) errors.name = "What is the work called? (Kaam ka naam?)";
  const status = data.get("status");
  if (!isKey(WORK_STATUSES, status)) errors.status = "Where is the work now?";
  const budgetRaw = clean(data.get("budget"), 20);
  const budget_paise = budgetRaw ? toPaise(budgetRaw) : null;
  if (budgetRaw && !budget_paise) errors.budget = "Numbers only, e.g. 250000. Leave empty if not known.";
  const date = (k: string) => {
    const v = String(data.get(k) ?? "");
    if (!v) return null;
    if (!isDate(v)) errors[k] = "Pick a date, or leave it empty.";
    return v;
  };
  const started_on = date("started_on");
  const finished_on = date("finished_on");
  if (started_on && finished_on && finished_on < started_on) errors.finished_on = "It cannot finish before it started.";
  if (Object.keys(errors).length) return { errors };
  const f: WorkFields = {
    name: name!,
    place: clean(data.get("place"), 80),
    status: status as WorkFields["status"],
    started_on,
    finished_on,
    budget_paise,
    notes: cleanLong(data.get("notes"), 4000),
  };
  if (id) {
    if (!(await getWork(id))) return { error: "This work is not in the office any more." };
    await updateWork(u, id, f);
    redirect(`/erp/works/${id}?saved=1`);
  }
  const newId = await addWork(u, f);
  redirect(`/erp/works/${newId}?new=1`);
}
