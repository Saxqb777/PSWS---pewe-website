import Link from "next/link";
import { isDemo, requireMember } from "@/lib/erp/auth";
import { TabBar } from "@/components/erp/portal-client";
import { DemoTour } from "@/components/erp/demo-tour";
import p from "@/components/erp/portal.module.css";

export const metadata = { title: { default: "My PSWS", template: "%s · My PSWS" } };

/**
 * The frame round every page of a member's own portal. The office's people
 * are members too, and have a button back to the office.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const u = await requireMember();
  return (
    <>
      <header className={p.top}>
        <Link href="/erp/me" className={p.brand}>
          PSWS <span>Members</span>
        </Link>
        {u.role !== "member" && (
          <Link href="/erp" className={p.office}>
            Office
          </Link>
        )}
      </header>
      {(await isDemo()) && (
        <p className={p.demo}>
          Demo: sample people and sample money, nothing here is real.{" "}
          <Link href="/erp/login">Be someone else</Link>
        </p>
      )}
      <main className={p.main}>{children}</main>
      <TabBar />
      <DemoTour bottom={72} />
    </>
  );
}
