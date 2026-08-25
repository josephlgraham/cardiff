/* ===========================================================================
   FIVEMILE heritage core

   Everything the heritage family shares: the file, the town order, the source
   line, the plate, the timeline row, and the navigation between chapters.

   The heritage page used to be one long scroll with seven chapters stacked
   inside it and a prev and next link at the foot of each one. Those links
   promised pages and delivered anchors, which is why the navigation felt
   wrong. It is a family now, the same way the almanac is a family: a hub and
   seven chapter pages, sharing this file and fivemile-heritage.css.

   The rule is the almanac's rule. Anything more than one page needs lives
   here and nowhere else. The hub owns its own rendering and a chapter page
   owns its own, but neither keeps a second copy of how a source line is
   built or how a chapter works out which facts belong to it.

   Two rules this file enforces, and they are the same rule twice:

     a fact renders with the source it came from, or it does not render
     a photograph renders with its credit, or it does not render

   There is no path through this file that puts an unattributed sentence or an
   unattributed picture on a page. A photograph added to the JSON with the
   credit left blank does not appear, which is the check working rather than
   the page breaking. Fill the credit in and it appears.

   Load order on every family page: this file, then the page's own script.
   The topographic background, the ticker strip, the masthead creek reading
   and the footer are all fivemile-common.js. Nothing in here touches them.
   =========================================================================== */
(function (window, document) {
  'use strict';

  var FILE = 'fivemile-heritage.json';
  var HUB = 'fivemile-heritage.html';

  /* Town order is Graysville, Cardiff, Brookside, west to east, and it is
     enforced here rather than trusted from the file. See DECISIONS.md 1 and
     29: the order is the renderer's job, not the data's. */
  var TOWN_ORDER = ['Graysville', 'Cardiff', 'Brookside'];
  var SHARED = 'The watershed';

  /* Where a row sorts when two things happened the same year. The three towns
     keep their west to east order and the watershed comes after them, because
     it is not one of the towns and should not read as though it were. */
  var PLACE_ORDER = TOWN_ORDER.concat([SHARED]);

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = String(s == null ? '' : s);
    return d.innerHTML;
  }
  function byId(id) { return document.getElementById(id); }
  function pad(n) { return n < 10 ? '0' + n : String(n); }

  /* --- the source line ---------------------------------------------------
     Every id on a fact has to resolve to a row in sources. One that does not
     is a typo, and the honest thing is to drop the fact rather than print it
     bare, so this returns null and the caller skips the entry. */
  function sourceLine(ids, sources) {
    var rows = (ids || []).map(function (id) { return sources[id]; })
                          .filter(function (row) { return row && row.url && row.name; });
    if (!rows.length) return null;

    return '<div class="hz-src">' + rows.map(function (row) {
      return '<a href="' + esc(row.url) + '" target="_blank" rel="noopener" title="' +
             esc(row.title || row.name) + '">' + esc(row.name) + '</a>';
    }).join(', ') + '</div>';
  }

  /* --- a plate -----------------------------------------------------------
     No credit, no picture. The caption and the credit are real text under the
     image rather than a title attribute, because a sighted reader has to be
     able to see where a photograph came from too. See DECISIONS.md 18. */
  function renderFigure(image, eager, compact) {
    if (!image || !image.src || !image.credit) return '';
    var credit = image.url
      ? '<a href="' + esc(image.url) + '" target="_blank" rel="noopener">' + esc(image.credit) + '</a>'
      : esc(image.credit);

    /* Compact drops the caption and keeps the credit. That asymmetry is the
       whole point: a caption is editorial and the hub has a blurb doing that
       job three inches to the right, but a credit is owed to whoever took the
       photograph and is never optional anywhere on this site. */
    var caption = compact ? '' : esc(image.caption || '');

    /* crop names where to anchor the hub thumbnail when it is trimmed to the
       common shape. It is ignored everywhere else, because a chapter page
       shows the whole plate and a measured drawing with its corners cut off
       is not a document any more. */
    var crop = compact && image.crop ? ' class="crop-' + esc(image.crop) + '"' : '';

    return '<figure class="ch-fig' + (compact ? ' compact' : '') + '">' +
      '<img' + crop + ' src="' + esc(image.src) + '" alt="' + esc(image.alt || '') + '" ' +
        'loading="' + (eager ? 'eager' : 'lazy') + '" decoding="async">' +
      '<figcaption>' + caption +
        '<span class="fig-credit">' + credit + '</span>' +
      '</figcaption>' +
    '</figure>';
  }

  function platesFor(chapter, images, eager) {
    return (chapter.images || []).map(function (key) {
      return renderFigure(images[key], eager);
    }).filter(Boolean).join('');
  }

  /* The first plate a chapter actually renders, which is what the hub shows
     beside its blurb. A chapter with no plate returns nothing and the hub
     lays that section out without one. */
  function leadPlate(chapter, images) {
    var keys = chapter.images || [];
    for (var i = 0; i < keys.length; i++) {
      var img = images[keys[i]];
      if (img && img.src && img.credit) return img;
    }
    return null;
  }

  /* --- one row in a chapter's timeline -----------------------------------
     The date, then where it happened, then what it was about, then the entry
     itself and the source under it.

     The town badge and the tag are the site's two badges doing the jobs they
     always do: the badge answers where, the tag answers what. See the note at
     the top of fivemile-cards.css. The towns have no colors and never will,
     which is decision 11, so the color on this row comes from the tag and the
     topic it names, never from the town.

     data-topic goes on the row rather than on the tag, and the topic colors in
     fivemile-heritage.css set --accent against it. The tag's bar reads that
     variable through the cascade and the row's left edge reads the same one,
     so a row and its tag cannot end up different colors. A topic nobody has
     given a color still gets the muted brown and still looks deliberate.

     A topic with no label in the file renders the row without a tag rather
     than with a bare key, because a key is not a word. */
  function renderFact(fact, sources, topics) {
    var src = sourceLine(fact.source, sources);
    if (!src) return '';

    var label = (topics || {})[fact.topic];
    var tag = label ? '<span class="tag">' + esc(label) + '</span>' : '';

    return '<li class="hz-row"' + (fact.topic ? ' data-topic="' + esc(fact.topic) + '"' : '') + '>' +
      '<div class="hz-top">' +
        '<span class="hz-when">' + esc(fact.when) + '</span>' +
        '<span class="town-badge">' + esc(fact.town) + '</span>' +
        tag +
      '</div>' +
      '<b class="hz-title">' + esc(fact.title) + '</b>' +
      '<p class="hz-note">' + esc(fact.note) + '</p>' +
      src +
    '</li>';
  }

  /* --- the towns a chapter has nothing for -------------------------------
     The three column layout said this with an em dash under an empty heading.
     One list cannot, because a town that is absent from it simply is not
     there to look at, so the chapter says it in words instead. Only the three
     towns count here. The watershed is not one of them and a chapter without
     it is not a gap in anything. */
  function gapLine(present) {
    var missing = TOWN_ORDER.filter(function (town) { return !present[town]; });
    if (!missing.length || missing.length === TOWN_ORDER.length) return '';
    var names = missing.length === 1
      ? missing[0]
      : missing.slice(0, -1).join(', ') + ' or ' + missing[missing.length - 1];
    return '<p class="hz-gap">Nothing is recorded here for ' + esc(names) +
           ' in these years. If you know something that belongs in it, send it along ' +
           'and it will go in with your name on the source line.</p>';
  }

  /* --- what falls in a chapter -------------------------------------------
     By year, so nothing carries a chapter id and moving a boundary re-files
     every fact on its own.

     Date order first, because the timeline is a chronology and that is the
     whole reason it is a list. Two things in the same year fall back to west
     to east, which keeps the hard rule true in the one place a chronology
     would otherwise decide the order by accident. */
  function factsIn(facts, chapter) {
    return facts.filter(function (f) {
      return f.year >= chapter.from && f.year <= chapter.to;
    }).sort(function (a, b) {
      if (a.year !== b.year) return a.year - b.year;
      return PLACE_ORDER.indexOf(a.town) - PLACE_ORDER.indexOf(b.town);
    });
  }

  /* Render a chapter's whole timeline, and report back which towns turned up
     in it so the caller can print the gap line. */
  function renderTimeline(data, chapter) {
    var present = {};
    var rows = factsIn(data.facts || [], chapter).map(function (f) {
      var row = renderFact(f, data.sources || {}, data.topics || {});
      if (row) present[f.town] = true;
      return row;
    }).filter(Boolean);

    /* The list and the line about what is missing from it are one panel. They
       are the same statement about the record, and a table that floats on the
       paper with nothing behind it reads as unfinished on this site. See the
       note above .hz-panel in the stylesheet. */
    var inner = (rows.length ? '<ol class="hz-list">' + rows.join('') + '</ol>'
                             : '<p class="empty">&mdash;</p>') + gapLine(present);

    return {
      count: rows.length,
      present: present,
      html: '<div class="hz-panel">' + inner + '</div>'
    };
  }

  /* --- moving between chapters -------------------------------------------
     The same three things at the head of a chapter and at its foot: the one
     before, the way back to all seven, and the one after. A reader arriving
     from a link should be able to see where they have landed in the run
     without scrolling to the bottom to find out, and a reader who has just
     finished should not have to scroll back up to leave.

     Two shapes, one component. At the head it is a quiet strip, because
     nothing up there should compete with the chapter title underneath it. At
     the foot it is a set of panels, because that is the moment the reader is
     actually choosing where to go and the choice deserves the room.

     The first chapter has nothing before it and the last has nothing after,
     and those cells render empty rather than disabled. An empty cell keeps
     the hub centred and says the same thing a greyed out button would have,
     without putting something on the page that looks like it should work.
     --------------------------------------------------------------------- */
  function navCell(chapter, dir, label) {
    if (!chapter) return '<span class="chn chn-' + dir + ' chn-none" aria-hidden="true"></span>';
    var arrow = dir === 'prev' ? '&larr; ' : '';
    var after = dir === 'next' ? ' &rarr;' : '';
    return '<a class="chn chn-' + dir + '" href="' + esc(chapter.page) + '">' +
      '<span class="chn-dir">' + arrow + label + after + '</span>' +
      '<span class="chn-name">' + esc(chapter.title) + '</span>' +
    '</a>';
  }

  function chapterNav(chapters, index, variant) {
    var prev = chapters[index - 1];
    var next = chapters[index + 1];
    var place = 'Chapter ' + (index + 1) + ' of ' + chapters.length;

    /* Which ends exist is worked out here and put on the element as a class,
       rather than left for the stylesheet to infer from an empty cell. CSS
       can see forwards along a row of siblings but not backwards, so the
       first chapter would have been one rule and the last chapter would have
       needed :has() to match. One class is cheaper and it reads. */
    var ends = (prev ? '' : ' no-prev') + (next ? '' : ' no-next');

    return '<nav class="ch-nav ' + variant + ends + '" aria-label="Chapter navigation">' +
      navCell(prev, 'prev', 'Previous') +
      '<a class="chn-hub" href="' + HUB + '">' +
        '<b>Heritage</b><i>' + place + '</i>' +
      '</a>' +
      navCell(next, 'next', 'Next') +
    '</nav>';
  }

  /* --- where all of it came from -----------------------------------------
     Only the sources a page actually leans on. The hub leans on the town
     panels, a chapter page leans on the facts inside its own span, and
     neither should print a bibliography for something the reader cannot see
     on the page in front of them. */
  function renderSources(data, chapter) {
    var target = byId('sourceList');
    if (!target) return;

    var sources = data.sources || {};
    var used = {};
    var facts = chapter ? factsIn(data.facts || [], chapter) : (data.facts || []);

    facts.forEach(function (fact) {
      (fact.source || []).forEach(function (id) { used[id] = true; });
    });
    if (!chapter) {
      (data.towns || []).forEach(function (town) {
        (town.sources || []).forEach(function (id) { used[id] = true; });
      });
    }

    var rows = Object.keys(used).map(function (id) { return sources[id]; })
                                .filter(function (row) { return row && row.url; })
                                .sort(function (a, b) {
                                  return (a.name + a.title).localeCompare(b.name + b.title);
                                });
    if (!rows.length) { target.innerHTML = '<li>&mdash;</li>'; return; }

    target.innerHTML = rows.map(function (row) {
      return '<li><a href="' + esc(row.url) + '" target="_blank" rel="noopener">' +
             esc(row.name) + ', ' + esc(row.title) + '</a></li>';
    }).join('');
  }

  /* --- boot --------------------------------------------------------------
     One fetch, and the page's own script gets the file. A page that fails to
     load it keeps the em dashes it shipped with, which is the site's empty
     state and is a truthful thing for it to be showing. */
  function load(onData) {
    fetch(FILE, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(FILE); return r.json(); })
      .then(onData)
      .catch(function () { /* the em dashes stay where they are */ });
  }

  window.FMHeritage = {
    HUB: HUB,
    TOWN_ORDER: TOWN_ORDER,
    esc: esc,
    byId: byId,
    pad: pad,
    load: load,
    sourceLine: sourceLine,
    renderFigure: renderFigure,
    platesFor: platesFor,
    leadPlate: leadPlate,
    renderFact: renderFact,
    factsIn: factsIn,
    renderTimeline: renderTimeline,
    chapterNav: chapterNav,
    renderSources: renderSources
  };
})(window, document);
