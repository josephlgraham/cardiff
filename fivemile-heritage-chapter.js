/* ===========================================================================
   fivemile-heritage-chapter.js

   One script, seven pages. Everything shared with the hub is in
   fivemile-heritage-core.js, which loads first.

   A chapter page says which chapter it is with data-chapter on the main
   element, and that is the only thing that differs between the seven files.
   Nothing about a chapter is written into its HTML: the span, the title, the
   opening, the plates, the timeline and the two turns all come out of
   fivemile-heritage.json, so moving a chapter boundary or adding a fact
   re-files itself across the family without anybody editing seven pages.

   The one thing each page does keep for itself is its head: the title, the
   description, the canonical link and the share image. Those have to be in
   the file rather than written by script, because the reader who needs them
   is a link preview, and it never runs any of this.
   =========================================================================== */
(function () {
  'use strict';

  var H = window.FMHeritage;
  if (!H) return;

  var host = document.querySelector('[data-chapter]');
  if (!host) return;
  var key = host.getAttribute('data-chapter');

  H.load(function (data) {
    var chapters = data.chapters || [];
    var index = -1;
    for (var i = 0; i < chapters.length; i++) {
      if (chapters[i].id === key) { index = i; break; }
    }
    if (index < 0) return;

    var chapter = chapters[index];
    var images = data.images || {};

    /* The head of the chapter. The number is set the same way it is on the
       hub, from position in the file, so the two can never disagree about
       which chapter is the fourth one. */
    var head = H.byId('chapterHead');
    if (head) {
      head.innerHTML =
        '<span class="ch-no">' + H.pad(index + 1) + '</span>' +
        '<span class="ch-id">' +
          '<span class="ch-span">' + H.esc(chapter.span) + '</span>' +
          '<h1 class="ch-title">' + H.esc(chapter.title) + '</h1>' +
        '</span>';
    }

    /* The plates and the opening, side by side. This is the shape the whole
       page used to open on and it survives the split unchanged, because it
       was never the part that was wrong.

       The pulled out figure that used to sit above the opening came off the
       hub, so it came off here too rather than being left on seven pages the
       front of the section no longer sets up. Every figure it carried is in
       the summary underneath in prose. */
    var open = H.byId('chapterOpen');
    if (open) {
      var plates = H.platesFor(chapter, images, true);
      open.className = 'ch-open' + (plates ? '' : ' noplate');
      open.innerHTML =
        (plates ? '<div class="ch-plates">' + plates + '</div>' : '') +
        '<div class="ch-lede">' +
          '<p class="ch-note">' + H.esc(chapter.summary || chapter.note || '') + '</p>' +
        '</div>';
    }

    /* Everything dated that falls inside this chapter's years. */
    var body = H.byId('chapterBody');
    var timeline = H.renderTimeline(data, chapter);
    if (body) body.innerHTML = timeline.html;

    var count = H.byId('chapterCount');
    if (count) {
      count.textContent = timeline.count + (timeline.count === 1 ? ' entry' : ' entries');
    }

    var top = H.byId('chapterNavTop');
    if (top) top.innerHTML = H.chapterNav(chapters, index, 'top');

    var foot = H.byId('chapterNavFoot');
    if (foot) foot.innerHTML = H.chapterNav(chapters, index, 'foot');

    H.renderSources(data, chapter);
  });
})();
