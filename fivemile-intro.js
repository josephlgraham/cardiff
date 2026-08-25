/* FIVEMILE masthead intro.

   The wordmark is struck letter by letter, left to right, the way a line
   comes off a typewriter, then the three town names land underneath in the
   same direction. West to east, which is also the locked town order.

   Runs about 1.9 seconds, once a day.

   Design constraints, all of them deliberate:

   1. Once a day, not once ever. What goes into localStorage is the date the
      reader last saw it, so it comes back the next day they open the site
      and never twice in the same one. sessionStorage would bring it back on
      every new tab, which is a different and worse thing.
   2. Never for anyone who has asked for reduced motion at the OS level.
      That check happens in the head gate, before this file loads.
   3. Any input ends it immediately. Tap, key, scroll, or wheel.
   4. Opacity and transform only. Nothing reflows, nothing on the page
      below the masthead moves, and no text changes position.
   5. Fail open, never fail hidden. Everything this file hides, it also
      restores. If the file never loads at all, the timer in the head gate
      reveals the masthead anyway.
   6. The red announcement strip is not touched. It is visible from the
      first frame, on every load, per CLAUDE.md.
   7. On the homepage the wordmark replays it. Everywhere else the wordmark
      is the link home, which is what it has always been. See bindReplay()
      at the foot of this file.

   Loaded synchronously immediately after the masthead markup so the split
   happens before the first paint. Do not add defer or async to the tag. */

window.FIVEMILE = window.FIVEMILE || {};

(function () {
  var STORAGE_KEY = "fivemile-intro-seen";

  /* The stored value is the local date the reader last saw the intro, so the
     day turns over at their midnight rather than UTC's. Month and day are not
     padded because the string is only ever compared against itself.

     The head gate in every page builds this same key inline, before this file
     loads. If one changes the other has to change with it. */
  function todayKey() {
    var t = new Date();
    return t.getFullYear() + "-" + (t.getMonth() + 1) + "-" + t.getDate();
  }

  /* Matches the longest animation in fivemile-common.css: the last town
     finishes at 1240ms delay plus 340ms stagger plus 300ms duration, which is
     1880ms. The margin covers slow paint on an old phone. The 2600ms backstop
     in each page's head gate is set from this number and has to outlast it. */
  var RUN_MS = 2200;

  var root = document.documentElement;
  var doneTimer = null;

  function el(id) {
    return document.getElementById(id);
  }

  /* Milliseconds between one letter being struck and the next. About seven
     and a half characters a second. This was 85ms, which is a fast typist;
     at 135ms it is somebody setting a nameplate rather than racing through a
     sentence, and the eight letters are legible one at a time as they land.

     Every other number in this file and in the intro block of
     fivemile-common.css is set from this one. Change it and walk the rest. */
  var STRIKE_MS = 135;

  /* When each letter lands. Not index times STRIKE_MS: a small wobble rides
     on top, because an even rate reads as a metronome and the thing being
     imitated is a person at a keyboard.

     Deterministic on purpose. The same wobble every load, so the intro is one
     fixed piece of motion and not a slightly different one each time. The
     values land between 0 and 20ms, well under one strike, so the letters can
     never arrive out of order however long the name gets. */
  function strikeDelay(index) {
    return index * STRIKE_MS + ((index * 37) % 5) * 5;
  }

  /* Split a string into per-letter spans carrying their index and their
     strike time, so the CSS can stagger any length of name without one rule
     per letter. */
  function splitLetters(node, text) {
    var html = "";
    var i;
    var index = 0;
    for (i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (ch === " ") {
        html += '<span class="fm-space">&nbsp;</span>';
        continue;
      }
      html += '<span class="fm-let" style="--i:' + index +
        ';--d:' + strikeDelay(index) + '">' + ch + "</span>";
      index++;
    }
    node.innerHTML = html;
  }

  /* Town names come from BRAND so the order is enforced in one place. */
  function splitTowns(node, towns) {
    var html = "";
    var i;
    for (i = 0; i < towns.length; i++) {
      if (i > 0) {
        html += '<span class="fm-sep" style="--i:' + i + '"> · </span>';
      }
      html += '<span class="fm-town" style="--i:' + i + '">' + towns[i].name + "</span>";
    }
    node.innerHTML = html;
  }

  /* Split the wordmark and the tagline into spans. This runs on every load,
     not only when the intro plays, because the arc treatment on the wordmark
     is per letter: the F and the E are set larger than the six letters
     between them, and the CSS needs something to hang that on. A reader who
     has already seen the intro still has to get the same wordmark. */
  function dress() {
    var wordmark = el("mhWordmark");
    var tagline = el("mhTagline");
    var brand = window.BRAND || {};
    if (!wordmark) return false;

    splitLetters(wordmark, brand.name || wordmark.textContent.trim());

    /* Letters read as "F, I, V, E" to a screen reader. The link carries the
       real name in its aria-label instead. */
    wordmark.setAttribute("aria-hidden", "true");

    if (tagline && brand.towns && brand.towns.length) {
      splitTowns(tagline, brand.towns);
    }
    return true;
  }

  function finish() {
    if (doneTimer) {
      clearTimeout(doneTimer);
      doneTimer = null;
    }
    root.setAttribute("data-intro", "done");
    document.removeEventListener("pointerdown", finish, true);
    document.removeEventListener("keydown", finish, true);
    document.removeEventListener("wheel", finish, true);
    document.removeEventListener("touchstart", finish, true);
  }

  function play() {
    /* dress() has already run by the time anything calls this, but calling it
       again is harmless and covers playIntro() on a page where the first
       attempt found no wordmark. */
    if (!dress()) {
      finish();
      return;
    }

    /* Written now rather than on completion, so a reader who reloads
       halfway through does not sit through it a second time. */
    try {
      localStorage.setItem(STORAGE_KEY, todayKey());
    } catch (e) {}

    /* Setting this synchronously in the same task as the split means the
       browser never paints the un-split state. No flash. */
    root.setAttribute("data-intro", "play");

    document.addEventListener("pointerdown", finish, true);
    document.addEventListener("keydown", finish, true);
    document.addEventListener("wheel", finish, true);
    document.addEventListener("touchstart", finish, true);

    doneTimer = setTimeout(finish, RUN_MS);
  }

  /* Always split, on every load. Synchronous and in the same task as the
     parse, so the browser never paints the un-split wordmark. */
  try {
    dress();
  } catch (e) {}

  /* Called by the page. Only the head gate can set "pending", and it only
     does so for a reader who has not seen it today and has not asked for
     reduced motion. */
  if (root.getAttribute("data-intro") === "pending") {
    try {
      play();
    } catch (e) {
      finish();
    }
  }

  /* Replay on demand. Three uses: the wordmark on the homepage calls this,
     a future theme toggle can call it, and Joe can run
     FIVEMILE.playIntro() in the console to see it again without clearing
     site data. */
  window.FIVEMILE.playIntro = function () {
    var reduced = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    finish();
    root.setAttribute("data-intro", "pending");
    try {
      play();
    } catch (e) {
      finish();
    }
  };

  /* Clears the stored date so the next load plays it fresh. */
  window.FIVEMILE.resetIntro = function () {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  };

  /* Is this the homepage. Same rule as pageKey() in fivemile-common.js: take
     the last path segment and drop the extension, so "/", "/index.html" and
     the extensionless "/index" some dev servers hand back all count. */
  function isHome() {
    var s = String(window.location.pathname).split("?")[0].split("#")[0];
    s = s.substring(s.lastIndexOf("/") + 1).replace(/\.html$/, "");
    return s === "" || s === "index";
  }

  /* The wordmark is the link home on every page. On the homepage that link
     has nowhere to go, so it replays the intro instead. Everywhere else it is
     left exactly as it is and takes the reader home.

     Deliberately not announced anywhere. It is not in the copy, it has no
     tooltip, and the aria-label still says Home, because on every page but
     one that is what it is and CLAUDE.md does not allow the UI to explain
     itself. A reader who taps the nameplate finds it. A reader who does not
     has lost nothing.

     Three things this is careful about:

     - The link stays a link. preventDefault only fires on a plain left click,
       so open in new tab, middle click, and long press all still work, and
       with JavaScript off the nameplate is a link home like anywhere else.
     - Reduced motion is not bound at all. playIntro() would return without
       doing anything, and a nameplate that swallows the click and then does
       nothing is worse than one that reloads the page.
     - The pointerdown listener that ends the intro is registered inside
       play(), after this click has already been dispatched, so the click that
       starts the replay cannot also be the input that ends it. */
  function bindReplay() {
    if (!isHome()) return;
    var reduced = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    var link = document.querySelector(".mh-brand-link");
    if (!link) return;

    link.addEventListener("click", function (e) {
      if (e.button && e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      window.FIVEMILE.playIntro();
    });
  }

  try {
    bindReplay();
  } catch (e) {}
})();
