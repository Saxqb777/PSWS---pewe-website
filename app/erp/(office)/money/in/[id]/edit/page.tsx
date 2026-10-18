import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import { getMoneyIn, knownNames } from "@/lib/erp/data";
import { toId } from "@/lib/erp/form-state";
import { MoneyInForm } from "@/components/erp/money-forms";
import { openApproval } from "@/lib/erp/books";
import { PageHead } from "@/components/erp/ui";
import { saveMoneyIn } from "../../../actions";

export const metadata = { title: "Change a receipt" };

export default async function EditMoneyIn({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("editor");
  const id = toId((await params).id);
  const m = id ? await getMoneyIn(id) : null;
  if (!m) notFound();
  if (m.cancelled_at || (await openApproval(`money_in:${m.id}`))) redirect(`/erp/money/in/${m.id}`);
  const names = await knownNames("in");
  return (
    <>
      <PageHead title={`Change ${m.receipt_no}`} sub="The change waits for all the approvers. The receipt number stays the same." back={{ href: `/erp/money/in/${m.id}`, label: m.receipt_no }} />
      <MoneyInForm action={saveMoneyIn.bind(null, m.id)} initial={m} names={names} submit="Ask for approval" askReason />
    </>
  );
}
