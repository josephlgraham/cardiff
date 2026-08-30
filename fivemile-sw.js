// FIVEMILE service worker.
// Handles caching, offline support, and pinned-message polling.

// Bumped for the FIVEMILE rebrand. Anyone who installed the site to their home
// screen has the old masthead, the old name, and the old CSS cached. Changing
// the manifest does not evict that. Bumping this constant does, because the
// activate handler below deletes every cache that is not this one.
// Bump it again on any change readers must not miss.
// v8 is the rename pass. This worker moved from /sw.js to /fivemile-sw.js and
// every path in the precache list below changed with it, so nothing a
// returning reader has cached is still valid.
// v9 drops the hairline under the masthead identity bar. CSS is served
// cache-first below, so without this bump a reader who already has
// fivemile-common.css keeps the old rule and the pale strip stays put. Any
// future masthead or stylesheet change needs the same treatment.
// v15 rebuilds the heritage page. It has a stylesheet and a script it did not
// have before, and the old page carried every rule it used inline, so without
// this a returning reader gets the new markup and nothing that draws it.
// v16 lays that page out as chapters and puts photographs on it. Same reason
// as v15: the stylesheet and the script both changed shape, and cache-first
// would hand a returning reader one of them and not the other.
// v23 is the nav rebuild: seven tabs in a new order, a stretched masthead
// intro that now plays once a day, and Hills and Hollers shelved and dropped
// from the list below. Every page's markup changed and so did
// fivemile-common.css and fivemile-intro.js. Without this bump a returning
// reader gets the old five-tab nav out of the cache and keeps it.
// v27 rebuilds the calendar. The page dropped its inline styles for
// fivemile-calendar.css and now shares the shell and the card system, its
// script and fivemile-season-data.js both changed shape, and turnings.json
// gained the garden dates. All of those are served cache-first, so without
// this bump a returning reader gets the new markup drawn by the old rules.
// v28 goes with v27 and takes the Cardiff slant out of the copy: the ticker
// default, the field guide, the almanac's weather sentences. All three of those
// are cached, and the ticker default in particular is the first thing a
// returning reader sees. See DECISIONS.md 42.
// v28 also moves fivemile-season-data.js to network-first, which is the fix for
// a returning reader seeing half a calendar. Read the note in the fetch handler
// before touching the routing there. See DECISIONS.md 43.
// v35 simplifies the calendar to one month and opens the dates room. The
// calendar page, its stylesheet, its script, fivemile-cards.css and
// fivemile-archive.js all changed, the engine moved into a new file, and
// fivemile-calendar-archive.html is new. Every one of those is served
// cache-first, so without this bump a returning reader gets a page built for
// the old markup. fivemile-calendar-core.js is code rather than data and stays
// cache-first with the rest of the scripts. See DECISIONS.md 50.
const CACHE_NAME = 'fivemile-v54';
// Renamed with everything else. These are cache keys rather than files, so
// nothing breaks either way, but leaving them would have been the one
// cardiff- string left in the source and the next person to grep would
// reasonably read it as a bug from the rename pass. The activate handler
// clears the old key on its own, and a reader whose stored message goes with
// it gets a silent re-bootstrap rather than a spurious notification.
const STATE_CACHE = 'fivemile-state';
const TICKER_URL = '/ticker.json';
const STATE_KEY = 'fivemile-ticker-state';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/fivemile-calendar.html',
  '/fivemile-civic.html',
  '/fivemile-guide.html',
  '/fivemile-heritage.html',
  // The seven heritage chapters. Same footing as the almanac desks and the
  // archive rooms: a reader who opened one and lost signal should get the
  // chapter rather than the offline card.
  '/fivemile-heritage-before.html',
  '/fivemile-heritage-camps.html',
  '/fivemile-heritage-charters.html',
  '/fivemile-heritage-peak.html',
  '/fivemile-heritage-close.html',
  '/fivemile-heritage-after.html',
  '/fivemile-heritage-back.html',
  '/fivemile-about.html',
  '/fivemile-news.html',
  '/fivemile-announce.html',
  '/fivemile-almanac.html',
  // The four almanac desks. Same footing as the almanac itself: a reader who
  // opened one and lost signal should still get the page rather than the
  // offline card.
  '/fivemile-fishing.html',
  '/fivemile-garden.html',
  '/fivemile-nightsky.html',
  '/fivemile-nature.html',
  '/fivemile-kitchen.html',
  // The archive hub and its five rooms. Same footing as the almanac desks: a
  // reader who opened one and lost signal should get the page rather than the
  // offline card.
  '/fivemile-archive.html',
  '/fivemile-gallery.html',
  '/fivemile-weather-archive.html',
  '/fivemile-creek-archive.html',
  '/fivemile-discharges.html',
  '/fivemile-news-archive.html',
  '/fivemile-calendar-archive.html',
  '/offline.html',
  '/fivemile-common.css',
  '/fivemile-cards.css',
  // The page shell, shared by twenty-one pages. Six pages deliberately do not
  // load it; see DECISIONS.md 40.
  '/fivemile-shell.css',
  '/fivemile-news.css',
  '/fivemile-calendar.css',
  '/fivemile-almanac.css',
  '/fivemile-archive.css',
  '/fivemile-archive.js',
  '/fivemile-heritage.css',
  '/fivemile-guide.css',
  '/fivemile-guide.js',
  // The guide is one page reading one file, so the file has to come with it.
  // The photographs are not precached: there are two hundred of them and the
  // runtime cache picks up the ones a reader actually opens.
  '/fivemile-guide.json',
  '/fivemile-common.js',
  // The calendar and the dates room both read turnings.json through the shared
  // engine, and both pages are precached above, so the file they draw
  // themselves from comes with them. The hub loads the engine too, to count
  // the figures on its fifth panel.
  '/fivemile-calendar.js',
  '/fivemile-calendar-core.js',
  '/fivemile-season-data.js',
  '/turnings.json',
  '/fivemile-almanac-core.js',
  // The sky arithmetic and the block that renders it. Both are wanted by the
  // news page and by two of the almanac desks, and none of them can draw a
  // moonrise or a planet without them.
  '/fivemile-sky.js',
  '/fivemile-skynow.js',
  '/fivemile-heritage.js',
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

  // Data files that are not called .json. There is one, and it is the reason
  // this list exists: fivemile-season-data.js holds the civic calendar, every
  // council meeting on the site, and it changes when the dates change rather
  // than when the code does.
  //
  // Under the extension rules below it was a script, so it was served
  // cache-first while turnings.json beside it was served network-first. That
  // is the worst of both: the calendar drew a fresh copy of one half of its
  // data and a stale copy of the other. It shipped that way, and what a reader
  // saw was Labor Day carrying a note about the Brookside meeting moving, and
  // no Brookside meeting anywhere on the page, because the entry for it was in
  // the half that came out of the cache.
  //
  // A stale council date is the one thing this site cannot serve. See
  // DECISIONS.md 43.
  const DATA_SCRIPTS = ['/fivemile-season-data.js'];

  const isJson = url.pathname.endsWith('.json');
  const isDataScript = DATA_SCRIPTS.indexOf(url.pathname) !== -1;
  const isNavigate = request.mode === 'navigate';
  const isAsset = /\.(?:css|js|svg|png|jpg|jpeg|webp|ico|woff2?|ttf)$/.test(url.pathname);

  // Network-first for JSON, for the data scripts above, and for navigation
  if (isJson || isDataScript || isNavigate) {
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
    tag: 'fivemile-pinned',
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
