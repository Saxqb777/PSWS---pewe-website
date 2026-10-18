import type { Metadata, Viewport } from "next";
import styles from "@/components/erp/erp.module.css";

export const metadata: Metadata = {
  title: { default: "PSWS Office", template: "%s · PSWS Office" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#eef1ef" };

/** Everything under /erp: the office, and the pages for signing in to it. */
export default function ErpLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.erp}>{children}</div>;
}
