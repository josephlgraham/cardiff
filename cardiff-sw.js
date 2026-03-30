const CACHE_VERSION = "cardiff-shell-v1";
const OFFLINE_URL = "offline.html";
const SHELL_FILES = [
  "index.html",
  "cardiff-almanac.html",
  "cardiff-calendar.html",
  "cardiff-news.html",
  "cardiff-civic.html",
  "cardiff-guide.html",
  "cardiff-involved.html",
  "cardiff-common.css",
  "cardiff-common.js",
  "cardiff-app.js",
  "favicon.svg",
  "cardiff-app-icon.svg",
  "manifest.webmanifest",
  OFFLINE_URL
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key !== CACHE_VERSION ? caches.delete(key) : Promise.resolve())))
    ).then(() => self.clients.claim())
  );
});

function isLocalGet(request) {
  const url = new URL(request.url);
  return request.method === "GET" && url.origin === self.location.origin;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (!isLocalGet(request)) return;

  const url = new URL(request.url);
  const isJson = url.pathname.endsWith(".json");
  const isNavigate = request.mode === "navigate";
  const isAsset = /\.(?:css|js|svg|png|jpg|jpeg|webp|ico|html)$/.test(url.pathname);

  if (isNavigate) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }

  if (isJson) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  if (isAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
  }
});
