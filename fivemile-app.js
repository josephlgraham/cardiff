/**
 * FIVEMILE app layer.
 *
 * Head tags only, plus a service worker registration for any page that loads
 * this without fivemile-pwa.js. The install banner lives in fivemile-pwa.js and
 * is the only place that asks a reader to add the site to their home screen.
 *
 * This file used to build an "app desk" panel offering alert preferences:
 * four checkboxes written to localStorage that nothing ever read, above copy
 * promising live push later. Push needs a server holding VAPID keys, and this
 * site has no backend by design, so the promise could not be kept. The desk
 * and every alert string went with it.
 *
 * No external dependencies.
 */
(function () {
  "use strict";

  var MANIFEST_HREF = "/manifest.json";
  var SERVICE_WORKER_HREF = "/fivemile-sw.js";

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

  /* An iPhone reads these when someone taps Add to Home Screen. Without them
     the icon lands with a browser chrome wrapper and the page's own title
     underneath it. The title has to match short_name in manifest.json, or the
     two names end up on one icon depending on which platform is reading. */
  function injectAppHead() {
    ensureHeadTag("link", { rel: "manifest", href: MANIFEST_HREF });
    ensureHeadTag("meta", { name: "theme-color", content: "#3d2810" });
    ensureHeadTag("meta", { name: "apple-mobile-web-app-capable", content: "yes" });
    ensureHeadTag("meta", {
      name: "apple-mobile-web-app-title",
      content: (window.BRAND && window.BRAND.full) || "Fivemile"
    });
    ensureHeadTag("meta", { name: "mobile-web-app-capable", content: "yes" });
  }

  /* Registering twice is harmless, the browser treats the second call for the
     same URL and scope as a no-op. Kept so a page loading this file without
     fivemile-pwa.js still goes offline capable. */
  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", function () {
      navigator.serviceWorker.register(SERVICE_WORKER_HREF).catch(function () {
        // Ignore registration misses.
      });
    });
  }

  function bootAppLayer() {
    injectAppHead();
    registerServiceWorker();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootAppLayer);
  } else {
    bootAppLayer();
  }
})();
