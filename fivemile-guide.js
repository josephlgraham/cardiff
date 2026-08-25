/* ===========================================================================
   fivemile-guide.js

   The field guide. Reads fivemile-guide.json and nothing else.

   The page is a filtered grid with a sheet over it. A species is a URL, so a
   reader who works out what they are looking at can send the entry to somebody
   else, and the phone's back button closes the sheet instead of leaving the
   page. That is the whole reason the history entries below exist.

   Nothing here is scored, stored, or sent anywhere. The quiz keeps a tally for
   as long as it is open and then forgets it.
   =========================================================================== */
(function () {
  'use strict';

  var DATA = null;
  var SPECIES = [];
  var BY_ID = {};
  var view = [];                 // what the grid is currently showing
  var place = 'all';
  var season = 'all';
  var query = '';
  var quiz = null;               // {list, i, score, answered}

  var SEASONS = [
    { k: 'spring', label: 'Spring', months: [2, 3, 4] },
    { k: 'summer', label: 'Summer', months: [5, 6, 7] },
    { k: 'fall', label: 'Fall', months: [8, 9, 10] },
    { k: 'winter', label: 'Winter', months: [11, 0, 1] }
  ];

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function nowSeason() {
    var m = new Date().getMonth();
    for (var i = 0; i < SEASONS.length; i++) {
      if (SEASONS[i].months.indexOf(m) > -1) return SEASONS[i].k;
    }
    return 'summer';
  }

  /* The grid shows a different photograph on a different day rather than the
     same one forever. The day of the year picks it, so it is the same for
     everybody looking on the same day and there is nothing to store. */
  function photoOfTheDay(sp) {
    if (!sp.photos || !sp.photos.length) return null;
    var start = new Date(new Date().getFullYear(), 0, 0);
    var day = Math.floor((new Date() - start) / 86400000);
    return sp.photos[day % sp.photos.length];
  }

  function biomeNames(sp) {
    return (sp.biomes || []).map(function (b) {
      return (DATA.biomes[b] && DATA.biomes[b].name) || b;
    });
  }

  function seasonLabel(sp) {
    var s = sp.seasons || [];
    if (s.length >= 4) return 'All year';
    return s.map(function (k) {
      for (var i = 0; i < SEASONS.length; i++) if (SEASONS[i].k === k) return SEASONS[i].label;
      return k;
    }).join(', ');
  }

  /* The one judgement the guide makes on a reader's behalf, and it is kept to
     four values on purpose. Anything sharper than this would be advice, and a
     web page is not in a position to give it. */
  function fieldUse(sp) {
    var hay = [sp.name, sp.body, sp.otw, (sp.facts || []).map(function (f) { return f.v; }).join(' ')]
      .join(' ').toLowerCase();
    if (/venomous|copperhead|cottonmouth|rattle/.test(hay) && !/not venomous/.test(hay)) {
      return { v: 'Give it room', c: 'high' };
    }
    if (/tick|poison ivy|urushiol|scorpion|sting|wild hog|lethal|deadly|do not eat/.test(hay)) {
      return { v: 'Watch yourself', c: 'mid' };
    }
    if (/not venomous|harmless|leave it alone/.test(hay)) {
      return { v: 'Low risk left alone', c: 'low' };
    }
    return { v: 'Look, do not handle', c: '' };
  }

  function haystack(sp) {
    return [
      sp.name, sp.sci, sp.ctx, sp.body, sp.otw,
      (sp.alias || []).join(' '),
      (sp.facts || []).map(function (f) { return f.l + ' ' + f.v; }).join(' '),
      sp.quiz ? sp.quiz.q : '',
      biomeNames(sp).join(' '),
      (sp.seasons || []).join(' '),
      sp.id.replace(/_/g, ' ')
    ].join(' ').toLowerCase();
  }

  /* ---------------------------------------------------------------------
     FILTERING
     --------------------------------------------------------------------- */
  function applyFilters() {
    var q = query.trim().toLowerCase();
    var terms = q ? q.split(/\s+/) : [];

    view = SPECIES.filter(function (sp) {
      if (place !== 'all' && (sp.biomes || []).indexOf(place) < 0) return false;
      if (season !== 'all' && (sp.seasons || []).indexOf(season) < 0) return false;
      if (!terms.length) return true;
      var hay = sp._hay;
      for (var i = 0; i < terms.length; i++) if (hay.indexOf(terms[i]) < 0) return false;
      return true;
    });

    // A name match beats a match buried in a field note.
    if (terms.length) {
      view.sort(function (a, b) {
        return score(b, terms) - score(a, terms);
      });
    }
    renderGrid();
  }

  /* The name a thing is called outranks the name it is also called, which
     outranks a mention in somebody else's field note. Without the split, a
     search for "snake" puts the dragonfly near the top, because a dragonfly is
     a snake doctor. */
  function score(sp, terms) {
    var name = sp.name.toLowerCase();
    var aliases = (sp.alias || []).map(function (a) { return a.toLowerCase(); });
    var sci = (sp.sci || '').toLowerCase();
    var n = 0;
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      if (name.indexOf(t) === 0) n += 6;
      else if (name.indexOf(t) > -1) n += 5;
      else if (aliases.some(function (a) { return a.indexOf(t) === 0; })) n += 3;
      else if (aliases.some(function (a) { return a.indexOf(t) > -1; })) n += 2;
      else if (sci.indexOf(t) > -1) n += 2;
    }
    return n;
  }

  /* ---------------------------------------------------------------------
     THE GRID
     --------------------------------------------------------------------- */
  function renderGrid() {
    var grid = $('gdGrid');
    var count = $('gdCount');

    count.textContent = view.length === SPECIES.length
      ? SPECIES.length + ' species'
      : view.length + ' of ' + SPECIES.length;

    if (!view.length) {
      grid.innerHTML = '<div class="empty">&mdash;</div>';
      return;
    }

    var here = nowSeason();
    grid.innerHTML = view.map(function (sp) {
      var p = photoOfTheDay(sp);
      var out = (sp.seasons || []).indexOf(here) > -1;
      var shot = p
        ? '<img src="' + esc(p.thumb) + '" alt="' + esc(p.alt) + '" loading="lazy" decoding="async" width="360" height="270">'
        : '<span class="ic" aria-hidden="true">' + esc(sp.icon) + '</span>';
      return '<button class="card-species" type="button" data-id="' + esc(sp.id) + '">'
        + '<span class="sp-shot">' + shot + '</span>'
        + '<span class="sp-bd">'
        + '<span class="sp-name">' + esc(sp.name) + '</span>'
        + '<span class="sp-latin">' + esc(sp.sci) + '</span>'
        + '<span class="sp-where">' + esc(biomeNames(sp).join(' · '))
        + (out ? ' <span class="on">· out now</span>' : '')
        + '</span></span></button>';
    }).join('');
  }

  /* A photograph that will not load falls through to the next one the species
     has, and then to the emoji. Nothing on this page shows a broken image. */
  function wireImageFallback(root) {
    root.addEventListener('error', function (e) {
      var img = e.target;
      if (!img || img.tagName !== 'IMG') return;
      var sp = BY_ID[img.getAttribute('data-sp')];
      var next = Number(img.getAttribute('data-next') || 0);
      var key = img.getAttribute('data-size') === 'full' ? 'src' : 'thumb';
      if (sp && sp.photos && next < sp.photos.length) {
        img.setAttribute('data-next', next + 1);
        img.src = sp.photos[next][key];
        return;
      }
      var holder = img.parentNode;
      if (holder) holder.innerHTML = '<span class="ic" aria-hidden="true">'
        + esc((sp && sp.icon) || '—') + '</span>';
    }, true);
  }

  /* ---------------------------------------------------------------------
     THE CHIPS
     --------------------------------------------------------------------- */
  function chip(kind, key, label, icon, pressed, extra) {
    return '<button class="gd-chip' + (extra ? ' ' + extra : '') + '" type="button"'
      + ' data-kind="' + kind + '" data-key="' + esc(key) + '"'
      + ' aria-pressed="' + (pressed ? 'true' : 'false') + '">'
      + (icon ? '<span class="ic" aria-hidden="true">' + esc(icon) + '</span>' : '')
      + esc(label) + '</button>';
  }

  function renderChips() {
    var here = nowSeason();
    var places = [chip('place', 'all', 'Everywhere', '', place === 'all')];
    Object.keys(DATA.biomes).forEach(function (k) {
      places.push(chip('place', k, DATA.biomes[k].name, DATA.biomes[k].icon, place === k));
    });
    $('gdPlaces').innerHTML = places.join('');

    var seasons = [chip('season', 'all', 'Any time', '', season === 'all')];
    seasons.push(chip('season', here, 'Out now', '', season === here, 'now'));
    SEASONS.forEach(function (s) {
      if (s.k === here) return;
      seasons.push(chip('season', s.k, s.label, '', season === s.k));
    });
    $('gdSeasons').innerHTML = seasons.join('');
  }

  /* ---------------------------------------------------------------------
     THE BIOME PANELS
     --------------------------------------------------------------------- */
  function renderBiomes() {
    $('gdBiomes').innerHTML = Object.keys(DATA.biomes).map(function (k) {
      var b = DATA.biomes[k];
      var n = SPECIES.filter(function (sp) { return (sp.biomes || []).indexOf(k) > -1; }).length;
      return '<div class="card-dept">'
        + '<div class="d-bar"><h3>' + esc(b.name) + '</h3>'
        + '<span class="r gd-bcount">' + n + ' species</span></div>'
        + '<div class="d-body">'
        + '<p>' + esc(b.desc) + '</p>'
        + '<div class="gd-gear"><em>What it asks for</em>' + esc(b.gear) + '</div>'
        + '</div></div>';
    }).join('');
  }

  /* ---------------------------------------------------------------------
     THE SHEET
     --------------------------------------------------------------------- */
  var sheet, sheetBody, sheetTitle;

  function openSheet(html, title) {
    sheetTitle.textContent = title;
    sheetBody.innerHTML = html;
    $('gdSheetIn').scrollTop = 0;
    if (!sheet.open) sheet.showModal();
  }

  function speciesHtml(sp) {
    var photos = sp.photos || [];
    var p = photos[0];
    var idx = view.indexOf(sp);
    var risk = fieldUse(sp);

    var shot = p
      ? '<img src="' + esc(p.src) + '" alt="' + esc(p.alt) + '" data-sp="' + esc(sp.id)
        + '" data-next="1" data-size="full" width="800" height="600">'
      : '<span class="ic" aria-hidden="true">' + esc(sp.icon) + '</span>';

    var html = '<div class="gd-shot" id="gdShot">' + shot + '</div>'
      + '<div class="gd-credit" id="gdCredit">' + creditLine(p) + '</div>';

    if (photos.length > 1) {
      html += '<div class="gd-thumbs" role="group" aria-label="Other photographs">'
        + photos.map(function (ph, i) {
          return '<button class="gd-thumb" type="button" data-photo="' + i + '"'
            + ' aria-pressed="' + (i === 0 ? 'true' : 'false') + '"'
            + ' aria-label="Photograph ' + (i + 1) + ' of ' + photos.length + '">'
            + '<img src="' + esc(ph.thumb) + '" alt="" loading="lazy"></button>';
        }).join('') + '</div>';
    }

    html += '<div class="gd-body">'
      + '<div class="card-check"><span class="b-hole"></span>'
      + '<div class="b-num">No. ' + String(SPECIES.indexOf(sp) + 1).padStart(3, '0') + '</div>'
      + '<h2 class="b-name">' + esc(sp.name) + '</h2>'
      + '<div class="b-latin">' + esc(sp.sci) + '</div>'
      + '<div class="b-tags">' + Object.keys(DATA.biomes).map(function (k) {
        var on = (sp.biomes || []).indexOf(k) > -1;
        return '<span class="b-tag' + (on ? ' on' : '') + '">' + esc(DATA.biomes[k].name) + '</span>';
      }).join('') + '</div>'
      + '<p class="b-line">' + esc(sp.ctx) + '</p>'
      + '<div class="b-foot">' + esc(seasonLabel(sp)) + '</div>'
      + '</div>'

      + '<div class="gd-quick">'
      + '<div><em>Where</em><b>' + esc(biomeNames(sp).join(', ')) + '</b></div>'
      + '<div><em>When</em><b>' + esc(seasonLabel(sp)) + '</b></div>'
      + '<div><em>How often</em><b>' + esc((DATA.rarity[sp.rarity] || DATA.rarity.common).label) + '</b></div>'
      + '<div><em>In the field</em><b class="' + risk.c + '">' + esc(risk.v) + '</b></div>'
      + '</div>';

    if (sp.lookalike) {
      html += '<div class="card-notice"><p class="n-kick">Often confused with</p><p>'
        + esc(sp.lookalike) + '</p></div>';
    }

    html += '<p class="gd-lab">Field note</p><p class="gd-note">' + esc(sp.body) + '</p>';

    if (sp.local) {
      html += '<div class="card-notice info"><p class="n-kick">Along the creek</p><p>'
        + esc(sp.local) + '</p></div>';
    }

    html += '<p class="gd-lab">What to notice</p><div class="gd-facts">'
      + (sp.facts || []).map(function (f) {
        return '<div class="gd-fact"><em>' + esc(f.l) + '</em><p>' + esc(f.v) + '</p></div>';
      }).join('') + '</div>';

    if (sp.otw) {
      html += '<div class="gd-otw"><em>What the old people said</em><p>' + esc(sp.otw) + '</p></div>';
    }

    html += '<div class="gd-out">';
    if (sp.recipe) {
      html += '<a class="gd-btn" href="' + esc(sp.recipe.href) + '">' + esc(sp.recipe.label) + '</a>';
    }
    if (sp.quiz) {
      html += '<button class="gd-btn solid" type="button" data-quiz="' + esc(sp.id) + '">Try the question</button>';
    }
    html += '</div></div>';

    // Carried on the element so the sheet's arrows know where they are.
    sheetPos = idx;
    return html;
  }

  function creditLine(p) {
    if (!p) return 'No photograph yet.';
    var bits = ['<b>' + esc(p.credit) + '</b>'];
    if (p.where) bits.push(esc(p.where));
    if (p.when) bits.push(esc(p.when));
    return bits.join(', ') + '. ' + esc(p.license) + ', via <a href="' + esc(p.url)
      + '" target="_blank" rel="noopener">' + esc(p.source) + '</a>.';
  }

  var sheetPos = -1;
  var current = null;

  function showSpecies(id) {
    var sp = BY_ID[id];
    if (!sp) return;
    current = sp;
    quiz = null;
    openSheet(speciesHtml(sp), sp.name);
    updateArrows();
  }

  function updateArrows() {
    var prev = $('gdPrev'), next = $('gdNext');
    var on = current && !quiz && sheetPos > -1;
    prev.disabled = !on || sheetPos <= 0;
    next.disabled = !on || sheetPos >= view.length - 1;
    prev.hidden = next.hidden = !on;
  }

  function step(by) {
    if (sheetPos < 0) return;
    var to = view[sheetPos + by];
    if (to) go(to.id);
  }

  /* ---------------------------------------------------------------------
     THE QUIZ
     --------------------------------------------------------------------- */
  function shuffled(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function startQuiz(onlyId) {
    var pool = SPECIES.filter(function (s) { return s.quiz; });
    quiz = {
      list: onlyId ? [BY_ID[onlyId]] : shuffled(pool),
      i: 0, score: 0, answered: false, single: !!onlyId
    };
    current = null;
    renderQuiz();
    updateArrows();
  }

  function renderQuiz() {
    var sp = quiz.list[quiz.i];
    var q = sp.quiz;
    var head = quiz.single ? sp.name
      : 'Question ' + (quiz.i + 1) + ' of ' + quiz.list.length;

    var html = '<div class="gd-body">'
      + (quiz.single ? '' : '<p class="gd-score">' + quiz.score + ' right so far</p>')
      + '<p class="gd-lab">' + esc(sp.name) + '</p>'
      + '<p class="gd-q">' + esc(q.q) + '</p>'
      + '<div class="gd-choices">'
      + q.choices.map(function (c, i) {
        return '<button class="gd-choice" type="button" data-answer="' + i + '">' + esc(c) + '</button>';
      }).join('')
      + '</div><div id="gdVerdict"></div></div>';

    openSheet(html, head);
  }

  function answerQuiz(pick) {
    if (quiz.answered) return;
    quiz.answered = true;
    var sp = quiz.list[quiz.i];
    var q = sp.quiz;
    var right = pick === q.correct;
    if (right) quiz.score++;

    var buttons = sheetBody.querySelectorAll('.gd-choice');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].disabled = true;
      if (i === q.correct) buttons[i].setAttribute('data-mark', 'ok');
      else if (i === pick) buttons[i].setAttribute('data-mark', 'no');
    }

    var more = !quiz.single && quiz.i < quiz.list.length - 1;
    $('gdVerdict').innerHTML =
      '<div class="gd-verdict ' + (right ? 'ok' : 'no') + '">' + esc(right ? q.right : q.wrong) + '</div>'
      + '<div class="gd-out" style="margin-top:14px">'
      + '<button class="gd-btn" type="button" data-open="' + esc(sp.id) + '">Read the full entry</button>'
      + (more
        ? '<button class="gd-btn solid" type="button" data-next-q="1">Next question</button>'
        : '<button class="gd-btn solid" type="button" data-quiz-done="1">'
          + (quiz.single ? 'Back to the entry' : 'See how you did') + '</button>')
      + '</div>';
  }

  function nextQuestion() {
    quiz.i++;
    quiz.answered = false;
    renderQuiz();
  }

  function quizDone() {
    if (quiz.single) { go(quiz.list[0].id); return; }
    var n = quiz.list.length;
    openSheet('<div class="gd-body">'
      + '<p class="gd-lab">The whole guide, once through</p>'
      + '<div class="gd-tally">' + quiz.score + ' / ' + n + '</div>'
      + '<p class="gd-note">' + esc(closingLine(quiz.score, n)) + '</p>'
      + '<div class="gd-out">'
      + '<button class="gd-btn solid" type="button" data-quiz-again="1">Run it again</button>'
      + '<button class="gd-btn" type="button" data-close="1">Back to the guide</button>'
      + '</div></div>', 'How you did');
  }

  function closingLine(score, n) {
    var pct = score / n;
    if (pct === 1) return 'Every one. You have been paying attention out there.';
    if (pct >= 0.8) return 'That is a person who walks the creek. The few you missed are worth reading back through.';
    if (pct >= 0.5) return 'A solid half and better. Most of what is left is the kind of thing you learn by seeing it once.';
    return 'The guide is right there and none of this is a test. Read a few entries and come back.';
  }

  /* ---------------------------------------------------------------------
     HISTORY

     Opening a species pushes an entry, so the phone's back gesture closes the
     sheet rather than leaving the page, and the address bar carries something
     worth sending to somebody.
     --------------------------------------------------------------------- */
  function go(id) {
    history.pushState({ gd: id }, '', '#' + id);
    route(id);
  }

  function route(id) {
    if (!id) { if (sheet.open) sheet.close(); current = null; quiz = null; return; }
    if (id === 'quiz') { startQuiz(null); return; }
    showSpecies(id);
  }

  function closeSheet() {
    if (history.state && history.state.gd) history.back();
    else { sheet.close(); location.hash = ''; }
  }

  /* ---------------------------------------------------------------------
     BOOT
     --------------------------------------------------------------------- */
  function boot(data) {
    DATA = data;
    SPECIES = data.species || [];
    SPECIES.forEach(function (sp) {
      sp._hay = haystack(sp);
      BY_ID[sp.id] = sp;
    });

    $('gdStamp').textContent = SPECIES.length + ' species';
    renderChips();
    renderBiomes();
    view = SPECIES.slice();
    renderGrid();

    var hash = (location.hash || '').replace(/^#/, '');
    if (hash && (BY_ID[hash] || hash === 'quiz')) {
      history.replaceState({ gd: hash }, '', '#' + hash);
      route(hash);
    }
  }

  function wire() {
    sheet = $('gdSheet');
    sheetBody = $('gdSheetBody');
    sheetTitle = $('gdSheetTitle');
    wireImageFallback(document.body);

    var search = $('gdSearch'), clear = $('gdClear');
    var timer = null;
    search.addEventListener('input', function () {
      clear.hidden = !search.value;
      clearTimeout(timer);
      timer = setTimeout(function () { query = search.value; applyFilters(); }, 140);
    });
    clear.addEventListener('click', function () {
      search.value = ''; clear.hidden = true; query = ''; applyFilters(); search.focus();
    });

    document.addEventListener('click', function (e) {
      var chipEl = e.target.closest && e.target.closest('.gd-chip');
      if (chipEl) {
        var kind = chipEl.getAttribute('data-kind');
        var key = chipEl.getAttribute('data-key');
        if (kind === 'place') place = (place === key && key !== 'all') ? 'all' : key;
        else season = (season === key && key !== 'all') ? 'all' : key;
        renderChips();
        applyFilters();
        return;
      }

      var card = e.target.closest && e.target.closest('.card-species');
      if (card) { go(card.getAttribute('data-id')); return; }

      if (e.target.closest && e.target.closest('#gdQuizStart')) { go('quiz'); return; }
    });

    $('gdClose').addEventListener('click', closeSheet);
    $('gdPrev').addEventListener('click', function () { step(-1); });
    $('gdNext').addEventListener('click', function () { step(1); });

    // Escape, and a tap on the dark ground outside the sheet.
    sheet.addEventListener('cancel', function (e) { e.preventDefault(); closeSheet(); });
    sheet.addEventListener('click', function (e) { if (e.target === sheet) closeSheet(); });

    sheetBody.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target : null;
      if (!t) return;

      var thumb = t.closest('.gd-thumb');
      if (thumb && current) {
        var i = Number(thumb.getAttribute('data-photo'));
        var p = current.photos[i];
        if (!p) return;
        $('gdShot').innerHTML = '<img src="' + esc(p.src) + '" alt="' + esc(p.alt)
          + '" data-sp="' + esc(current.id) + '" data-next="' + (i + 1) + '" data-size="full">';
        $('gdCredit').innerHTML = creditLine(p);
        var all = sheetBody.querySelectorAll('.gd-thumb');
        for (var j = 0; j < all.length; j++) all[j].setAttribute('aria-pressed', j === i ? 'true' : 'false');
        return;
      }

      var choice = t.closest('.gd-choice');
      if (choice && quiz) { answerQuiz(Number(choice.getAttribute('data-answer'))); return; }
      if (t.closest('[data-next-q]')) { nextQuestion(); return; }
      if (t.closest('[data-quiz-done]')) { quizDone(); return; }
      if (t.closest('[data-quiz-again]')) { startQuiz(null); return; }
      if (t.closest('[data-close]')) { closeSheet(); return; }

      var open = t.closest('[data-open]');
      if (open) { go(open.getAttribute('data-open')); return; }

      var q = t.closest('[data-quiz]');
      if (q) { startQuiz(q.getAttribute('data-quiz')); return; }
    });

    window.addEventListener('popstate', function (e) {
      route(e.state && e.state.gd);
    });
  }

  function start() {
    wire();
    fetch('fivemile-guide.json', { cache: 'no-cache' })
      .then(function (r) { return r.json(); })
      .then(boot)
      .catch(function () {
        $('gdGrid').innerHTML = '<div class="empty">&mdash;</div>';
        $('gdCount').textContent = '—';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
