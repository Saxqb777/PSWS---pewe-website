import { ErpShell } from "@/components/erp/shell";

export const metadata = { title: "Office" };

export default function ErpLayout({ children }: { children: React.ReactNode }) {
  return <ErpShell>{children}</ErpShell>;
}
