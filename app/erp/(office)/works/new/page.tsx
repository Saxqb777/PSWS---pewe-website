import { requireUser } from "@/lib/erp/auth";
import { WorkForm } from "@/components/erp/forms";
import { PageHead } from "@/components/erp/ui";
import { saveWork } from "../actions";

export const metadata = { title: "Add a work" };

export default async function NewWork() {
  await requireUser("editor");
  return (
    <>
      <PageHead title="Add a work" sub="Naya kaam" back={{ href: "/erp/works", label: "Village works" }} />
      <WorkForm action={saveWork.bind(null, null)} submit="Save the work" />
    </>
  );
}
