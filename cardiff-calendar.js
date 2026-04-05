(function () {
  "use strict";

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function entryTone(entry) {
    if (!entry) return "Calendar entry";
    if (entry.active) return "Active now";
    if ((entry.lane || "") === "tradition" || (entry.category || "") === "Tradition") return "Tradition marker";
    if ((entry.lane || "") === "celestial") return "Sky marker";
    if ((entry.lane || "") === "hunting") return "Season window";
    if ((entry.lane || "") === "frost") return "Garden timing";
    if ((entry.lane || "") === "civic") return "Town marker";
    return "Season marker";
  }

  function entryIcon(entry) {
    const title = String(entry && entry.title || "").toLowerCase();
    if (title.includes("ramps")) return "🧅";
    if (title.includes("morel")) return "🍄";
    if (title.includes("turkey")) return "🦃";
    if (title.includes("equinox")) return "⚖️";
    if (title.includes("frost")) return "🥶";
    if (title.includes("may day")) return "🌸";
    if (title.includes("fireflies")) return "✨";
    if (title.includes("catfish")) return "🐟";
    if (title.includes("summer solstice")) return "☀️";
    if (title.includes("midsummer")) return "🔥";
    if (title.includes("blackberr")) return "🫐";
    if (title.includes("muscadine")) return "🍇";
    if (title.includes("green corn")) return "🌽";
    if (title.includes("dove")) return "🕊️";
    if (title.includes("fall equinox")) return "🍂";
    if (title.includes("all hallows")) return "🎃";
    if (title.includes("squirrel")) return "🐿️";
    if (title.includes("orionid") || title.includes("leonid") || title.includes("perseid") || title.includes("geminid")) return "☄️";
    if (title.includes("deer")) return "🦌";
    if (title.includes("persimmon")) return "🧡";
    if (title.includes("winter solstice")) return "❄️";
    if (title.includes("incorporation")) return "🏛️";
    if (title.includes("tornado siren")) return "🚨";
    if (title.includes("city council")) return "🏛️";
    if ((entry && entry.lane) === "tradition") return "🕯️";
    if ((entry && entry.lane) === "celestial") return "🔭";
    if ((entry && entry.lane) === "nature") return "🍃";
    if ((entry && entry.lane) === "hunting") return "🦌";
    if ((entry && entry.lane) === "frost") return "🌱";
    if ((entry && entry.lane) === "civic") return "📌";
    return "📅";
  }

  function entryMeta(entry) {
    const parts = [];
    if (entry.category) parts.push(entry.category);
    if (entry.badge) parts.push(entry.badge);
    return parts.join(" · ");
  }

  function renderFeatured(entries) {
    const featureTarget = document.getElementById("featuredDateShell");
    const sideTarget = document.getElementById("upcomingMiniShell");
    if (!featureTarget || !sideTarget || !entries.length) return;

    const [feature, ...rest] = entries;
    featureTarget.innerHTML =
      '<div class="section-kicker">Featured date</div>' +
      '<div class="feature-row">' +
        '<div class="date-chip">' + escapeHtml(entryTone(feature)) + '</div>' +
        '<div class="date-chip">' + escapeHtml(feature.longDateLabel || feature.dateLabel || feature.windowLabel || "") + "</div>" +
      "</div>" +
      '<h2 class="holiday-title">' + escapeHtml(entryIcon(feature) + " " + feature.title) + "</h2>" +
      '<p class="holiday-copy">' + escapeHtml(feature.summary) + "</p>" +
      '<div class="event-meta">' +
        '<div class="meta-row"><div class="meta-icon">📍</div><div><div class="meta-label">Calendar lane</div><div class="meta-copy">' + escapeHtml((feature.lane || "season").replace(/_/g, " ")) + "</div></div></div>" +
        '<div class="meta-row"><div class="meta-icon">🏷️</div><div><div class="meta-label">Type</div><div class="meta-copy">' + escapeHtml(entryMeta(feature) || "Season marker") + "</div></div></div>" +
        '<div class="meta-row"><div class="meta-icon">📝</div><div><div class="meta-label">Why it is here</div><div class="meta-copy">This calendar keeps the town&rsquo;s seasonal cues, sky dates, and practical public dates in one place instead of scattering them across the site.</div></div></div>' +
      "</div>";

    sideTarget.innerHTML = rest.slice(0, 3).map((entry) => (
      '<article class="card mini-card reveal">' +
        '<div class="mini-date">' + escapeHtml(entry.longDateLabel || entry.dateLabel || entry.windowLabel || "") + "</div>" +
        '<div class="mini-title">' + escapeHtml(entryIcon(entry) + " " + entry.title) + "</div>" +
        '<div class="mini-copy">' + escapeHtml(entry.summary) + "</div>" +
      "</article>"
    )).join("");
  }

  function renderMonths(months) {
    const target = document.getElementById("seasonalMonthShell");
    if (!target) return;
    target.innerHTML = months.map((month) => (
      '<section class="card month-shell reveal">' +
        '<div class="section-kicker">' + escapeHtml(month.label) + "</div>" +
        '<div class="month-list">' +
          month.items.map((entry) => (
            '<div class="month-item">' +
              '<div class="month-date">' + escapeHtml(entry.dateLabel || entry.windowLabel || "") + "</div>" +
              '<div class="month-icon">' + escapeHtml(entryIcon(entry)) + '</div>' +
              '<div class="month-main"><div class="month-title">' + escapeHtml(entry.title) + '</div><div class="month-copy">' + escapeHtml(entry.summary) + "</div></div>" +
            "</div>"
          )).join("") +
        "</div>" +
      "</section>"
    )).join("");
  }

  function renderNotes(nextEntries) {
    const target = document.getElementById("calendarStatusNote");
    if (!target) return;
    const activeCount = nextEntries.filter((entry) => entry.active).length;
    const nextLabel = nextEntries[0] ? (nextEntries[0].title + " · " + (nextEntries[0].longDateLabel || nextEntries[0].dateLabel || nextEntries[0].windowLabel || "")) : "Waiting on entries";
    target.textContent = activeCount
      ? activeCount + " season windows are active right now. Next on the list: " + nextLabel
      : "Next on the list: " + nextLabel;
  }

  function bootCalendar() {
    const sharedSeasonData = window.CardiffSeasonData;
    if (!sharedSeasonData) return;
    const nextEntries = sharedSeasonData.getUpcomingCalendar(new Date(), 4);
    const months = sharedSeasonData.getCalendarMonths(new Date(), 8).filter((month) => month.items && month.items.length);
    renderFeatured(nextEntries);
    renderMonths(months);
    renderNotes(nextEntries);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootCalendar);
  } else {
    bootCalendar();
  }
})();
