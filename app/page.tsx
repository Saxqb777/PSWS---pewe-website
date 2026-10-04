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

const DESCRIPTION =
  "Pewe Social Welfare Society, the public trust of Village Pewe, Taluka Guhagar, District Ratnagiri: water, roads, Zakat and help for families, shown on a living 3D model of the village.";

export async function generateMetadata(): Promise<Metadata> {
  // what a link shows when it is shared on WhatsApp: a picture of the village, well under 300 KB
  const image = { url: "/og-pewe.jpg", width: 1200, height: 630, alt: "Pewe on the Vashishti creek, in 3D" };
  return {
    title: { absolute: `Pewe · ${SOCIETY.name}` },
    description: DESCRIPTION,
    openGraph: { type: "website", siteName: SOCIETY.name, title: `Pewe · ${SOCIETY.name}`, description: DESCRIPTION, images: [image] },
    twitter: { card: "summary_large_image", title: `Pewe · ${SOCIETY.name}`, description: DESCRIPTION, images: [image.url] },
    // stays out of search engines until the committee opens it
    robots: isPublicLaunch() ? undefined : { index: false, follow: false },
  };
}

/** Tells search engines and AI assistants plainly what the Society is. Only once the site is public. */
function Structured() {
  const data = {
    "@context": "https://schema.org",
    "@type": "NGO",
    name: SOCIETY.name,
    alternateName: [SOCIETY.shortName, SOCIETY.nameMarathi],
    foundingDate: String(SOCIETY.foundedYear),
    telephone: SOCIETY.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: SOCIETY.address.line1,
      addressLocality: "Pewe, Taluka Guhagar",
      addressRegion: SOCIETY.address.state,
      addressCountry: "IN",
    },
    identifier: [
      { "@type": "PropertyValue", name: "Public Trust Registration", value: SOCIETY.registrationNo },
      { "@type": "PropertyValue", name: "Society Registration", value: SOCIETY.societyRegNo },
    ],
    areaServed: "Pewe, Guhagar, Ratnagiri, Maharashtra",
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
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
  return (
    <>
      {isPublicLaunch() && <Structured />}
      {/* until launch, the page also lists what the office still has to fill in */}
      <PeweExperience initialPlace={initial} draft={!isPublicLaunch()} />
    </>
  );
}
