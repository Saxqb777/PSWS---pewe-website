import { requireUser } from "@/lib/erp/auth";
import { familyNames, getFamily, getRequest, getWork, workNames } from "@/lib/erp/data";
import { KINDS, inr, todayIST, labelOf } from "@/lib/erp/labels";
import { toId } from "@/lib/erp/form-state";
import { MoneyOutForm, type MoneyOutInitial } from "@/components/erp/money-forms";
import { fundBalances, getOpening } from "@/lib/erp/books";
import { PageHead } from "@/components/erp/ui";
import { saveMoneyOut } from "../../actions";

export const metadata = { title: "Money paid" };

type Search = { for?: string; family?: string; work?: string; request?: string };

/** Opened from Home, from a family (help given), from a work, or from an approved request. */
export default async function NewMoneyOut({ searchParams }: { searchParams: Promise<Search> }) {
  await requireUser("editor");
  const sp = await searchParams;
  const [families, works, opening] = await Promise.all([familyNames(), workNames(), getOpening()]);
  const funds = opening ? await fundBalances() : null;
  const initial: MoneyOutInitial = { on_date: todayIST() };
  let request: { id: number; label: string } | null = null;
  let title = "Money paid";
  let back = { href: "/erp/money", label: "Money" };

  const req = toId(sp.request) ? await getRequest(toId(sp.request)!) : null;
  const fam = req ? await getFamily(req.family_id) : toId(sp.family) ? await getFamily(toId(sp.family)!) : null;
  const work = toId(sp.work) ? await getWork(toId(sp.work)!) : null;

  if (req && fam && (req.status === "approved" || req.status === "waiting")) {
    Object.assign(initial, {
      family_id: fam.id,
      purpose: req.kind,
      amount_paise: req.approved_paise ? Math.max(req.approved_paise - req.paid_paise, 0) || null : null,
    });
    request = {
      id: req.id,
      label: `${labelOf(KINDS, req.kind, req.kind_other)}${req.approved_paise ? `, approved ${inr(req.approved_paise)}` : ""}${req.paid_paise ? `, ${inr(req.paid_paise)} paid so far` : ""}`,
    };
    title = `Help given to ${fam.name}`;
    back = { href: `/erp/families/${fam.id}`, label: fam.name };
  } else if (fam) {
    Object.assign(initial, { family_id: fam.id });
    title = `Help given to ${fam.name}`;
    back = { href: `/erp/families/${fam.id}`, label: fam.name };
  } else if (work) {
    Object.assign(initial, { work_id: work.id, purpose: "works" });
    title = `Payment for ${work.name}`;
    back = { href: `/erp/works/${work.id}`, label: work.name };
  } else if (sp.for === "family") {
    initial.forFamily = true;
    title = "Family helped";
  }

  return (
    <>
      <PageHead title={title} sub="A payment number is given when you save." back={back} />
      <MoneyOutForm
        action={saveMoneyOut.bind(null, null)}
        initial={initial}
        families={families}
        works={works}
        request={request}
        submit="Save the payment"
        funds={funds}
      />
    </>
  );
}
