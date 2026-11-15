import Link from "next/link";
import { isDemo, lookingAt, requireMember } from "@/lib/erp/auth";
import { TabBar } from "@/components/erp/portal-client";
import { DemoTour } from "@/components/erp/demo-tour";
import p from "@/components/erp/portal.module.css";
import { stopLooking } from "../(office)/control/actions";

export const metadata = { title: { default: "My PSWS", template: "%s · My PSWS" } };

/**
 * The frame round every page of a member's own portal. The office's people
 * are members too, and have a button back to the office.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const u = await requireMember();
  const looking = !!(await lookingAt());
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
      {(await isDemo()) && (
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
