import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { isDemo, lookingAt, requireMember } from "@/lib/erp/auth";
import { TabBar } from "@/components/erp/portal-client";
import { DemoTour } from "@/components/erp/demo-tour";
import p from "@/components/erp/portal.module.css";
import { stopLooking } from "../(office)/control/actions";

export const metadata: Metadata = {
  title: { default: "My PSWS", template: "%s · My PSWS" },
  manifest: "/erp/app.webmanifest",
  appleWebApp: { capable: true, title: "PSWS", statusBarStyle: "default" },
  icons: { apple: "/erp/icons/apple-180.png" },
};

export const viewport: Viewport = { themeColor: "#1f4d35" };

/**
 * The frame round every page of a member's own portal. The office's people
 * are members too, and have a button back to the office.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const u = await requireMember();
  const looking = !!(await lookingAt());
  const demo = await isDemo();
  return (
    <>
      <header className={p.top}>
        <Link href="/erp/me" className={p.brand}>
          PSWS <span>Members</span>
        </Link>
        {u.role !== "member" && !looking && (
          <Link href="/erp" className={p.office}>
            Office
          </Link>
        )}
      </header>
      {looking && (
        <form action={stopLooking} className={p.lookOnly}>
          <span>
            <b>{u.name}&apos;s portal</b>, as they see it. Look only: nothing can be sent in their name.
          </span>
          <button type="submit">Stop looking</button>
        </form>
      )}
      {demo && (
        <p className={p.demo}>
          Demo: sample people and sample money, nothing here is real.{" "}
          <Link href="/erp/login">Be someone else</Link>
        </p>
      )}
      <main className={p.main}>
        {looking ? (
          // every box and button greyed out; links still work, to look round
          <fieldset disabled className={p.lookFrame}>
            {children}
          </fieldset>
        ) : (
          children
        )}
      </main>
      <TabBar />
      <DemoTour bottom={72} />
    </>
  );
}
