import { ErpHead } from "@/components/erp/page-head";
import { ProtoAction } from "@/components/proto-action";
import { Badge, Ledger, Th, Td, Stat } from "@/components/ui/primitives";
import { ANNOUNCEMENTS } from "@/lib/mock-data";
import { longDate } from "@/lib/format";

export const metadata = { title: "Notices" };

export default function ErpNoticesPage() {
  return (
    <>
      <ErpHead
        title="Notices"
        lede="What goes up on the public board and on the members' group. A notice published here reaches a member in Dammam the same day it reaches one in the village."
        actions={
          <ProtoAction
            label="Write a notice"
            variant="primary"
            size="sm"
            does="Opens the notice editor — title in English and Marathi, body, and whether it is a formal notice or a work report."
            detail={[
              "Publishing pushes to the public notice board and, in the finished system, to the members' messaging group in the same action.",
              "Formal notices requiring a period — a General Body meeting, a tender opening — refuse to publish if the date is inside the required notice period.",
            ]}
          />
        }
      />

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Published this year" value={String(ANNOUNCEMENTS.length)} sub="Notices and work reports" />
        <Stat label="Formal notices" value={String(ANNOUNCEMENTS.filter((a) => a.isNotice).length)} sub="Carrying a notice period" tone="maroon" />
        <Stat label="Work reports" value={String(ANNOUNCEMENTS.filter((a) => !a.isNotice).length)} sub="Progress against works" tone="pine" />
        <Stat label="Pinned" value={String(ANNOUNCEMENTS.filter((a) => a.pinned).length)} sub="Held at the top of the board" tone="brass" />
      </div>

      <div className="mt-10">
        <Ledger>
          <thead>
            <tr>
              <Th>Posted</Th>
              <Th>Title</Th>
              <Th align="center">Kind</Th>
              <Th align="center">Pinned</Th>
              <Th align="right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {ANNOUNCEMENTS.map((a) => (
              <tr key={a.id}>
                <Td mono className="whitespace-nowrap">{longDate(a.postedOn)}</Td>
                <Td className="max-w-[32rem]">
                  <span className="font-semibold">{a.title}</span>
                  {a.titleMarathi && (
                    <span className="marathi mt-0.5 block text-[13px] text-ink-3">{a.titleMarathi}</span>
                  )}
                  <span className="mt-1 block line-clamp-2 text-[13px] leading-snug text-ink-2">{a.body}</span>
                </Td>
                <Td align="center">
                  {a.isNotice ? <Badge tone="approved">Notice</Badge> : <Badge tone="neutral">Report</Badge>}
                </Td>
                <Td align="center">
                  {a.pinned ? <Badge tone="flash">Pinned</Badge> : <span className="text-ink-3">—</span>}
                </Td>
                <Td align="right">
                  <div className="flex justify-end gap-2">
                    <ProtoAction
                      label="Edit"
                      variant="quiet"
                      size="sm"
                      title={a.title}
                      does="Reopens the notice in the editor."
                      detail={["Editing a published notice writes a revision and marks it corrected on the public board, rather than silently changing what people already read."]}
                    />
                    <ProtoAction
                      label={a.pinned ? "Unpin" : "Pin"}
                      variant="quiet"
                      size="sm"
                      does={a.pinned ? "Releases the notice from the top of the board." : "Holds the notice at the top of the public board until unpinned."}
                    />
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Ledger>
      </div>
    </>
  );
}
