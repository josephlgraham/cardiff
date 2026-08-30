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
      { href: 'fivemile-discharges.html', label: 'What goes in' },
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


  // ─── READING THE FORECAST ──────────────────────────────────────
  // One weather file, read on the homepage, the news page, and the almanac.
  // The rules for reading it live here so those three can never drift apart,
  // which they had: three sky-word tables, three ideas of what a day was
  // called, and only two pages that dropped a period once it had been and
  // gone. See DECISIONS.md 44.
  //
  // Marks are emoji because the reader's phone already has them, they carry a
  // sky condition faster than any word, and there is nothing to draw or load.
  // The mark is never the only place a reading appears: the cell around it
  // always states the temperature.
  var WX_MARKS = {
    sun: '\u2600\uFE0F', part: '\u26C5', cloud: '\u2601\uFE0F', rain: '\uD83C\uDF27\uFE0F',
    storm: '\u26C8\uFE0F', snow: '\uD83C\uDF28\uFE0F', fog: '\uD83C\uDF2B\uFE0F'
  };
  var WX_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Open-Meteo hands back a numbered code where the weather service hands back
  // a sentence. Both land on the same seven marks.
  var WX_CODES = [
    { max: 0,  key: 'sun',   word: 'Clear' },
    { max: 2,  key: 'part',  word: 'Partly cloudy' },
    { max: 3,  key: 'cloud', word: 'Overcast' },
    { max: 48, key: 'fog',   word: 'Fog' },
    { max: 57, key: 'rain',  word: 'Drizzle' },
    { max: 67, key: 'rain',  word: 'Rain' },
    { max: 77, key: 'snow',  word: 'Snow' },
    { max: 82, key: 'rain',  word: 'Showers' },
    { max: 86, key: 'snow',  word: 'Snow showers' }
  ];

  function wxEsc(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function wxNum(value) {
    var n = Number(value);
    return Number.isFinite(n) ? n : NaN;
  }

  function wxDate(value) {
    if (!value) return null;
    var d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function wxMarkKey(text) {
    var sky = String(text || '').toLowerCase();
    if (/thunder|tstorm|tornado/.test(sky)) return 'storm';
    if (/snow|sleet|ice|wintry|freezing/.test(sky)) return 'snow';
    if (/rain|shower|drizzle/.test(sky)) return 'rain';
    if (/fog|haze|smoke|mist/.test(sky)) return 'fog';
    if (/partly|mostly sunny|mostly clear/.test(sky)) return 'part';
    if (/sunny|clear/.test(sky)) return 'sun';
    return 'cloud';
  }

  // The bare character, for a slot that already has its own markup.
  function wxMarkChar(text) {
    return WX_MARKS[wxMarkKey(text)];
  }

  // The character wrapped so a screen reader says Sunny rather than reading
  // out the name of the character.
  function wxMark(text) {
    return '<span class="wx-mark" role="img" aria-label="' + wxEsc(text || 'Forecast') + '">' +
      wxMarkChar(text) + '</span>';
  }

  function wxCodeEntry(code) {
    var n = wxNum(code);
    if (!Number.isFinite(n)) return null;
    for (var i = 0; i < WX_CODES.length; i++) {
      if (n <= WX_CODES[i].max) return WX_CODES[i];
    }
    return { max: Infinity, key: 'storm', word: 'Thunderstorms' };
  }

  function wxCodeChar(code) {
    var entry = wxCodeEntry(code);
    return entry ? WX_MARKS[entry.key] : '';
  }

  function wxCodeWord(code) {
    var entry = wxCodeEntry(code);
    return entry ? entry.word : '';
  }

  // The chance of rain, which arrives either as a number or as an object with
  // the number inside it depending on how the file was written.
  function wxPop(period) {
    var p = period && period.probabilityOfPrecipitation;
    return wxNum(p && typeof p === 'object' ? p.value : p);
  }

  // A forecast file that has not refreshed still carries yesterday in it, and
  // yesterday's high is not a forecast. Anything already finished is dropped
  // rather than relabelled, because we would rather show two days than show a
  // day that has been and gone.
  function wxLive(periods, now) {
    var cutoff = (now instanceof Date ? now.getTime() : Date.now());
    return (Array.isArray(periods) ? periods : []).filter(function (p) {
      if (!p || !Number.isFinite(wxNum(p.temperature))) return false;
      var ends = wxDate(p.endTime);
      return !ends || ends.getTime() > cutoff;
    });
  }

  // The weather service ships a name with every period, and a stale file ships
  // a stale name. The label is built from the clock instead. 'short' is three
  // letters for a strip of days, 'slot' says which half of the day it is for a
  // strip that runs day, night, day.
  function wxLabel(period, now, style) {
    var start = wxDate(period && period.startTime);
    var today = (now instanceof Date ? now : new Date());
    if (!start) return String((period && period.name) || '').slice(0, 9);
    var sameDay = start.toDateString() === today.toDateString();
    if (style === 'slot') {
      if (sameDay) return period.isDaytime ? 'Today' : 'Tonight';
      var name = WX_WEEKDAYS[start.getDay()].slice(0, 3);
      return period.isDaytime ? name : name + ' night';
    }
    if (sameDay) return 'Today';
    return WX_WEEKDAYS[start.getDay()].slice(0, 3);
  }

  // One entry per calendar day, built off the live periods: the daylight half
  // carries the high and the sky, the night that follows it carries the low.
  // A day whose daylight has already run out is not the week ahead, so it
  // drops off the front rather than showing with a hole where its high was.
  function wxDays(periods, now) {
    var live = wxLive(periods, now);
    var order = [];
    var byDate = {};
    live.forEach(function (p) {
      var start = wxDate(p.startTime);
      if (!start) return;
      var key = p.isDaytime
        ? start.toDateString()
        : new Date(start.getTime() - 12 * 3600000).toDateString();
      if (!byDate[key]) {
        byDate[key] = { key: key, day: null, night: null, start: start };
        order.push(byDate[key]);
      }
      if (p.isDaytime) {
        if (!byDate[key].day) { byDate[key].day = p; byDate[key].start = start; }
      } else if (!byDate[key].night) {
        byDate[key].night = p;
      }
    });
    return order.filter(function (entry) { return entry.day; });
  }

  window.FivemileWx = {
    marks: WX_MARKS,
    weekdays: WX_WEEKDAYS,
    markKey: wxMarkKey,
    markChar: wxMarkChar,
    mark: wxMark,
    codeChar: wxCodeChar,
    codeWord: wxCodeWord,
    pop: wxPop,
    live: wxLive,
    label: wxLabel,
    days: wxDays
  };



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


// ─────────────────────────────────────────────────────────────────────
//  Year archives
//
//  The weather and creek archives are stored one file per year under a
//  directory, with an index.json naming the years, because a day that closed
//  in March never changes again and rewriting it every night put a fresh copy
//  of the whole record in git history each time. See scripts/lib/year-archive.mjs.
//
//  Pages want the whole record as one object, so this puts it back together.
//  A year that will not load is treated as a gap rather than as an empty
//  archive: better to draw eleven months than none.
// ─────────────────────────────────────────────────────────────────────
(function () {
  function grab(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (response) {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    });
  }

  window.FivemileYearArchive = function (dir) {
    return grab(dir + '/index.json').then(function (index) {
      var years = (index && index.years) || [];
      var out = {};
      Object.keys(index || {}).forEach(function (key) {
        if (key !== 'years') out[key] = index[key];
      });
      if (!years.length) {
        out.days = [];
        return out;
      }
      return Promise.all(years.map(function (entry) {
        return grab(dir + '/' + entry.year + '.json').catch(function () {
          return { days: [] };
        });
      })).then(function (parts) {
        var days = [];
        parts.forEach(function (part) {
          if (part && part.days && part.days.length) days = days.concat(part.days);
        });
        days.sort(function (a, b) {
          return String(a.date).localeCompare(String(b.date));
        });
        out.days = days;
        return out;
      });
    });
  };
})();

// ─────────────────────────────────────────────────────────────────────
//  Share row
//
//  Most people arrive here from a link somebody posted, so the way this site
//  grows is somebody passing a page on.
//
//  It sits under the page intro rather than at the foot. At the foot it was
//  thousands of pixels down on the field guide and never seen, which made it
//  an afterthought in fact as well as in feel. Under the intro is where a
//  newspaper puts it, and where somebody is when they decide to pass a thing
//  on, which is often before they have finished reading it.
//
//  It loads no third party script. The Facebook control is an ordinary link,
//  so Facebook learns nothing about a reader who never clicks it. And it stays
//  off a page that asks it to, which is what data-no-share is for.
// ─────────────────────────────────────────────────────────────────────
(function () {
  'use strict';

  function canonicalUrl() {
    var tag = document.querySelector('link[rel="canonical"]');
    var href = tag && tag.getAttribute('href');
    /* Strip a hash so two people sharing the same page do not post two links. */
    return (href || window.location.href).split('#')[0];
  }

  function shareTitle() {
    var og = document.querySelector('meta[property="og:title"]');
    return (og && og.getAttribute('content')) || document.title || 'FIVEMILE';
  }

  function say(host, words) {
    host.textContent = words;
    window.clearTimeout(host._clear);
    host._clear = window.setTimeout(function () { host.textContent = ''; }, 4000);
  }

  function copyLink(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(url);
    }
    /* Older phones. A hidden field and execCommand is ugly and it works. */
    return new Promise(function (resolve, reject) {
      try {
        var field = document.createElement('textarea');
        field.value = url;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.top = '-1000px';
        document.body.appendChild(field);
        field.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(field);
        ok ? resolve() : reject(new Error('copy refused'));
      } catch (error) { reject(error); }
    });
  }

  /* Icons drawn as inline SVG rather than loaded from anywhere, because a
     share row that fetches its own artwork from a CDN is the tracking this
     site does not do, wearing a different hat.

     They are one colour and take currentColor, so they pick up the ink and
     turn red on hover with the tile instead of sitting in it as a coloured
     blob. A row of brand blues and greens would fight the paper and red the
     rest of the site is built on. */
  var ICONS = {
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>' +
           '<line x1="8.6" y1="10.7" x2="15.4" y2="6.3"/><line x1="8.6" y1="13.3" x2="15.4" y2="17.7"/>',
    link:  '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/>' +
           '<path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    mail:  '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2.5 6.5 12 13l9.5-6.5"/>',
    text:  '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.9 9.9 0 0 1-2.8-.4L3 21l1.4-4.1A8.2 8.2 0 0 1 3 11.5a8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 9 8.4z"/>',
    /* The Facebook mark. If it ever looks a shade off against their brand
       page, replace this one path with the official SVG and nothing else
       changes. */
    facebook: '<path fill="currentColor" stroke="none" d="M15.12 5.32H17V2.14A26.11 26.11 0 0 0 14.26 2C11.54 2 9.68 3.66 9.68 6.7v2.62H6.61v3.56h3.07V22h3.68v-9.12h3.06l.46-3.56h-3.52V7.05c0-1.05.28-1.73 1.76-1.73z"/>'
  };

  function icon(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" ' +
      'fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + ICONS[name] + '</svg>';
  }

  /* `text` is what a screen reader gets. `short` is what fits in a tile at
     375px without wrapping onto a second line and making one tile taller than
     the rest. */
  function control(kind, text, iconName, short) {
    var el = document.createElement(kind);
    el.className = 'fm-share-btn';
    if (kind === 'button') el.type = 'button';
    el.innerHTML = icon(iconName) + '<span class="fm-share-lbl"></span>';
    el.querySelector('.fm-share-lbl').textContent = short || text;
    el.setAttribute('aria-label', text);
    return el;
  }

  function build() {
    var main = document.querySelector('main');
    if (!main) return;
    if (document.body.hasAttribute('data-no-share')) return;
    if (document.querySelector('.fm-share')) return;

    var url = canonicalUrl();
    var title = shareTitle();
    var canSheet = typeof navigator.share === 'function';

    var row = document.createElement('div');
    row.className = 'fm-share';

    var kick = document.createElement('span');
    kick.className = 'fm-share-kick';
    kick.textContent = 'Share';
    row.appendChild(kick);

    var status = document.createElement('span');
    status.className = 'fm-share-said';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    /* The label says what will actually happen. On a phone this opens the
       system sheet; on a laptop there usually is none, so it copies. */
    var first = control('button', canSheet ? 'Share' : 'Copy link', canSheet ? 'share' : 'link', canSheet ? 'Share' : 'Copy');
    first.addEventListener('click', function () {
      if (canSheet) {
        navigator.share({ title: title, url: url }).catch(function (error) {
          /* Closing the sheet is a choice, not a failure. */
          if (error && error.name === 'AbortError') return;
          copyLink(url).then(function () { say(status, 'Link copied.'); })
            .catch(function () { say(status, 'Could not share from this browser.'); });
        });
        return;
      }
      copyLink(url).then(function () { say(status, 'Link copied.'); })
        .catch(function () { say(status, 'Could not copy. The link is in the address bar.'); });
    });
    row.appendChild(first);

    if (canSheet) {
      var copy = control('button', 'Copy link', 'link', 'Copy');
      copy.addEventListener('click', function () {
        copyLink(url).then(function () { say(status, 'Link copied.'); })
          .catch(function () { say(status, 'Could not copy. The link is in the address bar.'); });
      });
      row.appendChild(copy);
    }

    var fb = control('a', 'Facebook', 'facebook');
    fb.href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url);
    fb.target = '_blank';
    fb.rel = 'noopener';
    row.appendChild(fb);

    /* Text and email are plain links to whatever the reader already has open.
       No script, no account, nothing watching. Plenty of people here will pass
       a page on by texting it to one person rather than posting it to
       everybody, and that is worth a button of its own. */
    var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (coarse) {
      var sms = control('a', 'Text', 'text');
      /* iOS wants sms:& and Android wants sms:?. sms:?& is read correctly by
         both, which is the only reason it is written that way. */
      sms.href = 'sms:?&body=' + encodeURIComponent(title + ' ' + url);
      row.appendChild(sms);
    }

    var mail = control('a', 'Email', 'mail');
    mail.href = 'mailto:?subject=' + encodeURIComponent(title) +
      '&body=' + encodeURIComponent(title) + '%0A%0A' + encodeURIComponent(url);
    row.appendChild(mail);

    row.appendChild(status);

    /* Where it goes, in order of preference.

       data-share-in puts the row inside the marked element, at its foot. That
       is the intro panel on every page that opens with one. Under the opening
       paragraph is where somebody decides to pass a page on, and on the five
       almanac desks the row was landing between the panel and the four gauge
       tiles, where a row of small bordered tiles read as a fifth row of
       readings rather than as the end of the intro. Inside the panel and ruled
       off, it is plainly part of the opening.

       data-share-here puts it directly after the marked element instead.
       The calendar and the news page still use it, because what a reader has
       just finished there is a block rather than a panel. index.html used it
       too, under the featured photograph, until the home page grew an opening
       panel of its own and could mark that instead.

       Otherwise it goes after the first section, so it sits under the opening
       block rather than being the first thing a reader meets. That selector
       used to ask for section.top, which the home page does not have, so on
       the home page it fell through and ended up above everything. Asking for
       the first section of any class is what fixes that.

       Prepending is the last resort and should never be reached by a page
       built the way the rest of them are. */
    var inside = main.querySelector('[data-share-in]');
    if (inside) {
      inside.appendChild(row);
      return;
    }
    var anchor = main.querySelector('[data-share-here]');
    if (!anchor) anchor = main.querySelector(':scope > section');
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(row, anchor.nextSibling);
    } else {
      main.insertBefore(row, main.firstChild);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
