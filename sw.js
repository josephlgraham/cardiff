// FIVEMILE service worker.
// Handles caching, offline support, and pinned-message polling.

// Bumped for the FIVEMILE rebrand. Anyone who installed the site to their home
// screen has the old masthead, the old name, and the old CSS cached. Changing
// the manifest does not evict that. Bumping this constant does, because the
// activate handler below deletes every cache that is not this one.
// Bump it again on any change readers must not miss.
const CACHE_NAME = 'fivemile-v7';
const STATE_CACHE = 'cardiff-state';
const TICKER_URL = '/ticker.json';
const STATE_KEY = 'cardiff-ticker-state';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/cardiff-calendar.html',
  '/cardiff-civic.html',
  '/cardiff-guide.html',
  '/cardiff-hollers.html',
  '/cardiff-cemetery.html',
  '/cardiff-involved.html',
  '/cardiff-news.html',
  '/cardiff-announce.html',
  '/cardiff-almanac.html',
  '/cardiff-kitchen.html',
  '/fivemile-gallery.html',
  '/offline.html',
  '/cardiff-common.css',
  '/fivemile-cards.css',
  '/fivemile-news.css',
  '/cardiff-common.js',
  '/fivemile-brand.js',
  '/fivemile-intro.js',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  // Precached because the notification above uses it, and a notification that
  // fires while the phone is offline still has to find its icon.
  '/icons/icon-192.png',
];

// ── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll fails hard on any error; use individual adds so missing files
      // don't block install
      return Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch(() => { /* ignore missing optional assets */ })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate ───────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== STATE_CACHE) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Only handle same-origin or the ticker URL
  if (url.origin !== self.location.origin) return;

  const isJson = url.pathname.endsWith('.json');
  const isNavigate = request.mode === 'navigate';
  const isAsset = /\.(?:css|js|svg|png|jpg|jpeg|webp|ico|woff2?|ttf)$/.test(url.pathname);

  // Network-first for JSON (ticker, data files) and navigation
  if (isJson || isNavigate) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) => cached || caches.match('/offline.html')
          )
        )
    );
    return;
  }

  // Cache-first for static assets
  if (isAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
        return cached || networkFetch;
      })
    );
  }
});

// ── Ticker state helpers ───────────────────────────────────────────────────
async function getStoredMessage() {
  try {
    const cache = await caches.open(STATE_CACHE);
    const response = await cache.match(STATE_KEY);
    if (!response) return null;
    const data = await response.json();
    return data.pinnedMessage ?? null;
  } catch {
    return null;
  }
}

async function storeMessage(message) {
  const cache = await caches.open(STATE_CACHE);
  const payload = JSON.stringify({ pinnedMessage: message, updatedAt: Date.now() });
  await cache.put(
    STATE_KEY,
    new Response(payload, { headers: { 'Content-Type': 'application/json' } })
  );
}

// ── Core ticker check ──────────────────────────────────────────────────────
async function checkTicker() {
  let data;
  try {
    const res = await fetch(TICKER_URL, { cache: 'no-store' });
    if (!res.ok) return;
    data = await res.json();
  } catch {
    return; // Network unavailable, silently skip
  }

  const newMessage = (data.pinnedMessage || '').trim();
  const oldMessage = await getStoredMessage();

  // Always store current value so first-run bootstraps silently
  if (oldMessage === null) {
    await storeMessage(newMessage);
    return;
  }

  if (newMessage && newMessage !== oldMessage) {
    await storeMessage(newMessage);
    await showTickerNotification(newMessage);
  }
}

async function showTickerNotification(message) {
  // Check permission before attempting to show
  if (self.Notification && Notification.permission !== 'granted') return;

  // The worker cannot read fivemile-brand.js, so the name is written out here.
  // If the publication is ever renamed again, this is one of the few places a
  // find and replace has to reach.
  // PNG rather than SVG: Android will not render an SVG notification icon.
  await self.registration.showNotification('FIVEMILE', {
    body: message,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'cardiff-pinned',
    renotify: true,
    data: { url: '/' },
    vibrate: [200, 100, 200],
  });
}

// ── Periodic Sync ──────────────────────────────────────────────────────────
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-ticker') {
    event.waitUntil(checkTicker());
  }
});

// ── Message from page ─────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_TICKER') {
    event.waitUntil
      ? event.waitUntil(checkTicker())
      : checkTicker();
  }
});

// ── Notification click ─────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus an existing Cardiff tab if possible
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
