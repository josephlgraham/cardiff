(function () {
  "use strict";

  var MANIFEST_HREF = "manifest.webmanifest";
  var SERVICE_WORKER_HREF = "cardiff-sw.js";
  var PREFS_KEY = "cardiff-alert-preferences";
  var installPromptEvent = null;

  function ensureHeadTag(tagName, attrs) {
    var selector = tagName;
    if (attrs.rel) selector += '[rel="' + attrs.rel + '"]';
    if (attrs.name) selector += '[name="' + attrs.name + '"]';
    if (attrs.id) selector += "#" + attrs.id;
    var el = document.head.querySelector(selector);
    if (!el) {
      el = document.createElement(tagName);
      document.head.appendChild(el);
    }
    Object.keys(attrs).forEach(function (key) {
      el.setAttribute(key, attrs[key]);
    });
    return el;
  }

  function injectAppHead() {
    ensureHeadTag("link", { rel: "manifest", href: MANIFEST_HREF });
    ensureHeadTag("meta", { name: "theme-color", content: "#3d2810" });
    ensureHeadTag("meta", { name: "apple-mobile-web-app-capable", content: "yes" });
    ensureHeadTag("meta", { name: "apple-mobile-web-app-title", content: "Cardiff" });
    ensureHeadTag("meta", { name: "mobile-web-app-capable", content: "yes" });
  }

  function readPrefs() {
    try {
      var raw = localStorage.getItem(PREFS_KEY);
      return raw ? JSON.parse(raw) : {
        weather: true,
        creek: true,
        civic: false,
        calendar: false
      };
    } catch (error) {
      return {
        weather: true,
        creek: true,
        civic: false,
        calendar: false
      };
    }
  }

  function writePrefs(prefs) {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (error) {
      // Ignore storage misses.
    }
  }

  function isStandaloneMode() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function buildDesk() {
    return (
      '<section class="cardiff-app-desk reveal" id="cardiffAppDesk" data-kicker="App desk">' +
        '<div class="cardiff-app-row">' +
          '<div>' +
            '<div class="cardiff-app-title">📱 A calm app shell is waking up.</div>' +
            '<p class="cardiff-app-copy" id="cardiffAppCopy">Install later if you want a cleaner home-screen version. Notification preferences can be saved now without tripping a browser permission prompt.</p>' +
          '</div>' +
          '<div class="cardiff-app-actions">' +
            '<button class="icon-btn" id="cardiffInstallBtn" type="button" hidden>Install Cardiff</button>' +
            '<button class="icon-btn" id="cardiffAlertPrefsBtn" type="button">Alert settings</button>' +
          '</div>' +
        '</div>' +
        '<div class="cardiff-app-panel" id="cardiffAlertPrefsPanel" hidden>' +
          '<div class="cardiff-app-panel-title">🔔 Pick the alerts that would matter.</div>' +
          '<p class="cardiff-app-panel-copy">This only saves your preferences on this device for now. We will not ask for browser notification permission until live push is actually ready.</p>' +
          '<div class="cardiff-app-options">' +
            '<label class="cardiff-app-option"><input type="checkbox" data-alert-pref="weather"> <span>Weather and lightning</span></label>' +
            '<label class="cardiff-app-option"><input type="checkbox" data-alert-pref="creek"> <span>Creek and flood read</span></label>' +
            '<label class="cardiff-app-option"><input type="checkbox" data-alert-pref="civic"> <span>Civic notices</span></label>' +
            '<label class="cardiff-app-option"><input type="checkbox" data-alert-pref="calendar"> <span>Calendar and community dates</span></label>' +
          '</div>' +
          '<div class="cardiff-app-status" id="cardiffAlertPrefsStatus">Saved on this device only.</div>' +
        '</div>' +
      '</section>'
    );
  }

  function injectDesk() {
    if (document.getElementById("cardiffAppDesk")) return;
    var footer = document.getElementById("cardiff-site-footer");
    var page = document.querySelector(".page");
    var target = footer || page;
    if (!target) return;
    if (footer) {
      footer.insertAdjacentHTML("beforebegin", buildDesk());
    } else {
      target.insertAdjacentHTML("beforeend", buildDesk());
    }
  }

  function syncPrefsUI() {
    var prefs = readPrefs();
    document.querySelectorAll("[data-alert-pref]").forEach(function (input) {
      input.checked = !!prefs[input.getAttribute("data-alert-pref")];
    });
  }

  function refreshInstallButton() {
    var installBtn = document.getElementById("cardiffInstallBtn");
    var copy = document.getElementById("cardiffAppCopy");
    if (!installBtn || !copy) return;

    if (isStandaloneMode()) {
      installBtn.hidden = true;
      copy.textContent = "Cardiff is already running in its app shell on this device. Alert preferences can stay quiet until live push is ready.";
      return;
    }

    if (installPromptEvent) {
      installBtn.hidden = false;
      copy.textContent = "Install whenever you want a cleaner home-screen version. Notification preferences can be saved now without tripping a browser permission prompt.";
      return;
    }

    installBtn.hidden = true;
    copy.textContent = "This site is getting its app shell in place. Install will show up quietly on supported devices when the browser is ready.";
  }

  function wireDesk() {
    var prefsPanel = document.getElementById("cardiffAlertPrefsPanel");
    var prefsBtn = document.getElementById("cardiffAlertPrefsBtn");
    var installBtn = document.getElementById("cardiffInstallBtn");
    var prefsStatus = document.getElementById("cardiffAlertPrefsStatus");
    if (!prefsPanel || !prefsBtn || !installBtn || !prefsStatus) return;

    syncPrefsUI();
    refreshInstallButton();

    prefsBtn.addEventListener("click", function () {
      prefsPanel.hidden = !prefsPanel.hidden;
      if (!prefsPanel.hidden) {
        syncPrefsUI();
      }
    });

    document.querySelectorAll("[data-alert-pref]").forEach(function (input) {
      input.addEventListener("change", function () {
        var prefs = readPrefs();
        prefs[input.getAttribute("data-alert-pref")] = input.checked;
        writePrefs(prefs);
        prefsStatus.textContent = "Saved on this device. We will ask for real notification permission later, only if you choose it.";
      });
    });

    installBtn.addEventListener("click", async function () {
      if (!installPromptEvent) return;
      installPromptEvent.prompt();
      try {
        await installPromptEvent.userChoice;
      } catch (error) {
        // Ignore prompt misses.
      }
      installPromptEvent = null;
      refreshInstallButton();
    });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", function () {
      navigator.serviceWorker.register(SERVICE_WORKER_HREF).catch(function () {
        // Ignore registration misses.
      });
    });
  }

  function listenForInstallPrompt() {
    window.addEventListener("beforeinstallprompt", function (event) {
      event.preventDefault();
      installPromptEvent = event;
      refreshInstallButton();
    });

    window.addEventListener("appinstalled", function () {
      installPromptEvent = null;
      refreshInstallButton();
    });
  }

  function bootAppLayer() {
    injectAppHead();
    injectDesk();
    wireDesk();
    registerServiceWorker();
    listenForInstallPrompt();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootAppLayer);
  } else {
    bootAppLayer();
  }
})();
