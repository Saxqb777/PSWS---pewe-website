import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import { seesNames } from "@/lib/erp/privacy";
import { getFamily } from "@/lib/erp/data";
import { toId } from "@/lib/erp/form-state";
import { FamilyForm } from "@/components/erp/forms";
import { PageHead } from "@/components/erp/ui";
import { saveFamily } from "../../actions";

export const metadata = { title: "Change a family's details" };

export default async function EditFamily({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser("editor");
  const id = toId((await params).id);
  const f = id ? await getFamily(id) : null;
  if (!f) notFound();
  if (!seesNames(u)) redirect(`/erp/families/${f.id}`);
  return (
    <>
      <PageHead title={f.name} sub="Change the details" back={{ href: `/erp/families/${f.id}`, label: f.name }} />
      <FamilyForm action={saveFamily.bind(null, f.id)} family={f} submit="Save the change" />
    </>
  );
}
