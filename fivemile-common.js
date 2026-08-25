// ─────────────────────────────────────────────────────────────────────
//  FIVEMILE Common. Shared across all pages.
//
//  This file handles the live elements that appear on every page:
//    • Creek/watershed reading in the masthead
//    • Ticker strip (with live alert support via ticker.json)
//    • Topo canvas background
//    • Scroll-reveal animations
//    • Active tab centering on mobile
//
//  SETUP FOR EACH PAGE:
//  1. Put the static masthead HTML directly in the page body.
//     Mark the current page's tab with class="active".
//
//  2. Before </body>, include this script:
//       <script src="fivemile-common.js"></script>
//
//  Weather, ticker, topo, and reveal animations are handled
//  automatically. The masthead HTML lives statically in each page.
//
//  To change the weather station, edit WX_URL below.
// ─────────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  // ─── WEATHER ───────────────────────────────────────────────────
  var WEATHER_URL = 'fivemile-weather.json';
  var WATERSHED_URL = 'fivemile-watershed.json';

  // ─── TICKER ────────────────────────────────────────────────────
  var TICKER_URL = 'ticker.json';
  var DEFAULT_TICKER = 'FIVEMILE \u00b7 Graysville, Cardiff, Brookside \u00b7 weather and roads \u00b7 the creek \u00b7 schools \u00b7 public decisions \u00b7 daily life around western Jefferson County';
  var TICKER_REFRESH_MS = 5 * 60 * 1000;

  // Severity-based ticker strip colors
  var STRIP_COLORS = {
    extreme:  '#8b0000',
    severe:   '#C8102E',
    moderate: '#b47800',
    minor:    '#446b52'
  };


  // The footer is the site map, grouped the way somebody would look for things
  // rather than the way the top nav is ordered. Four columns, each a heading and
  // a short list. Add a page to the group it belongs in. If a group ever runs
  // past six items it wants splitting, not shrinking. See DECISIONS.md 33.
  var FOOTER_NAV = [
    { label: 'News', items: [
      { href: 'fivemile-news.html',     label: 'News' },
      { href: 'fivemile-calendar.html', label: 'Calendar' },
      // Not in the masthead on purpose. Reachable from here and by direct link.
      { href: 'fivemile-announce.html', label: 'Announcements' }
    ] },
    { label: 'Almanac', items: [
      { href: 'fivemile-almanac.html',  label: 'Almanac' },
      { href: 'fivemile-fishing.html',  label: 'Fishing' },
      { href: 'fivemile-garden.html',   label: 'Garden' },
      { href: 'fivemile-nightsky.html', label: 'Night Sky' },
      { href: 'fivemile-nature.html',   label: 'Nature Watch' }
    ] },
    { label: 'The place', items: [
      { href: 'fivemile-guide.html',    label: 'Field Guide' },
      { href: 'fivemile-heritage.html', label: 'Heritage' },
      { href: 'fivemile-gallery.html',  label: 'Gallery' },
      // The hub. Its other three rooms, the weather log, the creek log, and
      // the story index, are one tap in from here rather than four more rows.
      { href: 'fivemile-archive.html',  label: 'Archive' }
    ] },
    // Hills and Hollers came out of here when it was shelved before launch.
    // The page is still in the repo and still works; nothing links to it.
    // See DECISIONS.md 38.
    { label: 'This site', items: [
      { href: 'index.html',             label: 'Home' },
      { href: 'fivemile-about.html',    label: 'About' }
    ] }
  ];

  // GitHub Pages serves /fivemile-news.html. Some static dev servers, including
  // `npx serve`, strip the extension and serve /cardiff-news. Normalise both to
  // a bare name so the current page is marked either way.
  function pageKey(pathOrHref) {
    var s = String(pathOrHref).split('?')[0].split('#')[0];
    s = s.substring(s.lastIndexOf('/') + 1);
    s = s.replace(/\.html$/, '');
    return s === '' ? 'index' : s;
  }

  function buildFooter() {
    var here = pageKey(window.location.pathname);
    // Each column is a named group. The name is a span rather than a heading, so
    // the footer does not add four entries to every page's heading outline, and
    // the list points at it with aria-labelledby so it is still announced.
    var cols = '';
    for (var i = 0; i < FOOTER_NAV.length; i++) {
      var group = FOOTER_NAV[i];
      var gid = 'fnav-g' + i;
      var links = '';
      for (var j = 0; j < group.items.length; j++) {
        var item = group.items[j];
        var isHere = pageKey(item.href) === here;
        links += '<li><a href="' + item.href + '"' +
          (isHere ? ' aria-current="page"' : '') + '>' + item.label + '</a></li>';
      }
      cols += '<li class="fnav-col">' +
        '<span class="fnav-head" id="' + gid + '">' + group.label + '</span>' +
        '<ul class="fnav-list" aria-labelledby="' + gid + '">' + links + '</ul>' +
        '</li>';
    }

    var brand = (window.BRAND && window.BRAND.full) || 'Fivemile';
    // Current year rather than a hardcoded one, so the footer does not go
    // stale on January 1st.
    var year = new Date().getFullYear();

    return '<footer class="cardiff-site-footer" id="cardiff-site-footer">' +
      '<div class="cardiff-site-footer-inner">' +
      '<nav class="cardiff-site-footer-nav" aria-label="All pages">' +
      '<ul class="fnav-cols">' + cols + '</ul></nav>' +
      '<div class="cardiff-site-footer-copy">Copyright ' + brand + ' ' + year + '</div>' +
      '</div>' +
      '</footer>';
  }
  function injectFooter() {
    if (document.getElementById('cardiff-site-footer')) return;
    // Most pages wrap their content in .page. The guide does not, and a page
    // without a footer is a dead end now that the footer is the site map, so
    // fall back to the body rather than bailing. See DECISIONS.md 34.
    var page = document.querySelector('.page') || document.body;
    if (!page) return;
    page.insertAdjacentHTML('beforeend', buildFooter());
  }

  function loadAppLayer() {
    if (document.querySelector('script[data-cardiff-app-layer]')) return;
    var script = document.createElement('script');
    script.src = 'fivemile-app.js';
    script.defer = true;
    script.setAttribute('data-cardiff-app-layer', 'true');
    document.head.appendChild(script);
  }


  function centerActiveTab() {
    var tabs = document.querySelector('.mh-tabs');
    var active = tabs && tabs.querySelector('a.active');
    if (!tabs || !active) return;
    active.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
  }


  // When a page is opened with a #hash (e.g. the masthead creek link points to
  // fivemile-almanac.html#watershed-card), the browser jumps to the target on
  // load — but our async cards then render and push the target down, leaving the
  // visitor stranded above it. Re-align to the target as the page settles, and
  // bow out the moment the visitor scrolls on their own.
  function honorHashAnchor() {
    var hash = window.location.hash;
    if (!hash || hash.length < 2) return;
    var target;
    try { target = document.getElementById(decodeURIComponent(hash.slice(1))); }
    catch (e) { return; }
    if (!target) return;

    var done = false;
    var ro = null;
    function stop() {
      if (done) return;
      done = true;
      if (ro) ro.disconnect();
      window.removeEventListener('wheel', onUser);
      window.removeEventListener('touchmove', onUser);
      window.removeEventListener('keydown', onKey);
    }
    function onUser() { stop(); }
    function onKey(e) {
      var nav = ['PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'Home', 'End', ' '];
      if (nav.indexOf(e.key) !== -1) stop();
    }
    function realign() { if (!done) target.scrollIntoView(); }

    window.addEventListener('wheel', onUser, { passive: true });
    window.addEventListener('touchmove', onUser, { passive: true });
    window.addEventListener('keydown', onKey);

    if (window.ResizeObserver) {
      ro = new ResizeObserver(realign);
      ro.observe(document.body);
    }
    realign();
    setTimeout(stop, 2500);
  }


  // ─────────────────────────────────────────────────────────────────
  //  WEATHER
  // ─────────────────────────────────────────────────────────────────

  function setEl(id, val) {
    var e = document.getElementById(id);
    if (e) e.textContent = val;
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
        var trend = lead ? (lead.trend || '') : '';
        var mood = creekMoodPill(isFinite(stage) ? stage : NaN);
        var pillText = isFinite(stage)
          ? mood.icon + ' ' + stage.toFixed(2) + ' ft · ' + mood.label
          : mood.icon + ' ' + mood.label;
        var el = document.getElementById('mhCreekPill');
        if (el) el.textContent = pillText;
        // Masthead right panel
        var stageEl = document.getElementById('mhCreekStage');
        if (stageEl) stageEl.textContent = isFinite(stage) ? '🌊 ' + stage.toFixed(2) + ' ft' : '🌊 Creek';
        var condEl = document.getElementById('mhCreekCond');
        if (condEl) condEl.textContent = trend ? (trend.charAt(0).toUpperCase() + trend.slice(1)) : mood.label;
        var srcEl = document.getElementById('mhCreekSrc');
        if (srcEl) srcEl.textContent = lead ? (lead.label || 'Five Mile Creek') : 'Five Mile Creek';
      })
      .catch(function () {
        var el = document.getElementById('mhCreekPill');
        if (el) el.textContent = '🌊 Creek';
        var stageEl = document.getElementById('mhCreekStage');
        if (stageEl) stageEl.textContent = '🌊 Creek';
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
      stripText.style.setProperty('will-change', 'transform');
      stripText.style.setProperty('animation', 'marquee ' + speed + 's linear infinite', 'important');
      stripText.style.setProperty('padding-left', '100%', 'important');
      stripText.style.setProperty('transform', '', 'important');
      return;
    }
    stripText.style.setProperty('will-change', 'auto');
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
  //  ANNOUNCEMENTS (reads announcements.json — single source of truth)
  //
  //  To post or edit a notice, edit announcements.json. Never hand-edit
  //  the HTML. This renderer fills, by element id:
  //    • #announceCurrent / #announcePast  → full notices (announce page)
  //    • #announceCard                      → compact preview (news page)
  //  Notices auto-sort into current vs. past by their date.
  // ─────────────────────────────────────────────────────────────────

  var ANNOUNCEMENTS_URL = 'announcements.json';
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  var WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Parse 'YYYY-MM-DD' as a local date (avoids UTC off-by-one).
  function parseLocalDate(str) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(str || ''));
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }

  function todayStart() {
    var n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }

  function noticeSummary(a) {
    if (a.summary) return a.summary;
    if (Array.isArray(a.body) && a.body.length) return a.body[0];
    return '';
  }

  // Full notice card for the Announcements page.
  function renderNoticeCard(a) {
    var d = parseLocalDate(a.date);
    var month = d ? MONTHS[d.getMonth()] : '';
    var day = d ? d.getDate() : '';
    var year = d ? d.getFullYear() : '';

    var datebox =
      '<div class="notice-datebox">' +
        '<span class="notice-datebox-month">' + escHtml(month) + '</span>' +
        '<span class="notice-datebox-day">' + escHtml(day) + '</span>' +
        '<span class="notice-datebox-year">' + escHtml(year) + '</span>' +
      '</div>';

    var metaItems = '';
    if (a.time) {
      metaItems +=
        '<div class="notice-meta-item"><div class="notice-meta-icon">🕕</div><div>' +
          '<div class="notice-meta-label">Time</div>' +
          '<div class="notice-meta-val">' + escHtml(a.time) + '</div>' +
        '</div></div>';
    }
    if (a.location) {
      metaItems +=
        '<div class="notice-meta-item"><div class="notice-meta-icon">📍</div><div>' +
          '<div class="notice-meta-label">Location</div>' +
          '<div class="notice-meta-val">' + escHtml(a.location) + '</div>' +
        '</div></div>';
    }
    var meta = metaItems ? '<div class="notice-meta">' + metaItems + '</div>' : '';

    var paras = (Array.isArray(a.body) ? a.body : [])
      .map(function (p) { return '<p>' + escHtml(p) + '</p>'; }).join('');

    // Footer: "Posted by X · Weekday, Month D, YYYY at TIME · LOCATION"
    var footerBits = [];
    if (d) {
      footerBits.push(WEEKDAYS[d.getDay()] + ', ' + month + ' ' + day + ', ' + year +
        (a.time ? ' at ' + escHtml(a.time) : ''));
    }
    if (a.location) footerBits.push(escHtml(a.location));
    var footer = 'Posted by ' + escHtml(a.postedBy || 'the FIVEMILE desk') +
      (footerBits.length ? ' · ' + footerBits.join(' · ') : '');

    return '<article class="notice-card reveal">' +
      '<div class="notice-head">' + datebox +
        '<div class="notice-head-text">' +
          '<div class="notice-tag">' + escHtml(a.tag) + '</div>' +
          '<div class="notice-headline">' + escHtml(a.headline) + '</div>' +
        '</div></div>' +
      '<div class="notice-body">' + meta +
        '<div class="notice-desc">' + paras + '</div>' +
      '</div>' +
      '<div class="notice-footer">' + footer + '</div>' +
    '</article>';
  }

  // Compact preview card for the News page (the #announceCard link).
  function renderPreviewCard(el, a) {
    var d = parseLocalDate(a.date);
    var month = d ? MONTHS[d.getMonth()] : '';
    var day = d ? d.getDate() : '';
    var year = d ? d.getFullYear() : '';

    var metaBits = [];
    if (d) metaBits.push(WEEKDAYS_SHORT[d.getDay()] + ', ' + month + ' ' + day);
    if (a.time) metaBits.push(a.time);
    if (a.location) metaBits.push(a.location);

    el.innerHTML =
      '<div class="announce-card-date">' +
        '<span class="announce-card-date-month">' + escHtml(month) + '</span>' +
        '<span class="announce-card-date-day">' + escHtml(day) + '</span>' +
        '<span class="announce-card-date-year">' + escHtml(year) + '</span>' +
      '</div>' +
      '<div class="announce-card-body">' +
        '<div class="announce-card-kicker">Community Board · Current Notice</div>' +
        '<div class="announce-card-title">' + escHtml(a.headline) + '</div>' +
        '<div class="announce-card-meta">' + escHtml(metaBits.join(' · ')) + '</div>' +
        '<div class="announce-card-copy">' + escHtml(noticeSummary(a)) + '</div>' +
      '</div>' +
      '<span class="announce-card-go">Full notice &rarr;</span>';
  }

  function loadAnnouncements() {
    var card = document.getElementById('announceCard');
    var currentBox = document.getElementById('announceCurrent');
    var pastBox = document.getElementById('announcePast');
    if (!card && !currentBox && !pastBox) return; // page has no slots

    fetch(ANNOUNCEMENTS_URL, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('missing'); return r.json(); })
      .then(function (data) {
        var list = (data && Array.isArray(data.announcements)) ? data.announcements.slice() : [];
        var today = todayStart();
        var current = [], past = [];
        list.forEach(function (a) {
          var d = parseLocalDate(a.date);
          if (d && d < today) past.push(a); else current.push(a);
        });
        current.sort(function (x, y) { return (parseLocalDate(x.date) || 0) - (parseLocalDate(y.date) || 0); });
        past.sort(function (x, y) { return (parseLocalDate(y.date) || 0) - (parseLocalDate(x.date) || 0); });

        // News page preview → soonest upcoming (fallback: most recent past).
        if (card) {
          var preview = current[0] || past[0];
          if (preview) { renderPreviewCard(card, preview); card.hidden = false; }
          else card.hidden = true;
        }

        // Announcements page → full current + past lists.
        if (currentBox) {
          currentBox.innerHTML = current.length
            ? current.map(renderNoticeCard).join('')
            : '<div class="archive-note reveal">No current notices. Check back soon.</div>';
        }
        if (pastBox) {
          pastBox.innerHTML = past.length
            ? past.map(renderNoticeCard).join('')
            : '<div class="archive-note reveal">No archived notices yet. Past announcements will appear here.</div>';
        }

        initReveals(); // wire up scroll-reveal for the freshly injected nodes
      })
      .catch(function () {
        // Leave the static fallback in place; just hide nothing extra.
        if (currentBox) currentBox.innerHTML =
          '<div class="archive-note reveal">Notices are temporarily unavailable.</div>';
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
  //  SMOOTH MARQUEE
  // ─────────────────────────────────────────────────────────────────

  function initSmoothMarquee() {
    // Promote the strip to its own compositor layer so the topo canvas
    // repainting at 60fps doesn't interrupt the scrolling text.
    var strip = document.querySelector('.announce-strip');
    if (strip) strip.style.setProperty('transform', 'translateZ(0)');

    // Override the keyframes with translate3d, which forces GPU compositing
    // more reliably than translateX across all browsers.
    if (!document.getElementById('cardiff-marquee-smooth')) {
      var s = document.createElement('style');
      s.id = 'cardiff-marquee-smooth';
      s.textContent = '@keyframes marquee{from{transform:translate3d(0,0,0)}to{transform:translate3d(-100%,0,0)}}';
      document.head.appendChild(s);
    }
  }


  // ─────────────────────────────────────────────────────────────────
  //  GAUGE TICK RAILS
  //
  //  The graduated rail down the left edge of a .card-gauge tile, drawn to
  //  the measured height of each tile so it reads as one piece of metal
  //  rather than a repeating texture.
  //
  //  This lived in index.html until the almanac grew gauge tiles of its own.
  //  Two copies of it would have drifted, so it moved here, which is the file
  //  every page already loads. index.html now calls through to this.
  // ─────────────────────────────────────────────────────────────────

  function drawTicks() {
    var rails = document.querySelectorAll('[data-ticks]');
    for (var i = 0; i < rails.length; i++) {
      var rail = rails[i], host = rail.parentNode;
      if (!host) continue;
      var height = host.offsetHeight || 150;
      var out = '';
      // A tile carrying a date gets a perforated stub instead of a scale. The
      // creek, the temperature and the air quality are all levels read off a
      // graduated rail, which is what those tick marks are drawing. A meeting
      // at ten in the morning is not a level, and a ruler beside it is
      // measuring nothing. Wider spacing than the ticks, because a
      // perforation you could tear along is not a row of graduations.
      if (host.classList.contains('event')) {
        for (var p = 1; p < Math.floor(height / 13); p++) {
          out += '<i style="top:' + (p * 13) + 'px"></i>';
        }
      } else {
        for (var t = 1; t < Math.floor(height / 7); t++) {
          out += '<i class="' + (t % 5 === 0 ? 'maj' : '') + '" style="top:' + (t * 7) + 'px"></i>';
        }
      }
      rail.innerHTML = out;
    }
  }

  window.FivemileDrawTicks = drawTicks;


  // ─────────────────────────────────────────────────────────────────
  //  BOOT
  // ─────────────────────────────────────────────────────────────────

  function boot() {
    injectFooter();
    loadAppLayer();
    centerActiveTab();
    initSmoothMarquee();
    initTopo();
    drawTicks();
    window.addEventListener('resize', drawTicks);
    window.addEventListener('load', drawTicks);
    loadWatershed();
    setInterval(loadWatershed, 10 * 60 * 1000);
    loadTicker();
    setInterval(loadTicker, TICKER_REFRESH_MS);
    loadAnnouncements();
    initReveals();
    honorHashAnchor();
    window.addEventListener('resize', centerActiveTab);
    window.addEventListener('load', centerActiveTab);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
