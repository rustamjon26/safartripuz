/**
 * SafarTrip service worker — HAND-WRITTEN. Do not regenerate.
 *
 * This file used to be minified next-pwa/workbox output. `next-pwa` is no
 * longer a dependency, so nothing rebuilds it; editing it by hand is now the
 * only way it changes.
 *
 * The rule it exists to enforce: /api/* is NEVER cached. The generated worker
 * ran every same-origin GET /api/* through NetworkFirst with a 24-hour
 * expiration, so a slow or offline network served day-old bookings,
 * availability and payment state as if it were current.
 *
 * Registration status: nothing in the app calls
 * `navigator.serviceWorker.register`, so on a fresh browser this worker is
 * inert. Clients that installed it during an earlier deploy are still
 * controlled by it and will pick this version up on their next update — which
 * is what CACHE_ALLOWLIST purging below is for. Before adding a registration
 * call, re-read this file: the API exclusion has to stay.
 */

const VERSION = "safartrip-v2";
const STATIC_CACHE = `${VERSION}-static`;

/** Everything else — including the old `apis` cache — is deleted on activate. */
const CACHE_ALLOWLIST = [STATIC_CACHE];

/** Immutable, content-hashed or versioned assets only. Never HTML, never API. */
const STATIC_PATH_PREFIXES = ["/_next/static/", "/icons/", "/images/", "/landing/"];
const STATIC_EXTENSIONS = /\.(?:js|css|woff2?|ttf|otf|eot|png|jpe?g|gif|svg|ico|webp|avif|mp3|mp4)$/i;

self.addEventListener("install", () => {
  // No precache manifest: it went stale on every deploy and served chunk URLs
  // that no longer existed.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => !CACHE_ALLOWLIST.includes(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

function isApiRequest(url) {
  return url.pathname === "/api" || url.pathname.startsWith("/api/");
}

function isStaticAsset(url) {
  if (STATIC_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    return true;
  }
  return STATIC_EXTENSIONS.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Deliberately no respondWith: the request never enters the worker's control,
  // so there is no path by which an API response is read from or written to a
  // cache. Everything else here is opt-in.
  if (isApiRequest(url)) return;

  if (!isStaticAsset(url)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      // Opaque and error responses are not worth persisting.
      if (response && response.ok && response.type === "basic") {
        cache.put(request, response.clone());
      }
      return response;
    })(),
  );
});
