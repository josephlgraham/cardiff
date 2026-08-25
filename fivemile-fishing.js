/* ===========================================================================
   FIVEMILE fishing desk

   Water temperature, creek level, pressure, and what any of that means for a
   small Warrior basin creek. The daily ratings are the same three the almanac
   shows, because they come from the same function in the core rather than a
   second copy of the arithmetic.

   Nothing on this page states a regulation, a limit, or an advisory finding
   that is not either linked to its source or marked as needing confirmation.
   The state changes all three and this is a static site.
   =========================================================================== */
(function () {
  "use strict";

  const FA = window.FivemileAlmanac;
  if (!FA) return;

  const setText = FA.setText;
  const setHTML = FA.setHTML;
  const escapeHtml = FA.escapeHtml;
  const iconHtml = FA.iconHtml;

  /* -------------------------------------------------------------------------
     THE THREE SPECIES

     General biology, not local claims. Every line here is true of the species
     across its range: what temperature wakes it up, where in a creek it holds,
     and when it spawns. None of it says anything about a particular bend of
     Five Mile Creek, because nobody has surveyed it and this site does not
     invent facts to fill a gap.

     Latin names are the accepted binomials. The tags read off today's water
     temperature, so the card changes with the season rather than sitting there
     as a poster.
     ------------------------------------------------------------------------- */
  const SPECIES = [
    {
      num: "No. 01",
      name: "Channel catfish",
      latin: "Ictalurus punctatus",
      line: "Bottom feeder that works by smell and touch rather than sight, which is why it keeps eating in muddy water that shuts everything else down. Holds in the deeper bends and under cover through the day and moves out to feed at dusk and after dark.",
      foot: "Best above 70°F · Feeds after rain",
      /* Rising, colored water after a storm is the classic catfish window
         because it washes food into the channel. */
      active: function (water) { return water >= 70; },
      tags: [
        { label: "Warm water", on: function (water) { return water >= 70; } },
        { label: "Night feeder", on: function () { return true; } },
        { label: "Muddy water is fine", on: function () { return true; } }
      ]
    },
    {
      num: "No. 02",
      name: "Spotted bass",
      latin: "Micropterus punctulatus",
      line: "The bass that suits a creek. It tolerates current better than a largemouth does and holds on hard structure in moving water, so it turns up in stretches too small and too fast for its bigger cousin. Spawns in spring once the water settles into the low sixties.",
      foot: "Best 60°F to 75°F · Holds in current",
      active: function (water) { return water >= 60 && water <= 78; },
      tags: [
        { label: "Current tolerant", on: function () { return true; } },
        { label: "Spawning window", on: function (water) { return water >= 58 && water <= 68; } },
        { label: "Settled weather", on: function (water, pressure) { return pressure === "High and settled"; } }
      ]
    },
    {
      num: "No. 03",
      name: "Bluegill",
      latin: "Lepomis macrochirus",
      line: "The bream everybody starts on. Spawns in colonies on shallow beds from late spring right through summer, so the same few yards of bank can hold dozens of fish at once. Warm shallows and a quiet approach do more than tackle does.",
      foot: "Best above 68°F · Beds in the shallows",
      active: function (water) { return water >= 68; },
      tags: [
        { label: "Warm shallows", on: function (water) { return water >= 68; } },
        { label: "Bedding season", on: function (water) { return water >= 70 && water <= 84; } },
        { label: "Good for children", on: function () { return true; } }
      ]
    }
  ];

  /* -------------------------------------------------------------------------
     THE YEAR

     Written by water temperature rather than by date, because that is what the
     fish are actually responding to. The months are a rough guide to when this
     creek usually reaches each of those temperatures.
     ------------------------------------------------------------------------- */
  const FISHING_YEAR = {
    0: { lead: "Cold and slow", note: "Water in the forties. Everything holds deep and eats little. Catfish are the realistic target." },
    1: { lead: "First warming", note: "A run of mild days can lift the shallows enough to move bass out of the deep water for an afternoon." },
    2: { lead: "Pre-spawn", note: "Bass feed hard as the water climbs through the fifties. One of the better months of the year." },
    3: { lead: "Bass spawn", note: "The low sixties put spotted and largemouth bass on beds. Handle and release spawning fish quickly." },
    4: { lead: "Bream move up", note: "Water past sixty eight and the bluegill start bedding in the shallows. Easiest fishing of the year." },
    5: { lead: "Full summer pattern", note: "Everything works early and late. The middle of the day belongs to the shade and the deep bends." },
    6: { lead: "Hot and low", note: "Low, clear, warm water. First light or nothing, and catfish after dark." },
    7: { lead: "The hard month", note: "Warmest water of the year and the least oxygen in it. Fish the moving water and the shade." },
    8: { lead: "Cooling off", note: "The first cool nights drop the water back into a range the bass will work again." },
    9: { lead: "Fall feeding", note: "Shortening days push everything to eat. Bass move shallow again and stay catchable all day." },
    10: { lead: "Slowing down", note: "Water back through the fifties. The bite gets shorter and more predictable each week." },
    11: { lead: "Winter holding", note: "Deep, slow, and quiet. Fish are still there and still eat, just not much and not often." }
  };

  function renderSpecies(water, pressureLabel) {
    setHTML("fishSpecies", SPECIES.map(function (fish) {
      const tags = fish.tags.map(function (tag) {
        return '<span class="b-tag' + (tag.on(water, pressureLabel) ? " on" : "") + '">' + escapeHtml(tag.label) + "</span>";
      }).join("");
      return '<div class="card-check">' +
        '<span class="b-hole"></span>' +
        '<div class="b-num">' + escapeHtml(fish.num) + "</div>" +
        '<div class="b-name">' + escapeHtml(fish.name) + "</div>" +
        '<div class="b-latin">' + escapeHtml(fish.latin) + "</div>" +
        '<div class="b-tags">' + tags + "</div>" +
        '<div class="b-line">' + escapeHtml(fish.line) + "</div>" +
        '<div class="b-foot">' + escapeHtml(fish.foot) + "</div>" +
        "</div>";
    }).join(""));
  }

  function renderYear(month) {
    const cells = [];
    for (let i = 0; i < 12; i += 1) {
      const entry = FISHING_YEAR[i];
      cells.push('<div class="month-cell' + (i === month ? " on" : "") + '">' +
        '<div class="month-name">' + escapeHtml(FA.MONTHS_LONG[i]) + "</div>" +
        '<div class="month-lead">' + escapeHtml(entry.lead) + "</div>" +
        '<div class="month-note">' + escapeHtml(entry.note) + "</div>" +
        "</div>");
    }
    setHTML("fishYear", cells.join(""));
    setText("fishYearStamp", FA.MONTHS_LONG[month] + " is marked");
  }

  function renderRatings(rows) {
    setHTML("fishRatings", rows.map(function (row) {
      return '<div class="alm-row">' +
        '<div class="alm-mark">' + iconHtml(row.icon) + "</div>" +
        "<div>" +
          '<div class="alm-head-line"><span class="alm-stars ' + row.cls + '">' + row.stars + "</span>" +
          '<span class="alm-name">' + escapeHtml(row.name) + "</span></div>" +
          '<div class="alm-note">' + escapeHtml(row.note) + "</div>" +
        "</div></div>";
    }).join(""));
  }

  function paintTile(id, value, sentence) {
    setHTML(id + "Val", value == null ? "&mdash;" : escapeHtml(value));
    setText(id + "Sub", sentence || "This reading is not coming through right now.");
  }

  function narrative(water, pressure, mood, stage) {
    const parts = [];
    parts.push("Water is running around " + water + "°F by estimate, which is " +
      (water >= 78 ? "warm enough that the middle of the day is a write-off"
        : water >= 68 ? "the range bream and catfish both want"
        : water >= 58 ? "comfortable for bass and getting there for everything else"
        : "cold enough that everything is holding deep and eating slowly") + ".");
    if (Number.isFinite(stage)) {
      parts.push("The creek is at " + stage.toFixed(2) + " feet, which reads as " + mood.label.toLowerCase() + ".");
    }
    parts.push("The barometer reads " + pressure.label.toLowerCase() + ". " + pressure.note);
    return parts.join(" ");
  }

  async function load() {
    const now = new Date();
    const month = now.getMonth();
    renderYear(month);
    setText("fishStamp", now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));

    const results = await Promise.all([FA.readWeather(), FA.readCreek()]);
    const wx = results[0];
    const creek = results[1];

    const stage = creek && Number.isFinite(creek.stage) ? creek.stage : NaN;
    const mood = FA.creekMood(stage);
    paintTile("fishCreek", Number.isFinite(stage) ? stage.toFixed(2) + " ft" : null,
      Number.isFinite(stage) ? mood.label + ". " + mood.note : "The Republic gauge is not answering right now.");

    if (!wx) {
      paintTile("fishWater", null, "Water temperature is estimated from the station reading, which is offline.");
      paintTile("fishPressure", null, "The station is not reporting a barometer right now.");
      paintTile("fishWindow", null, "The daily window needs the station reading.");
      setText("fishNarrative", "The weather station file did not load, so today's water estimate and pressure trend are missing. The creek reading above still stands on its own.");
      setText("fishReadStamp", "Station offline");
      renderSpecies(70, "Moderate");
      setHTML("fishRatings", '<div class="empty">Today’s ratings come back when the station file loads.</div>');
      FA.setRailSub("fishing", "Station offline");
      return;
    }

    const water = FA.estimateWaterTemp(wx.temp, month);
    const pressure = FA.pressureNote(wx.pressureIn);
    const window = FA.bestFishingWindow(wx);
    const rows = FA.fishingRows(wx);

    paintTile("fishWater", water + "°F", "Estimated from air temperature and the season, not measured in the water.");
    paintTile("fishPressure", pressure.label, pressure.note);
    paintTile("fishWindow", window.time, window.note);

    renderRatings(rows);
    renderSpecies(water, pressure.label);
    setText("fishNarrative", narrative(water, pressure, mood, stage));
    setText("fishReadStamp", "Station reading");
    FA.setRailSub("fishing", water + "°F water · " + window.time);
  }

  function boot() {
    FA.renderRail("fishing");
    FA.renderBackLink();
    load();
    window.setInterval(load, 10 * 60 * 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
