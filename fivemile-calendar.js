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
  const MONTH_EMOJI = ["❄️","🕯️","🌱","🌸","🌿","☀️","🌡️","🌾","🍂","🎃","🍁","⭐"];

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
      case "decoration-day": return addDays(lastWeekday(year, 5, 1), -1);
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
    if (n.includes("tornado siren"))                                 return "🚨";
    if (n.includes("council") || n.includes("town hall"))           return "🏛️";
    if (n.includes("incorporation"))                                 return "🏛️";
    if (n.includes("hazardous") || n.includes("hhw"))               return "♻️";
    if (n.includes("electronics") || n.includes("shredding"))       return "♻️";
    return "📅";
  }

  // ── Recurring civic dates ────────────────────────────────────────────────────

  function recurringDates(entry, rangeStart, rangeEnd) {
    const results = [];
    let y = rangeStart.getFullYear();
    let m = rangeStart.getMonth() + 1;
    const endY = rangeEnd.getFullYear();
    const endM = rangeEnd.getMonth() + 1;

    while (y < endY || (y === endY && m <= endM)) {
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

  // ── Build all entries for one calendar month ─────────────────────────────────

  function buildMonthEntries(month, year, turnings) {
    const entries = [];

    for (const turning of turnings) {
      for (let idx = 0; idx < turning.entries.length; idx++) {
        const e = turning.entries[idx];
        let date = null;
        let dateLabel = "";

        if (e.date.startsWith("month:")) {
          const m = parseInt(e.date.slice(6), 10);
          if (m === month) {
            // Sort before any specific-dated entries in this month
            date = new Date(year, month - 1, 0); // last day of prev month as sentinel
            dateLabel = MONTH_FULL[month - 1];
          }
        } else if (e.date.startsWith("movable:")) {
          const slug = e.date.slice(8);
          const d = resolveMovable(slug, year);
          if (d && d.getMonth() + 1 === month) {
            date = d;
            dateLabel = fmtDate(d);
          }
        } else {
          const parts = e.date.split("-").map(Number);
          const [mm, day] = parts;
          if (mm === month) {
            date = new Date(year, month - 1, day);
            dateLabel = fmtDate(date);
          }
        }

        if (date) {
          entries.push({
            date,
            dateLabel,
            name: e.name,
            desc: e.desc || "",
            url:  e.url  || "",
            sortKey: date.getTime() + idx * 0.001,
          });
        }
      }
    }

    // Civic entries
    const shared = window.CardiffSeasonData;
    if (shared && shared.entries) {
      const rangeStart = new Date(year, month - 1, 1);
      const rangeEnd   = new Date(year, month, 0);

      for (const entry of shared.entries.filter(e => e.lane === "civic")) {
        if (entry.kind === "day") {
          let d;
          if (entry.year) {
            if (entry.year !== year) continue;
            d = new Date(entry.year, entry.month - 1, entry.day);
          } else {
            d = new Date(year, entry.month - 1, entry.day);
          }
          if (d >= rangeStart && d <= rangeEnd) {
            entries.push({
              date: d, dateLabel: fmtDate(d),
              name: entry.title, desc: entry.summary || "", url: "",
              sortKey: d.getTime(),
            });
          }
        } else if (entry.kind === "recurring-weekday") {
          for (const d of recurringDates(entry, rangeStart, rangeEnd)) {
            entries.push({
              date: d, dateLabel: fmtDate(d),
              name: entry.title, desc: entry.summary || "", url: "",
              sortKey: d.getTime(),
            });
          }
        }
      }
    }

    entries.sort((a, b) => a.sortKey - b.sortKey);
    return entries;
  }

  // ── Rendering ────────────────────────────────────────────────────────────────

  function renderMonthPillStrip(currentMonth) {
    const pills = MONTH_FULL.map(function (name, idx) {
      const m = idx + 1;
      const cls = "infopill" + (m === currentMonth ? " current" : "");
      return '<button class="' + cls + '" data-month="' + m + '">' +
             '<span class="infopill-name">' + MONTH_EMOJI[idx] + " " + name + "</span>" +
             "</button>";
    }).join("");
    return '<div class="infopill-strip">' + pills + "</div>";
  }

  function renderAllMonths(currentMonth, year, turnings) {
    return Array.from({length: 12}, function (_, idx) {
      const month  = idx + 1;
      const entries = buildMonthEntries(month, year, turnings);

      const itemsHtml = entries.map(function (e) {
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
            ' target="_blank" rel="noopener noreferrer">Learn more ↗</a>';
        }
        html += "</div></li>";
        return html;
      }).join("");

      const isCurrent = month === currentMonth;
      return (
        '<details id="month-' + month + '" class="card turning-card reveal"' +
        (isCurrent ? " open" : "") + ">" +
        '<summary class="turning-head">' +
        '<span class="turning-emoji" aria-hidden="true">' + MONTH_EMOJI[idx] + "</span>" +
        '<div class="turning-meta">' +
        '<h2 class="turning-name">' + MONTH_FULL[idx] + "</h2>" +
        '<span class="turning-range">' + year + "</span>" +
        "</div>" +
        '<span class="chevron" aria-hidden="true">›</span>' +
        "</summary>" +
        (entries.length
          ? '<ul class="te-list">' + itemsHtml + "</ul>"
          : '<p style="padding:.8rem 0;font-size:.85rem;color:var(--ink3)">No dates recorded for this month.</p>') +
        "</details>"
      );
    }).join("");
  }

  // ── Boot ─────────────────────────────────────────────────────────────────────

  async function boot() {
    const today        = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear  = today.getFullYear();

    let data;
    try {
      const resp = await fetch("turnings.json");
      data = await resp.json();
    } catch (err) {
      console.error("Failed to load turnings.json", err);
      return;
    }

    const turnings = data.turnings;

    // Pill strip
    const pillShell = document.getElementById("infopill-strip-container");
    if (pillShell) {
      pillShell.innerHTML = renderMonthPillStrip(currentMonth);
      pillShell.querySelectorAll(".infopill").forEach(function (btn) {
        btn.addEventListener("click", function () {
          const m   = parseInt(btn.dataset.month, 10);
          const det = document.getElementById("month-" + m);
          if (det) {
            det.open = true;
            det.scrollIntoView({behavior: "smooth", block: "start"});
          }
        });
      });
      requestAnimationFrame(function () {
        pillShell.classList.add("visible");
        const active = pillShell.querySelector(".infopill.current");
        if (active) active.scrollIntoView({behavior: "auto", block: "nearest", inline: "center"});
      });
    }

    // Month cards
    const target = document.getElementById("turnings-shell");
    if (!target) return;
    target.innerHTML = renderAllMonths(currentMonth, currentYear, turnings);

    // Accordion: opening one month closes the others
    target.querySelectorAll("details").forEach(function (det) {
      det.addEventListener("toggle", function () {
        if (det.open) {
          target.querySelectorAll("details").forEach(function (other) {
            if (other !== det) other.open = false;
          });
        }
      });
    });

    // Reveal animations
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
