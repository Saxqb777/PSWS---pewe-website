/**
 * The app's helper on the phone. It keeps nothing: every page still comes
 * fresh from PSWS, so no one's money or name is stored on a phone. It only
 * steps in when there is no signal, with a plain page saying so.
 */
const WORKER = `
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
});
const OFFLINE = \`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>No signal · My PSWS</title><style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#eef1ef;color:#18201d;font:17px/1.5 Georgia,serif;padding:24px;box-sizing:border-box}
main{max-width:340px;text-align:center}b{display:block;font-size:26px;font-weight:500;margin-bottom:8px}
button{margin-top:18px;min-height:46px;padding:0 22px;font:inherit;color:#fff;background:#1f4d35;border:0;border-radius:4px}
</style></head><body><main><b>No signal</b>The phone is not on the internet right now. My PSWS opens again as soon as it is.
<br><button onclick="location.reload()">Try again</button></main></body></html>\`;
`;

export function GET() {
  return new Response(WORKER, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "no-cache",
      "Service-Worker-Allowed": "/erp/",
    },
  });
}
