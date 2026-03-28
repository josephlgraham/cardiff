# Cardiff PWA and App Roadmap

## Phase 1: Installable Site Shell

- Add a `manifest.webmanifest` with the Cardiff name, theme colors, icon set, and start URL.
- Add a small service worker that caches the site shell and key pages for repeat visits.
- Keep the first version conservative: cache the app shell, current page assets, and the latest local JSON files.
- Make the site installable on phones before we think about app stores.

## Phase 2: Offline-Friendly Local Tools

- Cache the home page, almanac, calendar, guide, and civic pages for spotty-signal use.
- Add an offline fallback page with a plain message instead of a browser error screen.
- Keep weather, alerts, and news clearly marked with their last-updated time so cached data still feels honest.

## Phase 3: Notification Groundwork

- Add a lightweight notification settings screen later with options like:
  - Weather alerts
  - Lightning and storms
  - Civic notices
  - New calendar dates
- Store subscriptions by topic instead of one big all-or-nothing notification switch.
- Keep the message tone human and local, not app-spammy.

## Phase 4: Push Infrastructure

- A static GitHub Pages site can be installable, but real push needs a sender/backend.
- Best future options:
  - Google Apps Script for simple managed sends
  - A small worker or serverless function for more control
- GitHub Actions can help with scheduled digests, but not true instant push on their own.

## Phase 5: Decide on "App" vs PWA

- If the installable PWA feels good, keep it as the main product.
- If you later want app-store presence, wrap the PWA with something like Capacitor.
- Do not build a separate native app unless the PWA hits a real limitation first.

## Recommended Order

1. Finish the live site polish.
2. Add the manifest, icons, and service worker.
3. Make the almanac, calendar, and alerts feel strong as an installable PWA.
4. Add notification preferences.
5. Add push once we choose the backend.
