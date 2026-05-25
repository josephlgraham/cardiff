/**
 * Cardiff, Alabama — PWA bootstrap
 * Registers the service worker, wires up notification polling,
 * and shows a subtle install banner when appropriate.
 * No external dependencies.
 */
(function () {
  'use strict';

  // ── Constants ────────────────────────────────────────────────────────────
  var SW_URL = '/sw.js';
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
  window.cardiffInstallPWA = function () {
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
  window.cardiffRequestNotifications = function () {
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

  function startPolling() {
    if (_pollTimer) return;
    _pollTimer = setInterval(sendCheckMessage, POLL_INTERVAL_MS);
  }

  // ── Install banner ───────────────────────────────────────────────────────
  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }

  function maybeShowInstallBanner() {
    if (isStandalone()) return;
    if (!_deferredInstallPrompt) return;
    if (_bannerEl) return; // already showing

    var banner = document.createElement('div');
    banner.id = 'cardiff-install-banner';
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
      'font-family:system-ui,sans-serif',
      'font-size:14px',
      'box-shadow:0 -2px 12px rgba(0,0,0,0.35)',
    ].join(';');

    var text = document.createElement('span');
    text.textContent = 'Install the Cardiff app for offline access and alerts.';
    text.style.cssText = 'flex:1;line-height:1.4';

    var installBtn = document.createElement('button');
    installBtn.textContent = 'Install';
    installBtn.style.cssText = [
      'background:#C8102E',
      'color:#fff',
      'border:none',
      'border-radius:6px',
      'padding:8px 16px',
      'font-size:13px',
      'font-weight:700',
      'cursor:pointer',
      'white-space:nowrap',
      'flex-shrink:0',
    ].join(';');
    installBtn.addEventListener('click', function () {
      window.cardiffInstallPWA();
    });

    var dismissBtn = document.createElement('button');
    dismissBtn.textContent = '✕';
    dismissBtn.setAttribute('aria-label', 'Dismiss install banner');
    dismissBtn.style.cssText = [
      'background:transparent',
      'color:rgba(245,234,216,0.7)',
      'border:none',
      'font-size:18px',
      'line-height:1',
      'cursor:pointer',
      'padding:4px 8px',
      'flex-shrink:0',
    ].join(';');
    dismissBtn.addEventListener('click', function () {
      removeInstallBanner();
      // Suppress for this session
      try { sessionStorage.setItem('cardiff-install-dismissed', '1'); } catch (e) {}
    });

    // Don't show again if dismissed this session
    try {
      if (sessionStorage.getItem('cardiff-install-dismissed')) return;
    } catch (e) {}

    banner.appendChild(text);
    banner.appendChild(installBtn);
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
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerServiceWorker);
  } else {
    registerServiceWorker();
  }
})();
