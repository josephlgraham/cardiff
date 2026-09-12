/* ===========================================================================
   FIVEMILE sky now

   The small standing block that says what is over the creek tonight and where
   the year has got to. It draws into whatever hosts it finds, so the news page
   and the night sky desk show the same thing without either of them keeping a
   second copy of it.

   The arithmetic is all fivemile-sky.js. This file is only the words and the
   markup, and it uses the department panel rows out of fivemile-cards.css
   rather than the almanac's own list, because the news page does not load the
   almanac stylesheet and one renderer that works on both pages is worth more
   than a second set of rules.

   WHAT IT WILL NOT DO. It is astronomy and it stays astronomy. No horoscopes,
   no star signs, and nothing about what any of it means for anybody. Where the
   planets are is a fact. What they portend is not this site's business.
   =========================================================================== */
(function () {
  "use strict";

  const SKY = window.FivemileSky;
  if (!SKY) return;

  const MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  function esc(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function clock(date) {
    return date ? date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—";
  }

  function cell(mark, label, value) {
    return '<div class="d-cell"><em><i class="d-mark" aria-hidden="true">' + esc(mark) + "</i>" +
      esc(label) + "</em><b>" + value + "</b></div>";
  }

  /* -------------------------------------------------------------------------
     THE PLANETS

     A planet gets the one time that is any use for it. For something in the
     evening sky that is when it goes down, because it is already up when the
     sky gets dark. For a morning planet it is when it comes up. For anything
     near opposition it is neither, because it is up the whole night.
     ------------------------------------------------------------------------- */
  function planetLine(planet) {
    if (planet.alwaysUp) return "Up all night";
    if (planet.when === "night") {
      return "Up most of the night" + (planet.rise ? ", from " + clock(planet.rise) : "");
    }
    if (planet.when === "evening") {
      return planet.set ? "Sets " + clock(planet.set) + (planet.setsIn ? ", in the " + planet.setsIn : "") : "In the evening sky";
    }
    return planet.rise ? "Rises " + clock(planet.rise) + (planet.risesIn ? ", in the " + planet.risesIn : "") : "In the morning sky";
  }

  /* How bright, in words. A magnitude is a number that runs backwards and
     almost nobody outside astronomy reads it, so it is not the thing on the
     page. It decides the wording and then gets out of the way. */
  function brightness(mag) {
    if (mag <= -3.5) return "far brighter than any star";
    if (mag <= -1.5) return "brighter than any star";
    if (mag <= 0) return "as bright as the brightest stars";
    if (mag <= 1.5) return "an ordinary bright star";
    return "faint enough to need a dark night";
  }

  /* The mark says which end of the night, because the label already says which
     planet and four identical marks down a list are four things a reader has
     to read past. Decision 51: a mark earns its place by saying something the
     words beside it do not. */
  function whenMark(planet) {
    if (planet.when === "night" || planet.alwaysUp) return "🌃";
    return planet.when === "evening" ? "🌇" : "🌅";
  }

  function renderPlanets(host, planets) {
    host.classList.add("d-pass");
    if (!planets.length) {
      host.innerHTML = '<div class="empty">&mdash;</div>';
      return;
    }
    host.innerHTML = '<div class="d-rows list fill">' +
      planets.map(function (planet) {
        return cell(whenMark(planet), planet.name, esc(planetLine(planet)));
      }).join("") + "</div>";
  }

  /* The same fact as the row underneath, said as a sentence rather than as a
     label and a time. "Sets 8:59 PM" is a table entry; "and it goes down about
     nine in the west" is what somebody would tell you. */
  function spokenLine(planet) {
    if (planet.alwaysUp) return "it is up the whole night";
    if (planet.when === "night") {
      return planet.rise ? "it comes up around " + clock(planet.rise) + " and stays up most of the night" : "it is up for most of the night";
    }
    if (planet.when === "evening") {
      return planet.set
        ? "it goes down at " + clock(planet.set) + (planet.setsIn ? " in the " + planet.setsIn : "")
        : "it is in the evening sky";
    }
    return planet.rise
      ? "it comes up at " + clock(planet.rise) + (planet.risesIn ? " in the " + planet.risesIn : "")
      : "it is in the morning sky";
  }

  function planetLede(planets) {
    if (!planets.length) {
      return "Nothing bright is far enough from the sun to be worth going out for tonight, which happens for a few weeks most years.";
    }
    const lead = planets[0];
    const parts = ["The one to look for is " + lead.name + ", " + brightness(lead.magnitude) +
      ", and " + spokenLine(lead) + "."];
    parts.push(lead.marginal
      ? "It is close in to the sun this month, so it wants a flat horizon and about twenty minutes of patience."
      : lead.note);

    const others = planets.slice(1).filter(function (planet) { return !planet.marginal; });
    if (others.length === 1) {
      parts.push(others[0].name + " is up as well, and " + spokenLine(others[0]) + ".");
    } else if (others.length > 1) {
      const names = others.map(function (planet) { return planet.name; });
      parts.push(names.slice(0, -1).join(", ") + " and " + names[names.length - 1] + " are up as well.");
    }
    return parts.join(" ");
  }

  /* -------------------------------------------------------------------------
     WHERE THE YEAR IS

     Three standing readings and one that only shows part of the year: the
     moon, the light, the named stretch when one is on, and the next thing the
     sky does. All of it worked out in fivemile-sky.js.

     This block used to open with the turning as well, Lammas or Michaelmas or
     Hallowtide and the date it began, read out of turnings.json. That is the
     one thing it will not do now. Those eight names are how the calendar files
     its dates, they are not a season anybody here is standing in, and the
     paragraph underneath was explaining loaf-mass to a reader who came to find
     out whether the creek was up. See DECISIONS.md 41 and 66.
     ------------------------------------------------------------------------- */

  /* Sunrise to sunset, and which way it is going. The amount is what somebody
     notices in September and the rate is why, and the rate is measured across
     the day either side rather than off yesterday alone so that it does not
     jump a minute on the arithmetic. */
  function dayLength(date) {
    const sun = SKY.riseSetTransit(date, SKY.sunAt, { h0: -0.833 });
    if (!sun.rise || !sun.set) return null;
    return (sun.set - sun.rise) / 3600000;
  }

  function dayApart(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12);
  }

  function lightLine(now) {
    const today = dayLength(now);
    if (today === null) return null;
    const hours = (Math.round(today * 10) / 10) + " hours";
    const before = dayLength(dayApart(now, -1));
    const after = dayLength(dayApart(now, 1));
    if (before === null || after === null) return hours;
    /* Within a week of a solstice this rounds to nothing, which is the true
       answer and the thing the solstice is named for. */
    const rate = Math.round((after - before) / 2 * 60);
    if (rate === 0) return hours + ", and holding steady";
    const count = Math.abs(rate);
    return hours + ", " + (rate > 0 ? "gaining " : "losing ") + count +
      (count === 1 ? " minute" : " minutes") + " a day";
  }

  function nextCelestial(now) {
    const source = window.CardiffSeasonData;
    if (!source || typeof source.getUpcomingCalendar !== "function") return null;
    const all = source.getUpcomingCalendar(now) || [];
    return all.find(function (entry) { return entry.lane === "celestial"; }) || null;
  }

  function renderSeason(host, tipHost, now) {
    host.classList.add("d-pass");
    /* The engine names the phase. This file used to name it here off the lit
       fraction, which put New Moon on the news page and on the night sky page
       directly under a tile reading Waxing Crescent. See DECISIONS.md 67. */
    const moon = SKY.moonPhase(now);
    const stretch = SKY.currentStretch(now);
    const next = nextCelestial(now);
    const light = lightLine(now);

    const rows = [];
    rows.push(cell("🌙", "The moon",
      esc(moon.name + ", " + Math.round(moon.fraction * 100) + "% lit")));
    if (light) rows.push(cell("🌅", "The light", esc(light)));
    if (stretch) {
      rows.push(cell(stretch.mark, "The season",
        esc(stretch.name + ", to " + MONTHS[stretch.to[0]] + " " + stretch.to[1])));
    }
    if (next) {
      rows.push(cell("☄️", "Next in the sky",
        esc(next.title + (next.dateLabel ? ", " + next.dateLabel : ""))));
    }
    /* fill, because these two panels stand side by side and the taller one
       sets the height. Without it the shorter one finishes with its spare
       height in a hole under the last row. */
    host.innerHTML = '<div class="d-rows list fill">' + rows.join("") + "</div>";

    if (!tipHost) return;
    /* The interesting half, and only when there is something to be interesting
       about. A named stretch carries where its name came from, which is worth
       a paragraph. The rest of the year the rows say all there is to say and
       the paragraph stays down. */
    const words = stretch ? stretch.why : "";
    tipHost.innerHTML = esc(words);
    tipHost.hidden = !words;
  }

  /* -------------------------------------------------------------------------
     Every reading here is worked out from the date in the reader's own
     browser, so this block fetches nothing at all and stands whether or not
     anything else on the page loaded.
     ------------------------------------------------------------------------- */
  function paint() {
    const now = new Date();
    const planetsHost = document.querySelector("[data-skynow-planets]");
    const ledeHost = document.querySelector("[data-skynow-lede]");
    const seasonHost = document.querySelector("[data-skynow-season]");
    const tipHost = document.querySelector("[data-skynow-tip]");
    const stampHost = document.querySelector("[data-skynow-stamp]");
    if (!planetsHost && !seasonHost) return;

    const planets = SKY.planetsTonight(now);

    if (planetsHost) renderPlanets(planetsHost, planets);
    if (ledeHost) ledeHost.textContent = planetLede(planets);
    if (stampHost) {
      const sun = SKY.riseSetTransit(now, SKY.sunAt, { h0: -0.833 });
      stampHost.textContent = sun.set ? "Dark from about " + clock(new Date(sun.set.getTime() + 45 * 60000)) : "—";
    }
    if (seasonHost) renderSeason(seasonHost, tipHost, now);

    const block = document.querySelector("[data-skynow]");
    if (block) block.hidden = false;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", paint);
  } else {
    paint();
  }
})();
