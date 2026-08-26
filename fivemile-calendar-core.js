/* ===========================================================================
   fivemile-calendar-core.js

   The calendar engine. Two pages read it:

     fivemile-calendar.html          one month, and a step to the month either side
     fivemile-calendar-archive.html  every month on file, by the year

   It lived inside fivemile-calendar.js until the archive room needed the same
   answers. Decision 41 already put the recurrence rules in one file for this
   exact reason, and copying Easter and the Brookside holiday shift into a
   second page would have undone that the week after it was written.

   Two sources and no third. `turnings.json` holds the year itself: the feasts,
   the garden dates, the signs in the woods. The civic, community, and market
   entries come out of `fivemile-season-data.js`, which is the same file the
   homepage and the news page read, so a council meeting is written down once
   and appears in four places.

   Nothing in here works out when a recurring meeting falls. That lives in
   fivemile-season-data.js, including the rule that moves the Brookside meeting
   off a holiday, and this file asks it a month at a time.

   Ranges are the almanac's. A window that runs March to May is not a date, and
   decision 27 gave those to the nature and garden desks.
   =========================================================================== */
(function () {
  "use strict";

  var MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var MONTH_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var WEEKDAY_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  /* West to east, and it is a rendering rule. See DECISIONS.md 1 and 29. */
  var TOWNS = ["Graysville", "Cardiff", "Brookside"];

  /* How far the calendar goes in either direction.

     Back to January 2026, because that is the year FIVEMILE started and there
     is nothing behind it. Forward to the end of next year, which in August is
     sixteen months of room and in December is still a whole year.

     Both ends are real walls: the step control stops at them and the archive
     room lists exactly the years between them. A calendar that pages forever
     will happily draw somebody March 2043, where the moon table is empty and
     every council roster is a guess. */
  var FIRST_YEAR = 2026;

  function lastYear() { return new Date().getFullYear() + 1; }

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function atNoon(year, month, day) {
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  function addDays(d, n) {
    var r = new Date(d.getTime());
    r.setDate(r.getDate() + n);
    return r;
  }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function plural(count, one, many) {
    return count + " " + (count === 1 ? one : many);
  }

  /* The anchor a month is reachable by. Links out of the archive room, links
     somebody has sent to somebody, and whatever is in the address bar all land
     on the same string, and it is the string the old accordion used. */
  function monthId(year, month) {
    return "m-" + year + "-" + pad2(month);
  }

  function parseMonthId(hash) {
    var m = /^#?m-(\d{4})-(\d{2})$/.exec(String(hash || ""));
    if (!m) return null;
    var year = Number(m[1]);
    var month = Number(m[2]);
    if (month < 1 || month > 12) return null;
    if (year < FIRST_YEAR || year > lastYear()) return null;
    return { year: year, month: month };
  }

  /* ------------------------------------------------------------------------
     MOVABLE DATES

     Easter runs Butcher's algorithm and eight other dates hang off it or off a
     weekday count. The two sales tax holidays are written as rules rather than
     as a list of years, because Alabama sets them by rule: the back to school
     weekend is the third Friday in July, and the severe weather weekend is the
     last weekend that fits inside February.
     ------------------------------------------------------------------------ */

  function computeEaster(year) {
    var a = year % 19;
    var b = Math.floor(year / 100);
    var c = year % 100;
    var d = Math.floor(b / 4);
    var e = b % 4;
    var f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4);
    var k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31);
    var day   = ((h + l - 7 * m + 114) % 31) + 1;
    return atNoon(year, month, day);
  }

  // nth occurrence of a weekday (0=Sun) in a month, 1 indexed
  function nthWeekday(year, month, nth, dow) {
    var first = new Date(year, month - 1, 1);
    var offset = (dow - first.getDay() + 7) % 7;
    return atNoon(year, month, 1 + offset + (nth - 1) * 7);
  }

  function lastWeekday(year, month, dow) {
    var last = new Date(year, month, 0);
    var offset = (last.getDay() - dow + 7) % 7;
    return atNoon(year, month, last.getDate() - offset);
  }

  /* Harvest and Hunter moons, 2025 to 2030. Astronomical, so they are looked
     up rather than derived. A year past the end of the table simply drops the
     two entries rather than printing a wrong date. */
  var MOON_TABLE = {
    2025: { "harvest-moon": [9, 17], "hunters-moon": [10, 17] },
    2026: { "harvest-moon": [9, 26], "hunters-moon": [10, 26] },
    2027: { "harvest-moon": [9, 15], "hunters-moon": [10, 15] },
    2028: { "harvest-moon": [10,  4], "hunters-moon": [11,  2] },
    2029: { "harvest-moon": [9, 14], "hunters-moon": [10, 13] },
    2030: { "harvest-moon": [10,  4], "hunters-moon": [11,  2] }
  };

  function resolveMovable(slug, year) {
    var e = computeEaster(year);
    switch (slug) {
      case "easter":         return e;
      case "good-friday":    return addDays(e, -2);
      case "ash-wednesday":  return addDays(e, -46);
      case "mardi-gras":     return addDays(e, -47);
      case "arbor-day":      return lastWeekday(year, 4, 5);
      case "mothers-day":    return nthWeekday(year, 5, 2, 0);
      case "memorial-day":   return lastWeekday(year, 5, 1);
      case "decoration-day": return addDays(lastWeekday(year, 5, 1), -1);
      case "labor-day":      return nthWeekday(year, 9, 1, 1);
      case "mlk-day":        return nthWeekday(year, 1, 3, 1);
      case "thanksgiving":   return nthWeekday(year, 11, 4, 4);
      // St. Nicholas in Brookside runs its food festival on the first Saturday
      // and Sunday of November, so the row lands on the Saturday.
      case "brookside-food-festival": return nthWeekday(year, 11, 1, 6);
      // Third Friday in July, and it runs through the Sunday after.
      case "tax-holiday-school": return nthWeekday(year, 7, 3, 5);
      // The last weekend that finishes inside February: find the last Sunday
      // in the month and step back to its Friday.
      case "tax-holiday-weather": return addDays(lastWeekday(year, 2, 0), -2);
      case "harvest-moon":
      case "hunters-moon": {
        var row = MOON_TABLE[year];
        if (row && row[slug]) return atNoon(year, row[slug][0], row[slug][1]);
        return null;
      }
      default: return null;
    }
  }

  /* ------------------------------------------------------------------------
     SUBJECTS

     Seven of them, and they answer what kind of date this is rather than which
     page it lives on. The colors are in fivemile-calendar.css. Order matters
     here: the first rule that matches wins, so the garden tests run before the
     season ones and "Pumpkins go in" does not come out as a nature note.
     ------------------------------------------------------------------------ */
  var SUBJECT_RULES = [
    ["garden",    /garden|plant|pumpkin|soil|beds|seed|dogwood/i],
    ["civic",     /council|siren|hazardous|electronics|shredding|incorporation|tax holiday|election|meeting/i],
    ["sky",       /equinox|solstice|moon|meteor|perseid|leonid|sunset|shower|star/i],
    ["season",    /frost|peeper|daffodil|firefl|katydid|mulberr|muscadine|persimmon|blackberr|morel|ramp|fig |dog days|dais|bloom|ripen/i],
    ["market",    /market/i]
  ];

  var SUBJECT_LABEL = {
    civic: "Civic", garden: "Garden", season: "Season",
    tradition: "Tradition", sky: "Sky", market: "Market",
    community: "Community"
  };

  function subjectFor(title, lane) {
    if (lane === "civic")     return "civic";
    if (lane === "market")    return "market";
    if (lane === "community") return "community";
    for (var i = 0; i < SUBJECT_RULES.length; i++) {
      if (SUBJECT_RULES[i][1].test(title)) return SUBJECT_RULES[i][0];
    }
    return "tradition";
  }

  function townFor(title, explicit) {
    if (explicit) return explicit;
    for (var i = 0; i < TOWNS.length; i++) {
      if (String(title).indexOf(TOWNS[i]) > -1) return TOWNS[i];
    }
    return "";
  }

  /* Where a link goes, said in the fewest words that still name the place. */
  function sourceName(url) {
    var host = String(url).replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
    if (host.indexOf("wikipedia.org") > -1) return "Wikipedia";
    if (host.indexOf("stnicholasbrookside.org") > -1) return "St. Nicholas";
    if (host.indexOf("revenue.alabama.gov") > -1) return "Alabama Department of Revenue";
    if (host.indexOf("jccal.org") > -1) return "Jefferson County";
    return host;
  }

  /* The turnings in turnings.json are a filing system for the entries and
     nothing a reader sees. Their names, ranges, and explainers are not
     rendered: a month is a month here, not a stretch of Michaelmas. See
     DECISIONS.md 41. */

  /* One fetch per page, however many months get drawn off it. The promise is
     held rather than the data, so paging from August to September is a redraw
     and never a second round trip. */
  var turningsPromise = null;

  function loadTurnings() {
    if (turningsPromise) return turningsPromise;
    turningsPromise = fetch("turnings.json").then(function (resp) {
      return resp.json();
    }).then(function (data) {
      return Array.isArray(data && data.turnings) ? data.turnings : [];
    }).catch(function (err) {
      console.error("Failed to load turnings.json", err);
      return [];
    });
    return turningsPromise;
  }

  /* ------------------------------------------------------------------------
     BUILDING A MONTH

     Every row on either page is one of these. `date` carries the day, and for
     a row with no day of its own `word` is what goes in the block instead.
     ------------------------------------------------------------------------ */
  function monthItems(year, month, turnings, today) {
    var items = [];
    var monthStart = atNoon(year, month, 1);

    (turnings || []).forEach(function (turning) {
      turning.entries.forEach(function (entry, index) {
        var date = null;
        var word = null;

        if (entry.date.indexOf("month:") === 0) {
          if (parseInt(entry.date.slice(6), 10) !== month) return;
          date = monthStart;
          word = "All month";
        } else if (entry.date.indexOf("movable:") === 0) {
          var resolved = resolveMovable(entry.date.slice(8), year);
          if (!resolved || resolved.getMonth() + 1 !== month) return;
          date = resolved;
        } else {
          var parts = entry.date.split("-").map(Number);
          if (parts[0] !== month) return;
          date = atNoon(year, month, parts[1]);
        }

        items.push({
          date: date,
          word: word,
          title: entry.name,
          blurb: entry.desc || "",
          url: entry.url || "",
          subject: subjectFor(entry.name, ""),
          town: townFor(entry.name, ""),
          shiftNote: "",
          /* Whole month rows sort to the top of their month, and two entries
             on the same day keep the order the file puts them in. */
          sort: (word ? monthStart.getTime() - 1 : date.getTime()) + index * 0.001
        });
      });
    });

    var season = window.CardiffSeasonData;
    if (season && typeof season.getEntriesForMonth === "function") {
      season.getEntriesForMonth(year, month).forEach(function (row) {
        var entry = row.entry;
        var lane = String(entry.lane || "").toLowerCase();
        if (lane !== "civic" && lane !== "market" && lane !== "community") return;

        var standing = !!row.standing;
        items.push({
          date: row.start,
          word: standing ? WEEKDAY_FULL[entry.weekday] + "s" : null,
          title: entry.title,
          blurb: entry.summary || "",
          url: entry.link || "",
          subject: subjectFor(entry.title, lane),
          town: townFor(entry.title, entry.town),
          shiftNote: row.shiftNote || "",
          sort: standing ? monthStart.getTime() - 1 : row.start.getTime()
        });
      });
    }

    items.forEach(function (item) {
      item.today = !!today && !item.word && sameDay(item.date, today);
    });

    return items.sort(function (a, b) { return a.sort - b.sort; });
  }

  /* ------------------------------------------------------------------------
     THE EVENT STUB

     One row shape, drawn the same on the calendar and in the archive room. The
     optional `note` is an extra mono line in the top bar, which is where a
     search hit out of the archive says which year it landed in.
     ------------------------------------------------------------------------ */
  function stubHtml(item, note) {
    var cls = "card-stub" + (item.word ? " window" : "") + (item.today ? " today" : "");
    var block = item.word
      ? '<span class="mo">' + MONTH_SHORT[item.date.getMonth()] + '</span>' +
        '<span class="wd">' + esc(item.word) + '</span>'
      : '<span class="mo">' + MONTH_SHORT[item.date.getMonth()] + '</span>' +
        '<span class="dy">' + pad2(item.date.getDate()) + '</span>';

    var body =
      '<div class="k-top">' +
        '<span class="tag ' + item.subject + '">' + SUBJECT_LABEL[item.subject] + '</span>' +
        (item.town ? '<span class="town-badge">' + esc(item.town) + '</span>' : '') +
        (note ? '<span class="k-src">' + esc(note) + '</span>' : '') +
      '</div>' +
      '<h3>' + esc(item.title) + '</h3>';

    if (item.blurb)     body += '<div class="w">' + esc(item.blurb) + '</div>';
    if (item.shiftNote) body += '<div class="k-shift">' + esc(item.shiftNote) + '</div>';
    if (item.url) {
      body += '<a class="k-more" href="' + esc(item.url) + '" target="_blank" rel="noopener noreferrer">' +
              esc(sourceName(item.url)) + ' &#8599;</a>';
    }

    return '<div class="' + cls + '">' +
             '<div class="k-date">' + block + '</div>' +
             '<div class="k-bd">' + body + '</div>' +
           '</div>';
  }

  window.FivemileCalendar = {
    MONTH_SHORT: MONTH_SHORT,
    MONTH_FULL: MONTH_FULL,
    FIRST_YEAR: FIRST_YEAR,
    lastYear: lastYear,
    esc: esc,
    atNoon: atNoon,
    addDays: addDays,
    pad2: pad2,
    plural: plural,
    monthId: monthId,
    parseMonthId: parseMonthId,
    loadTurnings: loadTurnings,
    monthItems: monthItems,
    stubHtml: stubHtml
  };
})();
