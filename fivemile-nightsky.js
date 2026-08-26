/* ===========================================================================
   FIVEMILE night sky desk

   The moon, the dark window, the month's sky notes, and the meteor year.

   Everything with a number attached is calculated on the page from the date
   and this location. Nothing here calls a sky service, and nothing here claims
   a minute it cannot work out. The month by month notes come from
   fivemile-skywatch.json, which is the sky desk's own writing.
   =========================================================================== */
(function () {
  "use strict";

  const FA = window.FivemileAlmanac;
  if (!FA) return;

  const setText = FA.setText;
  const setHTML = FA.setHTML;
  const escapeHtml = FA.escapeHtml;
  const iconHtml = FA.iconHtml;

  function paintTile(id, value, sentence) {
    setHTML(id + "Val", value == null ? "&mdash;" : escapeHtml(value));
    setText(id + "Sub", sentence || "This reading is not coming through right now.");
  }

  function shortDate(date) {
    if (!date) return "—";
    return FA.MONTHS_SHORT[date.getMonth()] + " " + date.getDate();
  }

  /* The eight phases as a strip. The current one is marked and the other seven
     are the reference, which is the whole reason to draw a cycle rather than a
     single figure. */
  function renderStrip(current) {
    setHTML("moonStrip", FA.MOON_PHASES.map(function (phase) {
      const on = phase.name === current.name;
      return '<div class="moon-cell' + (on ? " on" : "") + '">' +
        '<div class="m">' + iconHtml(phase.icon) + "</div>" +
        '<div class="n">' + escapeHtml(phase.name) + "</div>" +
        "</div>";
    }).join(""));
  }

  /* The four quarter phases, in the order they actually arrive rather than in
     the order of the cycle. A list headed "the next four" that opens with a
     date three weeks out is a list nobody can read. */
  function renderNextPhases(now) {
    const rows = ["New Moon", "First Quarter", "Full Moon", "Last Quarter"]
      .map(function (name) { return { name: name, when: FA.nextMoonPhase(now, name) }; })
      .filter(function (row) { return row.when; })
      .sort(function (a, b) { return a.when - b.when; });
    if (!rows.length) return;
    setHTML("skyPhaseRows", rows.map(function (row) {
      return '<div class="t-row"><span>' + escapeHtml(row.name) + "</span><b>" +
        escapeHtml(shortDate(row.when)) + "</b></div>";
    }).join(""));
  }

  function renderMeteors(now) {
    const next = FA.nextMeteorShower(now);
    setHTML("meteorList", FA.METEOR_SHOWERS.map(function (shower) {
      const isNext = next && shower.name === next.name;
      return '<div class="alm-row">' +
        '<div class="alm-mark">' + iconHtml("☄️") + "</div>" +
        "<div>" +
          '<div class="alm-head-line"><span class="alm-name">' + escapeHtml(shower.name) + "</span>" +
          (isNext ? '<span class="alm-open">Next up</span>' : "") + "</div>" +
          '<div class="alm-when">Peaks around ' + escapeHtml(FA.MONTHS_LONG[shower.month] + " " + shower.day) + "</div>" +
          '<div class="alm-note">' + escapeHtml(shower.note) + "</div>" +
        "</div></div>";
    }).join(""));
  }

  /* The month entry from the sky desk file. Each month can carry a pattern, a
     planet note, a calendar note and a special, and any of them can be absent.
     A month with nothing but an opening line still reads as finished. */
  function renderMonth(entry, monthIndex) {
    setText("skyMonthName", FA.MONTHS_LONG[monthIndex] + " over Five Mile Creek");
    setText("skyMonthTag", entry && entry.tag ? entry.tag : "Sky desk");
    setText("skyOpening", entry && entry.opening ? entry.opening : "The sky desk has not filed a note for this month yet.");
    const parts = ["pattern", "planet", "calendar", "special"]
      .map(function (key) { return entry ? entry[key] : null; })
      .filter(function (part) { return part && part.title; });
    if (!parts.length) {
      setHTML("skyMonthBody", '<div class="empty">&mdash;</div>');
      return;
    }
    setHTML("skyMonthBody", parts.map(function (part) {
      return '<div class="sky-event">' +
        '<div class="sky-event-icon">' + iconHtml(part.icon || "🔭") + "</div>" +
        "<div>" +
          '<div class="sky-event-title">' + escapeHtml(part.title) + "</div>" +
          '<div class="sky-event-note">' + escapeHtml(part.note || "") + "</div>" +
        "</div></div>";
    }).join(""));
  }

  async function load() {
    const now = new Date();
    const month = now.getMonth();
    const sun = FA.getSunTimes(now);
    const moon = FA.getMoonPhase(now);
    const age = Math.round(FA.moonAge(now));
    const daylight = FA.dayLengthHours(sun);
    const dark = Math.round((24 - daylight) * 10) / 10;

    setText("skyStamp", now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));

    /* The phase glyph used to lead the sentence under the reading. It is a
       mark, and the tile now has the place marks go, which is the kicker. */
    paintTile("skyMoon", moon.name, moon.science);
    FA.setTileMark("skyMoon", moon.icon, moon.name);
    paintTile("skyAge", age + " days", "Days into a cycle that runs twenty nine and a half from one new moon to the next.");
    paintTile("skyDark", dark + " hours",
      "Sun down at " + FA.formatClock(sun.set) + " and up again at " + FA.formatClock(sun.rise) + ". True darkness starts later than sunset.");

    const nextShower = FA.nextMeteorShower(now);
    paintTile("skyNext", nextShower ? nextShower.name : null,
      nextShower ? "Peaks around " + shortDate(nextShower.when) + ". " + nextShower.note : "");

    setText("moonIcon", moon.icon);
    setText("moonName", moon.name);
    setText("moonMeta", "Tonight over Five Mile Creek");
    setText("moonLore", moon.lore);
    setText("moonSci", moon.science);
    setText("skyMoonStamp", moon.icon + " " + age + " days in");
    renderStrip(moon);
    renderMeteors(now);
    FA.setRailSub("sky", moon.name);

    renderNextPhases(now);

    try {
      const data = await FA.fetchJSON(FA.SKY_WATCH_URL);
      const months = data && data.months ? data.months : {};
      renderMonth(months[String(month)] || null, month);
    } catch (error) {
      renderMonth(null, month);
    }
  }

  function boot() {
    FA.renderRail("sky");
    FA.renderBackLink();
    load();
    /* Once an hour is plenty. The moon does not move fast enough to justify
       more, and the only thing on this page that changes inside a day is the
       phase rolling over at midnight. */
    window.setInterval(load, 60 * 60 * 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
