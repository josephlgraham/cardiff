// ─────────────────────────────────────────────────────────────────────
//  Cardiff Ticker Loader
//  Drop this script into any page. It reads ticker.json and replaces
//  the announce-strip text with active weather alerts (or the default
//  message if none are active). Also updates the news page bulletin.
//
//  Include in HTML:  <script src="cardiff-ticker.js"></script>
//  (place it after the page content, before </body>)
//
//  Expects these elements to exist:
//    .announce-strip-text   — the scrolling ticker text (required)
//    #deskBulletin          — the blue bulletin box on the news page (optional)
//    #deskBulletinBox       — bulletin container, hidden when no alerts (optional)
//
//  Refreshes every 5 minutes automatically.
// ─────────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  var TICKER_URL = 'ticker.json';
  var REFRESH_MS = 5 * 60 * 1000; // 5 minutes
  var DEFAULT_MSG = 'Cardiff news desk · nearby towns · weather and roads · schools · public decisions · daily life around western Jefferson County';

  // ── Severity-based strip color ──
  // When an alert is active, the ticker strip background shifts color
  var STRIP_COLORS = {
    extreme:  '#8b0000',   // dark red — tornado warning, etc.
    severe:   '#C8102E',   // site red — severe thunderstorm, etc.
    moderate: '#b47800',   // amber — watches, advisories
    minor:    '#446b52',   // green — minor advisories
    normal:   ''           // default (uses CSS var)
  };

  function getStripColor(alerts) {
    if (!alerts || !alerts.length) return STRIP_COLORS.normal;
    // Use the most severe alert's severity
    var sev = (alerts[0].severity || '').toLowerCase();
    return STRIP_COLORS[sev] || STRIP_COLORS.moderate;
  }

  function setTickerMotion(stripText, shouldScroll, message) {
    if (!stripText) return;
    if (shouldScroll) {
      var baseSpeed = 32;
      var charRatio = message.length / 100;
      var speed = Math.max(20, Math.round(baseSpeed * charRatio));
      stripText.style.setProperty('animation', 'marquee ' + speed + 's linear infinite', 'important');
      stripText.style.setProperty('padding-left', '100%', 'important');
      stripText.style.setProperty('transform', '', 'important');
      return;
    }
    stripText.style.setProperty('animation', 'none', 'important');
    stripText.style.setProperty('padding-left', '0', 'important');
    stripText.style.setProperty('transform', 'none', 'important');
  }

  function loadTicker() {
    fetch(TICKER_URL, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('ticker.json not found');
        return res.json();
      })
      .then(function (data) {
        applyTicker(data);
      })
      .catch(function () {
        applyTicker({ ticker: '', alerts: [], hasAlerts: false });
      });
  }

  function applyTicker(data) {
    // ── Update the scrolling ticker strip ──
    var stripText = document.querySelector('.announce-strip-text');
    if (stripText) {
      var msg = (data.ticker || DEFAULT_MSG).trim();
      stripText.textContent = data.hasAlerts ? msg : '';
      setTickerMotion(stripText, !!data.hasAlerts, msg);
    }

    // ── Change strip background color for active alerts ──
    var strip = document.querySelector('.announce-strip');
    if (strip) {
      var color = getStripColor(data.alerts);
      if (color && data.hasAlerts) {
        strip.style.background = color;
      } else {
        strip.style.background = ''; // revert to CSS default
      }
    }

    // ── Update the news page bulletin box (if present) ──
    var bulletin = document.getElementById('deskBulletin');
    var bulletinBox = document.getElementById('deskBulletinBox');

    if (bulletin && data.hasAlerts && data.alerts && data.alerts.length) {
      // Build a clean bulletin from the top alert
      var topAlert = data.alerts[0];
      var bulletinText = topAlert.emoji + ' ' + topAlert.headline;
      if (topAlert.endsShort) {
        bulletinText += ' · Through ' + topAlert.endsShort;
      }
      if (topAlert.description) {
        bulletinText += ' — ' + topAlert.description;
      }
      bulletin.textContent = bulletinText;

      // Make sure the bulletin box is visible
      if (bulletinBox) bulletinBox.style.display = '';
    }
  }

  // ── Initial load ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadTicker);
  } else {
    loadTicker();
  }

  // ── Auto-refresh ──
  setInterval(loadTicker, REFRESH_MS);

})();
