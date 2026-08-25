(function () {
  "use strict";

  /* ==========================================================================
     THE CALENDAR

     Twelve months rolling forward from this one, drawn as event stubs.

     Two sources and no third. `turnings.json` holds the year itself: the old
     names, the feasts, the garden dates, the signs in the woods. The civic and
     market entries come out of `fivemile-season-data.js`, which is the same
     file the homepage and the news page read, so a council meeting is written
     down once and appears in three places.

     Nothing in here works out when a recurring meeting falls. That lives in
     fivemile-season-data.js, including the rule that moves the Brookside
     meeting off a holiday, and this file asks it a month at a time.

     Ranges are the almanac's. A window that runs March to May is not a date,
     and decision 27 gave those to the nature and garden desks.
     ========================================================================== */

  const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const MONTH_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const WEEKDAY_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  /* West to east, and it is a rendering rule. See DECISIONS.md 1 and 29. */
  const TOWNS = ["Graysville", "Cardiff", "Brookside"];

  const MONTHS_SHOWN = 12;

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function atNoon(year, month, day) {
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  function addDays(d, n) {
    const r = new Date(d.getTime());
    r.setDate(r.getDate() + n);
    return r;
  }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
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
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day   = ((h + l - 7 * m + 114) % 31) + 1;
    return atNoon(year, month, day);
  }

  // nth occurrence of a weekday (0=Sun) in a month, 1 indexed
  function nthWeekday(year, month, nth, dow) {
    const first = new Date(year, month - 1, 1);
    const offset = (dow - first.getDay() + 7) % 7;
    return atNoon(year, month, 1 + offset + (nth - 1) * 7);
  }

  function lastWeekday(year, month, dow) {
    const last = new Date(year, month, 0);
    const offset = (last.getDay() - dow + 7) % 7;
    return atNoon(year, month, last.getDate() - offset);
  }

  /* Harvest and Hunter's moons, 2025 to 2030. Astronomical, so they are looked
     up rather than derived. A year past the end of the table simply drops the
     two entries rather than printing a wrong date. */
  const MOON_TABLE = {
    2025: { "harvest-moon": [9, 17], "hunters-moon": [10, 17] },
    2026: { "harvest-moon": [9, 26], "hunters-moon": [10, 26] },
    2027: { "harvest-moon": [9, 15], "hunters-moon": [10, 15] },
    2028: { "harvest-moon": [10,  4], "hunters-moon": [11,  2] },
    2029: { "harvest-moon": [9, 14], "hunters-moon": [10, 13] },
    2030: { "harvest-moon": [10,  4], "hunters-moon": [11,  2] }
  };

  function resolveMovable(slug, year) {
    const e = computeEaster(year);
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
        const row = MOON_TABLE[year];
        if (row && row[slug]) return atNoon(year, row[slug][0], row[slug][1]);
        return null;
      }
      default: return null;
    }
  }

  /* ------------------------------------------------------------------------
     SUBJECTS

     Six of them, and they answer what kind of date this is rather than which
     page it lives on. The colors are in fivemile-calendar.css. Order matters
     here: the first rule that matches wins, so the garden tests run before the
     season ones and "Pumpkins go in" does not come out as a nature note.
     ------------------------------------------------------------------------ */
  const SUBJECT_RULES = [
    ["garden",    /garden|plant|pumpkin|soil|beds|seed|dogwood/i],
    ["civic",     /council|siren|hazardous|electronics|shredding|incorporation|tax holiday|election|meeting/i],
    ["sky",       /equinox|solstice|moon|meteor|perseid|leonid|sunset|shower|star/i],
    ["season",    /frost|peeper|daffodil|firefl|katydid|mulberr|muscadine|persimmon|blackberr|morel|ramp|fig |dog days|dais|bloom|ripen/i],
    ["market",    /market/i]
  ];

  const SUBJECT_LABEL = {
    civic: "Civic", garden: "Garden", season: "Season",
    tradition: "Tradition", sky: "Sky", market: "Market",
    community: "Community"
  };

  function subjectFor(title, lane) {
    if (lane === "civic")     return "civic";
    if (lane === "market")    return "market";
    if (lane === "community") return "community";
    for (let i = 0; i < SUBJECT_RULES.length; i++) {
      if (SUBJECT_RULES[i][1].test(title)) return SUBJECT_RULES[i][0];
    }
    return "tradition";
  }

  function townFor(title, explicit) {
    if (explicit) return explicit;
    for (let i = 0; i < TOWNS.length; i++) {
      if (String(title).indexOf(TOWNS[i]) > -1) return TOWNS[i];
    }
    return "";
  }

  /* Where a link goes, said in the fewest words that still name the place. */
  function sourceName(url) {
    const host = String(url).replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
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

  /* ------------------------------------------------------------------------
     BUILDING A MONTH

     Every row on the page is one of these. `day` is null for a row with no
     date of its own, and `word` is what goes in the block instead.
     ------------------------------------------------------------------------ */
  function monthItems(year, month, turnings, today) {
    const items = [];
    const monthStart = atNoon(year, month, 1);

    turnings.forEach(function (turning) {
      turning.entries.forEach(function (entry, index) {
        let date = null;
        let word = null;

        if (entry.date.indexOf("month:") === 0) {
          if (parseInt(entry.date.slice(6), 10) !== month) return;
          date = monthStart;
          word = "All month";
        } else if (entry.date.indexOf("movable:") === 0) {
          const resolved = resolveMovable(entry.date.slice(8), year);
          if (!resolved || resolved.getMonth() + 1 !== month) return;
          date = resolved;
        } else {
          const parts = entry.date.split("-").map(Number);
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

    const season = window.CardiffSeasonData;
    if (season && typeof season.getEntriesForMonth === "function") {
      season.getEntriesForMonth(year, month).forEach(function (row) {
        const entry = row.entry;
        const lane = String(entry.lane || "").toLowerCase();
        if (lane !== "civic" && lane !== "market" && lane !== "community") return;

        const standing = !!row.standing;
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
      item.today = !item.word && sameDay(item.date, today);
    });

    return items.sort(function (a, b) { return a.sort - b.sort; });
  }

  /* ------------------------------------------------------------------------
     RENDERING
     ------------------------------------------------------------------------ */
  function stubHtml(item) {
    const cls = "card-stub" + (item.word ? " window" : "") + (item.today ? " today" : "");
    const block = item.word
      ? '<span class="mo">' + MONTH_SHORT[item.date.getMonth()] + '</span>' +
        '<span class="wd">' + esc(item.word) + '</span>'
      : '<span class="mo">' + MONTH_SHORT[item.date.getMonth()] + '</span>' +
        '<span class="dy">' + pad2(item.date.getDate()) + '</span>';

    let body =
      '<div class="k-top">' +
        '<span class="tag ' + item.subject + '">' + SUBJECT_LABEL[item.subject] + '</span>' +
        (item.town ? '<span class="town-badge">' + esc(item.town) + '</span>' : '') +
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

  function monthId(year, month) {
    return "m-" + year + "-" + pad2(month);
  }

  function railHtml(months, currentYear, currentMonth) {
    return '<div class="month-rail">' + months.map(function (m) {
      const now = m.year === currentYear && m.month === currentMonth;
      const label = MONTH_SHORT[m.month - 1] + (m.month === 1 || m.year !== currentYear ? " " + String(m.year).slice(2) : "");
      return '<a class="mr-chip' + (now ? " now" : (m.past ? " past" : "")) + '" href="#' + monthId(m.year, m.month) + '">' +
               '<b>' + label + '</b>' +
               '<span>' + m.items.length + (m.items.length === 1 ? " date" : " dates") + '</span>' +
             '</a>';
    }).join("") + '</div>';
  }

  /* This month and next are open. The rest are shut and the rail opens them.
     See the note in fivemile-calendar.css for why. */
  function monthHtml(m, openIt, currentYear) {
    const note = [
      m.year === currentYear ? "" : String(m.year),
      m.items.length + (m.items.length === 1 ? " date" : " dates")
    ].filter(Boolean).join(" · ");

    return '<details class="month-blk reveal" id="' + monthId(m.year, m.month) + '"' +
             (openIt ? " open" : "") + ">" +
             '<summary class="hd"><h2>' + MONTH_FULL[m.month - 1] + '</h2>' +
             '<span class="hd-note">' + esc(note) + '</span>' +
             '<span class="m-chev" aria-hidden="true">&rsaquo;</span></summary>' +
             (m.items.length
               ? '<div class="rows">' + m.items.map(stubHtml).join("") + '</div>'
               : '<div class="empty">&mdash;</div>') +
           '</details>';
  }

  /* ------------------------------------------------------------------------
     BOOT
     ------------------------------------------------------------------------ */
  async function boot() {
    const now = new Date();
    const today = atNoon(now.getFullYear(), now.getMonth() + 1, now.getDate());

    let data;
    try {
      const resp = await fetch("turnings.json");
      data = await resp.json();
    } catch (err) {
      console.error("Failed to load turnings.json", err);
      data = { turnings: [] };
    }
    const turnings = Array.isArray(data.turnings) ? data.turnings : [];

    /* January of this year through twelve months forward from this one.

       Forward twelve so December does not leave a reader looking at a year that
       is nearly over. Back to January because a calendar that drops a month the
       moment it ends is a rolling window that overwrites itself, and CLAUDE.md
       is explicit that nothing on this site scrolls away. The duck race was in
       June and it still happened. Past months are shut and their rail chips are
       dimmed, so the year reads as a year with a position in it. */
    const months = [];
    const first = new Date(today.getFullYear(), 0, 1);
    const last  = new Date(today.getFullYear(), today.getMonth() + MONTHS_SHOWN - 1, 1);
    for (let cursor = first; cursor <= last; cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)) {
      const year  = cursor.getFullYear();
      const month = cursor.getMonth() + 1;
      months.push({
        year: year,
        month: month,
        past: year < today.getFullYear() || (year === today.getFullYear() && month < today.getMonth() + 1),
        items: monthItems(year, month, turnings, today)
      });
    }

    /* Next up. Dated rows only, because a row reading All month is not an
       answer to what is happening this week. A weekly entry is a standing row
       down in the month lists, so its next actual occurrence is worked out
       here: the next Thursday is a real answer and Thursdays is not. */
    const soon = [];
    months.forEach(function (m) {
      m.items.forEach(function (item) {
        if (item.word || item.date < today) return;
        soon.push(item);
      });
    });

    const season = window.CardiffSeasonData;
    if (season && Array.isArray(season.entries)) {
      season.entries.filter(function (entry) { return entry.kind === "weekly"; }).forEach(function (entry) {
        const ahead = (entry.weekday - today.getDay() + 7) % 7;
        soon.push({
          date: addDays(today, ahead),
          word: null,
          title: entry.title,
          blurb: entry.summary || "",
          url: entry.link || "",
          subject: subjectFor(entry.title, String(entry.lane || "").toLowerCase()),
          town: townFor(entry.title, entry.town),
          shiftNote: "",
          today: ahead === 0
        });
      });
    }

    soon.sort(function (a, b) { return a.date - b.date; });

    const nextShell = document.getElementById("calNext");
    if (nextShell) {
      const rows = soon.slice(0, 5);
      nextShell.innerHTML = rows.length
        ? '<div class="rows">' + rows.map(stubHtml).join("") + '</div>'
        : '<div class="empty">&mdash;</div>';
    }

    const railShell = document.getElementById("calRail");
    if (railShell) railShell.innerHTML = railHtml(months, today.getFullYear(), today.getMonth() + 1);

    const monthShell = document.getElementById("calMonths");
    if (monthShell) {
      const currentIndex = months.findIndex(function (m) {
        return m.year === today.getFullYear() && m.month === today.getMonth() + 1;
      });
      monthShell.innerHTML = months.map(function (m, index) {
        return monthHtml(m, index === currentIndex || index === currentIndex + 1, today.getFullYear());
      }).join("");
    }

    /* A shut month has to open when somebody asks for it, whether they asked
       from the rail, from a link somebody sent them, or from the address bar.
       The anchor still works with no JavaScript: the month head is there
       either way and the reader opens it themselves. */
    function openFromHash() {
      const id = String(window.location.hash || "").replace(/^#/, "");
      if (!id) return;
      const target = document.getElementById(id);
      if (target && target.tagName === "DETAILS") target.open = true;
    }
    window.addEventListener("hashchange", openFromHash);
    if (railShell) {
      railShell.querySelectorAll(".mr-chip").forEach(function (chip) {
        chip.addEventListener("click", function () {
          const target = document.getElementById(chip.getAttribute("href").slice(1));
          if (target) target.open = true;
        });
      });
    }
    openFromHash();

    const stamp = document.getElementById("calStamp");
    if (stamp) {
      stamp.textContent = MONTH_FULL[today.getMonth()] + " " + today.getDate() + ", " + today.getFullYear();
    }

    requestAnimationFrame(function () {
      document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("visible"); });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
