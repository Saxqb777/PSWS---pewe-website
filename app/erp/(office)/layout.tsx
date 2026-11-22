import Link from "next/link";
import { OWNER_PHONE, ownerBehind, requireUser } from "@/lib/erp/auth";
import { canDo } from "@/lib/erp/labels";
import { waitingForMe } from "@/lib/erp/books";
import { portalOn } from "@/lib/erp/flags";
import { officeWaiting } from "@/lib/erp/portal";
import { MobileMenu, Nav } from "@/components/erp/shell";
import { DemoTour } from "@/components/erp/demo-tour";
import styles from "@/components/erp/erp.module.css";
import { backToOwnerAction } from "./control/actions";

/**
 * The frame round every office page. Each page and each action checks who
 * is signed in for itself as well; this only draws the menu.
 */
export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  const admin = canDo(u.role, "admin");
  const accountant = u.role === "accountant";
  const [needsMe, portal, behind] = await Promise.all([
    waitingForMe(u.id),
    portalOn() ? officeWaiting(u.id).then((w) => w.pledges + w.asks + w.messages) : Promise.resolve(null),
    accountant ? ownerBehind() : Promise.resolve(false),
  ]);
  return (
    <>
      <header className={styles.top}>
        <Link href="/erp" className={styles.brand}>
          PSWS <span className={styles.brandWord}>Office</span>
        </Link>
        {portal !== null && u.phone !== OWNER_PHONE && !accountant ? (
          <Link href="/erp/me" className={styles.who}>
            My portal
          </Link>
        ) : (
          <Link href="/erp/account" className={styles.who}>
            {u.name}
            {u.post ? ` · ${u.post}` : ""}
          </Link>
        )}
        <MobileMenu
          admin={admin}
          name={u.name}
          needsMe={needsMe}
          portal={portal}
          myPortal={portal !== null && u.phone !== OWNER_PHONE && !accountant}
          owner={u.phone === OWNER_PHONE}
        />
      </header>
      {behind && (
        <form action={backToOwnerAction} className={styles.workingAs}>
          <span>
            You are working as the <b>PSWS Accountant</b>.
          </span>
          <button type="submit">Back to you</button>
        </form>
      )}
      <div className={styles.frame}>
        <aside className={styles.rail}>
          <Nav admin={admin} needsMe={needsMe} portal={portal} owner={u.phone === OWNER_PHONE} />
        </aside>
        <main className={styles.main}>{children}</main>
      </div>
      <DemoTour />
    </>
  );
}
