/* ===========================================================================
   fivemile-archive.js

   The archive family. Six pages share this file:

     fivemile-archive.html           the hub, five panels and nothing else
     fivemile-gallery.html           every photograph that has run
     fivemile-weather-archive.html   every day the station has reported
     fivemile-creek-archive.html     the creek at the Republic gauge, by the day
     fivemile-news-archive.html      every story that has run, by month
     fivemile-calendar-archive.html  every date the calendar keeps, by the year

   One file rather than five, on the same footing as fivemile-almanac-core.js:
   the rooms are the same three moves over different numbers, and splitting
   them would mean keeping the reel and the day table in step across four
   copies. Each loader is gated on an element only its own page carries, so a
   room fetches its own file and nothing else. The hub is the exception and
   reads all five, which is the point of a hub.

   The dates room is the one that reads no file of its own, because there is no
   dates file. The calendar is two lists and a set of rules, so the room asks
   fivemile-calendar-core.js for a month exactly the way the calendar page
   does. Same rule kept a different way: there is still only one place the
   answer comes from. See DECISIONS.md 50.

   Nothing here keeps a list of its own. Every room reads the same file the
   live page reads, so a photograph is archived by the act of being featured, a
   day is archived by the station reporting it, a story is archived by running,
   and a date is archived by being on the calendar. There is no second list to
   fall out of step, which is the only way an archive stays true without
   somebody minding it.
   =========================================================================== */
(function () {
  'use strict';

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  var PHOTO_FILE = 'fivemile-home-anchor.json';
  var WEATHER_FILE = 'fivemile-weather-archive.json';
  var CREEK_FILE = 'fivemile-creek-archive.json';
  var NEWS_INDEX = 'news-archive/index.json';

  function esc(value) {
    var box = document.createElement('div');
    box.textContent = String(value == null ? '' : value);
    return box.innerHTML;
  }

  function loadJson(url) {
    return fetch(url, { cache: 'no-store' }).then(function (response) {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    });
  }

  function byId(id) { return document.getElementById(id); }

  function setText(id, value) {
    var host = byId(id);
    if (host && value) host.textContent = value;
  }

  /* A date key is YYYY-MM-DD and is read as a local calendar date, never handed
     to the Date parser whole. new Date('2026-08-01') is midnight UTC, which is
     the evening of July 31 here, and every weekday in the tables below would be
     a day early. */
  function dateFromKey(key) {
    var parts = String(key).split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  function dayNumber(key) { return Number(String(key).slice(8, 10)); }
  function weekday(key) { return DAYS[dateFromKey(key).getDay()]; }
  function monthKey(key) { return String(key).slice(0, 7); }
  function monthName(key) { return MONTHS[Number(String(key).slice(5, 7)) - 1] || ''; }
  function monthLabel(key) { return monthName(key) + ' ' + String(key).slice(0, 4); }
  /* Jan in a mono label, January in a sentence. A chip and a table heading are
     labels and want the short form; a line of copy is copy and wants the word. */
  var MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  function monthProse(key) {
    return (MONTHS_FULL[Number(String(key).slice(5, 7)) - 1] || '') + ' ' + String(key).slice(0, 4);
  }
  function shortDate(key) { return monthName(key) + ' ' + dayNumber(key); }
  function longDate(key) { return shortDate(key) + ', ' + String(key).slice(0, 4); }

  function num(value) { return Number.isFinite(Number(value)) ? Number(value) : null; }
  function inches(value) { return num(value) == null ? '&mdash;' : num(value).toFixed(2) + ' in'; }
  function feet(value) { return num(value) == null ? '&mdash;' : num(value).toFixed(2) + ' ft'; }
  function plural(count, one, many) { return count + ' ' + (count === 1 ? one : many); }

  /* A reading cell. Label on top, figure under it, which is the .d-rows grid
     the card system already uses everywhere else on the site. */
  function cell(label, value) {
    return '<div class="d-cell"><em>' + label + '</em><b>' + value + '</b></div>';
  }

  function sortedDays(data) {
    return (data && Array.isArray(data.days) ? data.days : [])
      .filter(function (day) { return day && day.date; })
      .sort(function (a, b) { return a.date.localeCompare(b.date); });
  }

  function groupByMonth(rows, keyOf) {
    var months = {};
    rows.forEach(function (row) {
      var key = monthKey(keyOf(row));
      if (!months[key]) months[key] = [];
      months[key].push(row);
    });
    return months;
  }

  /* -------------------------------------------------------------------------
     THE REEL

     Months newest first, grouped under their year, one of them pressed. The
     caller hands over a note for each chip, which is what the chip reports
     under its own name: a month of rain, an average stage, a count of stories.
     ------------------------------------------------------------------------- */
  function buildReel(host, monthKeys, noteFor, onPick) {
    if (!host) return;
    var year = '';
    var html = '';
    monthKeys.forEach(function (key) {
      var thisYear = String(key).slice(0, 4);
      if (thisYear !== year) {
        year = thisYear;
        html += '<span class="reel-year">' + esc(year) + '</span>';
      }
      html += '<button type="button" class="reel-btn" data-month="' + esc(key) + '" aria-pressed="false">' +
        esc(monthName(key)) + '<small>' + noteFor(key) + '</small></button>';
    });
    host.innerHTML = html;
    host.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('.reel-btn') : null;
      if (!button) return;
      pick(button.getAttribute('data-month'));
    });

    function pick(key) {
      Array.prototype.forEach.call(host.querySelectorAll('.reel-btn'), function (button) {
        button.setAttribute('aria-pressed', button.getAttribute('data-month') === key ? 'true' : 'false');
      });
      onPick(key);
    }
    if (monthKeys.length) pick(monthKeys[0]);
  }

  /* -------------------------------------------------------------------------
     CHARTS

     Drawn from the numbers already on the page, in the same construction as
     the creek chart on the almanac: a viewBox, a polyline, and a mono label at
     each end. No library and nothing to poke at.
     ------------------------------------------------------------------------- */
  var CHART_W = 700;

  function chartFrame(height, body, leftLabel, rightLabel, topLabel, title) {
    return '<svg viewBox="0 0 ' + CHART_W + ' ' + height + '" role="img" aria-label="' + esc(title) + '">' +
      body +
      '<line x1="34" y1="' + (height - 22) + '" x2="' + (CHART_W - 10) + '" y2="' + (height - 22) +
        '" stroke="rgba(80,44,8,0.18)" stroke-width="1"/>' +
      (topLabel ? '<text class="arc-axis" x="34" y="13">' + esc(topLabel) + '</text>' : '') +
      '<text class="arc-axis" x="34" y="' + (height - 6) + '">' + esc(leftLabel) + '</text>' +
      '<text class="arc-axis" x="' + (CHART_W - 10) + '" y="' + (height - 6) + '" text-anchor="end">' +
        esc(rightLabel) + '</text>' +
      '</svg>';
  }

  /* Rain falls in a day and stops, so it is drawn as a column standing on the
     day it fell rather than as a line running through the ones it did not. */
  function rainChart(days, label) {
    var height = 150;
    var top = 20;
    var floor = height - 22;
    var left = 34;
    var right = CHART_W - 10;
    var peak = Math.max.apply(null, days.map(function (day) { return num(day.rain) || 0; }));
    if (!(peak > 0)) return '';
    var slot = (right - left) / days.length;
    var width = Math.max(2, Math.min(14, slot - 2));
    var bars = days.map(function (day, index) {
      var value = num(day.rain) || 0;
      if (!value) return '';
      var tall = Math.max(1.5, (value / peak) * (floor - top));
      var x = left + (index * slot) + ((slot - width) / 2);
      return '<rect x="' + x.toFixed(1) + '" y="' + (floor - tall).toFixed(1) + '" width="' + width.toFixed(1) +
        '" height="' + tall.toFixed(1) + '" rx="1" fill="var(--hold-weather)"/>';
    }).join('');
    return chartFrame(height, bars, shortDate(days[0].date), shortDate(days[days.length - 1].date),
      peak.toFixed(2) + ' in', label + ' rain, day by day');
  }

  /* The creek is continuous, so it is a line, with the day's low and high
     shaded behind it. The band is the part worth having: a mean of 1.4 ft says
     nothing about an afternoon that touched three and a half. */
  function stageChart(days, label) {
    var height = 186;
    var top = 20;
    var floor = height - 22;
    var left = 34;
    var right = CHART_W - 10;
    var lows = days.map(function (day) { return num(day.low); }).filter(function (v) { return v != null; });
    var highs = days.map(function (day) { return num(day.high); }).filter(function (v) { return v != null; });
    if (!lows.length || !highs.length) return '';
    var floorValue = Math.min.apply(null, lows);
    var peakValue = Math.max.apply(null, highs);
    var span = (peakValue - floorValue) || 1;
    var step = days.length > 1 ? (right - left) / (days.length - 1) : 0;
    function x(index) { return left + (index * step); }
    function y(value) { return floor - ((value - floorValue) / span) * (floor - top); }

    var upper = days.map(function (day, index) { return x(index).toFixed(1) + ',' + y(num(day.high)).toFixed(1); });
    var lower = days.map(function (day, index) { return x(index).toFixed(1) + ',' + y(num(day.low)).toFixed(1); }).reverse();
    var line = days.map(function (day, index) { return x(index).toFixed(1) + ',' + y(num(day.mean)).toFixed(1); }).join(' ');

    var body = '<polygon points="' + upper.concat(lower).join(' ') + '" fill="var(--hold-creek)" fill-opacity="0.22"/>' +
      '<polyline fill="none" stroke="var(--hold-creek)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="' + line + '"/>';
    return chartFrame(height, body, shortDate(days[0].date), shortDate(days[days.length - 1].date),
      peakValue.toFixed(2) + ' ft', label + ' creek stage at the Republic gauge');
  }

  /* -------------------------------------------------------------------------
     PHOTOGRAPHS

     A photograph carries its own provenance in its file name,
     what-it-is_monthyear_first-last.jpg, as in
     brookside_fog_sept2022_joe-graham.jpg. The subject may hold underscores, so
     the date is found by pattern, and the month is read from its first three
     letters so sept and sep and september agree. The JSON fields win where set,
     and a file matching neither reads as an em dash rather than a guess. Keep
     this in step with fileFacts in index.html.
     ------------------------------------------------------------------------- */
  var MONTH_KEYS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

  function fileFacts(src) {
    var name = String(src || '').split('?')[0].split('/').pop().replace(/\.[A-Za-z0-9]+$/, '');
    var month, year, who;
    var named = name.match(/^(.+)_([A-Za-z]+)(\d{4})_([A-Za-z][A-Za-z0-9-]*)$/);
    if (named) {
      month = MONTH_KEYS[named[2].slice(0, 3).toLowerCase()];
      year = named[3];
      who = named[4];
    } else {
      var dated = name.match(/^(.+)_(\d{4})-(\d{2})_([A-Za-z][A-Za-z0-9-]*)$/);
      if (!dated) return { year: null, month: null, credit: '' };
      month = Number(dated[3]);
      year = dated[2];
      who = dated[4];
    }
    if (!month || month < 1 || month > 12) return { year: null, month: null, credit: '' };
    return {
      year: year,
      month: month,
      credit: who.split('-').filter(Boolean).map(function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      }).join(' ')
    };
  }

  /* A taken field holding a bare year is a real answer and sorts with the rest
     of that year. A picture nobody has dated stays undated and sorts last. */
  function takenKey(item) {
    var raw = String(item.taken || '').trim();
    var full = raw.match(/^(\d{4})-(\d{2})/);
    if (full) {
      var month = Number(full[2]);
      return (month >= 1 && month <= 12) ? { year: full[1], month: month } : null;
    }
    var yearOnly = raw.match(/^(\d{4})$/);
    if (yearOnly) return { year: yearOnly[1], month: null };
    var facts = fileFacts(item.src);
    return facts.year ? { year: facts.year, month: facts.month } : null;
  }

  function takenLabel(item) {
    var key = takenKey(item);
    if (!key) return '';
    return key.month ? MONTHS[key.month - 1] + ' ' + key.year : key.year;
  }

  function creditOf(item) {
    return String(item.credit || '').trim() || fileFacts(item.src).credit;
  }

  function orderedPhotos(data) {
    var items = (data && Array.isArray(data.items) ? data.items : [])
      .filter(function (item) { return item && item.src; });
    return items.sort(function (a, b) {
      var ka = takenKey(a);
      var kb = takenKey(b);
      if (!ka && !kb) return 0;
      if (!ka) return 1;
      if (!kb) return -1;
      return (kb.year - ka.year) || ((kb.month || 0) - (ka.month || 0));
    });
  }

  function loadPhotos() {
    var host = byId('galleryGrid');
    if (!host) return;
    loadJson(PHOTO_FILE).then(function (data) {
      var items = orderedPhotos(data);
      if (!items.length) return;

      host.innerHTML = items.map(function (item) {
        var src = String(item.src).indexOf('/') > -1 ? item.src : 'fivemile_photos/' + item.src;
        var credit = creditOf(item);
        var taken = takenLabel(item);
        return '<div class="card-post">' +
          '<div class="p-img"><img src="' + esc(src) + '" alt="' + esc(item.alt || '') + '" loading="lazy" decoding="async"></div>' +
          '<div class="p-bd">' +
            '<div class="p-lf">' +
              '<h3>' + esc(item.title || '') + '</h3>' +
              '<p>' + esc(item.copy || '') + '</p>' +
            '</div>' +
            '<div class="p-rt">' +
              '<div class="p-stamp">' + (credit ? esc(credit.toUpperCase()) : '&mdash;') + '</div>' +
              '<div class="p-yr">' + (taken ? esc(taken) : '&mdash;') + '</div>' +
            '</div>' +
          '</div></div>';
      }).join('');

      /* The oldest picture anybody has put a date on. An undated one sorts to
         the end of the grid, so the last item is not reliably the answer. */
      var dated = items.filter(function (item) { return takenKey(item); });
      if (dated.length) {
        setText('photoStamp', plural(items.length, 'picture', 'pictures') +
          ' · back to ' + takenLabel(dated[dated.length - 1]));
      }
    }).catch(function () { /* the empty state is already on the page */ });
  }

  /* -------------------------------------------------------------------------
     WEATHER
     ------------------------------------------------------------------------- */
  function weatherSummary(days) {
    var warm = null, cold = null, wet = null, gust = null;
    var rain = 0;
    var wetDays = 0;
    days.forEach(function (day) {
      if (num(day.high) != null && (!warm || num(day.high) > num(warm.high))) warm = day;
      if (num(day.low) != null && (!cold || num(day.low) < num(cold.low))) cold = day;
      if (num(day.rain) != null && (!wet || num(day.rain) > num(wet.rain))) wet = day;
      if (num(day.maxGust) != null && (!gust || num(day.maxGust) > num(gust.maxGust))) gust = day;
      rain += num(day.rain) || 0;
      if ((num(day.rain) || 0) >= 0.01) wetDays += 1;
    });
    return { warm: warm, cold: cold, wet: wet, gust: gust, rain: rain, wetDays: wetDays };
  }

  function wettestMonth(days) {
    var months = groupByMonth(days, function (day) { return day.date; });
    var best = null;
    var bestTotal = -1;
    Object.keys(months).forEach(function (key) {
      var total = months[key].reduce(function (running, day) { return running + (num(day.rain) || 0); }, 0);
      if (total > bestTotal) { bestTotal = total; best = key; }
    });
    return { month: best, total: bestTotal };
  }

  /* The longest the ground has gone without measurable rain. Counted across the
     whole file rather than inside a month, because a dry spell does not stop at
     the end of January. */
  function longestDryRun(days) {
    var run = 0, best = 0, endedOn = '';
    days.forEach(function (day) {
      if ((num(day.rain) || 0) >= 0.01) { run = 0; return; }
      run += 1;
      if (run > best) { best = run; endedOn = day.date; }
    });
    return { days: best, endedOn: endedOn };
  }

  function renderWeatherMonth(days, key) {
    var body = byId('weatherMonth');
    if (!body) return;
    setText('weatherMonthName', monthProse(key));
    if (!days.length) {
      body.innerHTML = '<div class="empty">&mdash;</div>';
      return;
    }
    var sum = weatherSummary(days);
    var rows = '<div class="d-rows">' +
      cell('Warmest &middot; ' + esc(shortDate(sum.warm.date)), esc(num(sum.warm.high)) + '&deg;') +
      cell('Coldest &middot; ' + esc(shortDate(sum.cold.date)), esc(num(sum.cold.low)) + '&deg;') +
      cell('Rain for the month', inches(sum.rain)) +
      cell('Wettest day &middot; ' + esc(shortDate(sum.wet.date)), inches(sum.wet.rain)) +
      cell('Days with rain', esc(sum.wetDays) + ' of ' + esc(days.length)) +
      cell('Hardest gust &middot; ' + esc(shortDate(sum.gust.date)), esc(num(sum.gust.maxGust)) + ' mph') +
      '</div>';

    var chart = rainChart(days, monthLabel(key));
    var table = '<table class="arc-table">' +
      '<thead><tr><th scope="col">Day</th><th scope="col">High</th><th scope="col">Low</th>' +
        '<th scope="col">Rain</th><th scope="col" class="opt">Gust</th></tr></thead><tbody>' +
      days.map(function (day) {
        var rainValue = num(day.rain) || 0;
        return '<tr>' +
          '<th scope="row"><span>' + esc(weekday(day.date)) + '</span>' + esc(dayNumber(day.date)) + '</th>' +
          '<td' + (day === sum.warm ? ' class="peak"' : '') + '>' + (num(day.high) == null ? '&mdash;' : esc(num(day.high))) + '</td>' +
          '<td' + (day === sum.cold ? ' class="peak"' : '') + '>' + (num(day.low) == null ? '&mdash;' : esc(num(day.low))) + '</td>' +
          '<td class="' + (rainValue ? (day === sum.wet ? 'peak' : '') : 'zero') + '">' + rainValue.toFixed(2) + '</td>' +
          '<td class="opt">' + (num(day.maxGust) == null ? '&mdash;' : esc(num(day.maxGust))) + '</td>' +
          '</tr>';
      }).join('') +
      '</tbody></table>';

    body.innerHTML = rows +
      (chart ? '<div class="arc-chart" style="margin-top:15px">' + chart + '</div>' : '<div style="height:15px"></div>') +
      table;
  }

  /* Every day the station has ever reported, read at once. Six extremes, which
     is the board a reader checks before they check anything else: was that the
     hottest it has been, or does it only feel that way. */
  function renderWeatherRecords(days) {
    var host = byId('weatherRecords');
    if (!host || !days.length) return;
    var sum = weatherSummary(days);
    var wettest = wettestMonth(days);
    var dry = longestDryRun(days);
    host.innerHTML = '<div class="d-rows">' +
      cell('Hottest &middot; ' + esc(shortDate(sum.warm.date)), esc(num(sum.warm.high)) + '&deg;') +
      cell('Coldest &middot; ' + esc(shortDate(sum.cold.date)), esc(num(sum.cold.low)) + '&deg;') +
      cell('Wettest day &middot; ' + esc(shortDate(sum.wet.date)), inches(sum.wet.rain)) +
      cell('Wettest month &middot; ' + esc(monthLabel(wettest.month)), inches(wettest.total)) +
      cell('Longest dry run &middot; to ' + esc(shortDate(dry.endedOn)), esc(dry.days) + ' days') +
      cell('Rain on the books', inches(sum.rain)) +
      '</div>';
  }

  function loadWeather() {
    var reel = byId('weatherReel');
    if (!reel) return;
    loadJson(WEATHER_FILE).then(function (data) {
      var days = sortedDays(data);
      if (!days.length) return;
      var months = groupByMonth(days, function (day) { return day.date; });
      var keys = Object.keys(months).sort().reverse();

      setText('weatherStamp', plural(days.length, 'day', 'days') + ' · back to ' + monthLabel(days[0].date));
      buildReel(reel, keys, function (key) {
        var total = months[key].reduce(function (running, day) { return running + (num(day.rain) || 0); }, 0);
        return total.toFixed(2) + ' in';
      }, function (key) {
        renderWeatherMonth(months[key], key);
      });
      renderWeatherRecords(days);
    }).catch(function () { /* the empty state is already on the page */ });
  }

  /* -------------------------------------------------------------------------
     THE CREEK
     ------------------------------------------------------------------------- */
  function creekSummary(days) {
    var high = null, low = null, flow = null, meanSum = 0;
    days.forEach(function (day) {
      if (num(day.high) != null && (!high || num(day.high) > num(high.high))) high = day;
      if (num(day.low) != null && (!low || num(day.low) < num(low.low))) low = day;
      if (num(day.cfs) != null && (!flow || num(day.cfs) > num(flow.cfs))) flow = day;
      meanSum += num(day.mean) || 0;
    });
    return { high: high, low: low, flow: flow, mean: days.length ? meanSum / days.length : null };
  }

  function renderCreekMonth(days, key) {
    var body = byId('creekMonth');
    if (!body) return;
    setText('creekMonthName', monthProse(key));
    if (!days.length) {
      body.innerHTML = '<div class="empty">&mdash;</div>';
      return;
    }
    var sum = creekSummary(days);
    var rows = '<div class="d-rows">' +
      cell('Highest &middot; ' + esc(shortDate(sum.high.date)), feet(sum.high.high)) +
      cell('Lowest &middot; ' + esc(shortDate(sum.low.date)), feet(sum.low.low)) +
      cell('Average for the month', feet(sum.mean)) +
      cell('Most flow &middot; ' + esc(shortDate(sum.flow.date)), esc(num(sum.flow.cfs)) + ' cfs') +
      '</div>';

    var chart = stageChart(days, monthLabel(key));
    var table = '<table class="arc-table">' +
      '<thead><tr><th scope="col">Day</th><th scope="col">Low</th><th scope="col">High</th>' +
        '<th scope="col">Mean</th><th scope="col" class="opt">Flow</th></tr></thead><tbody>' +
      days.map(function (day) {
        return '<tr>' +
          '<th scope="row"><span>' + esc(weekday(day.date)) + '</span>' + esc(dayNumber(day.date)) + '</th>' +
          '<td' + (day === sum.low ? ' class="peak"' : '') + '>' + (num(day.low) == null ? '&mdash;' : num(day.low).toFixed(2)) + '</td>' +
          '<td' + (day === sum.high ? ' class="peak"' : '') + '>' + (num(day.high) == null ? '&mdash;' : num(day.high).toFixed(2)) + '</td>' +
          '<td>' + (num(day.mean) == null ? '&mdash;' : num(day.mean).toFixed(2)) + '</td>' +
          '<td class="opt">' + (num(day.cfs) == null ? '&mdash;' : num(day.cfs).toFixed(1)) + '</td>' +
          '</tr>';
      }).join('') +
      '</tbody></table>';

    body.innerHTML = rows +
      (chart ? '<div class="arc-chart tall" style="margin-top:15px">' + chart + '</div>' : '<div style="height:15px"></div>') +
      table;
  }

  function loadCreek() {
    var reel = byId('creekReel');
    if (!reel) return;
    loadJson(CREEK_FILE).then(function (data) {
      var days = sortedDays(data);
      if (!days.length) return;
      var months = groupByMonth(days, function (day) { return day.date; });
      var keys = Object.keys(months).sort().reverse();

      setText('creekStamp', plural(days.length, 'day', 'days') + ' · back to ' + longDate(days[0].date));
      buildReel(reel, keys, function (key) {
        var mean = months[key].reduce(function (running, day) { return running + (num(day.mean) || 0); }, 0) / months[key].length;
        return mean.toFixed(2) + ' ft';
      }, function (key) {
        renderCreekMonth(months[key], key);
      });
    }).catch(function () { /* the empty state is already on the page */ });
  }

  /* -------------------------------------------------------------------------
     THE STORIES

     news-archive/index.json is the shelf label, written by the gatherer,
     because a static host cannot list a directory. Months load one at a time
     until somebody searches, at which point the whole run comes down and the
     search runs over all of it.
     ------------------------------------------------------------------------- */
  var newsMonths = [];
  var newsLoaded = {};
  var newsCurrent = '';

  function storyRow(story) {
    var when = story.published_at ? String(story.published_at).slice(0, 10) : '';
    var tags = (Array.isArray(story.tags) ? story.tags : []).slice(0, 2).map(function (tag) {
      return '<span class="tag" data-beat="' + esc(String(tag).toLowerCase().replace(/[^a-z]/g, '')) + '">' + esc(tag) + '</span>';
    }).join('');
    return '<a class="card-stub story" href="' + esc(story.url) + '" target="_blank" rel="noreferrer">' +
      '<div class="k-bd">' +
        '<div class="k-top">' +
          '<span class="town-badge">' + esc(story.town || 'Regional') + '</span>' +
          tags +
          '<span class="k-src">' + esc(story.outlet || '') + (when ? ' &middot; ' + esc(longDate(when)) : '') + '</span>' +
        '</div>' +
        '<h3>' + esc(story.title || '') + '</h3>' +
      '</div></a>';
  }

  function renderStories(stories, countLabel) {
    var host = byId('newsRows');
    if (!host) return;
    host.innerHTML = stories.length ? stories.map(storyRow).join('') : '<div class="empty">&mdash;</div>';
    var count = byId('newsCount');
    if (count) count.textContent = countLabel;
  }

  function monthStories(key) {
    return loadJson('news-archive/' + key + '.json').then(function (data) {
      newsLoaded[key] = (data && Array.isArray(data.stories) ? data.stories : []);
      return newsLoaded[key];
    }).catch(function () {
      newsLoaded[key] = [];
      return newsLoaded[key];
    });
  }

  function showMonth(key) {
    newsCurrent = key;
    var ready = newsLoaded[key] ? Promise.resolve(newsLoaded[key]) : monthStories(key);
    ready.then(function (stories) {
      if (newsCurrent !== key) return;
      renderStories(stories, monthLabel(key) + ' · ' + plural(stories.length, 'story', 'stories'));
    });
  }

  function runSearch(term) {
    var needle = term.trim().toLowerCase();
    if (!needle) {
      showMonth(newsCurrent);
      return;
    }
    Promise.all(newsMonths.map(function (month) {
      return newsLoaded[month.month] ? Promise.resolve(newsLoaded[month.month]) : monthStories(month.month);
    })).then(function () {
      var hits = [];
      newsMonths.forEach(function (month) {
        (newsLoaded[month.month] || []).forEach(function (story) {
          var hay = [story.title, story.summary, story.outlet, story.town]
            .concat(Array.isArray(story.tags) ? story.tags : [])
            .join(' ').toLowerCase();
          if (hay.indexOf(needle) > -1) hits.push(story);
        });
      });
      hits.sort(function (a, b) { return String(b.published_at || '').localeCompare(String(a.published_at || '')); });
      renderStories(hits, 'Every month · ' + plural(hits.length, 'match', 'matches'));
    });
  }

  function loadNews() {
    var reel = byId('newsReel');
    if (!reel) return;
    loadJson(NEWS_INDEX).then(function (data) {
      newsMonths = (data && Array.isArray(data.months) ? data.months : []);
      if (!newsMonths.length) return;

      var oldest = newsMonths[newsMonths.length - 1];
      setText('newsStamp', plural(num(data.total) || 0, 'story', 'stories') + ' · back to ' + monthLabel(oldest.month));

      var counts = {};
      newsMonths.forEach(function (month) { counts[month.month] = month.count; });
      buildReel(reel, newsMonths.map(function (month) { return month.month; }), function (key) {
        return String(counts[key] || 0);
      }, showMonth);

      var find = byId('newsFind');
      if (find) {
        var timer = null;
        find.addEventListener('input', function () {
          window.clearTimeout(timer);
          var value = find.value;
          timer = window.setTimeout(function () { runSearch(value); }, 160);
        });
      }
    }).catch(function () { /* the empty state is already on the page */ });
  }

  /* -------------------------------------------------------------------------
     THE DATES

     The calendar keeps one month on screen and this is the rest of it: every
     month FIVEMILE has a calendar for, a year at a time, and a search across
     all of them.

     Nothing is stored here. There is no dates file to fall out of step with
     the calendar, because the room asks the same engine the calendar asks, a
     month at a time, and gets the same answer back. That is the rule the other
     four rooms keep by reading the file the live page reads.
     See DECISIONS.md 36 and 50.
     ------------------------------------------------------------------------- */
  var dateYears = [];      // [{ year, total, months: [{ month, items }] }]
  var dateCurrentYear = 0;

  function calendarEngine() { return window.FivemileCalendar; }

  function buildYears(turnings) {
    var C = calendarEngine();
    var out = [];
    for (var year = C.FIRST_YEAR; year <= C.lastYear(); year++) {
      var months = [];
      var total = 0;
      for (var month = 1; month <= 12; month++) {
        var items = C.monthItems(year, month, turnings, null);
        total += items.length;
        months.push({ month: month, items: items });
      }
      out.push({ year: year, total: total, months: months });
    }
    return out;
  }

  /* The reel holds a run of months everywhere else in the archive and a run of
     years here. Same control, same 44px, same rule that a chip has to report
     something under its own name rather than only naming itself. */
  function buildYearReel(host, years, onPick) {
    if (!host) return null;
    host.innerHTML = years.map(function (row) {
      return '<button type="button" class="reel-btn" data-year="' + row.year + '" aria-pressed="false">' +
        row.year + '<small>' + row.total + '</small></button>';
    }).join('');

    host.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('.reel-btn') : null;
      if (!button) return;
      pick(Number(button.getAttribute('data-year')));
    });

    function pick(year) {
      Array.prototype.forEach.call(host.querySelectorAll('.reel-btn'), function (button) {
        button.setAttribute('aria-pressed', Number(button.getAttribute('data-year')) === year ? 'true' : 'false');
      });
      onPick(year);
    }
    return pick;
  }

  /* A month row, drawn as the event stub the calendar draws, doing the same
     job: the thing worth scanning goes in the brown block and the body says
     what is behind it.

     Four titles and then a count. Somebody deciding whether August is worth a
     tap wants to recognise something, not read eleven rows twice. */
  function dateMonthRow(year, month, items) {
    var C = calendarEngine();
    var titles = items.slice(0, 4).map(function (item) { return esc(item.title); });
    var rest = items.length - titles.length;
    if (rest > 0) titles.push(rest + ' more');

    return '<a class="card-stub" href="fivemile-calendar.html#' + C.monthId(year, month) + '">' +
      '<div class="k-date">' +
        '<span class="mo">' + C.MONTH_SHORT[month - 1] + '</span>' +
        '<span class="dy">' + year + '</span>' +
      '</div>' +
      '<div class="k-bd">' +
        '<div class="k-top"><span class="k-src">' + plural(items.length, 'date', 'dates') + '</span></div>' +
        '<h3>' + esc(C.MONTH_FULL[month - 1]) + '</h3>' +
        (titles.length ? '<div class="w">' + titles.join(' &middot; ') + '</div>' : '') +
      '</div></a>';
  }

  function showYear(year) {
    dateCurrentYear = year;
    var row = dateYears.filter(function (y) { return y.year === year; })[0];
    var host = byId('dateMonths');
    var hits = byId('dateHits');
    if (!row || !host) return;

    if (hits) hits.innerHTML = '';
    host.innerHTML = '<div class="rows">' + row.months.map(function (m) {
      return dateMonthRow(year, m.month, m.items);
    }).join('') + '</div>';
    setText('dateCount', year + ' \u00b7 ' + plural(row.total, 'date', 'dates'));
  }

  /* Every date on file, not just the year on screen. Somebody looking for the
     duck race does not know which year they are standing in. */
  function runDateSearch(term) {
    var C = calendarEngine();
    var needle = term.trim().toLowerCase();
    var host = byId('dateMonths');
    var hits = byId('dateHits');
    if (!hits) return;

    if (!needle) {
      showYear(dateCurrentYear);
      return;
    }

    var found = [];
    dateYears.forEach(function (row) {
      row.months.forEach(function (m) {
        m.items.forEach(function (item) {
          var hay = [item.title, item.blurb, item.town, item.subject].join(' ').toLowerCase();
          if (hay.indexOf(needle) > -1) found.push({ item: item, year: row.year, month: m.month });
        });
      });
    });

    if (host) host.innerHTML = '';
    hits.innerHTML = found.length
      ? '<div class="rows">' + found.map(function (hit) {
          return C.stubHtml(hit.item, C.MONTH_FULL[hit.month - 1] + ' ' + hit.year);
        }).join('') + '</div>'
      : '<div class="empty">&mdash;</div>';
    setText('dateCount', 'Every year \u00b7 ' + plural(found.length, 'match', 'matches'));
  }

  function loadDates() {
    var reel = byId('dateReel');
    if (!reel || !calendarEngine()) return;

    calendarEngine().loadTurnings().then(function (turnings) {
      dateYears = buildYears(turnings);
      if (!dateYears.length) return;

      var total = dateYears.reduce(function (sum, row) { return sum + row.total; }, 0);
      setText('dateStamp', plural(total, 'date', 'dates') + ' on file \u00b7 back to January ' + dateYears[0].year);

      /* The year a reader is standing in opens first, not the oldest one. */
      var now = new Date().getFullYear();
      var opening = dateYears.filter(function (row) { return row.year === now; })[0] || dateYears[0];
      var pick = buildYearReel(reel, dateYears, showYear);
      if (pick) pick(opening.year);

      var find = byId('dateFind');
      if (find) {
        var timer = null;
        find.addEventListener('input', function () {
          window.clearTimeout(timer);
          var value = find.value;
          timer = window.setTimeout(function () { runDateSearch(value); }, 160);
        });
      }
    });
  }

  /* -------------------------------------------------------------------------
     THE HUB

     Four panels, three readings and a line each. It reads all four files
     because that is the job. A hub that only names its rooms is a menu, and a
     reader in front of a menu still has to open every door to find out whether
     there is anything behind it. These say what is in there before you go.
     ------------------------------------------------------------------------- */
  function hubPhotos() {
    loadJson(PHOTO_FILE).then(function (data) {
      var items = orderedPhotos(data);
      if (!items.length) return;
      var dated = items.filter(function (item) { return takenKey(item); });
      setText('hubPhotoCount', String(items.length));
      setText('hubPhotoNewest', dated.length ? takenLabel(dated[0]) : '');
      setText('hubPhotoOldest', dated.length ? takenLabel(dated[dated.length - 1]) : '');
      var newest = dated[0] || items[0];
      var credit = creditOf(newest);
      setText('hubPhotoNote', 'The most recent one in is ' + String(newest.title || '').toLowerCase() +
        (credit ? ', by ' + credit : '') + '.');
    }).catch(function () { /* the panel keeps its em dashes */ });
  }

  function hubWeather() {
    loadJson(WEATHER_FILE).then(function (data) {
      var days = sortedDays(data);
      if (!days.length) return;
      var sum = weatherSummary(days);
      var wettest = wettestMonth(days);
      setText('hubWeatherDays', String(days.length));
      setText('hubWeatherSince', monthLabel(days[0].date));
      setText('hubWeatherHot', num(sum.warm.high) + '°');
      setText('hubWeatherNote', 'The wettest month on the books is ' + monthProse(wettest.month) +
        ', which brought ' + wettest.total.toFixed(2) + ' inches.');
    }).catch(function () { /* the panel keeps its em dashes */ });
  }

  function hubCreek() {
    loadJson(CREEK_FILE).then(function (data) {
      var days = sortedDays(data);
      if (!days.length) return;
      var sum = creekSummary(days);
      setText('hubCreekDays', String(days.length));
      setText('hubCreekSince', longDate(days[0].date));
      setText('hubCreekHigh', num(sum.high.high).toFixed(2) + ' ft');
      setText('hubCreekNote', 'It has run between ' + num(sum.low.low).toFixed(2) + ' and ' +
        num(sum.high.high).toFixed(2) + ' feet so far, and the record gets a day longer every day.');
    }).catch(function () { /* the panel keeps its em dashes */ });
  }

  function hubNews() {
    loadJson(NEWS_INDEX).then(function (data) {
      var months = (data && Array.isArray(data.months) ? data.months : []);
      if (!months.length) return;
      var total = num(data.total) || 0;
      var oldest = months[months.length - 1];
      var busiest = months.reduce(function (best, month) { return month.count > best.count ? month : best; }, months[0]);
      setText('hubNewsCount', String(total));
      setText('hubNewsMonths', String(months.length));
      setText('hubNewsSince', monthLabel(oldest.month));
      /* Naming the busiest of one month is a joke at the reader's expense.
         Until there are two, the note says what the shelf actually holds. */
      setText('hubNewsNote', months.length > 1
        ? 'The busiest month so far is ' + monthProse(busiest.month) + ', with ' +
          plural(busiest.count, 'story', 'stories') + ' in it.'
        : 'Everything from ' + monthProse(oldest.month) +
          ' forward, and a new month opens the first time a story runs in it.');
    }).catch(function () { /* the panel keeps its em dashes */ });
  }

  /* The dates panel is the one figure on the hub that is worked out rather
     than read off a file, because the calendar has no file: it is two lists
     and a set of rules. The principle holds all the same, since the sum is
     counted with the engine the room and the calendar page both ask. */
  function hubDates() {
    var C = window.FivemileCalendar;
    if (!C) return;
    C.loadTurnings().then(function (turnings) {
      var total = 0;
      var months = 0;
      for (var year = C.FIRST_YEAR; year <= C.lastYear(); year++) {
        for (var month = 1; month <= 12; month++) {
          total += C.monthItems(year, month, turnings, null).length;
          months++;
        }
      }
      setText('hubDateCount', String(total));
      setText('hubDateMonths', String(months));
      setText('hubDateSince', 'January ' + C.FIRST_YEAR);
    });
  }

  function loadHub() {
    if (!byId('hubPhotoCount')) return;
    hubPhotos();
    hubWeather();
    hubCreek();
    hubNews();
    hubDates();
  }

  loadHub();
  loadPhotos();
  loadWeather();
  loadCreek();
  loadNews();
  loadDates();
})();
