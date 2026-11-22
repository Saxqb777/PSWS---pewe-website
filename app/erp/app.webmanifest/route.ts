/**
 * What a phone needs to keep My PSWS on its home screen as an app: it opens
 * straight to the member's own page, full screen, with the PSWS icon.
 */
export function GET() {
  return Response.json(
    {
      id: "/erp/me",
      name: "My PSWS",
      short_name: "PSWS",
      description: "Pewe Social Welfare Society: your card, passbook, asks and notices.",
      start_url: "/erp/me",
      scope: "/erp/",
      display: "standalone",
      orientation: "portrait",
      background_color: "#eef1ef",
      theme_color: "#1f4d35",
      icons: [
        { src: "/erp/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/erp/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "/erp/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } },
  );
}
