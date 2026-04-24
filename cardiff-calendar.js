(function () {
  "use strict";

  // ── Utilities ────────────────────────────────────────────────────────────────

  function escapeHtml(v) {
    return String(v || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const MONTH_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  function fmtDate(d) {
    return MONTH_SHORT[d.getMonth()] + " " + d.getDate();
  }

  function addDays(d, n) {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  }

  // ── Movable date computation ─────────────────────────────────────────────────

  function computeEaster(year) {
    // Butcher's algorithm
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
    return new Date(year, month - 1, day);
  }

  // nth occurrence of weekday (0=Sun..6=Sat) in a given month, 1-indexed
  function nthWeekday(year, month, nth, dow) {
    const first = new Date(year, month - 1, 1);
    const offset = (dow - first.getDay() + 7) % 7;
    return new Date(year, month - 1, 1 + offset + (nth - 1) * 7);
  }

  // Last occurrence of weekday in month
  function lastWeekday(year, month, dow) {
    const last = new Date(year, month, 0);
    const offset = (last.getDay() - dow + 7) % 7;
    return new Date(year, month - 1, last.getDate() - offset);
  }

  // Harvest Moon / Hunter's Moon hardcoded 2025–2030
  // (full moon nearest Sep 22 for Harvest; first full moon after for Hunter's)
  const MOON_TABLE = {
    2025: { "harvest-moon": [9, 17], "hunters-moon": [10, 17] },
    2026: { "harvest-moon": [9, 26], "hunters-moon": [10, 26] },
    2027: { "harvest-moon": [9, 15], "hunters-moon": [10, 15] },
    2028: { "harvest-moon": [10,  4], "hunters-moon": [11,  2] },
    2029: { "harvest-moon": [9, 14], "hunters-moon": [10, 13] },
    2030: { "harvest-moon": [10,  4], "hunters-moon": [11,  2] },
  };

  function resolveMovable(slug, year) {
    const e = computeEaster(year);
    switch (slug) {
      case "easter":         return e;
      case "ash-wednesday":  return addDays(e, -46);
      case "mardi-gras":     return addDays(e, -47);
      case "arbor-day":      return lastWeekday(year, 4, 5);      // last Fri in Apr
      case "mothers-day":    return nthWeekday(year, 5, 2, 0);    // 2nd Sun in May
      case "memorial-day":   return lastWeekday(year, 5, 1);      // last Mon in May
      case "decoration-day": {
        const mem = lastWeekday(year, 5, 1);
        // Sunday nearest Memorial Day; Memorial Day is Monday so Sunday before is 1 day away
        return addDays(mem, -1);
      }
      case "labor-day":      return nthWeekday(year, 9, 1, 1);    // 1st Mon in Sep
      case "mlk-day":        return nthWeekday(year, 1, 3, 1);    // 3rd Mon in Jan
      case "thanksgiving":   return nthWeekday(year, 11, 4, 4);   // 4th Thu in Nov
      case "harvest-moon":
      case "hunters-moon": {
        const row = MOON_TABLE[year];
        if (row && row[slug]) return new Date(year, row[slug][0] - 1, row[slug][1]);
        return null;
      }
      default: return null;
    }
  }

  // ── Entry emoji ─────────────────────────────────────────────────────────────

  function entryEmoji(name) {
    const n = (name || "").toLowerCase();
    // Fixed holidays & feast days
    if (n.includes("brigid") || n.includes("imbolc"))                return "🕯️";
    if (n.includes("candlemas"))                                      return "🕯️";
    if (n.includes("valentine"))                                      return "💝";
    if (n.includes("mardi gras") || n.includes("shrove"))            return "🎭";
    if (n.includes("ash wednesday"))                                  return "✝️";
    if (n.includes("peeper"))                                         return "🐸";
    if (n.includes("daffodil"))                                       return "🌼";
    if (n.includes("david") || n.includes("dewi"))                   return "🌼";
    if (n.includes("giuseppe") || (n.includes("joseph") && n.includes("day"))) return "⚜️";
    if (n.includes("equinox") || n.includes("solstice"))             return n.includes("spring") || n.includes("autumn") || n.includes("fall") ? "⚖️" : (n.includes("summer") ? "☀️" : "❄️");
    if (n.includes("lady day") || n.includes("annunciation"))        return "🌸";
    if (n.includes("easter"))                                        return "🐣";
    if (n.includes("dogwood"))                                       return "🌸";
    if (n.includes("earth day"))                                     return "🌍";
    if (n.includes("george"))                                        return "🐉";
    if (n.includes("arbor day"))                                     return "🌳";
    if (n.includes("beltane") || n.includes("calan mai"))            return "🔥";
    if (n.includes("may day"))                                       return "🌸";
    if (n.includes("mother"))                                        return "💐";
    if (n.includes("memorial day"))                                  return "🎖️";
    if (n.includes("decoration day"))                                return "🌺";
    if (n.includes("firefl"))                                        return "✨";
    if (n.includes("mulberr"))                                       return "🍇";
    if (n.includes("juneteenth"))                                    return "✊";
    if (n.includes("john") && n.includes("midsummer"))              return "🔥";
    if (n.includes("dog days"))                                      return "🌡️";
    if (n.includes("independence day"))                              return "🎆";
    if (n.includes("rosalia"))                                       return "🌹";
    if (n.includes("fig"))                                           return "🍃";
    if (n.includes("perseid"))                                       return "☄️";
    if (n.includes("lammas") || n.includes("loaf"))                  return "🌾";
    if (n.includes("lawrence") || n.includes("san lorenzo"))        return "☄️";
    if (n.includes("ferragosto") || n.includes("assumption"))       return "⛱️";
    if (n.includes("katydid"))                                       return "🦗";
    if (n.includes("labor day"))                                     return "⚒️";
    if (n.includes("muscadine"))                                     return "🍇";
    if (n.includes("harvest moon"))                                  return "🌕";
    if (n.includes("hunter"))                                        return "🌕";
    if (n.includes("michaelmas daisi"))                              return "💜";
    if (n.includes("michaelmas") || n.includes("st. michael"))      return "⚔️";
    if (n.includes("francis"))                                       return "🐾";
    if (n.includes("frost window"))                                  return "❄️";
    if (n.includes("persimmon"))                                     return "🧡";
    if (n.includes("halloween") || n.includes("all hallows"))       return "🎃";
    if (n.includes("all saints") || n.includes("calan gaeaf"))      return "🕯️";
    if (n.includes("all souls") || n.includes("giorno dei morti"))  return "🕯️";
    if (n.includes("veterans") || n.includes("armistice"))          return "🎖️";
    if (n.includes("leonid"))                                        return "☄️";
    if (n.includes("thanksgiving"))                                  return "🦃";
    if (n.includes("nicholas"))                                      return "🎁";
    if (n.includes("earliest sunset"))                              return "🌅";
    if (n.includes("santa lucia") || n.includes("saint lucy"))      return "🕯️";
    if (n.includes("yule") || n.includes("winter solstice"))        return "❄️";
    if (n.includes("vigilia") || n.includes("christmas eve"))       return "🐟";
    if (n.includes("christmas day"))                                 return "🎄";
    if (n.includes("new year's eve"))                                return "🥂";
    if (n.includes("new year's day"))                                return "🎊";
    if (n.includes("twelfth night"))                                 return "🌿";
    if (n.includes("epiphany") || n.includes("befana"))             return "🧙";
    if (n.includes("martin luther king") || n.includes("mlk"))      return "✊";
    if (n.includes("dwynwen") || n.includes("santes"))              return "💕";
    if (n.includes("groundhog"))                                     return "🦔";
    // Nature / foraging
    if (n.includes("ramp") || n.includes("wild onion"))             return "🧅";
    if (n.includes("morel"))                                         return "🍄";
    if (n.includes("turkey season"))                                 return "🦃";
    if (n.includes("catfish"))                                       return "🐟";
    if (n.includes("blackberr"))                                     return "🫐";
    if (n.includes("green corn"))                                    return "🌽";
    if (n.includes("dove"))                                          return "🕊️";
    if (n.includes("squirrel"))                                      return "🐿️";
    if (n.includes("deer"))                                          return "🦌";
    if (n.includes("frost") || n.includes("freeze"))                return "🌨️";
    // Civic
    if (n.includes("tornado siren"))                                 return "🚨";
    if (n.includes("council") || n.includes("town hall"))           return "🏛️";
    if (n.includes("incorporation"))                                 return "🏛️";
    if (n.includes("hazardous") || n.includes("hhw"))               return "♻️";
    if (n.includes("electronics") || n.includes("shredding"))       return "♻️";
    return "📅";
  }

  // ── Turning year-boundary logic ──────────────────────────────────────────────

  function turningSpansYearBoundary(turning) {
    const startM = parseInt(turning.start.split("-")[0], 10);
    const endM   = parseInt(turning.end.split("-")[0], 10);
    return endM < startM;
  }

  // Resolve one entry's date to a JS Date, accounting for a turning that
  // spans the year boundary (Yuletide: Dec 21 – Feb 1).
  function resolveEntryDate(dateStr, turning, baseYear) {
    if (!dateStr) return null;
    const spans   = turningSpansYearBoundary(turning);
    const startM  = parseInt(turning.start.split("-")[0], 10);

    if (dateStr.startsWith("movable:")) {
      const slug = dateStr.slice(8);
      if (spans) {
        // Try baseYear; if the result's month is before the turning's start month
        // (i.e., Jan/Feb side of Yuletide), use baseYear+1 instead.
        const d1 = resolveMovable(slug, baseYear);
        if (d1 && d1.getMonth() + 1 >= startM) return d1;
        return resolveMovable(slug, baseYear + 1);
      }
      return resolveMovable(slug, baseYear);
    }

    if (dateStr.startsWith("month:")) {
      const m = parseInt(dateStr.slice(6), 10);
      const y = (spans && m < startM) ? baseYear + 1 : baseYear;
      return new Date(y, m - 1, 1);
    }

    // MM-DD
    const parts = dateStr.split("-").map(Number);
    const m = parts[0], day = parts[1];
    const y = (spans && m < startM) ? baseYear + 1 : baseYear;
    return new Date(y, m - 1, day);
  }

  function formatEntryDateLabel(dateStr, turning, baseYear) {
    if (!dateStr) return "";
    if (dateStr.startsWith("month:")) {
      const m = parseInt(dateStr.slice(6), 10);
      return MONTH_FULL[m - 1];
    }
    const d = resolveEntryDate(dateStr, turning, baseYear);
    return d ? fmtDate(d) : "";
  }

  // ── Finding which turning contains today ─────────────────────────────────────

  function findCurrentTurningIdx(turnings, today) {
    const mm = today.getMonth() + 1;
    const dd = today.getDate();
    const ord = mm * 100 + dd;

    for (let i = 0; i < turnings.length; i++) {
      const t = turnings[i];
      const [startM, startD] = t.start.split("-").map(Number);
      const [endM,   endD]   = t.end.split("-").map(Number);
      const startOrd = startM * 100 + startD;
      const endOrd   = endM   * 100 + endD;

      if (endM < startM) {
        // Spans year boundary (Yuletide)
        if (ord >= startOrd || ord <= endOrd) return i;
      } else {
        if (ord >= startOrd && ord <= endOrd) return i;
      }
    }
    return 0;
  }

  // For the first turning in the ordered list, determine what calendar year
  // the turning started in (relevant when today is in Yuletide's Jan/Feb portion).
  function firstTurningBaseYear(turning, today) {
    const year   = today.getFullYear();
    const todayM = today.getMonth() + 1;
    if (turningSpansYearBoundary(turning)) {
      const startM = parseInt(turning.start.split("-")[0], 10);
      if (todayM < startM) return year - 1; // we're in the wrap-around portion
    }
    return year;
  }

  // Compute the base year (year the turning's start date falls in) for each
  // turning in the ordered 8-turning sequence.
  function computeBaseYears(orderedTurnings, firstBaseYear) {
    const years = [firstBaseYear];
    for (let i = 1; i < orderedTurnings.length; i++) {
      const prevStartM = parseInt(orderedTurnings[i - 1].start.split("-")[0], 10);
      const currStartM = parseInt(orderedTurnings[i].start.split("-")[0], 10);
      if (currStartM < prevStartM) {
        years.push(years[i - 1] + 1);
      } else {
        years.push(years[i - 1]);
      }
    }
    return years;
  }

  // ── Local civic events ───────────────────────────────────────────────────────

  // Enumerate every date that a recurring-weekday entry lands on
  // within [rangeStart, rangeEnd].
  function recurringDates(entry, rangeStart, rangeEnd) {
    const results = [];
    // Iterate month-by-month across the range
    let y = rangeStart.getFullYear();
    let m = rangeStart.getMonth() + 1;
    const endY = rangeEnd.getFullYear();
    const endM = rangeEnd.getMonth() + 1;

    while (y < endY || (y === endY && m <= endM)) {
      // Skip excepted months
      const isExcepted = entry.exceptMonths &&
        entry.exceptMonths.some(ex => ex.year === y && ex.month === m);

      if (!isExcepted) {
        const d = nthWeekday(y, m, entry.nth, entry.weekday);
        if (d >= rangeStart && d <= rangeEnd) results.push(d);
      }

      m++;
      if (m > 12) { m = 1; y++; }
    }
    return results;
  }

  function getCivicEntries(turning, baseYear) {
    const shared = window.CardiffSeasonData;
    if (!shared || !shared.entries) return [];

    const civic = shared.entries.filter(e => e.lane === "civic");
    const results = [];

    const [startM, startD] = turning.start.split("-").map(Number);
    const [endM,   endD]   = turning.end.split("-").map(Number);
    const spans = turningSpansYearBoundary(turning);
    const rangeStart = new Date(baseYear, startM - 1, startD);
    const rangeEnd   = spans
      ? new Date(baseYear + 1, endM - 1, endD)
      : new Date(baseYear,     endM - 1, endD);

    function inRange(d) { return d && d >= rangeStart && d <= rangeEnd; }

    for (const entry of civic) {
      if (entry.kind === "day") {
        let d;
        if (entry.year) {
          d = new Date(entry.year, entry.month - 1, entry.day);
        } else {
          // Annual event — try baseYear, then baseYear+1 for spanning turnings
          d = new Date(baseYear, entry.month - 1, entry.day);
          if (spans && !inRange(d)) d = new Date(baseYear + 1, entry.month - 1, entry.day);
        }
        if (inRange(d)) {
          results.push({
            date: d,
            dateLabel: fmtDate(d),
            name: entry.title,
            desc: entry.summary || "",
            url: "",
            sortKey: d.getTime(),
          });
        }
      } else if (entry.kind === "recurring-weekday") {
        for (const d of recurringDates(entry, rangeStart, rangeEnd)) {
          let timeNote = "";
          if (entry.hour) timeNote = " · " + (entry.hour === 10 ? "10 AM" : entry.hour + ":00");
          if (entry.timeTBD) timeNote = " · time TBD";
          results.push({
            date: d,
            dateLabel: fmtDate(d),
            name: entry.title,
            desc: entry.summary || "",
            url: "",
            sortKey: d.getTime(),
          });
        }
      }
    }

    return results;
  }

  // ── Build sorted entry list for one turning ──────────────────────────────────

  function buildEntries(turning, baseYear) {
    const fromJson = turning.entries.map((e, idx) => {
      const d = resolveEntryDate(e.date, turning, baseYear);
      return {
        date: d,
        dateLabel: formatEntryDateLabel(e.date, turning, baseYear),
        name: e.name,
        desc: e.desc || "",
        url:  e.url  || "",
        // Use original index as tiebreaker so equal dates keep JSON order
        sortKey: (d ? d.getTime() : Infinity) + idx,
      };
    });

    const civic = getCivicEntries(turning, baseYear);
    const all   = fromJson.concat(civic);

    all.sort((a, b) => a.sortKey - b.sortKey);
    return all;
  }

  // ── Rendering ────────────────────────────────────────────────────────────────

  function fmtTurningRange(turning) {
    function p(mmdd) {
      const [mm, dd] = mmdd.split("-").map(Number);
      return MONTH_SHORT[mm - 1] + " " + dd;
    }
    return p(turning.start) + " \u2013 " + p(turning.end);
  }

  function renderPillStrip(turnings, currentId) {
    const pills = turnings.map(function(t) {
      var cls = "infopill" + (t.id === currentId ? " current" : "");
      return '<button class="' + cls + '" data-slug="' + escapeHtml(t.id) + '">' +
             '<span class="infopill-name">' + escapeHtml(t.name) + "</span>" +
             '<span class="infopill-range">' + escapeHtml(fmtTurningRange(t)) + "</span>" +
             "</button>";
    }).join("");
    return '<div class="infopill-strip">' + pills + "</div>";
  }

  function renderAllTurnings(orderedTurnings, baseYears, currentId) {
    return orderedTurnings.map((turning, i) => {
      const entries = buildEntries(turning, baseYears[i]);

      const itemsHtml = entries.map(e => {
        let html =
          '<li class="te-item">' +
          '<div class="te-date">' + escapeHtml(e.dateLabel) + "</div>" +
          '<div class="te-icon" aria-hidden="true">' + entryEmoji(e.name) + "</div>" +
          '<div class="te-body">' +
          '<div class="te-name">' + escapeHtml(e.name) + "</div>";
        if (e.desc) {
          html += '<div class="te-desc">' + escapeHtml(e.desc) + "</div>";
        }
        if (e.url) {
          html +=
            '<a class="te-link" href="' + escapeHtml(e.url) + '"' +
            ' target="_blank" rel="noopener noreferrer">Learn more \u2197</a>';
        }
        html += "</div></li>";
        return html;
      }).join("");

      const isCurrent = turning.id === currentId;
      return (
        '<details id="turning-' + escapeHtml(turning.id) + '" class="card turning-card reveal"' + (isCurrent ? " open" : "") + ">" +
        '<summary class="turning-head">' +
        '<span class="turning-emoji" aria-hidden="true">' + escapeHtml(turning.emoji) + "</span>" +
        '<div class="turning-meta">' +
        '<h2 class="turning-name">' + escapeHtml(turning.name) + "</h2>" +
        '<span class="turning-range">' + escapeHtml(fmtTurningRange(turning)) + "</span>" +
        "</div>" +
        '<span class="chevron" aria-hidden="true">\u203a</span>' +
        "</summary>" +
        '<ul class="te-list">' + itemsHtml + "</ul>" +
        "</details>"
      );
    }).join("");
  }

  // ── Boot ─────────────────────────────────────────────────────────────────────

  async function boot() {
    const today = new Date();

    let data;
    try {
      const resp = await fetch("turnings.json");
      data = await resp.json();
    } catch (err) {
      console.error("Failed to load turnings.json", err);
      return;
    }

    const turnings = data.turnings;
    const startIdx = findCurrentTurningIdx(turnings, today);
    const currentId = turnings[startIdx].id;

    // Render infopill strip in calendar order
    const pillShell = document.getElementById("infopill-strip-container");
    if (pillShell) {
      pillShell.innerHTML = renderPillStrip(turnings, currentId);
      pillShell.querySelectorAll(".infopill").forEach(function(btn) {
        btn.addEventListener("click", function() {
          var det = document.getElementById("turning-" + btn.dataset.slug);
          if (det) { det.open = true; det.scrollIntoView({behavior: "smooth", block: "start"}); }
        });
      });
      requestAnimationFrame(function() {
        pillShell.classList.add("visible");
        var active = pillShell.querySelector(".infopill.current");
        if (active) active.scrollIntoView({behavior: "auto", block: "nearest", inline: "center"});
      });
    }

    // Build ordered 8-turning list beginning with today's turning
    const ordered = [];
    for (let i = 0; i < 8; i++) ordered.push(turnings[(startIdx + i) % 8]);

    const fYear    = firstTurningBaseYear(ordered[0], today);
    const baseYears = computeBaseYears(ordered, fYear);

    const html = renderAllTurnings(ordered, baseYears, currentId);

    const target = document.getElementById("turnings-shell");
    if (!target) return;
    target.innerHTML = html;

    // Trigger reveal animations
    requestAnimationFrame(function () {
      target.querySelectorAll(".reveal").forEach(function (el) {
        el.classList.add("visible");
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
