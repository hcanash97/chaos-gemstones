/* Chaos service worker — production only.
 * Registration in src/components/site/PwaRegister.tsx skips iframes
 * and Lovable preview hosts. Network-first for everything; falls back
 * to cache, then to /offline.html for navigations.
 */
const CACHE = "chaos-v1";
const APP_SHELL = [
  "/",
  "/marketplace",
  "/vendors",
  "/about",
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        APP_SHELL.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => null),
        ),
      ),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Never cache API or auth traffic.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/~oauth")) return;

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok && fresh.type === "basic") {
          const copy = fresh.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return fresh;
      } catch {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === "navigate") {
          const offline = await caches.match("/offline.html");
          if (offline) return offline;
        }
        return new Response("Offline", { status: 503, statusText: "Offline" });
      }
    })(),
  );
});