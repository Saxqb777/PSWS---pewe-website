import { cookies } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { GATE_COOKIE, expectedDigest, digestsMatch } from "@/lib/gate";

/** True when this visitor has entered the members' password. */
export async function isUnlocked(): Promise<boolean> {
  const jar = await cookies();
  return digestsMatch(jar.get(GATE_COOKIE)?.value ?? "", await expectedDigest());
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const unlocked = await isUnlocked();
  return (
    <>
      <SiteHeader unlocked={unlocked} />
      <main>{children}</main>
      <SiteFooter unlocked={unlocked} />
    </>
  );
}
