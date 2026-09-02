import type { Metadata, Viewport } from "next";
import { Newsreader, IBM_Plex_Sans, IBM_Plex_Mono, Tiro_Devanagari_Marathi } from "next/font/google";
import { SOCIETY } from "@/lib/site";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

const tiroMarathi = Tiro_Devanagari_Marathi({
  subsets: ["devanagari", "latin"],
  weight: ["400"],
  variable: "--font-tiro-marathi",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SOCIETY.name} — Pewe, Guhagar, Ratnagiri`,
    template: `%s · ${SOCIETY.shortName}`,
  },
  description:
    "Pewe Social Welfare Society — a registered welfare society of the village of Pewe, Taluka Guhagar, District Ratnagiri. Village projects, Zakat and welfare, and a published account of every rupee.",
};

export const viewport: Viewport = {
  themeColor: "#F4EFE6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${plexSans.variable} ${plexMono.variable} ${tiroMarathi.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
