import { notFound } from "next/navigation";
import { MomSheet } from "./sheet";
import { EN } from "./content";

export const metadata = { robots: { index: false, follow: false } };

export default function MomEnglish() {
  // Internal document — it names every member of the committee, so it must
  // not be reachable on the public site. Renders only when the flag is set.
  if (!process.env.ALLOW_INTERNAL_DOCS) notFound();
  return <MomSheet c={EN} />;
}
