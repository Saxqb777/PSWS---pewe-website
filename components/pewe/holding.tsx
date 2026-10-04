import { SOCIETY } from "@/lib/site";
import styles from "./holding.module.css";

/** What the public sees at / until the new Pewe is opened to everyone. */
export function Holding() {
  return (
    <main className={styles.page}>
      <div>
        <p className={styles.coords}>17.5605° N · 73.2422° E</p>
        <h1 className={styles.word}>Pewe</h1>
        <p className={styles.name}>{SOCIETY.name}</p>
        <p className={styles.marathi}>{SOCIETY.nameMarathi}</p>
        <p className={styles.line}>Our new website is being made. It will open here soon.</p>
        <div className={styles.links}>
          <a className={styles.link} href={SOCIETY.phoneHref}>
            Call the office
          </a>
          <a className={styles.link} href="/erp">
            Members
          </a>
        </div>
      </div>
    </main>
  );
}
