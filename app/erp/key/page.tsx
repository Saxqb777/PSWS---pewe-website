import Link from "next/link";
import { KeyDoor } from "@/components/erp/key-door";
import styles from "@/components/erp/erp.module.css";

export const metadata = { title: "Opening the office" };

/** The owner's private link lands here: /erp/key#<key>. */
export default function KeyPage() {
  return (
    <main className={styles.door}>
      <div className={styles.doorBox}>
        <p className={styles.doorWord}>
          PSWS <span>Office</span>
        </p>
        <h1 className={styles.doorTitle}>Your private link</h1>
        <KeyDoor />
        <p className={styles.doorNote}>
          Committee members sign in with their mobile number instead.{" "}
          <Link href="/erp/login" className={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
