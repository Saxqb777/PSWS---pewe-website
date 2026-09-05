import { ErpHead } from "@/components/erp/page-head";
import { ProtoAction } from "@/components/proto-action";
import { Stat, Ledger, Th, Td, Panel, Progress } from "@/components/ui/primitives";
import { SCORECARDS } from "@/lib/mock-data";
import { pct } from "@/lib/format";

export const metadata = { title: "Scorecards" };

export default function ScorecardsPage() {
  const avg = Math.round(SCORECARDS.reduce((s, r) => s + r.overallScore, 0) / SCORECARDS.length);
  const avgDays = (SCORECARDS.reduce((s, r) => s + r.avgExecutionDays, 0) / SCORECARDS.length).toFixed(1);
  const totalTasks = SCORECARDS.reduce((s, r) => s + r.tasksAssigned, 0);
  const doneTasks = SCORECARDS.reduce((s, r) => s + r.tasksCompleted, 0);

  return (
    <>
      <ErpHead
        title="Member scorecards — 2026"
        lede="Tasks assigned against tasks finished, and how long they took. Kept so that the load can be seen and shared out, not so that anybody can be shamed with it."
        actions={
          <ProtoAction
            label="Assign a task"
            variant="primary"
            size="sm"
            does="Opens the task sheet — what is to be done, who is to do it, and by when."
            detail={[
              "Completing a task stamps the date, and the execution days are the difference between assignment and completion. Neither figure can be typed in by hand.",
              "A task can be reassigned, in which case the clock starts again for the new holder and the original holder keeps the part they did.",
            ]}
          />
        }
      />

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Average score" value={String(avg)} sub="Across the ten most active members" />
        <Stat label="Tasks completed" value={`${doneTasks} of ${totalTasks}`} sub={`${pct(doneTasks, totalTasks)}% completion`} tone="pine" />
        <Stat label="Average execution" value={`${avgDays} days`} sub="Assignment to completion" tone="brass" />
        <Stat label="Members tracked" value={String(SCORECARDS.length)} sub="Committee and active members" tone="maroon" />
      </div>

      <div className="mt-10">
        <Ledger>
          <thead>
            <tr>
              <Th>Member</Th>
              <Th>Post</Th>
              <Th align="right">Assigned</Th>
              <Th align="right">Completed</Th>
              <Th>Completion</Th>
              <Th align="right">Avg days</Th>
              <Th align="right">Meetings</Th>
              <Th align="right">Score</Th>
            </tr>
          </thead>
          <tbody>
            {SCORECARDS.map((r) => {
              const completion = pct(r.tasksCompleted, r.tasksAssigned);
              return (
                <tr key={r.memberId}>
                  <Td className="whitespace-nowrap">
                    <span className="font-semibold">{r.name}</span>
                    <span className="num block text-[12px] text-ink-3">{r.memberId}</span>
                  </Td>
                  <Td className="text-ink-2">{r.post ?? <span className="text-ink-3">—</span>}</Td>
                  <Td align="right" mono>{r.tasksAssigned}</Td>
                  <Td align="right" mono>{r.tasksCompleted}</Td>
                  <Td className="min-w-[8rem]">
                    <Progress
                      value={completion}
                      tone={completion >= 85 ? "pine" : completion >= 70 ? "brass" : "maroon"}
                      showLabel={false}
                    />
                    <span className="num mt-1 block text-[12px] text-ink-3">{completion}%</span>
                  </Td>
                  <Td align="right" mono className={r.avgExecutionDays > 7 ? "text-maroon" : "text-ink"}>
                    {r.avgExecutionDays.toFixed(1)}
                  </Td>
                  <Td align="right" mono className="text-ink-2">
                    {r.meetingsAttended}/{r.meetingsHeld}
                  </Td>
                  <Td align="right" mono className="text-[16.5px] font-semibold">
                    {r.overallScore}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Ledger>
      </div>

      <Panel tone="sunk" className="mt-8">
        <div className="p-5">
          <div className="label label-maroon">How the score is worked out</div>
          <p className="mt-2 max-w-3xl text-[15px] leading-[1.65] text-ink-2">
            Completion rate carries the most weight, then meeting attendance,
            then execution speed. Speed is weighted least on purpose: a member in
            Dubai answering on a Friday is not the same as one in the village
            answering on a Tuesday, and the score should not pretend otherwise.
          </p>
          <p className="mt-3 max-w-3xl text-[15px] leading-[1.65] text-ink-2">
            The scorecard is visible to the member it belongs to and to the
            committee. It is not published on the public site.
          </p>
        </div>
      </Panel>
    </>
  );
}
