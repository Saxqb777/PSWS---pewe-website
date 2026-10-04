import styles from "./pewe.module.css";

/**
 * A gap the office still has to fill. Shown only on the private preview,
 * so the committee can see exactly what is missing; the page leaves it out
 * once the site is public, so nothing unconfirmed is ever shown as fact.
 */
export function ToFill({ title, asks, onInk = false }: { title: string; asks: string[]; onInk?: boolean }) {
  return (
    <aside
      className={`${styles.toFill} ${onInk ? styles.toFillOnInk : ""}`}
      aria-label={`For the office to fill: ${title}`}
    >
      <p className={styles.toFillTag}>For the office to fill · only on the preview</p>
      <p className={styles.toFillTitle}>{title}</p>
      <ul>
        {asks.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
    </aside>
  );
}
