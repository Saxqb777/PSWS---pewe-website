import { ErpHead } from "@/components/erp/page-head";
import { ProtoAction } from "@/components/proto-action";
import { Stat, Badge, Ledger, Th, Td, Panel } from "@/components/ui/primitives";
import { MEMBERS, MEMBER_ROLL, ROLE_LABEL } from "@/lib/mock-data";

export const metadata = { title: "Members" };

const BASED_TONE: Record<string, string> = {
  Gulf: "flash", Mumbai: "neutral", Pune: "neutral",
  Pewe: "disbursed", Guhagar: "approved", Ratnagiri: "approved",
};

export default function MembersPage() {
  const byPlace = MEMBERS.reduce<Record<string, number>>((acc, m) => {
    acc[m.based] = (acc[m.based] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <ErpHead
        title="Members"
        lede={`The roll stands at ${MEMBER_ROLL.total}. A sample of ${MEMBER_ROLL.shownInPrototype} is loaded into this prototype.`}
        actions={
          <>
            <ProtoAction
              label="Add a member"
              variant="primary"
              size="sm"
              does="Opens the enrolment form — name, phone, mohalla, where they are based, and the proposer's member ID."
              detail={[
                "The next member ID in the PSWS-000 series is allocated on save and cannot be reused, even if the enrolment is later cancelled.",
                "A new member starts unregistered until the first year's dues are receipted.",
              ]}
            />
            <ProtoAction
              label="Export the roll"
              variant="quiet"
              size="sm"
              does="Exports the roll as a spreadsheet — member ID, name, phone, role, mohalla, dues status."
              detail={["Phone numbers are included only for Admin and Committee roles."]}
            />
          </>
        }
      />

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="On the roll" value={String(MEMBER_ROLL.total)} sub={`${MEMBER_ROLL.registered} registered`} />
        <Stat label="Dues paid" value={String(MEMBER_ROLL.duesPaidThisYear)} sub={`${MEMBER_ROLL.total - MEMBER_ROLL.duesPaidThisYear} outstanding`} tone="pine" />
        <Stat label="Working abroad" value={String(MEMBER_ROLL.basedAbroad)} sub="Chiefly the Gulf" tone="brass" />
        <Stat label="Outside the district" value={String(MEMBER_ROLL.basedOutOfDistrict)} sub="Mumbai, Bhiwandi and Pune" tone="maroon" />
      </div>

      <Panel tone="sunk" className="mt-8">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 p-4">
          <span className="label">Where the sample lives</span>
          {Object.entries(byPlace)
            .sort((a, b) => b[1] - a[1])
            .map(([place, n]) => (
              <span key={place} className="flex items-center gap-2">
                <Badge tone={BASED_TONE[place] ?? "neutral"}>{place}</Badge>
                <span className="num text-[13.5px] text-ink-2">{n}</span>
              </span>
            ))}
        </div>
      </Panel>

      <div className="mt-8">
        <Ledger>
          <thead>
            <tr>
              <Th>Member ID</Th>
              <Th>Name</Th>
              <Th>Phone</Th>
              <Th>Mohalla</Th>
              <Th>Based</Th>
              <Th>Role</Th>
              <Th align="center">Joined</Th>
              <Th align="center">Registered</Th>
              <Th align="center">Dues</Th>
              <Th align="right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {MEMBERS.map((m) => (
              <tr key={m.id} className={!m.isRegistered ? "bg-rust-tint/40" : ""}>
                <Td mono className="font-semibold">{m.memberId}</Td>
                <Td className="whitespace-nowrap">{m.fullName}</Td>
                <Td mono className="whitespace-nowrap text-ink-2">{m.phone}</Td>
                <Td>{m.mohalla}</Td>
                <Td><Badge tone={BASED_TONE[m.based] ?? "neutral"}>{m.based}</Badge></Td>
                <Td>{m.role === "MEMBER" ? <span className="text-ink-3">Member</span> : <span className="font-semibold">{ROLE_LABEL[m.role]}</span>}</Td>
                <Td align="center" mono>{m.joinedYear}</Td>
                <Td align="center">
                  {m.isRegistered ? <Badge tone="disbursed">Yes</Badge> : <Badge tone="pending">Pending</Badge>}
                </Td>
                <Td align="center">
                  {m.duesPaid ? <span className="text-pine">Paid</span> : <span className="text-rust">Due</span>}
                </Td>
                <Td align="right">
                  <ProtoAction
                    label="Open"
                    variant="quiet"
                    size="sm"
                    title={m.fullName}
                    does="Opens the member's record — giving history, welfare applications made, tasks assigned, and scorecard."
                    detail={[
                      "Changing a member's role is restricted to Admin and is written to the audit trail with the old value, the new value and who changed it.",
                      "A member's own giving history is visible to them in their portal, but donor names are hidden from other members.",
                    ]}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </Ledger>
      </div>

      <p className="mt-4 text-[13.5px] text-ink-3">
        Showing {MEMBER_ROLL.shownInPrototype} of {MEMBER_ROLL.total}. The finished
        table pages, sorts on any column, and filters by mohalla, role, dues status
        and where the member is based.
      </p>
    </>
  );
}
