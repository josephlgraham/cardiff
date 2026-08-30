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

  const TURNINGS_URL = "turnings.json";

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
    if (!planets.length) {
      host.innerHTML = '<div class="empty">&mdash;</div>';
      return;
    }
    host.innerHTML = '<div class="d-rows list">' +
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

     The turning comes from turnings.json, which the calendar has carried since
     the beginning and which is the eight old quarter and cross quarter names.
     The stretch comes from fivemile-sky.js and is the shorter run inside a year
     that somebody would actually name in conversation. The dog days are the
     one everybody says, and they are also the one everybody gets wrong, so
     when they are on the page says where the name came from.
     ------------------------------------------------------------------------- */
  function withinTurning(now, turning) {
    const md = String(now.getMonth() + 1).padStart(2, "0") + "-" +
      String(now.getDate()).padStart(2, "0");
    if (turning.start <= turning.end) return md >= turning.start && md <= turning.end;
    return md >= turning.start || md <= turning.end;
  }

  function readableDate(value) {
    const parts = /^(\d{2})-(\d{2})$/.exec(String(value || ""));
    if (!parts) return null;
    return MONTHS[Number(parts[1]) - 1] + " " + Number(parts[2]);
  }

  function moonName(fraction, waxing) {
    if (fraction < 0.03) return "New moon";
    if (fraction > 0.97) return "Full moon";
    if (fraction < 0.47) return waxing ? "Waxing crescent" : "Waning crescent";
    if (fraction < 0.53) return waxing ? "First quarter" : "Last quarter";
    return waxing ? "Waxing gibbous" : "Waning gibbous";
  }

  function nextCelestial(now) {
    const source = window.CardiffSeasonData;
    if (!source || typeof source.getUpcomingCalendar !== "function") return null;
    const all = source.getUpcomingCalendar(now) || [];
    return all.find(function (entry) { return entry.lane === "celestial"; }) || null;
  }

  function renderSeason(host, tipHost, now, turning) {
    const lit = SKY.moonIllumination(now);
    const stretch = SKY.currentStretch(now);
    const next = nextCelestial(now);

    const rows = [];
    rows.push(cell("🌙", "The moon",
      esc(moonName(lit.fraction, lit.waxing) + ", " + Math.round(lit.fraction * 100) + "% lit")));
    if (turning) {
      rows.push(cell(turning.emoji || "🕰️", "The turning",
        esc(turning.name + ", since " + (readableDate(turning.start) || "—"))));
    }
    if (stretch) {
      rows.push(cell(stretch.mark, "Where the year is",
        esc(stretch.name + ", to " + MONTHS[stretch.to[0]] + " " + stretch.to[1])));
    }
    if (next) {
      rows.push(cell("☄️", "Next in the sky",
        esc(next.title + (next.dateLabel ? ", " + next.dateLabel : ""))));
    }
    host.innerHTML = '<div class="d-rows list">' + rows.join("") + "</div>";

    if (!tipHost) return;
    /* The interesting half. A named stretch of the year gets its explanation,
       and when there is no stretch on, the turning's own does the job. */
    const words = stretch ? stretch.why : (turning && turning.explainer) || "";
    tipHost.innerHTML = esc(words);
    tipHost.hidden = !words;
  }

  /* ------------------------------------------------------------------------- */
  async function currentTurning(now) {
    try {
      const response = await fetch(TURNINGS_URL, { cache: "no-store" });
      if (!response.ok) throw new Error("no turnings");
      const data = await response.json();
      const list = (data && data.turnings) || [];
      return list.find(function (turning) { return withinTurning(now, turning); }) || null;
    } catch (error) {
      /* The turning is the nicest part of this block and not the load bearing
         part. Without the file the moon and the planets still stand. */
      return null;
    }
  }

  async function paint() {
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
    if (seasonHost) renderSeason(seasonHost, tipHost, now, await currentTurning(now));

    const block = document.querySelector("[data-skynow]");
    if (block) block.hidden = false;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", paint);
  } else {
    paint();
  }
})();
