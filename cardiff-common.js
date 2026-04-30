// ─────────────────────────────────────────────────────────────────────
//  Cardiff Common — Shared across all pages
//
//  This file handles everything that appears on every page:
//    • Masthead (brand, nav tabs, weather readout)
//    • Ticker strip (with live alert support via ticker.json)
//    • Topo canvas background
//    • Scroll-reveal animations
//    • Active tab highlighting
//
//  SETUP FOR EACH PAGE:
//  1. In <head>, include the common CSS:
//       <link rel="stylesheet" href="cardiff-common.css">
//
//  2. Right after <body>, put these two elements:
//       <canvas id="topo-canvas"></canvas>
//       <div class="page">
//         <div id="cardiff-masthead"></div>
//         <!-- rest of page content -->
//       </div>
//
//  3. Before </body>, include this script:
//       <script src="cardiff-common.js"></script>
//
//  That's it. The masthead, weather, ticker, topo background, and
//  reveal animations are all handled automatically.
//
//  To change the nav links, edit the TABS array below.
//  To change the weather station, edit WX_URL below.
// ─────────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  // ─── NAV TABS ──────────────────────────────────────────────────
  // Edit this list to add, remove, or rename pages.
  // id: used for active-tab detection (matches against the filename)
  // href: the page URL
  // label: what shows in the nav bar

  var TABS = [
    { id: 'home',     href: 'index.html',            label: 'Home' },
    { id: 'news',     href: 'cardiff-news.html',     label: 'News' },
    { id: 'almanac',  href: 'cardiff-almanac.html',  label: 'Almanac' },
    { id: 'calendar', href: 'cardiff-calendar.html', label: 'Calendar' },
    { id: 'guide',    href: 'cardiff-guide.html',    label: 'Field Guide' },
    { id: 'hollers',  href: 'cardiff-hollers.html',  label: 'Hills & Hollers' },
    { id: 'cemetery', href: 'cardiff-cemetery.html',  label: 'Cemetery' },
    { id: 'civic',    href: 'cardiff-civic.html',     label: 'Civic Pathway' },
    { id: 'involved', href: 'cardiff-involved.html',  label: 'Get Involved' }
  ];

  // ─── WEATHER ───────────────────────────────────────────────────
  var WEATHER_URL = 'cardiff-weather.json';
  var WATERSHED_URL = 'cardiff-watershed.json';
  var FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbx90oZdqT77vIQvI_YzCcFX1qLOgqdroVqa_-Jo05SiztJasMgrNMTJ4FdrOWsdzEPHTw/exec';

  // ─── TICKER ────────────────────────────────────────────────────
  var TICKER_URL = 'ticker.json';
  var DEFAULT_TICKER = 'Cardiff news desk \u00b7 nearby towns \u00b7 weather and roads \u00b7 schools \u00b7 public decisions \u00b7 daily life around western Jefferson County';
  var TICKER_REFRESH_MS = 5 * 60 * 1000;

  // Severity-based ticker strip colors
  var STRIP_COLORS = {
    extreme:  '#8b0000',
    severe:   '#C8102E',
    moderate: '#b47800',
    minor:    '#446b52'
  };


  // ─────────────────────────────────────────────────────────────────
  //  MASTHEAD INJECTION
  // ─────────────────────────────────────────────────────────────────

  function detectActiveTab() {
    var page = window.location.pathname.split('/').pop().toLowerCase();
    if (!page || page === 'index.html') return 'home';
    for (var i = 0; i < TABS.length; i++) {
      if (page === TABS[i].href.toLowerCase()) return TABS[i].id;
    }
    // Fallback: check if filename contains a tab id
    for (var j = 0; j < TABS.length; j++) {
      if (page.indexOf(TABS[j].id) !== -1) return TABS[j].id;
    }
    return 'home';
  }

  function buildMasthead() {
    var activeId = detectActiveTab();

    var tabsHtml = TABS.map(function (tab) {
      var cls = tab.id === activeId ? ' class="active"' : '';
      var label = tab.label.replace(/&/g, '&amp;');
      return '<a href="' + tab.href + '" id="tab-' + tab.id + '"' + cls + '>' + label + '</a>';
    }).join('\n    ');

    return '<header class="cardiff-masthead">\n' +
      '  <div class="mh-identity">\n' +
      '    <div class="mh-left-info">Five Mile Creek Watershed<br>Jefferson County, Alabama</div>\n' +
      '    <div class="mh-brand"><a href="index.html" class="mh-brand-link"><div class="mh-brand-name">Cardiff<span class="comma"> &middot; </span>Alabama</div><span class="mh-brand-sub">Incorporated January 1900</span></a></div>\n' +
      '    <div class="mh-right-info"><a href="cardiff-almanac.html#wx-card" class="mh-wx-link"><span class="wx-hi" id="mhTemp">&mdash;&deg;F</span> &nbsp;&middot;&nbsp; <span id="mhCond">&mdash;</span></a><br><span id="mhWind">&mdash;</span><br><span id="mhUpdated" class="mh-updated"></span></div>\n' +
      '    <div class="mh-mobile-pills">\n' +
      '      <a href="cardiff-almanac.html#watershed-card" class="mh-pill" id="mhCreekPill">🌊 Creek</a>\n' +
      '      <a href="cardiff-almanac.html#wx-card" class="mh-pill" id="mhWxPill">🌤\uFE0F &mdash;&deg;F</a>\n' +
      '    </div>\n' +
      '  </div>\n' +
      '  <nav class="mh-tabs">\n' +
      '    ' + tabsHtml + '\n' +
      '  </nav>\n' +
      '  <div class="announce-strip">\n' +
      '    <div class="announce-strip-scroll"><span class="announce-strip-text"></span></div>\n' +
      '  </div>\n' +
      '</header>';
  }

  function injectMasthead() {
    var target = document.getElementById('cardiff-masthead');
    if (!target) return;
    target.outerHTML = buildMasthead();
  }

  function buildFooter() {
    return '<footer class="cardiff-site-footer" id="cardiff-site-footer">' +
      '<div class="cardiff-site-footer-inner">' +
      '<div class="cardiff-site-footer-slogan">100 Years Y2K</div>' +
      '<div class="cardiff-site-footer-copy">Copyright 2026</div>' +
      '</div>' +
      '</footer>';
  }

  function injectFooter() {
    if (document.getElementById('cardiff-site-footer')) return;
    var page = document.querySelector('.page');
    if (!page) return;
    page.insertAdjacentHTML('beforeend', buildFooter());
  }

  function loadAppLayer() {
    if (document.querySelector('script[data-cardiff-app-layer]')) return;
    var script = document.createElement('script');
    script.src = 'cardiff-app.js';
    script.defer = true;
    script.setAttribute('data-cardiff-app-layer', 'true');
    document.head.appendChild(script);
  }

  function submitSiteForm(payload) {
    return new Promise(function (resolve, reject) {
      try {
        var enrichedPayload = Object.assign({
          submissionId: 'msg-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
          pageTitle: document.title || '',
          url: window.location.href || '',
          referrer: document.referrer || ''
        }, payload || {});
        var iframeName = 'cardiff-site-inbox-frame';
        var iframe = document.querySelector('iframe[name="' + iframeName + '"]');
        if (!iframe) {
          iframe = document.createElement('iframe');
          iframe.name = iframeName;
          iframe.title = 'Cardiff site inbox';
          iframe.hidden = true;
          iframe.style.display = 'none';
          document.body.appendChild(iframe);
        }

        // Apps Script web apps are more reliable with a regular form POST
        // than a cross-origin fetch from a static site.
        var form = document.createElement('form');
        form.method = 'POST';
        form.action = FORM_ENDPOINT;
        form.target = iframeName;
        form.acceptCharset = 'UTF-8';
        form.style.display = 'none';

        Object.keys(enrichedPayload).forEach(function (key) {
          var input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = enrichedPayload[key] == null ? '' : String(enrichedPayload[key]);
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
        window.setTimeout(function () {
          form.remove();
          resolve();
        }, 900);
      } catch (err) {
        reject(err);
      }
    });
  }

  function centerActiveTab() {
    var tabs = document.querySelector('.mh-tabs');
    var active = tabs && tabs.querySelector('a.active');
    if (!tabs || !active) return;
    active.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
  }


  // ─────────────────────────────────────────────────────────────────
  //  WEATHER
  // ─────────────────────────────────────────────────────────────────

  function setEl(id, val) {
    var e = document.getElementById(id);
    if (e) e.textContent = val;
  }

  function loadWeather() {
    fetch(WEATHER_URL, { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var current = d && d.current ? d.current : null;
        if (!current) throw new Error('missing current weather');
        var temp = Math.round(Number(current.temp));
        var windSpeed = Math.round(Number(current.windSpeed || 0));
        var windDir = current.windDir || 'Calm';
        var wind = windSpeed + ' mph ' + windDir;
        var cond = current.condition || 'Offline';

        // Seasonal & condition emoji
        var now = new Date(), md = now.getMonth() + 1, dd = now.getDate();
        var wxE;
        if (md === 12 && dd >= 24 && dd <= 26) wxE = '🎄';
        else if (md === 12 && dd === 31) wxE = '🎆';
        else if (md === 1 && dd === 1) wxE = '🥳';
        else if (md === 7 && dd === 4) wxE = '🦅';
        else if (md === 10 && dd === 31) wxE = '🎃';
        else if (md === 11 && dd >= 25 && dd <= 28) wxE = '🦃';
        else if (md === 2 && dd === 14) wxE = '❤️';
        else if (cond === 'Rain') wxE = '🌧️';
        else if (cond === 'Sunny' && temp >= 85) wxE = '🍹';
        else if (cond === 'Sunny' && temp >= 70) wxE = '😎';
        else if (cond === 'Sunny') wxE = '☀️';
        else if (cond === 'Hot') wxE = '🌡️';
        else if (cond === 'Overcast' && temp < 40) wxE = '🧥';
        else if (cond === 'Overcast') wxE = '☁️';
        else if (cond === 'Breezy') wxE = '🌬️';
        else if (cond === 'Cold' && temp < 25) wxE = '🥶';
        else if (cond === 'Cold') wxE = '🧤';
        else if (cond === 'Warm & humid') wxE = '💦';
        else wxE = '🌤️';

        var wE = windSpeed < 5 ? '🍃' : windSpeed < 15 ? '💨' : '🌬️';

        setEl('mhTemp', wxE + ' ' + temp + '°F');
        setEl('mhCond', cond);
        setEl('mhWind', wE + ' ' + wind);
        var obsTime = current.lastUpdated || current.obsTime;
        if (obsTime) {
          var t = new Date(String(obsTime).replace(' ', 'T'));
          var h = t.getHours(), m = t.getMinutes();
          var ap = h >= 12 ? 'PM' : 'AM';
          h = h % 12 || 12;
          setEl('mhUpdated', 'Updated ' + h + ':' + (m < 10 ? '0' : '') + m + ' ' + ap);
        }
        var wxPill = document.getElementById('mhWxPill');
        if (wxPill) wxPill.textContent = wxE + ' ' + temp + '°F · ' + cond;
      })
      .catch(function () {
        setEl('mhTemp', '—');
        setEl('mhCond', 'Offline');
      });
  }


  function creekMoodPill(stage) {
    if (!isFinite(stage)) return { icon: '📡', label: 'Creek' };
    if (stage < 1.5)  return { icon: '🥾', label: 'Low & wadable' };
    if (stage < 2.25) return { icon: '🛶', label: 'Creek level' };
    if (stage < 3.5)  return { icon: '🚣', label: 'Moving fast' };
    return { icon: '🛟', label: 'High water' };
  }

  function loadWatershed() {
    fetch(WATERSHED_URL, { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var gauges = Array.isArray(d.gauges) ? d.gauges : [];
        var lead = null;
        for (var i = 0; i < gauges.length; i++) {
          if (gauges[i].role === 'lead') { lead = gauges[i]; break; }
        }
        if (!lead && gauges.length) lead = gauges[0];
        var stage = lead ? parseFloat(lead.stage_ft) : NaN;
        var mood = creekMoodPill(isFinite(stage) ? stage : NaN);
        var text = isFinite(stage)
          ? mood.icon + ' ' + stage.toFixed(2) + ' ft · ' + mood.label
          : mood.icon + ' ' + mood.label;
        var el = document.getElementById('mhCreekPill');
        if (el) el.textContent = text;
      })
      .catch(function () {
        var el = document.getElementById('mhCreekPill');
        if (el) el.textContent = '🌊 Creek';
      });
  }


  // ─────────────────────────────────────────────────────────────────
  //  TICKER (reads ticker.json for live alerts)
  // ─────────────────────────────────────────────────────────────────

  function getStripColor(alerts) {
    if (!alerts || !alerts.length) return '';
    var sev = (alerts[0].severity || '').toLowerCase();
    return STRIP_COLORS[sev] || STRIP_COLORS.moderate;
  }

  function setTickerMotion(stripText, shouldScroll, message) {
    if (!stripText) return;
    if (shouldScroll) {
      var speed = Math.max(20, Math.round(32 * (message.length / 100)));
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
        if (!res.ok) throw new Error('missing');
        return res.json();
      })
      .then(function (data) {
        var pinnedMsg = (data && data.pinnedMessage) ? data.pinnedMessage.trim() : '';
        if (pinnedMsg && data.pinnedMessageExpires && new Date(data.pinnedMessageExpires) <= new Date()) {
          pinnedMsg = '';
        }
        var shouldShowTicker = !!(data && (data.hasAlerts || data.showTicker || pinnedMsg));

        // Update ticker strip text
        var stripText = document.querySelector('.announce-strip-text');
        if (stripText) {
          var msg;
          if (pinnedMsg && data.hasAlerts) {
            msg = pinnedMsg + '    ·    ' + (data.ticker || '').trim();
          } else if (pinnedMsg) {
            msg = pinnedMsg;
          } else {
            msg = (data.ticker || DEFAULT_TICKER).trim();
          }
          stripText.textContent = shouldShowTicker ? msg : '';
          setTickerMotion(stripText, shouldShowTicker, msg);
        }

        // Change strip color for active alerts
        var strip = document.querySelector('.announce-strip');
        if (strip) {
          var color = getStripColor(data.alerts);
          strip.style.background = (color && data.hasAlerts) ? color : '';
        }

        // Update news page bulletin box if present
        var bulletin = document.getElementById('deskBulletin');
        var bulletinBox = document.getElementById('deskBulletinBox');
        var topWatch = document.getElementById('top-watch');
        if (bulletin && data.hasAlerts && data.alerts && data.alerts.length) {
          var top = data.alerts[0];
          var text = top.emoji + ' ' + top.headline;
          if (top.endsShort) text += ' \u00b7 Through ' + top.endsShort;
          if (top.description) text += ' \u2014 ' + top.description;
          bulletin.textContent = text;
          if (bulletinBox) bulletinBox.style.display = '';
          if (topWatch) topWatch.style.display = '';
        }
      })
      .catch(function () {
        var stripText = document.querySelector('.announce-strip-text');
        if (stripText) {
          stripText.textContent = '';
          setTickerMotion(stripText, false, '');
        }
      });
  }


  // ─────────────────────────────────────────────────────────────────
  //  TOPO CANVAS BACKGROUND
  // ─────────────────────────────────────────────────────────────────

  function initTopo() {
    var canvas = document.getElementById('topo-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W, H, lines = [], frame = 0;

    function build() {
      lines = [];
      for (var i = 0; i < 30; i++) {
        var bY = (H / 29) * i, pts = [];
        for (var s = 0; s <= 26; s++) {
          pts.push([
            (W / 26) * s,
            bY + Math.sin(s * 0.41 + i * 0.63) * 15 +
                Math.sin(s * 0.18 + i * 1.1) * 30 +
                Math.sin(s * 0.07 + i * 0.35) * 46 +
                Math.cos(s * 0.55 + i * 0.82) * 11
          ]);
        }
        var idx = i % 5 === 0;
        lines.push({
          pts: pts,
          color: idx ? 'rgba(80,44,8,0.11)' : 'rgba(80,44,8,0.052)',
          w: idx ? 1.2 : 0.6,
          ph: Math.random() * Math.PI * 2,
          sp: 0.0004 + Math.random() * 0.0004
        });
      }
      // Five Mile Creek line
      var ck = [];
      for (var s2 = 0; s2 <= 52; s2++) {
        ck.push([
          (W / 52) * s2,
          H * 0.72 + Math.sin(s2 * 0.22) * 58 + Math.sin(s2 * 0.13) * 88 + Math.cos(s2 * 0.35) * 26
        ]);
      }
      lines.push({
        pts: ck,
        color: 'rgba(150,40,20,0.11)',
        w: 2.4,
        ph: 0,
        sp: 0.00025,
        dash: [8, 10]
      });
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      lines.forEach(function (l) {
        ctx.beginPath();
        ctx.strokeStyle = l.color;
        ctx.lineWidth = l.w;
        ctx.setLineDash(l.dash || []);
        var t = frame * l.sp + l.ph;
        l.pts.forEach(function (p, i) {
          var dy = p[1] +
            Math.sin(t + i * 0.28) * 2.8 +
            Math.sin(t * 1.7 + i * 0.14) * 1.2 +
            Math.cos(t * 0.8 + i * 0.42) * 1.6;
          if (i === 0) ctx.moveTo(p[0], dy);
          else ctx.lineTo(p[0], dy);
        });
        ctx.stroke();
      });
      ctx.setLineDash([]);
      frame++;
      requestAnimationFrame(draw);
    }

    function resize() {
      W = canvas.width = innerWidth;
      H = canvas.height = innerHeight;
      build();
    }

    window.addEventListener('resize', resize);
    resize();
    draw();
  }


  // ─────────────────────────────────────────────────────────────────
  //  SCROLL REVEAL
  // ─────────────────────────────────────────────────────────────────

  function initReveals() {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (entry.isIntersecting) {
          setTimeout(function () { entry.target.classList.add('visible'); }, i * 70);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(function (el) {
      observer.observe(el);
    });
  }


  // ─────────────────────────────────────────────────────────────────
  //  BOOT
  // ─────────────────────────────────────────────────────────────────

  function boot() {
    injectMasthead();
    injectFooter();
    loadAppLayer();
    centerActiveTab();
    window.CardiffSite = window.CardiffSite || {};
    window.CardiffSite.submitForm = submitSiteForm;
    initTopo();
    loadWeather();
    setInterval(loadWeather, 5 * 60 * 1000);
    loadWatershed();
    setInterval(loadWatershed, 10 * 60 * 1000);
    loadTicker();
    setInterval(loadTicker, TICKER_REFRESH_MS);
    initReveals();
    window.addEventListener('resize', centerActiveTab);
    window.addEventListener('load', centerActiveTab);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
