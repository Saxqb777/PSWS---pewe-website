import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { digestsMatch } from "@/lib/gate";
import { PREVIEW_COOKIE, expectedPreviewDigest, isPublicLaunch } from "@/lib/preview";
import { SOCIETY } from "@/lib/site";
import { PeweExperience } from "@/components/pewe/pewe-experience";
import { Holding } from "@/components/pewe/holding";
import { PLACE_BY_ID, type PlaceId } from "@/components/pewe/places";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#eef1ef",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: `Pewe · ${SOCIETY.name}` },
    // stays out of search engines until the committee opens it
    robots: isPublicLaunch() ? undefined : { index: false, follow: false },
  };
}

async function canSeePreview() {
  if (isPublicLaunch()) return true;
  const jar = await cookies();
  const have = jar.get(PREVIEW_COOKIE)?.value ?? "";
  return !!have && digestsMatch(have, await expectedPreviewDigest());
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  if (!(await canSeePreview())) return <Holding />;
  const { p } = await searchParams;
  const initial = p && p in PLACE_BY_ID ? (p as PlaceId) : null;
  return <PeweExperience initialPlace={initial} />;
}
