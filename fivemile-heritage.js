/* ===========================================================================
   fivemile-heritage.js

   The heritage hub, and nothing else. Everything shared with the seven
   chapter pages is in fivemile-heritage-core.js, which loads first.

   The hub used to be the whole publication: seven chapters stacked one after
   another with every dated entry showing, which was somewhere near four
   hundred lines of type before a reader had decided they were interested. It
   is a front page now. Each chapter gets a photograph, the one figure worth
   carrying away from that stretch of years, a few sentences on why it
   mattered, and a door.

   The dated timeline did not go anywhere. It moved to the chapter's own page,
   where somebody who wants all of it can have all of it.
   =========================================================================== */
(function () {
  'use strict';

  var H = window.FMHeritage;
  if (!H) return;

  /* --- the three town panels at the top ---------------------------------- */
  function renderTowns(data) {
    var target = H.byId('townPanels');
    if (!target) return;

    var byName = {};
    (data.towns || []).forEach(function (town) { byName[town.name] = town; });

    var panels = H.TOWN_ORDER.map(function (name) { return byName[name]; }).filter(Boolean);
    if (!panels.length) return;

    target.innerHTML = panels.map(function (town) {
      /* All three cards carry the same five rows in the same order, so they
         can be read across rather than one at a time. Graysville has no mine
         to put in the second one, and an empty value prints the site's empty
         state rather than a blank, because an em dash there is a real answer:
         nothing in these sources records one. See the note in CLAUDE.md on
         empty states, and DECISIONS.md 15 on why these are full tab cards. */
      /* A trailing asterisk on a value is a reference mark, and it is set as
         one rather than left as a character in the figure: mono, red, small,
         and out of the bold. It points at the note in the same card, which is
         where the long version of that row already is. Nothing here needs a
         footnote, because the card is the footnote.

         The mark exists because the row is a table cell and a table cell that
         wraps to two lines drags the whole card out of line with the two
         beside it. Two dates and a mark fit on one line. The sentence that
         explains them does not. */
      var rows = (town.rows || []).map(function (pair) {
        var raw = pair[1] || '';
        var marked = raw.slice(-1) === '*';
        if (marked) raw = raw.slice(0, -1);
        var value = raw
          ? H.esc(raw) + (marked ? '<span class="t-mark">*</span>' : '')
          : '&mdash;';
        return '<div class="t-row"><span>' + H.esc(pair[0]) + '</span><b>' + value + '</b></div>';
      }).join('');
      return '<div class="card-tab">' +
        '<span class="t-tab">' + H.esc(town.name) + '</span>' +
        '<h3 class="t-title">' + H.esc(town.line || '') + '</h3>' +
        rows +
        '<p class="t-note">' + H.esc(town.lede || '') + '</p>' +
      '</div>';
    }).join('');
  }

  /* --- the seven doors ---------------------------------------------------
     A plate, the span and the title, the one big figure, the blurb, and the
     way in.

     THE ROW IS NOT AN ANCHOR, and it cannot be. A plate carries a credit and
     a credit is a link, so wrapping the row in an <a> puts an anchor inside
     an anchor, which is invalid and which the parser fixes by tearing the
     outer one open. That is not a subtle failure: it turned seven rows into
     nineteen. The row is a div, the title carries the only real link, and
     that link throws a transparent overlay across the whole row so a reader
     on a phone still gets the entire thing as a target. The credit sits above
     the overlay so it stays clickable. See the z-index note in the stylesheet.

     The count of entries is printed on the way in. It is the one honest
     signal about how thick the record is for a stretch of years, and it is
     what the old contents list was carrying. A chapter with three entries in
     it and a chapter with eleven should not look identical from out here.

     THE LADDER. A rung is three blocks: who it is, the photograph, and what
     it is about. The body is the blurb and the way in, nothing else. Every
     chapter still carries a `big` figure in the JSON and nothing renders it
     any more: the pulled out figure competed with the title on one side and
     the blurb on the other, and the numbers it held all appear in the chapter
     summaries in prose anyway. The field is kept because it is written and
     sourced, not because anything is waiting on it. Odd rungs run left to right and even rungs run right to
     left, which is what stops seven near identical rows from reading as a
     list to be endured.

     The alternation is a class rather than :nth-child, because it is a fact
     about the rung and should be legible in the markup rather than inferred
     from where the element happens to sit. It also survives anything else
     ever being put in that container.

     The DOM order never changes. Identity, plate, body, on every rung. Only
     the grid areas swap, so a screen reader and a keyboard get one order
     while the eye gets two. That is the whole reason this is done with
     grid-template-areas and not by reversing the markup.
     --------------------------------------------------------------------- */
  function renderChapters(data) {
    var target = H.byId('chapters');
    if (!target) return;

    var images = data.images || {};
    var chapters = data.chapters || [];

    target.innerHTML = chapters.map(function (chapter, i) {
      var lead = H.leadPlate(chapter, images);
      var plate = lead ? H.renderFigure(lead, i < 2, true) : '';
      var count = H.factsIn(data.facts || [], chapter).length;

      var cls = 'hub-ch' + (plate ? '' : ' noplate') + (i % 2 ? ' alt' : '');

      return '<div class="' + cls + '">' +
        '<div class="hub-id">' +
          '<h3 class="hub-title">' +
            '<a class="hub-link" href="' + H.esc(chapter.page) + '">' + H.esc(chapter.title) + '</a>' +
          '</h3>' +
          '<span class="hub-span">' + H.esc(chapter.span) + '</span>' +
          '<span class="hub-no" aria-hidden="true">' + H.pad(i + 1) + '</span>' +
        '</div>' +
        (plate ? '<div class="hub-plate">' + plate + '</div>' : '') +
        '<div class="hub-bd">' +
          '<p class="hub-blurb">' + H.esc(chapter.blurb || '') + '</p>' +
          '<span class="hub-go">Read this chapter <span class="hub-arrow" aria-hidden="true">&rarr;</span>' +
            '<span class="hub-count">' + count + (count === 1 ? ' entry' : ' entries') + '</span>' +
          '</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  H.load(function (data) {
    renderTowns(data);
    renderChapters(data);
    H.renderSources(data);
  });
})();
