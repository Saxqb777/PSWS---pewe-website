import { notFound } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import { getWork } from "@/lib/erp/data";
import { toId } from "@/lib/erp/form-state";
import { WorkForm } from "@/components/erp/forms";
import { PageHead } from "@/components/erp/ui";
import { saveWork } from "../../actions";

export const metadata = { title: "Change a work" };

export default async function EditWork({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("editor");
  const id = toId((await params).id);
  const w = id ? await getWork(id) : null;
  if (!w) notFound();
  return (
    <>
      <PageHead title={w.name} sub="Change the details" back={{ href: `/erp/works/${w.id}`, label: w.name }} />
      <WorkForm action={saveWork.bind(null, w.id)} work={w} submit="Save the change" />
    </>
  );
}
