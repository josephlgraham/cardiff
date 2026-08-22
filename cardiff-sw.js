// Tombstone. Not a working service worker.
//
// This file exists so a phone that installed the site under an older path
// lets go of it. The live worker is /fivemile-sw.js. Do not delete this and
// do not add anything to it. See DECISIONS.md 10.
//
// It takes over immediately, drops every cache it can see, unregisters
// itself, and reloads any open window so the reader lands on the current
// site rather than a year old copy of it.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch (e) { /* nothing cached, nothing to clear */ }

    await self.registration.unregister();

    const windows = await self.clients.matchAll({ type: 'window' });
    windows.forEach((client) => {
      // navigate() is not available everywhere, so fall back to a message the
      // page can ignore safely.
      if (typeof client.navigate === 'function') {
        client.navigate(client.url).catch(() => {});
      }
    });
  })());
});

// Never answer a fetch. Everything goes to the network, which is the current
// site, so a reader is never served a stale page out of a dead worker.
