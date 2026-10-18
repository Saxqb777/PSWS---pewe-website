import Link from "next/link";
import { requireUser } from "@/lib/erp/auth";
import { canDo } from "@/lib/erp/labels";
import { MobileMenu, Nav } from "@/components/erp/shell";
import styles from "@/components/erp/erp.module.css";

/**
 * The frame round every office page. Each page and each action checks who
 * is signed in for itself as well; this only draws the menu.
 */
export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  const admin = canDo(u.role, "admin");
  return (
    <>
      <header className={styles.top}>
        <Link href="/erp" className={styles.brand}>
          <span className={styles.brandName}>PSWS</span>
          <span className={styles.brandWord}>Office</span>
        </Link>
        <Link href="/erp/account" className={styles.who}>
          {u.name}
          {u.post ? ` · ${u.post}` : ""}
        </Link>
        <MobileMenu admin={admin} name={u.name} />
      </header>
      <div className={styles.frame}>
        <aside className={styles.rail}>
          <Nav admin={admin} />
        </aside>
        <main className={styles.main}>{children}</main>
      </div>
    </>
  );
}
