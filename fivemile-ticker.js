// Cardiff Ticker Loader
// Drop this script into any page. It reads ticker.json and replaces
// the announce-strip text with active alerts or a manual ticker note.
// It can also update the news page bulletin from the top live alert.

(function () {
  'use strict';

  var TICKER_URL = 'ticker.json';
  var REFRESH_MS = 5 * 60 * 1000;
  var DEFAULT_MSG = 'Cardiff news desk · nearby towns · weather and roads · schools · public decisions · daily life around western Jefferson County';

  var STRIP_COLORS = {
    extreme: '#8b0000',
    severe: '#C8102E',
    moderate: '#b47800',
    minor: '#446b52',
    normal: ''
  };

  function getStripColor(alerts) {
    if (!alerts || !alerts.length) return STRIP_COLORS.normal;
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

  function applyTicker(data) {
    var shouldShowTicker = !!(data && (data.hasAlerts || data.showTicker));
    var stripText = document.querySelector('.announce-strip-text');
    if (stripText) {
      var msg = (data.ticker || DEFAULT_MSG).trim();
      stripText.textContent = shouldShowTicker ? msg : '';
      setTickerMotion(stripText, shouldShowTicker, msg);
    }

    var strip = document.querySelector('.announce-strip');
    if (strip) {
      var color = getStripColor(data.alerts);
      strip.style.background = (color && data.hasAlerts) ? color : '';
    }

    var bulletin = document.getElementById('deskBulletin');
    var bulletinBox = document.getElementById('deskBulletinBox');
    if (bulletin && data.hasAlerts && data.alerts && data.alerts.length) {
      var topAlert = data.alerts[0];
      var bulletinText = topAlert.emoji + ' ' + topAlert.headline;
      if (topAlert.endsShort) bulletinText += ' · Through ' + topAlert.endsShort;
      if (topAlert.description) bulletinText += ' — ' + topAlert.description;
      bulletin.textContent = bulletinText;
      if (bulletinBox) bulletinBox.style.display = '';
    }
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
        applyTicker({ ticker: '', alerts: [], hasAlerts: false, showTicker: false });
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadTicker);
  } else {
    loadTicker();
  }

  setInterval(loadTicker, REFRESH_MS);
})();
