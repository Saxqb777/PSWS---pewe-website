"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import { vote, withdraw } from "@/lib/erp/books";
import { clean } from "@/lib/erp/labels";
import type { FormState } from "@/lib/erp/form-state";

export async function voteAction(id: number, _: FormState, data: FormData): Promise<FormState> {
  const u = await requireUser();
  const yes = data.get("decision") === "yes";
  const note = clean(data.get("note"), 300);
  if (!yes && !note) return { errors: { note: "Say why not, so the others can see. (Kyun nahi?)" } };
  const problem = await vote(u, id, yes, note);
  if (problem) return { error: problem };
  revalidatePath("/erp", "layout");
  redirect(`/erp/approvals/${id}?voted=${yes ? "yes" : "no"}`);
}

export async function withdrawAction(id: number, _: FormState): Promise<FormState> {
  const u = await requireUser();
  const problem = await withdraw(u, id);
  if (problem) return { error: problem };
  revalidatePath("/erp", "layout");
  redirect(`/erp/approvals/${id}?withdrawn=1`);
}
