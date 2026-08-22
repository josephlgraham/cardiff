/* FIVEMILE masthead intro.

   The wordmark is struck letter by letter, left to right, the way a line
   comes off a typewriter, then the three town names land underneath in the
   same direction. West to east, which is also the locked town order.

   Runs about 1.1 seconds and then never again.

   Design constraints, all of them deliberate:

   1. Once, ever. Gated on localStorage, not sessionStorage. A reader who
      has seen it does not see it a second time.
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

   Loaded synchronously immediately after the masthead markup so the split
   happens before the first paint. Do not add defer or async to the tag. */

window.FIVEMILE = window.FIVEMILE || {};

(function () {
  var STORAGE_KEY = "fivemile-intro-seen";

  /* Matches the longest animation in fivemile-common.css: the last town
     finishes at 790ms delay plus 200ms stagger plus 220ms duration. The
     margin covers slow paint on an old phone. */
  var RUN_MS = 1500;

  var root = document.documentElement;
  var doneTimer = null;

  function el(id) {
    return document.getElementById(id);
  }

  /* Milliseconds between one letter being struck and the next. About twelve
     characters a second, which is a fast typist rather than a teleprinter. */
  var STRIKE_MS = 85;

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
      localStorage.setItem(STORAGE_KEY, "1");
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
     does so for a first time reader who has not asked for reduced motion. */
  if (root.getAttribute("data-intro") === "pending") {
    try {
      play();
    } catch (e) {
      finish();
    }
  }

  /* Replay on demand. Two uses: a future theme toggle can call this, and
     Joe can run FIVEMILE.playIntro() in the console to see it again
     without clearing site data. */
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

  /* Clears the seen flag so the next load plays it fresh. */
  window.FIVEMILE.resetIntro = function () {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  };
})();
