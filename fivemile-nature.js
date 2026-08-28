/* ===========================================================================
   FIVEMILE nature watch desk

   What is moving, blooming, and calling this month, and the season windows
   the year turns on.

   The month tables live in fivemile-almanac-core.js. The season windows come
   from fivemile-season-data.js, which is the same file the calendar page
   reads, so the two can never disagree about a date. Civic dates are filtered
   out here: those belong to the calendar and this is not a calendar.

   Hunting seasons appear as dates and only as dates. See CLAUDE.md.
   =========================================================================== */
(function () {
  "use strict";

  const FA = window.FivemileAlmanac;
  if (!FA) return;

  const setText = FA.setText;
  const setHTML = FA.setHTML;
  const escapeHtml = FA.escapeHtml;
  const iconHtml = FA.iconHtml;

  /* The lanes this desk covers. Everything the season data carries except
     civic, which is the calendar's. */
  const LANES = ["nature", "hunting", "frost", "tradition"];
  const STORAGE_KEY = "cardiff-season-windows-expanded";

  /* What people have actually recorded along the lower creek, from
     iNaturalist, gathered by scripts/fetch/inat-observations.mjs. The file is
     the whole contract: this reads it and asks nobody anything at runtime.
     Twelve rows before the reader opens the rest, same as the season windows
     below. */
  const OBS_URL = "fivemile-observations.json";
  const OBS_PREVIEW = 12;

  let expanded = false;
  let obsExpanded = false;

  function paintTile(id, value, sentence) {
    setHTML(id + "Val", value == null ? "&mdash;" : escapeHtml(value));
    setText(id + "Sub", sentence || "This reading is not coming through right now.");
  }

  function renderMonth(guide) {
    setHTML("natureBody", guide.items.map(function (item) {
      return '<div class="alm-row">' +
        '<div class="alm-mark">' + iconHtml(item.icon) + "</div>" +
        "<div>" +
          '<div class="alm-name">' + escapeHtml(item.title) + "</div>" +
          '<div class="alm-note">' + escapeHtml(item.note) + "</div>" +
        "</div></div>";
    }).join(""));
  }

  function renderYear(month) {
    const cells = [];
    for (let i = 0; i < 12; i += 1) {
      const guide = FA.NATURE_GUIDE[i];
      cells.push('<div class="month-cell' + (i === month ? " on" : "") + '">' +
        '<div class="month-name">' + escapeHtml(FA.MONTHS_LONG[i]) + "</div>" +
        '<div class="month-lead">' + escapeHtml(guide.tag) + "</div>" +
        '<div class="month-note">' + escapeHtml(guide.lead) + "</div>" +
        "</div>");
    }
    setHTML("natureYear", cells.join(""));
  }

  function renderWindows(now) {
    const preview = FA.seasonEntries(now, LANES, 3);
    const full = FA.seasonEntries(now, LANES);
    const entries = expanded ? full : preview;

    if (!entries.length) {
      setHTML("natureWindows", '<div class="empty">&mdash;</div>');
      return;
    }

    setHTML("natureWindows", entries.map(function (entry) {
      const when = entry.longDateLabel || entry.dateLabel || entry.windowLabel || "Watch the season";
      return '<div class="alm-row">' +
        '<div class="alm-mark">' + iconHtml(FA.seasonIcon(entry)) + "</div>" +
        "<div>" +
          '<div class="alm-head-line"><span class="alm-name">' + escapeHtml(entry.title) + "</span>" +
          '<span class="' + (entry.active ? "alm-open" : "alm-closed") + '">' + escapeHtml(entry.badge || (entry.active ? "Open" : "Ahead")) + "</span></div>" +
          '<div class="alm-when">' + escapeHtml(when) + " &middot; " + escapeHtml(entry.category || "Season window") + "</div>" +
          '<div class="alm-note">' + escapeHtml(entry.summary || "") + "</div>" +
        "</div></div>";
    }).join(""));

    const toggle = document.getElementById("natureExpand");
    if (!toggle) return;
    if (full.length <= preview.length) {
      toggle.hidden = true;
      return;
    }
    toggle.hidden = false;
    toggle.textContent = expanded ? "Show the next three months" : "Show the full run of seasons";
    toggle.onclick = function () {
      expanded = !expanded;
      try {
        window.localStorage.setItem(STORAGE_KEY, expanded ? "1" : "0");
      } catch (error) {
        /* Storage is optional here. */
      }
      renderWindows(now);
    };
  }

  /* "2026-08-25" is a calendar day, not an instant. Handing it to Date() reads
     it as UTC midnight and prints the day before in Central time. */
  function observedLabel(value) {
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
    if (!parts) return null;
    const date = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  }

  function observationRow(entry) {
    const when = observedLabel(entry.observedOn);
    /* An obscured record has no town on it and is not given one. iNaturalist
       withheld the location and this page does not guess at it. */
    const where = entry.place || (entry.obscured ? "Location withheld" : null);
    const line = [when, entry.group, where].filter(Boolean).join(" \u00b7 ");

    const sentence = [];
    if (entry.latin && entry.observer) {
      sentence.push(escapeHtml(entry.latin) + ", recorded by " + escapeHtml(entry.observer) + ".");
    } else if (entry.observer) {
      sentence.push("Recorded by " + escapeHtml(entry.observer) + ".");
    } else if (entry.latin) {
      sentence.push(escapeHtml(entry.latin) + ".");
    }
    if (entry.guide) {
      sentence.push('It is in the <a href="fivemile-guide.html#' + escapeHtml(entry.guide) + '">field guide</a>.');
    }

    return '<div class="alm-row">' +
      '<div class="alm-mark">' + iconHtml(entry.icon || "🍃") + "</div>" +
      "<div>" +
        '<div class="alm-head-line">' +
          '<a class="alm-name obs-name" href="' + escapeHtml(entry.url) + '" target="_blank" rel="noopener">' +
            escapeHtml(entry.name) + "</a>" +
          (entry.firstRecord ? '<span class="alm-open">First one recorded here</span>' : "") +
        "</div>" +
        (line ? '<div class="alm-when">' + escapeHtml(line) + "</div>" : "") +
        (sentence.length ? '<div class="alm-note">' + sentence.join(" ") + "</div>" : "") +
      "</div></div>";
  }

  function renderObservations(data) {
    const host = document.getElementById("obsList");
    if (!host) return;

    const entries = (data && data.observations) || [];
    if (!entries.length) {
      setHTML("obsList", '<div class="empty">&mdash;</div>');
      setHTML("obsStamp", "&mdash;");
      return;
    }

    const counts = data.counts || {};
    const months = Math.round((counts.window_days || 120) / 30);
    const species = counts.species_in_window || 0;
    setText("obsStamp", species + " species in the last " + months + " months");

    const shown = obsExpanded ? entries : entries.slice(0, OBS_PREVIEW);
    setHTML("obsList", shown.map(observationRow).join(""));

    const toggle = document.getElementById("obsExpand");
    if (!toggle) return;
    if (entries.length <= OBS_PREVIEW) {
      toggle.hidden = true;
      return;
    }
    toggle.hidden = false;
    toggle.textContent = obsExpanded
      ? "Show the last " + OBS_PREVIEW
      : "Show all " + entries.length;
    toggle.onclick = function () {
      obsExpanded = !obsExpanded;
      renderObservations(data);
    };
  }

  async function loadObservations() {
    try {
      const response = await fetch(OBS_URL, { cache: "no-store" });
      if (!response.ok) throw new Error("observations unavailable");
      renderObservations(await response.json());
    } catch (error) {
      /* The file is not answering. An em dash and nothing else. */
      setHTML("obsList", '<div class="empty">&mdash;</div>');
      setHTML("obsStamp", "&mdash;");
    }
  }

  function narrative(now, guide, sun, wx) {
    const parts = [guide.lead];
    const daylight = Math.round(FA.dayLengthHours(sun) * 10) / 10;
    parts.push("Sunrise is " + FA.formatClock(sun.rise) + " and sunset is " + FA.formatClock(sun.set) +
      ", which gives " + daylight + " hours of light.");
    if (wx) {
      const ground = FA.groundCondition(wx.precipTotal, wx.humidity);
      parts.push(ground.title + ". " + ground.note);
    }
    return parts.join(" ");
  }

  async function load() {
    const now = new Date();
    const month = now.getMonth();
    const guide = FA.NATURE_GUIDE[month];
    const sun = FA.getSunTimes(now);
    const daylight = Math.round(FA.dayLengthHours(sun) * 10) / 10;

    setText("natureStamp", now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
    setText("natureTag", guide.tag);
    setText("natureMonthName", FA.MONTHS_LONG[month]);
    renderMonth(guide);
    renderYear(month);
    renderWindows(now);
    FA.setRailSub("nature", guide.items[0].title);

    paintTile("natureMonth", guide.tag, guide.lead);
    paintTile("natureLight", daylight + " hours",
      "Sunrise " + FA.formatClock(sun.rise) + ", sunset " + FA.formatClock(sun.set) + ". Day length is what most of this responds to.");

    const windows = FA.seasonEntries(now, LANES, 3);
    if (windows.length) {
      const lead = windows.find(function (entry) { return entry.active; }) || windows[0];
      paintTile("natureWindow", lead.title,
        (lead.longDateLabel || lead.dateLabel || lead.windowLabel || "Watch the season") + ". " + (lead.summary || ""));
    } else {
      paintTile("natureWindow", null, "Nothing is queued in the next three months.");
    }

    loadObservations();

    const wx = await FA.readWeather();
    setText("natureReadStamp", wx ? "Station reading" : "Station offline");
    setText("natureNarrative", narrative(now, guide, sun, wx));
    if (wx) {
      const ground = FA.groundCondition(wx.precipTotal, wx.humidity);
      paintTile("natureGround", ground.title, ground.note);
      FA.setTileMark("natureGround", ground.icon, ground.title);
    } else {
      paintTile("natureGround", null, "The station file is not answering, so walk the yard and judge it yourself.");
    }
  }

  function boot() {
    FA.renderRail("nature");
    FA.renderBackLink();
    try {
      expanded = window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch (error) {
      expanded = false;
    }
    load();
    window.setInterval(load, 30 * 60 * 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
