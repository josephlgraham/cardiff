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
      summary: "An annual marker for the town itself. Incorporated January 1900."
    },
    {
      id: "tornado-siren-test",
      title: "Jefferson County tornado siren test",
      category: "Civic",
      lane: "civic",
      kind: "recurring-weekday",
      nth: 1,
      weekday: 3,
      hour: 10,
      windowLabel: "First Wednesday of each month, 10:00 AM",
      calendarLabel: "First Wednesday, 10:00 AM",
      summary: "Jefferson County tests its outdoor warning sirens on the first Wednesday of each month at 10:00 AM. No action needed — it is a scheduled test."
    },
    {
      id: "cardiff-city-council",
      title: "Cardiff City Council meeting",
      category: "Civic",
      lane: "civic",
      kind: "recurring-weekday",
      nth: 2,
      weekday: 2,
      hour: 18,
      exceptMonths: [{year: 2026, month: 4}],
      windowLabel: "Second Tuesday of each month, 6:00 PM",
      calendarLabel: "Second Tuesday, 6:00 PM",
      summary: "Cardiff City Council meets on the second Tuesday of each month at 6:00 PM."
    },
    {
      id: "cardiff-town-council-april-2026",
      title: "Cardiff Town Council Meeting",
      category: "Civic",
      lane: "civic",
      kind: "day",
      year: 2026,
      month: 4,
      day: 13,
      hour: 18,
      windowLabel: "Apr 13, 2026 · 6:00 PM",
      calendarLabel: "Apr 13, 2026",
      summary: "Cardiff Town Council meeting — the first step toward restarting active local government. All residents welcome. Cardiff Town Hall, 6:00 PM. No agenda required to attend."
    },
    {
      id: "great-horned-owls",
      title: "Great horned owls nesting",
      category: "Worth a listen",
      lane: "nature",
      kind: "range",
      startMonth: 1,
      startDay: 1,
      endMonth: 2,
      endDay: 15,
      windowLabel: "Jan - mid Feb",
      calendarLabel: "Jan - mid Feb",
      summary: "The earliest nesters in the woods. On cold still nights in January the pairs call back and forth across the bottoms, already setting up to raise young while everything else is still waiting out the winter."
    },
    {
      id: "quadrantids",
      title: "Quadrantid meteor shower",
      category: "Celestial",
      lane: "celestial",
      kind: "range",
      startMonth: 1,
      startDay: 2,
      endMonth: 1,
      endDay: 4,
      windowLabel: "Around Jan 3 - 4",
      calendarLabel: "Around Jan 3 - 4",
      summary: "The year's first major shower, short and sharp. The peak runs only a few hours, so a clear cold night around the third or fourth is the whole window. Worth bundling up for from a dark creek bottom."
    },
    {
      id: "winter-wild-greens",
      title: "Winter wild greens",
      category: "Foraging",
      lane: "nature",
      kind: "range",
      startMonth: 1,
      startDay: 15,
      endMonth: 3,
      endDay: 15,
      windowLabel: "Mid Jan - mid Mar",
      calendarLabel: "Mid Jan - mid Mar",
      summary: "Chickweed, henbit, and bittercress green up in the cool months when little else will, along fence lines, garden edges, and disturbed ground. They are mild and tender now, before the heat turns them bitter."
    },
    {
      id: "red-maple-bloom",
      title: "Red maple bloom (first color)",
      category: "Worth a look",
      lane: "nature",
      kind: "range",
      startMonth: 1,
      startDay: 25,
      endMonth: 3,
      endDay: 1,
      windowLabel: "Late Jan - Feb",
      calendarLabel: "Late Jan - Feb",
      summary: "Among the first trees to flower, well ahead of any leaves. On a warm late-winter day the tops of the red maples flush a dull red across the bottoms, the earliest real hint that the year is turning back over."
    },
    {
      id: "candlemas-imbolc",
      title: "Candlemas & Imbolc",
      category: "Tradition",
      lane: "tradition",
      kind: "range",
      startMonth: 2,
      startDay: 1,
      endMonth: 2,
      endDay: 2,
      windowLabel: "Feb 1 - 2",
      calendarLabel: "Feb 1 - 2",
      summary: "The cross-quarter point halfway between the winter solstice and the spring equinox. Older calendars marked it as the first stirring of spring, with candles, weather signs, and the watching-for-the-turn that later became Groundhog Day."
    },
    {
      id: "spring-peepers",
      title: "Spring peepers & chorus frogs",
      category: "Worth a listen",
      lane: "nature",
      kind: "range",
      startMonth: 2,
      startDay: 1,
      endMonth: 3,
      endDay: 20,
      windowLabel: "Feb - Mar",
      calendarLabel: "Feb - Mar",
      summary: "The first real sound of the turn. On warm wet evenings the peepers and upland chorus frogs start up in the wet bottoms and roadside ditches, loud enough to carry, well before anything has leafed out."
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
      summary: "The shortest day of the year. Long before modern Christmas calendars, people marked this dark turn with sky watching, fire, evergreens, and return-of-light traditions."
    },
    {
      id: "hhw-collection-spring-2026",
      title: "Household Hazardous Waste Collection",
      category: "Civic",
      lane: "civic",
      kind: "day",
      year: 2026,
      month: 4,
      day: 25,
      windowLabel: "Apr 25, 2026 · 8:00 AM – 11:30 AM",
      calendarLabel: "Apr 25, 2026",
      link: "https://www.jccal.org/Default.asp?ID=2294&pg=Electronics+Hazardous+Materials",
      summary: "Jefferson County HHW drop-off — Cardiff area site is First Baptist Church, Gardendale (940 Main St.). Accepts chemicals, paint, batteries, and other household hazardous materials. 8:00 AM – 11:30 AM."
    },
    {
      id: "electronics-dropoff-may-2026",
      title: "Electronics & Paper Shredding Drop-Off",
      category: "Civic",
      lane: "civic",
      kind: "day",
      year: 2026,
      month: 5,
      day: 9,
      windowLabel: "May 9, 2026 · 9:00 AM – 11:30 AM",
      calendarLabel: "May 9, 2026",
      link: "https://www.jccal.org/Default.asp?ID=2294&pg=Electronics+Hazardous+Materials",
      summary: "Jefferson County electronics and paper shredding event at Center Point Satellite Courthouse, 2651 Center Point Parkway. Accepts computers, TVs, phones, printers, cables, and more. 9:00 AM – 11:30 AM."
    },
    {
      id: "electronics-dropoff-june-2026",
      title: "Electronics & Paper Shredding Drop-Off",
      category: "Civic",
      lane: "civic",
      kind: "day",
      year: 2026,
      month: 6,
      day: 13,
      windowLabel: "Jun 13, 2026 · 9:00 AM – 11:30 AM",
      calendarLabel: "Jun 13, 2026",
      link: "https://www.jccal.org/Default.asp?ID=2294&pg=Electronics+Hazardous+Materials",
      summary: "Jefferson County electronics and paper shredding event at Valley Reclamation Facility, 3923 Clear Water Drive, Bessemer. Accepts computers, TVs, phones, printers, cables, and more. 9:00 AM – 11:30 AM."
    },
    {
      id: "hhw-collection-fall-2026",
      title: "Household Hazardous Waste Collection",
      category: "Civic",
      lane: "civic",
      kind: "day",
      year: 2026,
      month: 10,
      day: 17,
      windowLabel: "Oct 17, 2026 · 8:00 AM – 11:30 AM",
      calendarLabel: "Oct 17, 2026",
      link: "https://www.jccal.org/Default.asp?ID=2294&pg=Electronics+Hazardous+Materials",
      summary: "Jefferson County HHW drop-off — Cardiff area site is Camp Ketona (121 County Shop Road). Accepts chemicals, paint, batteries, and other household hazardous materials. 8:00 AM – 11:30 AM."
    },
    {
      id: "electronics-dropoff-sep-2026",
      title: "Electronics & Paper Shredding Drop-Off",
      category: "Civic",
      lane: "civic",
      kind: "day",
      year: 2026,
      month: 9,
      day: 12,
      windowLabel: "Sep 12, 2026 · 9:00 AM – 11:30 AM",
      calendarLabel: "Sep 12, 2026",
      link: "https://www.jccal.org/Default.asp?ID=2294&pg=Electronics+Hazardous+Materials",
      summary: "Jefferson County electronics and paper shredding event at Birmingham City Hall/Lynn Henley Park, 710 20th Street North. Accepts computers, TVs, phones, printers, cables, and more. 9:00 AM – 11:30 AM."
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

  function formatTime(hour) {
    const period = hour >= 12 ? "PM" : "AM";
    const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return h + ":00\u202f" + period;
  }

  // Returns the day-of-month for the nth occurrence of weekday (0=Sun) in the given month,
  // or null if that occurrence does not exist in the month.
  function nthWeekdayOfMonth(year, month, weekday, nth) {
    const firstDay = new Date(year, month - 1, 1);
    const firstWeekday = firstDay.getDay();
    const day = 1 + ((weekday - firstWeekday + 7) % 7) + (nth - 1) * 7;
    const daysInMonth = new Date(year, month, 0).getDate();
    return day <= daysInMonth ? day : null;
  }

  function buildRecurringOccurrenceForYearMonth(entry, year, month) {
    if (entry.exceptMonths && entry.exceptMonths.some(function(e) { return e.year === year && e.month === month; })) return null;
    const day = nthWeekdayOfMonth(year, month, entry.weekday, entry.nth);
    if (day === null) return null;
    const start = atNoon(year, month, day);
    const end = atNoon(year, month, day);
    return { start, end };
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

  function monthsApart(from, to) {
    return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  }

  // Badge text is derived from timing, not stored per entry: active items get a
  // category-flavored status word, upcoming items get a plain "when".
  function computeBadge(entry, active, daysUntil, today, start) {
    const lane = String(entry.lane || "").toLowerCase();
    const category = String(entry.category || "").toLowerCase();
    const title = String(entry.title || "").toLowerCase();

    if (active) {
      if (lane === "hunting") return "in season";
      if (lane === "celestial") return title.includes("meteor") ? "tonight" : "today";
      if (lane === "frost") return "any day now";
      if (lane === "tradition") return "here now";
      if (lane === "civic") return "today";
      if (lane === "nature") return category === "foraging" ? "ready now" : "active now";
      return "on now";
    }

    if (daysUntil <= 7) return "this week";
    const months = monthsApart(today, start);
    if (months <= 0) return "this month";
    if (months === 1) return "next month";
    if (start.getFullYear() === today.getFullYear()) return "later this year";
    if (start.getFullYear() === today.getFullYear() + 1) return "next year";
    return "later";
  }

  function describeOccurrence(entry, occurrence, today) {
    const active = today >= occurrence.start && today <= addDays(occurrence.end, 1);
    const nextRelevant = active ? today : occurrence.start;
    const daysUntil = Math.round((occurrence.start - today) / DAY_MS);

    let dateLabel;
    let longDateLabel;
    if (entry.kind === "day") {
      const timePart = entry.timeTBD ? "time TBD" : (entry.hour !== undefined ? formatTime(entry.hour) : null);
      dateLabel = formatMonthDay(occurrence.start) + (timePart ? ", " + timePart : "");
      longDateLabel = formatFullDate(occurrence.start) + (timePart ? " \u00b7 " + timePart : "");
    } else if (entry.kind === "recurring-weekday") {
      const timePart = entry.timeTBD ? "time TBD" : (entry.hour !== undefined ? formatTime(entry.hour) : null);
      dateLabel = formatMonthDay(occurrence.start) + (timePart ? ", " + timePart : "");
      longDateLabel = formatFullDate(occurrence.start) + (timePart ? " \u00b7 " + timePart : "");
    } else {
      dateLabel = entry.windowLabel;
      longDateLabel = `${formatMonthDay(occurrence.start)} - ${formatMonthDay(occurrence.end)}`;
    }

    return {
      ...entry,
      start: occurrence.start,
      end: occurrence.end,
      active,
      daysUntil,
      nextRelevant,
      dateLabel,
      longDateLabel,
      badge: computeBadge(entry, active, daysUntil, today, occurrence.start)
    };
  }

  function resolveEntry(entry, referenceDate) {
    const today = atNoon(referenceDate.getFullYear(), referenceDate.getMonth() + 1, referenceDate.getDate());

    if (entry.kind === "recurring-weekday") {
      const refYear = today.getFullYear();
      const refMonth = today.getMonth() + 1;
      const occurrences = [];
      for (let offset = -1; offset <= 13; offset++) {
        const d = new Date(refYear, refMonth - 1 + offset, 1);
        const occ = buildRecurringOccurrenceForYearMonth(entry, d.getFullYear(), d.getMonth() + 1);
        if (occ) {
          occurrences.push(describeOccurrence(entry, occ, today));
        }
      }
      const active = occurrences.find((item) => item.active);
      if (active) return active;
      const upcoming = occurrences
        .filter((item) => item.start >= today)
        .sort((a, b) => a.start - b.start)[0];
      return upcoming || occurrences.sort((a, b) => a.start - b.start).pop();
    }

    const year = today.getFullYear();
    const candidateYears = entry.year ? [entry.year] : [year - 1, year, year + 1];
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
              summary: markerSummary(entry, "start"),
              sortDate: entry.start
            });
          }
          if (endInMonth) {
            markers.push({
              ...entry,
              title: markerTitle(entry, "end"),
              dateLabel: formatMonthDay(entry.end),
              longDateLabel: formatFullDate(entry.end),
              summary: markerSummary(entry, "end"),
              sortDate: entry.end
            });
          }
          return markers;
        })
        .sort((a, b) => {
          const aDate = a.sortDate || a.start;
          const bDate = b.sortDate || b.start;
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
