import { notFound } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import { getMember } from "@/lib/erp/data";
import { canDo, showPhone } from "@/lib/erp/labels";
import { toId } from "@/lib/erp/form-state";
import { MemberForm } from "@/components/erp/forms";
import { Facts, PageHead, Pending } from "@/components/erp/ui";
import { AskBox } from "@/components/erp/cancel-box";
import { Removed } from "@/components/erp/bring-back";
import { openApproval } from "@/lib/erp/books";
import styles from "@/components/erp/erp.module.css";
import { askRemoveMember, bringBackMember, saveMember } from "../actions";

export const metadata = { title: "Member" };

export default async function MemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ back?: string }>;
}) {
  const u = await requireUser();
  const id = toId((await params).id);
  const m = id ? await getMember(id) : null;
  if (!m) notFound();
  const pending = m.active ? await openApproval(`member:${m.id}`) : null;
  return (
    <>
      <PageHead title={m.name} sub={m.active ? (m.post ?? "Member") : "Removed"} back={{ href: "/erp/members", label: "Members" }} />
      {!m.active && (
        <Removed what="The member" action={canDo(u.role, "editor") ? bringBackMember.bind(null, m.id) : null} />
      )}
      {pending && <Pending a={pending} />}
      {(await searchParams).back && m.active && <p className={styles.formDone}>Brought back.</p>}
      {canDo(u.role, "editor") ? (
        <MemberForm action={saveMember.bind(null, m.id)} member={m} submit="Save the change" />
      ) : (
        <div className={styles.card}>
          <Facts items={[["Mobile", showPhone(m.phone)], ["Lives in", m.lives_in], ["Post", m.post], ["Notes", m.notes]]} />
        </div>
      )}
      {m.active && !pending && canDo(u.role, "editor") && (
        <AskBox
          action={askRemoveMember.bind(null, m.id)}
          title="Remove this member"
          explain="For someone who is no longer a member. Removing needs all the approvers."
          button="Ask to remove"
        />
      )}
    </>
  );
}
