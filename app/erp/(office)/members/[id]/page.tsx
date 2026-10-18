import { notFound } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import { getMember } from "@/lib/erp/data";
import { canDo, showPhone } from "@/lib/erp/labels";
import { toId } from "@/lib/erp/form-state";
import { MemberForm } from "@/components/erp/forms";
import { Facts, PageHead } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";
import { saveMember } from "../actions";

export const metadata = { title: "Member" };

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const id = toId((await params).id);
  const m = id ? await getMember(id) : null;
  if (!m) notFound();
  return (
    <>
      <PageHead title={m.name} sub={m.active ? (m.post ?? "Member") : "No longer a member"} back={{ href: "/erp/members", label: "Members" }} />
      {canDo(u.role, "editor") ? (
        <MemberForm action={saveMember.bind(null, m.id)} member={m} submit="Save the change" />
      ) : (
        <div className={styles.card}>
          <Facts items={[["Mobile", showPhone(m.phone)], ["Lives in", m.lives_in], ["Post", m.post], ["Notes", m.notes]]} />
        </div>
      )}
    </>
  );
}
