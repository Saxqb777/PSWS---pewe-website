import { requireUser } from "@/lib/erp/auth";
import { MemberForm } from "@/components/erp/forms";
import { PageHead } from "@/components/erp/ui";
import { saveMember } from "../actions";

export const metadata = { title: "Add a member" };

export default async function NewMember() {
  await requireUser("editor");
  return (
    <>
      <PageHead title="Add a member" back={{ href: "/erp/members", label: "Members" }} />
      <MemberForm action={saveMember.bind(null, null)} submit="Save the member" />
    </>
  );
}
