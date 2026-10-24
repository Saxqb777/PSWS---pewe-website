import { currentUser, isDemo } from "@/lib/erp/auth";
import { db, num } from "@/lib/erp/db";
import { Suspense } from "react";
import { TourFloat } from "./demo-tour-float";

/**
 * The demo's guided tour: a floating card that walks through the portal in
 * the order to show it, as whichever sample person each step needs. It is
 * drawn only in the demo copy; on the real office it renders nothing.
 */
export async function DemoTour({ bottom = 16 }: { bottom?: number }) {
  if (!(await isDemo())) return null;
  const [u, people, asks] = await Promise.all([
    currentUser(),
    db()`SELECT id, name FROM erp_user WHERE active AND phone <> 'owner'`,
    db()`SELECT id, title FROM erp_ask`,
  ]);
  // sample people by first name: "Ayaan (sample)" → Ayaan
  const who: Record<string, number> = {};
  for (const r of people) who[String(r.name).split(" ")[0]] = num(r.id);
  const ask = (start: string) => num(asks.find((a) => String(a.title).startsWith(start))?.id ?? 0);
  return (
    <Suspense fallback={null}>
      <TourFloat
        me={u ? String(u.name).split(" ")[0] : null}
        people={who}
        hospital={ask("Hospital costs")}
        tank={ask("Water tank")}
        bottom={bottom}
      />
    </Suspense>
  );
}
