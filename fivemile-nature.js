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

  let expanded = false;

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

    const wx = await FA.readWeather();
    setText("natureReadStamp", wx ? "Station reading" : "Station offline");
    setText("natureNarrative", narrative(now, guide, sun, wx));
    if (wx) {
      const ground = FA.groundCondition(wx.precipTotal, wx.humidity);
      paintTile("natureGround", ground.title, ground.note);
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
