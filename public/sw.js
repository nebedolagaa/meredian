// Meredian service worker — app-shell + offline fallback.
// Strategy: network-first for navigations (so dynamic, authed pages stay fresh),
// cache-first for static assets, and an offline fallback page when the network
// is unavailable.

const CACHE = "meredian-v2";
// Runtime cache for recently visited session pages so today's workout can
// still open in a basement gym with no signal.
const PAGES_CACHE = "meredian-pages-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE && k !== PAGES_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Web-push reminders (sent by the send-reminders edge function).
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "Meredian";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url: payload.url || "/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache auth or API traffic.
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/auth")) {
    return;
  }

  // HTML navigations: network-first. Session pages are kept in a runtime
  // cache so an already-opened workout survives losing the connection;
  // everything else falls back to the offline page.
  if (request.mode === "navigate") {
    const isSessionPage = url.pathname.startsWith("/session/");
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (isSessionPage && response.ok) {
            const copy = response.clone();
            caches.open(PAGES_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match(OFFLINE_URL);
        }),
    );
    return;
  }

  // Static assets: cache-first, then network (and cache the result).
  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icon") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});
