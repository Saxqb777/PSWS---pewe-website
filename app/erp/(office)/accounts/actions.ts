"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import {
  addTransfer,
  askApproval,
  closeMonth,
  closedMessage,
  getOpening,
  isApprover,
  monthFigures,
  openingChanges,
  setOpening,
  type Opening,
} from "@/lib/erp/books";
import { clean, inr, isDate, showMonth, thisMonthIST, todayIST, toPaise, toPaiseOrZero } from "@/lib/erp/labels";
import type { FormState } from "@/lib/erp/form-state";

/** The starting balances: set once, and changed afterwards only with the approvers. */
export async function saveStarting(_: FormState, data: FormData): Promise<FormState> {
  const u = await requireUser("editor");
  const errors: Record<string, string> = {};
  const on_date = String(data.get("on_date") ?? "");
  if (!isDate(on_date) || on_date > todayIST()) errors.on_date = "Pick the date these balances are from.";
  const amt = (k: string) => {
    const v = toPaiseOrZero(data.get(k));
    if (v === null) errors[k] = "Numbers only, e.g. 25000. Leave empty for nothing.";
    return v ?? 0;
  };
  const o: Opening = {
    on_date,
    cash_paise: amt("cash"),
    bank_paise: amt("bank"),
    zakat_paise: amt("zakat"),
    donation_paise: amt("donation"),
    development_paise: amt("development"),
    other_paise: amt("other"),
  };
  if (Object.keys(errors).length) return { errors };
  const places = o.cash_paise + o.bank_paise;
  const funds = o.zakat_paise + o.donation_paise + o.development_paise + o.other_paise;
  if (places !== funds)
    return {
      error: `Cash and bank come to ${inr(places)}, but the funds come to ${inr(funds)}. The funds say whose money the cash and bank hold, so they must add up to the same.`,
    };
  const was = await getOpening();
  if (!was) {
    await setOpening(u, o);
    revalidatePath("/erp", "layout");
    redirect("/erp/accounts?started=1");
  }
  const reason = clean(data.get("reason"), 300);
  if (!reason) return { errors: { reason: "Say why they need changing. The approvers read this." } };
  const change_lines = openingChanges(was, o);
  if (!change_lines) return { error: "Nothing is different from the saved starting balances." };
  const r = await askApproval(u, {
    entity: "opening",
    entity_id: null,
    entity_key: "opening",
    action: "change",
    summary: "the starting balances",
    change_lines,
    changes: o,
    reason,
  });
  if ("error" in r) return { error: r.error };
  redirect(`/erp/approvals/${r.id}?new=1`);
}

/** Cash deposited in the bank, or cash taken out of it. */
export async function moveMoney(_: FormState, data: FormData): Promise<FormState> {
  const u = await requireUser("editor");
  const errors: Record<string, string> = {};
  const direction = data.get("direction");
  if (direction !== "to_bank" && direction !== "to_cash") errors.direction = "Which way did the money go?";
  const amount = toPaise(data.get("amount"));
  if (!amount) errors.amount = "Type the amount in numbers, e.g. 5000.";
  const on_date = String(data.get("on_date") ?? "");
  if (!isDate(on_date) || on_date > todayIST()) errors.on_date = "Pick the date.";
  if (Object.keys(errors).length) return { errors };
  const closed = await closedMessage(on_date);
  if (closed) return { errors: { on_date: closed } };
  await addTransfer(u, { on_date, direction: direction as "to_bank" | "to_cash", amount_paise: amount!, note: clean(data.get("note"), 200) });
  revalidatePath("/erp", "layout");
  return { done: `Saved: ${direction === "to_bank" ? "cash deposited in the bank" : "cash taken from the bank"}, ${inr(amount)}.` };
}

/** Closing a month: the books against the bank statement and the cash counted. Only the approvers. */
export async function closeMonthAction(month: string, _: FormState, data: FormData): Promise<FormState> {
  const u = await requireUser("editor");
  if (!(await isApprover(u.id))) return { error: "Only the approvers close a month." };
  if (!/^\d{4}-\d{2}$/.test(month) || month >= thisMonthIST()) return { error: "A month can be closed once it has ended." };
  const errors: Record<string, string> = {};
  const cash = toPaiseOrZero(data.get("cash"));
  if (cash === null) errors.cash = "Type the cash counted, in numbers.";
  const bank = toPaiseOrZero(data.get("bank"));
  if (bank === null) errors.bank = "Type the balance on the bank statement, in numbers.";
  if (Object.keys(errors).length) return { errors };
  const note = clean(data.get("note"), 300);
  const books = await monthFigures(month);
  const off = [
    cash !== books.cash ? `cash is ${inr(Math.abs(cash! - books.cash))} ${cash! > books.cash ? "more" : "less"} than the books` : "",
    bank !== books.bank ? `the bank is ${inr(Math.abs(bank! - books.bank))} ${bank! > books.bank ? "more" : "less"} than the books` : "",
  ].filter(Boolean);
  if (off.length && !note)
    return {
      errors: {
        note: `These do not match: ${off.join(", and ")}. Fix the entries first, or write here what the difference is.`,
      },
    };
  await closeMonth(u, month, { cash_counted_paise: cash!, bank_statement_paise: bank!, note });
  revalidatePath("/erp", "layout");
  redirect(`/erp/accounts?closed=${month}`);
}

export async function askReopen(month: string, _: FormState, data: FormData): Promise<FormState> {
  const u = await requireUser("editor");
  const reason = clean(data.get("reason"), 300);
  if (!reason) return { errors: { reason: "Say why it needs reopening. The approvers read this." } };
  const r = await askApproval(u, {
    entity: "month",
    entity_id: null,
    entity_key: `month:${month}`,
    action: "reopen",
    summary: showMonth(month),
    reason,
  });
  if ("error" in r) return { error: r.error };
  redirect(`/erp/approvals/${r.id}?new=1`);
}
