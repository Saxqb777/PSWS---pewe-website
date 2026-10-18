import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import { familyNames, getMoneyOut, getRequest, workNames } from "@/lib/erp/data";
import { KINDS, labelOf } from "@/lib/erp/labels";
import { toId } from "@/lib/erp/form-state";
import { MoneyOutForm } from "@/components/erp/money-forms";
import { fundBalances, getOpening, openApproval } from "@/lib/erp/books";
import { PageHead } from "@/components/erp/ui";
import { saveMoneyOut } from "../../../actions";

export const metadata = { title: "Change a payment" };

export default async function EditMoneyOut({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("editor");
  const id = toId((await params).id);
  const m = id ? await getMoneyOut(id) : null;
  if (!m) notFound();
  if (m.cancelled_at || (await openApproval(`money_out:${m.id}`))) redirect(`/erp/money/out/${m.id}`);
  const funds = (await getOpening()) ? await fundBalances(m.id) : null;
  const [families, works, req] = await Promise.all([
    familyNames(),
    workNames(),
    m.request_id ? getRequest(m.request_id) : null,
  ]);
  // a work that has since finished still shows in its own payment
  if (m.work_id && !works.some((w) => w.id === m.work_id)) works.push({ id: m.work_id, name: m.work_name ?? "" });
  if (m.family_id && !families.some((f) => f.id === m.family_id))
    families.push({ id: m.family_id, name: m.family_name ?? "", place: null });
  return (
    <>
      <PageHead title={`Change ${m.voucher_no}`} sub="The change waits for all the approvers. The payment number stays the same." back={{ href: `/erp/money/out/${m.id}`, label: m.voucher_no }} />
      <MoneyOutForm
        action={saveMoneyOut.bind(null, m.id)}
        initial={m}
        families={families}
        works={works}
        request={req ? { id: req.id, label: labelOf(KINDS, req.kind, req.kind_other) } : null}
        submit="Ask for approval"
        askReason
        funds={funds}
      />
    </>
  );
}
