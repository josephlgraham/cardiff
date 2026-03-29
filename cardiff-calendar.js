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
    if ((entry.lane || "") === "celestial") return "Sky marker";
    if ((entry.lane || "") === "hunting") return "Season window";
    if ((entry.lane || "") === "frost") return "Garden timing";
    if ((entry.lane || "") === "civic") return "Town marker";
    return "Season marker";
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
      '<h2 class="holiday-title">' + escapeHtml(feature.title) + "</h2>" +
      '<p class="holiday-copy">' + escapeHtml(feature.summary) + "</p>" +
      '<div class="event-meta">' +
        '<div class="meta-row"><div class="meta-icon">📍</div><div><div class="meta-label">Calendar lane</div><div class="meta-copy">' + escapeHtml((feature.lane || "season").replace(/_/g, " ")) + "</div></div></div>" +
        '<div class="meta-row"><div class="meta-icon">🏷️</div><div><div class="meta-label">Type</div><div class="meta-copy">' + escapeHtml(entryMeta(feature) || "Season marker") + "</div></div></div>" +
        '<div class="meta-row"><div class="meta-icon">📝</div><div><div class="meta-label">Why it is here</div><div class="meta-copy">This calendar keeps the town&rsquo;s seasonal cues, sky dates, and practical public dates in one place instead of scattering them across the site.</div></div></div>' +
      "</div>";

    sideTarget.innerHTML = rest.slice(0, 3).map((entry) => (
      '<article class="card mini-card reveal">' +
        '<div class="mini-date">' + escapeHtml(entry.longDateLabel || entry.dateLabel || entry.windowLabel || "") + "</div>" +
        '<div class="mini-title">' + escapeHtml(entry.title) + "</div>" +
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
              '<div><div class="month-title">' + escapeHtml(entry.title) + '</div><div class="month-copy">' + escapeHtml(entry.summary) + "</div></div>" +
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
