import { notFound } from "next/navigation";
import { MomSheet } from "../sheet";
import { HI } from "../content";

export const metadata = { robots: { index: false, follow: false } };

export default function MomHinglish() {
  if (!process.env.ALLOW_INTERNAL_DOCS) notFound();
  return <MomSheet c={HI} />;
}
