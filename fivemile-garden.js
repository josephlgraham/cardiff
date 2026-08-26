/* ===========================================================================
   FIVEMILE garden desk

   The planting year for zone 7b running into 8a on creek bottomland.

   The month tables live in fivemile-almanac-core.js because the almanac reads
   them too. The two frost dates are the ones this site already keeps in
   fivemile-season-data.js, around March 20 and around November 15, and they
   are read from there rather than restated, so correcting them corrects
   everything downstream.
   =========================================================================== */
(function () {
  "use strict";

  const FA = window.FivemileAlmanac;
  if (!FA) return;

  const setText = FA.setText;
  const setHTML = FA.setHTML;
  const escapeHtml = FA.escapeHtml;
  const iconHtml = FA.iconHtml;

  /* The frost lookup lives in the core now. The almanac carries a garden card
     that needs the same two dates, and two copies of a date lookup is how the
     two pages end up disagreeing about when to plant. */
  const frostDates = FA.frostDates;
  const nextOccurrence = FA.nextOccurrence;
  const daysBetween = FA.daysBetween;

  function paintTile(id, value, sentence) {
    setHTML(id + "Val", value == null ? "&mdash;" : escapeHtml(value));
    setText(id + "Sub", sentence || "This reading is not coming through right now.");
  }

  function renderJobs(guide) {
    setHTML("gardenJobs", guide.items.map(function (item) {
      return '<div class="alm-row">' +
        '<div class="alm-mark">' + iconHtml(item.icon) + "</div>" +
        "<div>" +
          '<div class="alm-name">' + escapeHtml(item.name) + "</div>" +
          '<div class="alm-status ' + FA.plantActionClass(item.action) + '">' + escapeHtml(item.action) + "</div>" +
          '<div class="alm-note">' + escapeHtml(item.note) + "</div>" +
        "</div></div>";
    }).join(""));
  }

  function renderYear(month) {
    const cells = [];
    for (let i = 0; i < 12; i += 1) {
      const guide = FA.PLANTING_GUIDE[i];
      cells.push('<div class="month-cell' + (i === month ? " on" : "") + '">' +
        '<div class="month-name">' + escapeHtml(FA.MONTHS_LONG[i]) + "</div>" +
        '<div class="month-lead">' + escapeHtml(guide.tag) + "</div>" +
        '<div class="month-note">' + escapeHtml(guide.note) + "</div>" +
        "</div>");
    }
    setHTML("gardenYear", cells.join(""));
  }

  /* The photographs the packet windows hold. Written by
     scripts/build-garden-photos.mjs, which is where the choosing and the
     crediting happen. Read once and kept, because the file is a few hundred
     bytes and the packets redraw every half hour.

     It carries two things: the photographs, keyed by crop, and which crop each
     planting guide entry uses. Fall tomatoes and tomatoes are the same plant
     and share one. */
  let PHOTOS = null;

  async function readPhotos() {
    if (PHOTOS) return PHOTOS;
    try {
      PHOTOS = await FA.fetchJSON("fivemile-garden-photos.json");
    } catch (err) {
      PHOTOS = { photos: {}, items: {} };
    }
    return PHOTOS;
  }

  function photoFor(item) {
    const book = PHOTOS || { photos: {}, items: {} };
    return book.photos[book.items[item.name]] || null;
  }

  /* A photograph of somebody else's okra is still somebody else's okra, so the
     name, the licence, and the way back to the file go under the window. The
     field guide credits its photographs the same way and for the same reason:
     a picture with no provenance is a rumor, the same as a number. */
  function windowHtml(photo) {
    return '<div class="s-win"><img src="' + escapeHtml(photo.src) + '" alt="' +
      escapeHtml(photo.alt) + '" loading="lazy" decoding="async" width="480" height="360"></div>' +
      '<p class="s-credit">' + escapeHtml(photo.credit) + '. ' + escapeHtml(photo.license) +
      ', via <a href="' + escapeHtml(photo.url) + '" target="_blank" rel="noopener">' +
      escapeHtml(photo.source) + "</a>.</p>";
  }

  /* One packet a month, for the crop the month leads with.

     A row of three packets was too much of the same thing at once: the list
     beside it already carries every job for the month, planting and tending
     and harvesting alike, and repeating three of them as cards said nothing
     the list had not. So the month gets one crop, printed properly, with a
     photograph and the sowing under it. Everything else stays a line of type
     in the list, which is the right weight for it.

     The lead crop is the first thing going in the ground this month that has
     a photograph. A packet is a photograph of a crop with the sowing under
     it, so a packet with an empty window is not a packet, and a month with no
     photograph for anything it is sowing runs the list on its own rather than
     printing a blank one. */
  function renderFeature(guide, month) {
    const row = document.getElementById("gardenMonthRow");
    const sowing = guide.items.filter(function (item) {
      return FA.plantActionClass(item.action) === "pa-plant";
    });
    const lead = sowing.filter(photoFor)[0] || null;

    if (row) row.classList.toggle("no-feature", !lead);
    if (!lead) {
      setHTML("gardenFeature", "");
      return;
    }

    const photo = photoFor(lead);
    setHTML("gardenFeature",
      '<div class="card-packet">' +
        '<div class="s-top"><div class="k">' + escapeHtml(FA.MONTHS_LONG[month]) + "</div>" +
        "<h3>" + escapeHtml(lead.name) + "</h3></div>" +
        windowHtml(photo) +
        '<div class="s-bd">' +
          '<div class="s-row"><span>This month</span><b>' + escapeHtml(lead.action) + "</b></div>" +
          '<div class="s-row"><span>Zone</span><b>7b to 8a</b></div>' +
          '<div class="s-foot">' + escapeHtml(lead.note) + "</div>" +
        "</div></div>");
  }

  function narrative(now, frost, wx) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nextSpring = nextOccurrence(now, frost.spring);
    const nextFall = nextOccurrence(now, frost.fall);
    const next = nextSpring < nextFall ? { when: nextSpring, kind: "last spring frost" } : { when: nextFall, kind: "first fall frost" };
    const days = daysBetween(today, next.when);
    const parts = [];
    parts.push("The " + next.kind + " is about " + days + " day" + (days === 1 ? "" : "s") + " out, around " +
      FA.MONTHS_SHORT[next.when.getMonth()] + " " + next.when.getDate() + ".");
    if (wx) {
      const ground = FA.groundCondition(wx.precipTotal, wx.humidity);
      parts.push(ground.title + ". " + ground.note);
    }
    parts.push("Bottomland beds drain unevenly, so the low corner of a plot is a different garden from the high end of it.");
    return parts.join(" ");
  }

  async function load() {
    const now = new Date();
    const month = now.getMonth();
    const guide = FA.PLANTING_GUIDE[month];
    const frost = frostDates();

    setText("gardenStamp", now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
    setText("gardenTag", guide.tag);
    setText("gardenMonthName", FA.MONTHS_LONG[month]);
    renderJobs(guide);
    renderYear(month);
    await readPhotos();
    renderFeature(guide, month);
    FA.setRailSub("garden", guide.items[0].action + " " + guide.items[0].name.toLowerCase());

    paintTile("gardenMonth", FA.MONTHS_LONG[month], guide.lead);

    const next = FA.nextFrost(now);
    paintTile("gardenFrost", next.days + " days",
      next.kind + ", around " + next.label + ". An average, not a deadline.");

    /* Growing season length, worked out from the two dates rather than stated
       as a number somebody would have to remember to update. */
    const springThisYear = new Date(now.getFullYear(), frost.spring.month, frost.spring.day);
    const fallThisYear = new Date(now.getFullYear(), frost.fall.month, frost.fall.day);
    setText("gardenSeasonLength", "About " + daysBetween(springThisYear, fallThisYear) + " days");

    const wx = await FA.readWeather();
    setText("gardenNarrative", narrative(now, frost, wx));
    if (wx) {
      const ground = FA.groundCondition(wx.precipTotal, wx.humidity);
      paintTile("gardenGround", ground.title, ground.note);
      FA.setTileMark("gardenGround", ground.icon, ground.title);
    } else {
      paintTile("gardenGround", null, "The station file is not answering, so walk the beds and judge it yourself.");
    }

    const creek = await FA.readCreek();
    if (creek && creek.rain && Number.isFinite(Number(creek.rain.monthToDate))) {
      const total = Number(creek.rain.monthToDate);
      paintTile("gardenRain", total.toFixed(2) + '"',
        "Rain measured at the Cardiff station so far in " + (creek.rain.monthLabel || "this month") + ".");
    } else {
      paintTile("gardenRain", null, "Waiting on the station file.");
    }
  }

  function boot() {
    FA.renderRail("garden");
    FA.renderBackLink();
    load();
    window.setInterval(load, 30 * 60 * 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
