/**
 * Cardiff, Alabama — PWA bootstrap
 * Registers the service worker, wires up notification polling,
 * and shows a subtle install banner when appropriate.
 * No external dependencies.
 */
(function () {
  'use strict';

  // ── Constants ────────────────────────────────────────────────────────────
  var SW_URL = '/fivemile-sw.js';
  var SW_SCOPE = '/';
  var POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
  var PERIODIC_SYNC_TAG = 'check-ticker';
  var PERIODIC_SYNC_MIN_INTERVAL = 10 * 60 * 1000; // 10 minutes in ms

  // ── State ────────────────────────────────────────────────────────────────
  var _swRegistration = null;
  var _deferredInstallPrompt = null;
  var _bannerEl = null;
  var _pollTimer = null;

  // ── PWA install prompt ───────────────────────────────────────────────────
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    _deferredInstallPrompt = e;
    maybeShowInstallBanner();
  });

  window.addEventListener('appinstalled', function () {
    _deferredInstallPrompt = null;
    removeInstallBanner();
  });

  /** Programmatically trigger the install prompt (exposed globally). */
  window.fivemileInstallPWA = function () {
    if (!_deferredInstallPrompt) return;
    _deferredInstallPrompt.prompt();
    _deferredInstallPrompt.userChoice.then(function () {
      _deferredInstallPrompt = null;
      removeInstallBanner();
    });
  };

  // ── Notification permission ───────────────────────────────────────────────
  /**
   * Call this from a user-gesture handler (button click, etc.).
   * Returns a Promise<NotificationPermission>.
   */
  window.fivemileRequestNotifications = function () {
    if (!('Notification' in window)) {
      return Promise.resolve('denied');
    }
    if (Notification.permission === 'granted') {
      return Promise.resolve('granted');
    }
    return Notification.requestPermission().then(function (perm) {
      if (perm === 'granted') {
        // Trigger an immediate check so the SW bootstraps the stored value
        sendCheckMessage();
      }
      return perm;
    });
  };

  // ── Service worker registration ──────────────────────────────────────────
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register(SW_URL, { scope: SW_SCOPE })
      .then(function (reg) {
        _swRegistration = reg;

        // Register Periodic Sync if supported
        if ('periodicSync' in reg) {
          navigator.permissions
            .query({ name: 'periodic-background-sync' })
            .then(function (status) {
              if (status.state === 'granted') {
                return reg.periodicSync.register(PERIODIC_SYNC_TAG, {
                  minInterval: PERIODIC_SYNC_MIN_INTERVAL,
                });
              }
            })
            .catch(function () { /* API not available */ });
        }

        // Wait until the SW is active, then do an immediate check
        var sw = reg.active || reg.waiting || reg.installing;
        if (sw && sw.state === 'activated') {
          sendCheckMessage();
        } else {
          navigator.serviceWorker.addEventListener('controllerchange', function () {
            sendCheckMessage();
          });
        }

        // Set up periodic polling via setInterval as a reliable fallback
        startPolling();
      })
      .catch(function (err) {
        console.warn('[Cardiff PWA] SW registration failed:', err);
      });
  }

  // ── Messaging ────────────────────────────────────────────────────────────
  function sendCheckMessage() {
    if (!navigator.serviceWorker.controller) return;
    navigator.serviceWorker.controller.postMessage({ type: 'CHECK_TICKER' });
  }

  /* The worker only raises a notification when permission is already granted,
     and nothing on the site asks for it now that the alert desk is gone. So
     polling would fetch ticker.json every ten minutes forever and could never
     produce anything. Left wired for whenever alerts get thought through
     properly, but idle until something grants permission. */
  function startPolling() {
    if (_pollTimer) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    _pollTimer = setInterval(sendCheckMessage, POLL_INTERVAL_MS);
  }

  // ── Install banner ───────────────────────────────────────────────────────
  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }

  /* iPadOS reports itself as a Mac, so the touch point count is what separates
     an iPad from a desktop. This is only used to decide which half of the
     banner to show, never to withhold anything. */
  function isIOS() {
    var ua = navigator.userAgent || '';
    if (/iphone|ipad|ipod/i.test(ua)) return true;
    return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  }

  /* Two ways in, because the platforms differ and the reader should not have
     to care which one they are on.

     Chrome on Android hands us beforeinstallprompt, so a button can open the
     native dialog. Safari has no equivalent API and never will have fired that
     event, so an iPhone gets the same sentence and the two taps that do the
     same job. Naming Apple's menu item is the one bit of interface this site
     spells out, and only because it is Safari's interface and not ours. */
  function maybeShowInstallBanner() {
    if (isStandalone()) return;
    if (_bannerEl) return; // already showing

    var canPrompt = !!_deferredInstallPrompt;
    if (!canPrompt && !isIOS()) return;

    var banner = document.createElement('div');
    banner.id = 'fivemile-install-banner';
    banner.setAttribute('role', 'banner');
    banner.style.cssText = [
      'position:fixed',
      'bottom:0',
      'left:0',
      'right:0',
      'z-index:9999',
      'display:flex',
      'align-items:center',
      'justify-content:space-between',
      'gap:12px',
      'padding:12px 16px',
      'background:#3d2810',
      'border-top:2px solid #C8102E',
      'color:#f5ead8',
      'font-family:var(--sans,"Plus Jakarta Sans",system-ui,sans-serif)',
      'font-size:15px',
      'box-shadow:0 -2px 12px rgba(0,0,0,0.35)',
    ].join(';');

    var text = document.createElement('span');
    // No app, no install, no progressive web anything. The reader is being
    // asked to put an icon on their home screen, so that is what it says.
    text.textContent = 'Add ' + ((window.BRAND && window.BRAND.name) || 'FIVEMILE') +
      ' to your home screen.' +
      (canPrompt ? '' : ' Tap the share button, then Add to Home Screen.');
    text.style.cssText = 'flex:1;line-height:1.4';

    var installBtn = null;
    if (canPrompt) {
      installBtn = document.createElement('button');
      installBtn.textContent = 'Add';
      installBtn.style.cssText = [
        'background:#C8102E',
        'color:#fff',
        'border:none',
        'border-radius:6px',
        'padding:10px 18px',
        'min-height:44px',
        'font:inherit',
        'font-weight:700',
        'cursor:pointer',
        'white-space:nowrap',
        'flex-shrink:0',
      ].join(';');
      installBtn.addEventListener('click', function () {
        window.fivemileInstallPWA();
      });
    }

    var dismissBtn = document.createElement('button');
    dismissBtn.textContent = '✕';
    dismissBtn.setAttribute('aria-label', 'Dismiss');
    dismissBtn.style.cssText = [
      'background:transparent',
      'color:rgba(245,234,216,0.7)',
      'border:none',
      'font-size:20px',
      'line-height:1',
      'cursor:pointer',
      'min-width:44px',
      'min-height:44px',
      'flex-shrink:0',
    ].join(';');
    dismissBtn.addEventListener('click', function () {
      removeInstallBanner();
      // Suppress for this session
      try { sessionStorage.setItem('fivemile-install-dismissed', '1'); } catch (e) {}
    });

    // Don't show again if dismissed this session
    try {
      if (sessionStorage.getItem('fivemile-install-dismissed')) return;
    } catch (e) {}

    banner.appendChild(text);
    if (installBtn) banner.appendChild(installBtn);
    banner.appendChild(dismissBtn);

    document.body.appendChild(banner);
    _bannerEl = banner;
  }

  function removeInstallBanner() {
    if (_bannerEl) {
      _bannerEl.parentNode && _bannerEl.parentNode.removeChild(_bannerEl);
      _bannerEl = null;
    }
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  /* The banner has to be offered on its own as well as from the prompt event,
     because Safari never fires that event and an iPhone would otherwise never
     be told the site can go on a home screen at all. */
  function boot() {
    registerServiceWorker();
    maybeShowInstallBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
