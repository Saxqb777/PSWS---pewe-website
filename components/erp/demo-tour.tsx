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
    db()`SELECT id, name, role FROM erp_user WHERE active AND phone <> 'owner'`,
    db()`SELECT id, title FROM erp_ask`,
  ]);
  // sample people by first name: "Ayaan (sample)" → Ayaan; the PSWS Accountant → Accountant
  const first = (name: string, role: string) => (role === "accountant" ? "Accountant" : name.split(" ")[0]);
  const who: Record<string, number> = {};
  for (const r of people) who[first(String(r.name), String(r.role))] = num(r.id);
  const ask = (start: string) => num(asks.find((a) => String(a.title).startsWith(start))?.id ?? 0);
  return (
    <Suspense fallback={null}>
      <TourFloat
        me={u ? first(u.name, u.role) : null}
        people={who}
        hospital={ask("Hospital costs")}
        tank={ask("Water tank")}
        bottom={bottom}
      />
    </Suspense>
  );
}
