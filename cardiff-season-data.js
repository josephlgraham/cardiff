(function () {
  "use strict";

  const YEAR_WINDOW_DAYS = 366;
  const DAY_MS = 24 * 60 * 60 * 1000;

  const SEASON_ENTRIES = [
    {
      id: "incorporation-anniversary",
      title: "Cardiff incorporation anniversary",
      category: "Civic",
      lane: "civic",
      kind: "day",
      month: 1,
      day: 1,
      windowLabel: "January 1900",
      calendarLabel: "Jan 1",
      seasonTag: "calendar",
      activeTag: "calendar",
      upcomingTag: "coming up",
      summary: "An annual marker for the town itself. Incorporated January 1900."
    },
    {
      id: "ramps",
      title: "Ramps & wild onions",
      category: "Foraging",
      lane: "nature",
      kind: "range",
      startMonth: 2,
      startDay: 15,
      endMonth: 4,
      endDay: 1,
      windowLabel: "Feb 15 - Apr 1",
      calendarLabel: "Feb 15 - Apr 1",
      seasonTag: "worth a look",
      activeTag: "worth a look",
      upcomingTag: "coming up",
      summary: "Earliest green on the creek bottoms. Look for the broad flat leaves before anything else leafs out. Smell confirms it."
    },
    {
      id: "morels",
      title: "Morels",
      category: "Foraging",
      lane: "nature",
      kind: "range",
      startMonth: 3,
      startDay: 1,
      endMonth: 4,
      endDay: 30,
      windowLabel: "Mar - Apr",
      calendarLabel: "Mar - Apr",
      seasonTag: "worth a look",
      activeTag: "worth a look",
      upcomingTag: "wait for spring",
      summary: "Warm wet days, tulip poplar slopes, old orchards, and the sort of ground people keep half-secret for a reason."
    },
    {
      id: "spring-equinox",
      title: "Spring equinox",
      category: "Celestial",
      lane: "celestial",
      kind: "day",
      month: 3,
      day: 20,
      windowLabel: "Mar 20",
      calendarLabel: "Around Mar 20",
      seasonTag: "calendar",
      activeTag: "watch for",
      upcomingTag: "watch for",
      summary: "Day and night in balance. Older planting calendars treated this as a real turning, not just a date on paper."
    },
    {
      id: "may-day-echoes",
      title: "May Day & old spring customs",
      category: "Tradition",
      lane: "tradition",
      kind: "day",
      month: 5,
      day: 1,
      windowLabel: "May 1",
      calendarLabel: "May 1",
      seasonTag: "calendar",
      activeTag: "watch for",
      upcomingTag: "watch for",
      summary: "Flowering, ribbons, bonfires, and spring-fire customs in older European calendars lived near this turning. Not a local legal holiday, just part of the longer seasonal inheritance."
    },
    {
      id: "easter-season",
      title: "Easter season",
      category: "Christian calendar",
      lane: "tradition",
      kind: "range",
      startMonth: 3,
      startDay: 29,
      endMonth: 4,
      endDay: 12,
      windowLabel: "Late Mar - early Apr",
      calendarLabel: "Moves each spring",
      seasonTag: "calendar",
      activeTag: "watch for",
      upcomingTag: "watch for",
      summary: "Christian spring observance gathered around older rebirth-season symbols, dawn worship, flowers, and egg imagery that long predate modern church calendars. The exact date moves year to year."
    },
    {
      id: "last-spring-frost",
      title: "Last spring frost",
      category: "Garden",
      lane: "frost",
      kind: "day",
      month: 3,
      day: 20,
      windowLabel: "Around Mar 20",
      calendarLabel: "Around Mar 20",
      seasonTag: "watch for",
      activeTag: "watch for",
      upcomingTag: "watch for",
      summary: "Creek-bottom gardens can run a little later, but this is the frost date people still plan around."
    },
    {
      id: "turkey-season",
      title: "Turkey season",
      category: "Hunting",
      lane: "hunting",
      kind: "range",
      startMonth: 3,
      startDay: 15,
      endMonth: 5,
      endDay: 8,
      windowLabel: "Spring (Mar - May)",
      calendarLabel: "Approx. Mar - May",
      seasonTag: "on now",
      activeTag: "on now",
      upcomingTag: "later on",
      summary: "Gobblers, green-up, and early starts. Confirm Alabama dates each year before treating it as a legal calendar."
    },
    {
      id: "fireflies",
      title: "Fireflies (first light)",
      category: "Worth a look",
      lane: "nature",
      kind: "range",
      startMonth: 5,
      startDay: 20,
      endMonth: 6,
      endDay: 15,
      windowLabel: "Late May - Jun",
      calendarLabel: "Late May - Jun",
      seasonTag: "worth a look",
      activeTag: "worth a look",
      upcomingTag: "watch for",
      summary: "Usually two weeks in late May into early June in the creek bottoms. One of the better reasons to be out after dark."
    },
    {
      id: "catfish-noodling",
      title: "Catfish noodling",
      category: "Oddball season",
      lane: "hunting",
      kind: "range",
      startMonth: 5,
      startDay: 1,
      endMonth: 8,
      endDay: 31,
      windowLabel: "May 1 - Aug 31",
      calendarLabel: "May 1 - Aug 31",
      seasonTag: "on now",
      activeTag: "on now",
      upcomingTag: "coming up",
      summary: "Legal in Alabama May 1 through August 31. Half joke, half tradition. It earns its place."
    },
    {
      id: "summer-solstice",
      title: "Summer solstice",
      category: "Celestial",
      lane: "celestial",
      kind: "day",
      month: 6,
      day: 21,
      windowLabel: "Jun 21",
      calendarLabel: "Around Jun 21",
      seasonTag: "calendar",
      activeTag: "watch for",
      upcomingTag: "watch for",
      summary: "The longest day of the year. Peoples across the Southeast watched solar turnings long before they lived on printed calendars, and later midsummer customs gathered around the same light."
    },
    {
      id: "midsummer-customs",
      title: "Midsummer customs",
      category: "Tradition",
      lane: "tradition",
      kind: "range",
      startMonth: 6,
      startDay: 21,
      endMonth: 6,
      endDay: 24,
      windowLabel: "Around Jun 21 - 24",
      calendarLabel: "Around Jun 21 - 24",
      seasonTag: "calendar",
      activeTag: "watch for",
      upcomingTag: "watch for",
      summary: "Bonfires, flower customs, and long-light celebrations sit near this point in older midsummer traditions. The shape of the season came first, the names came later."
    },
    {
      id: "blackberries",
      title: "Blackberries",
      category: "Foraging",
      lane: "nature",
      kind: "range",
      startMonth: 6,
      startDay: 20,
      endMonth: 7,
      endDay: 31,
      windowLabel: "Late Jun - Jul",
      calendarLabel: "Late Jun - Jul",
      seasonTag: "worth a look",
      activeTag: "worth a look",
      upcomingTag: "coming up",
      summary: "Late June into July along field edges and old clearings. The canes that were a nuisance all spring earn their keep now."
    },
    {
      id: "perseids",
      title: "Perseid meteor shower",
      category: "Celestial",
      lane: "celestial",
      kind: "range",
      startMonth: 8,
      startDay: 11,
      endMonth: 8,
      endDay: 13,
      windowLabel: "Around Aug 11 - 13",
      calendarLabel: "Around Aug 11 - 13",
      seasonTag: "watch for",
      activeTag: "watch for",
      upcomingTag: "watch for",
      summary: "Most reliable shower of the year. Summer heat, clear skies, and the creek bottom is a fine spot."
    },
    {
      id: "muscadines",
      title: "Muscadines",
      category: "Foraging",
      lane: "nature",
      kind: "range",
      startMonth: 8,
      startDay: 1,
      endMonth: 9,
      endDay: 30,
      windowLabel: "Aug - Sep",
      calendarLabel: "Aug - Sep",
      seasonTag: "worth a look",
      activeTag: "worth a look",
      upcomingTag: "later on",
      summary: "August into September in the creek edge tangles and old fence lines. Native and wild and as local as it gets."
    },
    {
      id: "green-corn-time",
      title: "Green Corn time (regional)",
      category: "Tradition",
      lane: "tradition",
      kind: "range",
      startMonth: 8,
      startDay: 1,
      endMonth: 8,
      endDay: 31,
      windowLabel: "Aug",
      calendarLabel: "August",
      seasonTag: "calendar",
      activeTag: "watch for",
      upcomingTag: "later on",
      summary: "Across the Southeast, many Native communities tied ceremony to the corn cycle rather than one fixed printed date. Timing varied by people and place, which is part of the point."
    },
    {
      id: "dove-season",
      title: "Dove season",
      category: "Hunting",
      lane: "hunting",
      kind: "range",
      startMonth: 9,
      startDay: 1,
      endMonth: 10,
      endDay: 31,
      windowLabel: "Sep 1 - Oct",
      calendarLabel: "Approx. Sep - Oct",
      seasonTag: "on now",
      activeTag: "on now",
      upcomingTag: "watch for",
      summary: "Opens September 1 in Alabama. A big deal in rural communities and worth keeping on the fall list."
    },
    {
      id: "fall-equinox",
      title: "Fall equinox",
      category: "Celestial",
      lane: "celestial",
      kind: "day",
      month: 9,
      day: 22,
      windowLabel: "Sep 22",
      calendarLabel: "Around Sep 22",
      seasonTag: "calendar",
      activeTag: "watch for",
      upcomingTag: "watch for",
      summary: "The second balance point of the year, when old harvest calendars and the land itself both start leaning harder into fall."
    },
    {
      id: "all-hallows-turn",
      title: "All Hallows turning",
      category: "Tradition",
      lane: "tradition",
      kind: "range",
      startMonth: 10,
      startDay: 31,
      endMonth: 11,
      endDay: 1,
      windowLabel: "Oct 31 - Nov 1",
      calendarLabel: "Oct 31 - Nov 1",
      seasonTag: "calendar",
      activeTag: "watch for",
      upcomingTag: "later on",
      summary: "Old end-of-harvest and turning-to-winter customs gathered around this edge of the year long before modern porch decorations got there first."
    },
    {
      id: "christmas-tide",
      title: "Christmas tide",
      category: "Christian calendar",
      lane: "tradition",
      kind: "range",
      startMonth: 12,
      startDay: 24,
      endMonth: 1,
      endDay: 6,
      windowLabel: "Dec 24 - Jan 6",
      calendarLabel: "Dec 24 - Jan 6",
      seasonTag: "calendar",
      activeTag: "on now",
      upcomingTag: "later on",
      summary: "Christian Christmas observance landed on a season already full of fire, evergreen, feast, and return-of-light customs. The church calendar came later than the winter turning it settled onto."
    },
    {
      id: "squirrel-season",
      title: "Squirrel season",
      category: "Hunting",
      lane: "hunting",
      kind: "range",
      startMonth: 10,
      startDay: 1,
      endMonth: 2,
      endDay: 28,
      windowLabel: "Oct - Feb",
      calendarLabel: "Approx. Oct - Feb",
      seasonTag: "good now",
      activeTag: "good now",
      upcomingTag: "later on",
      summary: "One of the friendlier seasons to learn because the sign is obvious and the rhythm is simple."
    },
    {
      id: "orionids",
      title: "Orionid meteor shower",
      category: "Celestial",
      lane: "celestial",
      kind: "day",
      month: 10,
      day: 21,
      windowLabel: "Around Oct 21",
      calendarLabel: "Around Oct 21",
      seasonTag: "watch for",
      activeTag: "watch for",
      upcomingTag: "watch for",
      summary: "Peaks around October 21. Debris from Halley's Comet. Good from a dark creek bottom with no moon interference."
    },
    {
      id: "deer-season",
      title: "Deer season",
      category: "Hunting",
      lane: "hunting",
      kind: "range",
      startMonth: 11,
      startDay: 15,
      endMonth: 1,
      endDay: 31,
      windowLabel: "Nov - Jan",
      calendarLabel: "Approx. Nov - Jan",
      seasonTag: "watch now",
      activeTag: "watch now",
      upcomingTag: "later on",
      summary: "Still the big woods conversation once the leaves turn and the mornings sharpen up."
    },
    {
      id: "first-fall-frost",
      title: "First fall frost",
      category: "Garden",
      lane: "frost",
      kind: "day",
      month: 11,
      day: 15,
      windowLabel: "Around Nov 15",
      calendarLabel: "Around Nov 15",
      seasonTag: "watch for",
      activeTag: "watch for",
      upcomingTag: "later on",
      summary: "The ridges feel it first. The bottoms often hold on a little longer before the first real nip."
    },
    {
      id: "persimmons",
      title: "Persimmons",
      category: "Foraging",
      lane: "nature",
      kind: "range",
      startMonth: 11,
      startDay: 15,
      endMonth: 12,
      endDay: 15,
      windowLabel: "After first frost",
      calendarLabel: "After first frost (around mid-November)",
      seasonTag: "later on",
      activeTag: "worth a walk",
      upcomingTag: "later on",
      summary: "Post-first-frost only. Before the frost they will pucker you. After it, they are worth the walk. The ridges hold them longest."
    },
    {
      id: "leonids",
      title: "Leonid meteor shower",
      category: "Celestial",
      lane: "celestial",
      kind: "day",
      month: 11,
      day: 17,
      windowLabel: "Around Nov 17",
      calendarLabel: "Around Nov 17",
      seasonTag: "watch for",
      activeTag: "watch for",
      upcomingTag: "watch for",
      summary: "Peaks around November 17. Can produce bursts in active years. Worth stepping outside even in a quiet year."
    },
    {
      id: "geminids",
      title: "Geminid meteor shower",
      category: "Celestial",
      lane: "celestial",
      kind: "range",
      startMonth: 12,
      startDay: 13,
      endMonth: 12,
      endDay: 14,
      windowLabel: "Around Dec 13 - 14",
      calendarLabel: "Around Dec 13 - 14",
      seasonTag: "watch for",
      activeTag: "watch for",
      upcomingTag: "watch for",
      summary: "Cold but worth it. Often the most active shower of the year, which is unusual because it does not come from a comet."
    },
    {
      id: "winter-solstice",
      title: "Winter solstice",
      category: "Celestial",
      lane: "celestial",
      kind: "day",
      month: 12,
      day: 21,
      windowLabel: "Dec 21",
      calendarLabel: "Around Dec 21",
      seasonTag: "calendar",
      activeTag: "watch for",
      upcomingTag: "watch for",
      summary: "The shortest day of the year. Long before modern Christmas calendars, people marked this dark turn with sky watching, fire, evergreens, and return-of-light traditions."
    }
  ];

  function atNoon(year, month, day) {
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  function cloneDate(date) {
    return new Date(date.getTime());
  }

  function addDays(date, days) {
    return new Date(date.getTime() + days * DAY_MS);
  }

  function formatMonthDay(date) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function formatFullDate(date) {
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }

  function buildOccurrence(entry, year) {
    if (entry.kind === "day") {
      const start = atNoon(year, entry.month, entry.day);
      const end = cloneDate(start);
      return { start, end };
    }

    const start = atNoon(year, entry.startMonth, entry.startDay);
    let end = atNoon(year, entry.endMonth, entry.endDay);
    if (end < start) end = atNoon(year + 1, entry.endMonth, entry.endDay);
    return { start, end };
  }

  function describeOccurrence(entry, occurrence, today) {
    const active = today >= occurrence.start && today <= addDays(occurrence.end, 1);
    const nextRelevant = active ? today : occurrence.start;
    const daysUntil = Math.round((occurrence.start - today) / DAY_MS);
    return {
      ...entry,
      start: occurrence.start,
      end: occurrence.end,
      active,
      daysUntil,
      nextRelevant,
      dateLabel:
        entry.kind === "day"
          ? formatMonthDay(occurrence.start)
          : entry.windowLabel,
      longDateLabel:
        entry.kind === "day"
          ? formatFullDate(occurrence.start)
          : `${formatMonthDay(occurrence.start)} - ${formatMonthDay(occurrence.end)}`,
      badge: active ? entry.activeTag : entry.upcomingTag
    };
  }

  function resolveEntry(entry, referenceDate) {
    const today = atNoon(referenceDate.getFullYear(), referenceDate.getMonth() + 1, referenceDate.getDate());
    const year = today.getFullYear();
    const candidateYears = [year - 1, year, year + 1];
    const occurrences = candidateYears
      .map((candidateYear) => describeOccurrence(entry, buildOccurrence(entry, candidateYear), today))
      .filter((item) => Math.abs(item.start - today) < YEAR_WINDOW_DAYS * DAY_MS);

    const active = occurrences.find((item) => item.active);
    if (active) return active;

    const upcoming = occurrences
      .filter((item) => item.start >= today)
      .sort((a, b) => a.start - b.start)[0];

    return upcoming || occurrences.sort((a, b) => a.start - b.start)[0];
  }

  function getSeasonEntries(referenceDate, monthsAhead) {
    const today = referenceDate ? new Date(referenceDate) : new Date();
    const horizon = addDays(today, Math.round((monthsAhead || 3) * 31));

    return SEASON_ENTRIES
      .map((entry) => resolveEntry(entry, today))
      .filter((entry) => entry.active || entry.start <= horizon)
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.start - b.start;
      });
  }

  function getAllEntries(referenceDate) {
    const today = referenceDate ? new Date(referenceDate) : new Date();
    return SEASON_ENTRIES
      .map((entry) => resolveEntry(entry, today))
      .sort((a, b) => a.start - b.start);
  }

  function getUpcomingCalendar(referenceDate, limit) {
    const today = referenceDate ? new Date(referenceDate) : new Date();
    const items = SEASON_ENTRIES
      .map((entry) => resolveEntry(entry, today))
      .filter((entry) => entry.active || entry.start >= addDays(today, -14))
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.start - b.start;
      });
    return typeof limit === "number" ? items.slice(0, limit) : items;
  }

  function markerTitle(entry, edge) {
    if (edge === "start") return entry.title + " opens";
    if (String(entry.title || "").toLowerCase().includes("season")) return entry.title + " closes";
    return entry.title + " winds down";
  }

  function markerSummary(entry, edge) {
    const lane = String(entry.lane || "").toLowerCase();
    const category = String(entry.category || "").toLowerCase();
    const title = String(entry.title || "");

    if (edge === "start") {
      if (title === "Easter season") return "This year's movable Easter window starts here, carrying older rebirth-season symbols into the Christian spring calendar.";
      if (title === "Christmas tide") return "This Christmas window opens here, landing on a season that was already full of fire, evergreen, and return-of-light customs.";
      if (lane === "hunting") return "This is the opening edge of the season window. Check current Alabama rules before treating it like a legal green light.";
      if (lane === "nature") return "This is the opening edge of the window, when the signs usually start showing up in the bottoms, edges, or woods.";
      if (lane === "tradition" || category === "christian calendar" || category === "tradition") return "This observance starts here on this year's calendar, even if the deeper seasonal roots run older than the printed dates.";
      if (lane === "celestial") return "This sky window starts here, which is your cue to begin watching before it slips past.";
      return "This is the opening edge of the window, when the season begins to show itself in a more readable way.";
    }

    if (title === "Easter season") return "This year's movable Easter window trails off here, but the older spring symbols and the season itself keep running past the printed date.";
    if (title === "Christmas tide") return "This Christmas window closes here, even though the winter turning and its older customs always run deeper than the church calendar.";
    if (lane === "hunting") return "This is the closing edge of the season window. After this point, it drops off the legal calendar even if the woods still feel the same.";
    if (lane === "nature") return "This is usually the trailing edge of the window, when the season starts handing off to whatever comes next.";
    if (lane === "tradition" || category === "christian calendar" || category === "tradition") return "This observance closes here on the printed calendar, but the seasonal meaning around it usually lingers longer.";
    if (lane === "celestial") return "This sky window is tapering out here, so it is the last clean stretch to catch it without waiting another year.";
    return "This is the trailing edge of the window, when the season starts letting go and giving way to the next marker.";
  }

  function getCalendarMonths(referenceDate, monthCount) {
    const today = referenceDate ? new Date(referenceDate) : new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1, 12, 0, 0, 0);
    const months = [];

    for (let index = 0; index < (monthCount || 6); index += 1) {
      const monthStart = new Date(start.getFullYear(), start.getMonth() + index, 1, 12, 0, 0, 0);
      const monthEnd = new Date(start.getFullYear(), start.getMonth() + index + 1, 0, 12, 0, 0, 0);
      const items = SEASON_ENTRIES
        .map((entry) => resolveEntry(entry, monthStart))
        .flatMap((entry) => {
          if (entry.end < monthStart || entry.start > monthEnd) return [];
          if (entry.kind !== "range") return [entry];

          const startInMonth = entry.start >= monthStart && entry.start <= monthEnd;
          const endInMonth = entry.end >= monthStart && entry.end <= monthEnd;
          if (startInMonth && endInMonth) return [entry];

          const markers = [];
          if (startInMonth) {
            markers.push({
              ...entry,
              title: markerTitle(entry, "start"),
              dateLabel: formatMonthDay(entry.start),
              longDateLabel: formatFullDate(entry.start),
              summary: markerSummary(entry, "start")
            });
          }
          if (endInMonth) {
            markers.push({
              ...entry,
              title: markerTitle(entry, "end"),
              dateLabel: formatMonthDay(entry.end),
              longDateLabel: formatFullDate(entry.end),
              summary: markerSummary(entry, "end")
            });
          }
          return markers;
        })
        .sort((a, b) => {
          const aDate = a.kind === "range" && / ends$/.test(a.title) ? a.end : a.start;
          const bDate = b.kind === "range" && / ends$/.test(b.title) ? b.end : b.start;
          return aDate - bDate;
        });
      months.push({
        key: `${monthStart.getFullYear()}-${monthStart.getMonth() + 1}`,
        label: monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        items
      });
    }

    return months;
  }

  window.CardiffSeasonData = {
    entries: SEASON_ENTRIES.slice(),
    getAllEntries,
    getSeasonEntries,
    getUpcomingCalendar,
    getCalendarMonths
  };
})();
