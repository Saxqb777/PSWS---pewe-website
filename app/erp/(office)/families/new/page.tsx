import { redirect } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import { seesNames } from "@/lib/erp/privacy";
import { FamilyForm } from "@/components/erp/forms";
import { PageHead } from "@/components/erp/ui";
import { saveFamily } from "../actions";

export const metadata = { title: "Add a family" };

export default async function NewFamily() {
  const u = await requireUser("editor");
  // only those who see the names of the people helped add them
  if (!seesNames(u)) redirect("/erp/families");
  return (
    <>
      <PageHead title="Add a family" sub="Only the name is needed now. The rest can come later." back={{ href: "/erp/families", label: "Families" }} />
      <FamilyForm action={saveFamily.bind(null, null)} submit="Save the family" />
    </>
  );
}
