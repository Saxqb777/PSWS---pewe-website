import { requireUser } from "@/lib/erp/auth";
import { MeetingForm } from "@/components/erp/forms";
import { PageHead } from "@/components/erp/ui";
import { saveMeeting } from "../../members/actions";

export const metadata = { title: "Add a meeting or notice" };

export default async function NewMeeting() {
  await requireUser("editor");
  return (
    <>
      <PageHead title="Meeting or notice" sub="Baithak ya elaan" back={{ href: "/erp/meetings", label: "Meetings and notices" }} />
      <MeetingForm action={saveMeeting.bind(null, null)} submit="Save" />
    </>
  );
}
