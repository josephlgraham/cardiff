/* ===========================================================================
   fivemile-archive.js

   The archive family. Seven pages share this file:

     fivemile-archive.html           the hub, a search and a panel per room
     fivemile-gallery.html           every photograph that has run
     fivemile-weather-archive.html   every day the station has reported
     fivemile-creek-archive.html     the creek at the Republic gauge, by the day
     fivemile-news-archive.html      every story that has run, by month
     fivemile-calendar-archive.html  every date the calendar keeps, by the year
     fivemile-species-archive.html   every species recorded in the three towns

   The editions room is written by scripts/build-editions.mjs and does not
   load this file; the hub reads its index all the same.

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
  var WEATHER_DIR = 'fivemile-weather-archive';
  var CREEK_DIR = 'fivemile-creek-archive';
  var CREEK_PEAKS = 'fivemile-creek-peaks.json';
  var NEWS_INDEX = 'news-archive/index.json';
  var EDITION_INDEX = 'fivemile-editions/index.json';
  var SIGHTINGS_FILE = 'fivemile-observations.json';
  /* A photograph of each species, not of the sighting. See DECISIONS.md 83. */
  var SPECIES_PHOTOS = 'fivemile-species-photos.json';

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

  /* Year archives come back through the shared loader in fivemile-common.js,
     which stitches the year files back into one object. */
  function loadArchive(dir) {
    return window.FivemileYearArchive(dir);
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
  /* num() with a hole in it. Number(null) is 0, so num(null) comes back as a
     reading of nought, and the creek archive is full of nulls on purpose: a
     day before October 2007 has no low and no high. Anything that can be
     missing goes through this instead. */
  function reading(value) { return value == null || value === '' ? null : num(value); }
  function inches(value) { return num(value) == null ? '&mdash;' : num(value).toFixed(2) + ' in'; }
  function feet(value) { return num(value) == null ? '&mdash;' : num(value).toFixed(2) + ' ft'; }
  function plural(count, one, many) { return count + ' ' + (count === 1 ? one : many); }
  /* The same thing with the thousands marked, for counts that run past a few
     hundred. 33,616 samples is read at a glance; 33616 has to be counted. */
  function tally(count, one, many) {
    return Number(count || 0).toLocaleString('en-US') + ' ' + (count === 1 ? one : many);
  }

  /* A reading cell. Label on top, figure under it, which is the .d-rows grid
     the card system already uses everywhere else on the site. The mark is
     optional here only because the weather room has not been given its marks
     yet; see DECISIONS.md 51. */
  function cell(label, value, mark) {
    return '<div class="d-cell"><em>' + (mark ? '<i class="d-mark" aria-hidden="true">' + mark + '</i>' : '') +
      label + '</em><b>' + value + '</b></div>';
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

  /* -------------------------------------------------------------------------
     THE CREEK

     Every day the Republic gauge has on file, which is every day since May
     21, 1988. The room reads all of it at once and works everything else out
     here: where the creek usually runs on each day of the year, every season
     ranked against the same season in the other years, and a grid of every
     month on file. None of that is stored anywhere. It is fourteen thousand
     rows and about 140 KB over the wire, which is less than a photograph, and
     it means there is no summary file that could ever disagree with the days
     it summarizes. See DECISIONS.md 71.

     The charts measure the box they are drawn into and set the viewBox to it,
     the way the creek chart on the almanac does, so one unit is one pixel and
     the type is the size the stylesheet says. See DECISIONS.md 45.
     ------------------------------------------------------------------------- */
  var SLOT_START = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
  var SEASONS = [
    { id: 'winter', name: 'Winter', first: 12 },
    { id: 'spring', name: 'Spring', first: 3 },
    { id: 'summer', name: 'Summer', first: 6 },
    { id: 'fall', name: 'Fall', first: 9 }
  ];
  /* .arc-axis is 11px DM Mono, and DM Mono gives every character six tenths
     of an em, so a label's width is its length times this. */
  var AXIS_CHAR = 11 * 0.6;
  var RULE = 'rgba(80,44,8,0.12)';
  var OTHER_YEAR = '#B3A58C';
  /* Five steps from far drier than usual to far wetter, for the grid. Brown for
     dry ground and the creek green for water, with the middle three tenths of
     years in a paper tone that sits just off the card. */
  var WETNESS = [
    { below: 0.1, fill: '#8B5E34', word: 'far drier than usual' },
    { below: 0.3, fill: '#D6BA90', word: 'drier than usual' },
    { below: 0.7, fill: '#EDE3D1', word: 'about usual' },
    { below: 0.9, fill: '#A3C4AB', word: 'wetter than usual' },
    { below: 2, fill: '#4A7C59', word: 'far wetter than usual' }
  ];

  var creek = {
    days: [], byDate: {}, byYear: {}, first: '', last: '', lastYear: 0, nowYear: 0,
    bands: null, years: {}, fullYears: [], seasons: {}, grid: null, peaks: null,
    year: 0, season: '', picked: [], focus: 0, pickYear: null, redraws: {}
  };

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function keyOf(date) { return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()); }
  function addDays(key, count) {
    var date = dateFromKey(key);
    date.setDate(date.getDate() + count);
    return keyOf(date);
  }
  /* Rounded, because a daylight saving change puts 23 or 25 hours between two
     midnights. */
  function daysApart(a, b) { return Math.round((dateFromKey(b) - dateFromKey(a)) / 86400000); }
  /* Where a date sits in a leap year, 0 to 365. Every year uses the same slots,
     so March 1 is always slot 60 and February 29 has a slot of its own that
     three years in four leave empty. That is what lets 1988 and 2026 be drawn
     on the same axis and compared a day at a time. */
  function slotOf(key) { return SLOT_START[Number(key.slice(5, 7)) - 1] + dayNumber(key) - 1; }
  function slotMonth(slot) {
    var index = 0;
    while (index < 11 && SLOT_START[index + 1] <= slot) index += 1;
    return index;
  }
  function slotDate(slot) {
    var index = slotMonth(slot);
    return MONTHS[index] + ' ' + (slot - SLOT_START[index] + 1);
  }
  function numeric(a, b) { return a - b; }
  function present(value) { return value != null; }
  function quantile(sorted, p) {
    if (!sorted.length) return null;
    var at = (sorted.length - 1) * p;
    var lo = Math.floor(at);
    var hi = Math.ceil(at);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (at - lo);
  }
  function average(list) {
    return list.length ? list.reduce(function (sum, n) { return sum + n; }, 0) / list.length : null;
  }
  function median(list) { return quantile(list.slice().sort(numeric), 0.5); }
  function ordinal(n) {
    var tail = n % 100;
    var suffix = (tail >= 11 && tail <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
    return n + suffix;
  }
  /* Counted from the wet end for the top half of the list and from the dry
     end for the bottom half, because nobody says a season was the thirty
     first wettest of thirty eight. */
  function rankPhrase(position, count) {
    if (position <= Math.ceil(count / 2)) return position === 1 ? 'wettest' : ordinal(position) + ' wettest';
    var fromDry = count - position + 1;
    return fromDry === 1 ? 'driest' : ordinal(fromDry) + ' driest';
  }
  function flowFigure(value) {
    if (value == null) return '&mdash;';
    if (value >= 1000) return Math.round(value).toLocaleString('en-US');
    return value >= 10 ? String(Math.round(value)) : value.toFixed(1);
  }
  function cfs(value) { return value == null ? '&mdash;' : flowFigure(value) + ' cfs'; }
  function depthOf(day) { return reading(day.mean); }
  /* A day before October 2007 has a mean and nothing else, so its highest
     figure is its mean. The labels say which one they are showing. */
  function highOf(day) { return reading(day.high) != null ? reading(day.high) : reading(day.mean); }
  function lowOf(day) { return reading(day.low) != null ? reading(day.low) : reading(day.mean); }
  function boxOf(host, tall) {
    var width = Math.max(280, Math.round((host && host.clientWidth) || 640));
    var narrow = width < 520;
    return {
      width: width,
      narrow: narrow,
      height: tall ? (narrow ? 230 : 280) : (narrow ? 180 : 210)
    };
  }
  function frameOf(box) {
    return {
      left: box.narrow ? 38 : 60,
      right: box.width - (box.narrow ? 6 : 10),
      top: 14,
      bottom: box.height - 26
    };
  }
  function svgOpen(box, label) {
    return '<svg viewBox="0 0 ' + box.width + ' ' + box.height + '" role="img" aria-label="' + esc(label) + '">';
  }

  /* -------------------------------------------------------------------------
     What the page works out from the days
     ------------------------------------------------------------------------- */

  /* Where the creek usually runs on each day of the year. Every full year
     before this one, taken a week either side of the date, which is enough
     readings for a steady band and narrow enough that it still turns with the
     seasons. The five figures are the tenth, quarter, middle, three quarter and
     ninetieth marks. */
  function buildBands() {
    var buckets = [];
    var slot;
    for (slot = 0; slot < 366; slot++) buckets.push([]);
    creek.days.forEach(function (day) {
      var depth = depthOf(day);
      if (depth == null || Number(day.date.slice(0, 4)) >= creek.nowYear) return;
      buckets[slotOf(day.date)].push(depth);
    });
    creek.bands = [];
    for (slot = 0; slot < 366; slot++) {
      var pool = [];
      for (var k = -7; k <= 7; k++) pool = pool.concat(buckets[(slot + k + 366) % 366]);
      pool.sort(numeric);
      creek.bands.push(pool.length ? [0.1, 0.25, 0.5, 0.75, 0.9].map(function (p) { return quantile(pool, p); }) : null);
    }
  }

  function buildCreekYears() {
    Object.keys(creek.byYear).forEach(function (key) {
      var year = Number(key);
      var rows = creek.byYear[key];
      var depths = [];
      var flows = [];
      var usual = [];
      var above = 0;
      var highest = null;
      var lowest = null;
      rows.forEach(function (day) {
        var depth = depthOf(day);
        if (depth != null) {
          depths.push(depth);
          var band = creek.bands[slotOf(day.date)];
          if (band) {
            usual.push(band[2]);
            if (depth > band[2]) above += 1;
          }
        }
        if (reading(day.cfs) != null) flows.push(reading(day.cfs));
        if (highOf(day) != null && (!highest || highOf(day) > highOf(highest))) highest = day;
        if (lowOf(day) != null && (!lowest || lowOf(day) < lowOf(lowest))) lowest = day;
      });
      creek.years[year] = {
        year: year,
        rows: rows,
        depth: average(depths),
        usual: average(usual),
        flow: average(flows),
        above: above,
        compared: usual.length,
        highest: highest,
        lowest: lowest,
        full: year < creek.nowYear && rows.length >= 330 &&
          rows[0].date <= year + '-01-15' && rows[rows.length - 1].date >= year + '-12-15'
      };
    });
    creek.fullYears = Object.keys(creek.years)
      .map(function (key) { return creek.years[key]; })
      .filter(function (stats) { return stats.full && stats.flow != null; })
      .sort(function (a, b) { return b.flow - a.flow; });
    creek.fullYears.forEach(function (stats, index) { stats.rank = index + 1; });
  }

  function seasonById(id) {
    return SEASONS.filter(function (season) { return season.id === id; })[0] || SEASONS[1];
  }
  /* A season is named for the year it ends in, so Winter 2026 is December
     2025 into February 2026, and it is always written with both years. */
  function seasonWindow(id, year) {
    var season = seasonById(id);
    var start = (id === 'winter' ? year - 1 : year) + '-' + pad2(season.first) + '-01';
    var endMonth = (season.first + 1) % 12 + 1;
    var end = keyOf(new Date(year, endMonth, 0));
    return { start: start, end: end, length: daysApart(start, end) + 1 };
  }
  function seasonShort(id, year) {
    return id === 'winter' ? (year - 1) + '–' + String(year).slice(2) : String(year);
  }
  function seasonName(id, year) {
    return seasonById(id).name + ' ' + seasonShort(id, year);
  }
  function windowLabel(win) {
    return shortDate(win.start) + ' to ' + shortDate(win.end);
  }

  function seasonStats(id, year) {
    var win = seasonWindow(id, year);
    var rows = [];
    var date = dateFromKey(win.start);
    for (var i = 0; i < win.length; i++) {
      var day = creek.byDate[keyOf(date)];
      if (day) rows.push(day);
      date.setDate(date.getDate() + 1);
    }
    var depths = rows.map(depthOf).filter(present);
    var flows = rows.map(function (day) { return reading(day.cfs); }).filter(present);
    var open = win.end > creek.last;
    return {
      id: id,
      year: year,
      window: win,
      rows: rows,
      depth: average(depths),
      flow: average(flows),
      open: open,
      full: !open && rows.length >= win.length * 0.9
    };
  }

  function buildSeasons() {
    var firstYear = Number(creek.first.slice(0, 4));
    SEASONS.forEach(function (season) {
      var list = [];
      for (var year = creek.lastYear + (season.id === 'winter' ? 1 : 0); year >= firstYear; year--) {
        var stats = seasonStats(season.id, year);
        if (stats.rows.length >= 7) list.push(stats);
      }
      var full = list
        .filter(function (stats) { return stats.full && stats.flow != null; })
        .sort(function (a, b) { return b.flow - a.flow; });
      full.forEach(function (stats, index) { stats.rank = index + 1; });
      creek.seasons[season.id] = {
        list: list,
        full: full,
        usualDepth: median(full.map(function (stats) { return stats.depth; }).filter(present)),
        usualFlow: median(full.map(function (stats) { return stats.flow; }))
      };
    });
  }

  /* Every month of every year, placed against the same month in all the
     others. Months rather than weeks: a week of this creek is mostly whether
     one storm landed in it, and a grid of weeks read as confetti. A month is
     long enough to be wet or dry. Flow rather than depth, because flow is
     complete back to the first day and depth has a few gaps, and a month is
     only placed at all once ten of its days have reported. */
  function buildGrid() {
    var sums = {};
    creek.days.forEach(function (day) {
      var flow = reading(day.cfs);
      if (flow == null) return;
      var year = day.date.slice(0, 4);
      var month = Number(day.date.slice(5, 7)) - 1;
      if (!sums[year]) sums[year] = [];
      if (!sums[year][month]) sums[year][month] = { total: 0, count: 0 };
      sums[year][month].total += flow;
      sums[year][month].count += 1;
    });
    var years = Object.keys(sums).map(Number).sort(function (a, b) { return b - a; });
    var cells = {};
    var columns = [];
    for (var month = 0; month < 12; month++) columns.push([]);
    years.forEach(function (year) {
      cells[year] = [];
      for (var m = 0; m < 12; m++) {
        var bucket = sums[year][m];
        var flow = bucket && bucket.count >= 10 ? bucket.total / bucket.count : null;
        cells[year].push(flow == null ? null : { flow: flow });
        if (flow != null) columns[m].push(flow);
      }
    });
    years.forEach(function (year) {
      cells[year].forEach(function (entry, m) {
        if (!entry) return;
        var below = 0;
        var equal = 0;
        columns[m].forEach(function (other) {
          if (other < entry.flow) below += 1;
          else if (other === entry.flow) equal += 1;
        });
        entry.share = (below + (equal - 1) / 2) / Math.max(1, columns[m].length - 1);
        entry.step = WETNESS.filter(function (step) { return entry.share < step.below; })[0];
      });
    });
    creek.grid = { years: years, cells: cells };
  }

  /* -------------------------------------------------------------------------
     Drawing
     ------------------------------------------------------------------------- */

  /* A depth scale that holds the usual range and the ordinary days of whatever
     is drawn over it, and lets a flood run off the top rather than flattening
     every other day of the year against the floor. A day that goes off the top
     gets a mark and its date. */
  function depthScale(values, bands) {
    var lows = [];
    var highs = [];
    bands.forEach(function (band) {
      if (!band) return;
      lows.push(band[0]);
      highs.push(band[4]);
    });
    var sorted = values.filter(present).sort(numeric);
    var lo = Math.min(lows.length ? Math.min.apply(null, lows) : Infinity, sorted.length ? sorted[0] : Infinity);
    var hi = Math.max(highs.length ? Math.max.apply(null, highs) : -Infinity, sorted.length ? quantile(sorted, 0.97) : -Infinity);
    lo = Math.floor((lo - 0.04) * 10) / 10;
    hi = Math.ceil((hi + 0.04) * 4) / 4;
    return { lo: lo, hi: Math.max(hi, lo + 0.5) };
  }

  function depthAxis(scale, frame, y, narrow) {
    var span = scale.hi - scale.lo;
    var step = [0.1, 0.25, 0.5, 1, 2, 5, 10].filter(function (s) { return span / s <= 4.5; })[0] || 10;
    var out = '';
    for (var i = Math.ceil(scale.lo / step - 1e-9); i * step <= scale.hi + 1e-9; i++) {
      var value = i * step;
      var at = y(value).toFixed(1);
      out += '<line x1="' + frame.left + '" x2="' + frame.right + '" y1="' + at + '" y2="' + at + '" stroke="' + RULE + '" stroke-width="1"/>' +
        '<text class="arc-axis" x="' + (frame.left - 6) + '" y="' + (Number(at) + 4) + '" text-anchor="end">' +
        value.toFixed(step >= 1 ? 0 : 2) + (narrow ? '' : ' ft') + '</text>';
    }
    return out;
  }

  /* Month names along the bottom, each centred in its own span, with a hair
     line at the start of every month after the first. A span too narrow for
     three letters takes one. */
  function monthAxis(spans, frame, baseline, bare) {
    return spans.map(function (span, index) {
      var room = span.x1 - span.x0;
      var name = MONTHS[span.month];
      var text = name.length * AXIS_CHAR + 6 <= room ? name : (AXIS_CHAR + 2 <= room ? name.charAt(0) : '');
      return (index && !bare ? '<line x1="' + span.x0.toFixed(1) + '" x2="' + span.x0.toFixed(1) + '" y1="' + frame.top +
          '" y2="' + frame.bottom + '" stroke="' + RULE + '" stroke-width="1"/>' : '') +
        (text ? '<text class="arc-axis" x="' + ((span.x0 + span.x1) / 2).toFixed(1) + '" y="' + baseline +
          '" text-anchor="middle">' + text + '</text>' : '');
    }).join('');
  }

  /* A line that breaks wherever a day is missing, so a gap in the record reads
     as a gap and not as a straight run the gauge never reported. */
  function brokenPath(points) {
    var d = '';
    var previous = null;
    points.forEach(function (point) {
      if (point.y == null) { previous = null; return; }
      d += (previous && point.i - previous.i === 1 ? 'L' : 'M') + point.x.toFixed(1) + ' ' + point.y.toFixed(1);
      previous = point;
    });
    return d;
  }

  function bandPolygon(points, loIndex, hiIndex) {
    var top = [];
    var bottom = [];
    points.forEach(function (point) {
      if (!point.band) return;
      top.push(point.x.toFixed(1) + ',' + point.y(point.band[hiIndex]).toFixed(1));
      bottom.push(point.x.toFixed(1) + ',' + point.y(point.band[loIndex]).toFixed(1));
    });
    return top.length ? top.concat(bottom.reverse()).join(' ') : '';
  }

  function highestOf(rows) {
    return rows.reduce(function (best, day) {
      return highOf(day) != null && (!best || highOf(day) > highOf(best)) ? day : best;
    }, null);
  }

  /* A red mark at the top of the chart over every rise that ran off it, one
     mark a rise. Only the day the card above calls the highest gets its date
     written beside it, so the chart and the card can never name two different
     days as the top of the year. */
  function offTheTop(rows, xOf, scale, frame) {
    var named = highestOf(rows);
    var marks = '';
    var run = null;
    function close() {
      if (!run) return;
      var x = xOf(run.peak);
      marks += '<path d="M' + (x - 5).toFixed(1) + ' ' + (frame.top + 8) + 'L' + x.toFixed(1) + ' ' + (frame.top + 1) +
        'L' + (x + 5).toFixed(1) + ' ' + (frame.top + 8) + 'Z" fill="var(--red)"/>';
      if (run.days.indexOf(named) > -1) {
        var label = shortDate(named.date);
        var flip = x + 9 + label.length * AXIS_CHAR > frame.right;
        marks += '<text class="arc-axis arc-flag" x="' + (flip ? x - 9 : x + 9).toFixed(1) + '" y="' + (frame.top + 9) + '"' +
          (flip ? ' text-anchor="end"' : '') + '>' + esc(label) + '</text>';
      }
      run = null;
    }
    rows.forEach(function (day, index) {
      var over = depthOf(day) != null && depthOf(day) > scale.hi;
      var follows = run && daysApart(rows[index - 1].date, day.date) === 1;
      if (!over || !follows) close();
      if (!over) return;
      if (!run) run = { days: [], peak: day };
      run.days.push(day);
      if (depthOf(day) > depthOf(run.peak)) run.peak = day;
    });
    close();
    return marks;
  }

  function legend(items) {
    return '<div class="arc-legend">' + items.map(function (item) {
      return '<span><i class="sw ' + item[0] + '" aria-hidden="true"></i>' + item[1] + '</span>';
    }).join('') + '</div>';
  }

  /* The year: a year's daily mean laid over where the creek usually runs. */
  function drawYearChart(host, stats) {
    if (!host) return;
    var box = boxOf(host, true);
    var frame = frameOf(box);
    var plot = frame.right - frame.left;
    var scale = depthScale(stats.rows.map(depthOf), creek.bands);
    function x(slot) { return frame.left + ((slot + 0.5) / 366) * plot; }
    function y(value) { return frame.bottom - ((value - scale.lo) / (scale.hi - scale.lo)) * (frame.bottom - frame.top); }

    var usual = [];
    for (var slot = 0; slot < 366; slot++) usual.push({ x: x(slot), band: creek.bands[slot], y: y });
    var usualLine = brokenPath(usual.map(function (point, index) {
      return { i: index, x: point.x, y: point.band ? y(point.band[2]) : null };
    }));
    var start = stats.year + '-01-01';
    var points = stats.rows.map(function (day) {
      var depth = depthOf(day);
      return { i: daysApart(start, day.date), x: x(slotOf(day.date)), y: depth == null ? null : y(depth) };
    });
    var spans = SLOT_START.map(function (first, month) {
      return { month: month, x0: frame.left + (first / 366) * plot, x1: frame.left + ((SLOT_START[month + 1] || 366) / 366) * plot };
    });

    var last = stats.rows[stats.rows.length - 1];
    var dot = stats.year === creek.lastYear && depthOf(last) != null
      ? '<circle cx="' + x(slotOf(last.date)).toFixed(1) + '" cy="' + y(depthOf(last)).toFixed(1) + '" r="4" fill="var(--hold-creek)" stroke="#FAF6EE" stroke-width="2"/>'
      : '';

    host.innerHTML = svgOpen(box, stats.year + ' creek depth at the Republic gauge against the usual range') +
      '<defs><clipPath id="creekYearClip"><rect x="' + frame.left + '" y="' + frame.top + '" width="' + plot +
        '" height="' + (frame.bottom - frame.top) + '"/></clipPath></defs>' +
      depthAxis(scale, frame, y, box.narrow) +
      monthAxis(spans, frame, box.height - 8) +
      '<g clip-path="url(#creekYearClip)">' +
        '<polygon points="' + bandPolygon(usual, 0, 4) + '" fill="var(--hold-creek)" fill-opacity="0.1"/>' +
        '<polygon points="' + bandPolygon(usual, 1, 3) + '" fill="var(--hold-creek)" fill-opacity="0.16"/>' +
        '<path d="' + usualLine + '" fill="none" stroke="#6B6156" stroke-width="1.25" stroke-dasharray="4 3"/>' +
        '<path d="' + brokenPath(points) + '" fill="none" stroke="var(--hold-creek)" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round"/>' +
      '</g>' +
      dot +
      offTheTop(stats.rows, function (day) { return x(slotOf(day.date)); }, scale, frame) +
      '<line x1="' + frame.left + '" x2="' + frame.right + '" y1="' + frame.bottom + '" y2="' + frame.bottom + '" stroke="rgba(80,44,8,0.28)" stroke-width="1"/>' +
      '</svg>';
  }

  function yearSentence(stats) {
    if (!stats.compared) return '';
    var share = stats.above + ' of ' + plural(stats.compared, 'day', 'days');
    if (stats.full) {
      var count = creek.fullYears.length;
      return 'In ' + stats.year + ' the creek ran above its usual level on ' + share +
        (stats.rank ? ', and by the water that went through it was the ' + rankPhrase(stats.rank, count) +
          ' of the ' + count + ' full years on file' : '') + '.';
    }
    if (stats.year === creek.lastYear) {
      return 'So far in ' + stats.year + ' the creek has run above its usual level on ' + share + '.';
    }
    return 'From ' + shortDate(stats.rows[0].date) + ' on, the creek ran above its usual level on ' + share +
      ' in ' + stats.year + '.';
  }

  function renderCreekYear(year) {
    var stats = creek.years[year];
    var body = byId('creekYear');
    if (!stats || !body) return;
    creek.year = year;
    setText('creekYearName', String(year));
    var high = stats.highest;
    var low = stats.lowest;
    body.innerHTML = '<div class="d-rows">' +
      cell('Average depth', feet(stats.depth), '🌊') +
      cell('Usual for these days', feet(stats.usual), '🕰️') +
      (high ? cell((reading(high.high) != null ? 'Highest' : 'Highest mean') + ' &middot; ' + esc(shortDate(high.date)), feet(highOf(high)), '⬆️') : '') +
      (low ? cell((reading(low.low) != null ? 'Lowest' : 'Lowest mean') + ' &middot; ' + esc(shortDate(low.date)), feet(lowOf(low)), '⬇️') : '') +
      '</div>' +
      '<div class="arc-plot" id="creekYearChart"></div>' +
      legend([['sw-line', esc(String(year))], ['sw-usual', 'Usual'], ['sw-mid', 'Half of years'], ['sw-wide', 'Eight years in ten']]) +
      '<p class="arc-say">' + yearSentence(stats) + '</p>';
    creek.redraws.year = function () { drawYearChart(byId('creekYearChart'), stats); };
    creek.redraws.year();
    buildMonthReel(stats);
    if (creek.redraws.grid) creek.redraws.grid();
  }

  /* The month: the day table, with the day's low to its high shaded behind
     the mean wherever the fifteen minute record reaches. */
  function drawMonthChart(host, days, key) {
    if (!host || !days.length) return;
    var box = boxOf(host, false);
    var frame = frameOf(box);
    var plot = frame.right - frame.left;
    var year = Number(key.slice(0, 4));
    var month = Number(key.slice(5, 7));
    var length = new Date(year, month, 0).getDate();
    var usual = [];
    for (var d = 1; d <= length; d++) usual.push(creek.bands[slotOf(key + '-' + pad2(d))]);
    var values = [];
    days.forEach(function (day) { values.push(lowOf(day), highOf(day)); });
    usual.forEach(function (band) { if (band) values.push(band[2]); });
    values = values.filter(present);
    if (!values.length) return;
    var lo = Math.floor((Math.min.apply(null, values) - 0.04) * 10) / 10;
    var hi = Math.ceil((Math.max.apply(null, values) + 0.04) * 4) / 4;
    var scale = { lo: lo, hi: Math.max(hi, lo + 0.5) };
    function x(index) { return frame.left + ((index + 0.5) / length) * plot; }
    function y(value) { return frame.bottom - ((value - scale.lo) / (scale.hi - scale.lo)) * (frame.bottom - frame.top); }

    /* The band runs in stretches of days that all carry a low and a high, so a
       missing day opens a gap in it rather than being bridged. */
    var bands = '';
    var run = [];
    function closeRun() {
      if (run.length > 1) {
        bands += '<polygon points="' + run.map(function (day) { return x(dayNumber(day.date) - 1).toFixed(1) + ',' + y(reading(day.high)).toFixed(1); })
          .concat(run.slice().reverse().map(function (day) { return x(dayNumber(day.date) - 1).toFixed(1) + ',' + y(reading(day.low)).toFixed(1); }))
          .join(' ') + '" fill="var(--hold-creek)" fill-opacity="0.22"/>';
      }
      run = [];
    }
    days.forEach(function (day) {
      var ranged = reading(day.low) != null && reading(day.high) != null;
      var follows = run.length && dayNumber(day.date) - dayNumber(run[run.length - 1].date) === 1;
      if (!ranged || !follows) closeRun();
      if (ranged) run.push(day);
    });
    closeRun();

    var ticks = '';
    [1, 8, 15, 22, 29].forEach(function (n) {
      if (n > length) return;
      ticks += '<text class="arc-axis" x="' + x(n - 1).toFixed(1) + '" y="' + (box.height - 8) + '" text-anchor="middle">' + n + '</text>';
    });

    host.innerHTML = svgOpen(box, monthProse(key) + ' creek depth at the Republic gauge, day by day') +
      depthAxis(scale, frame, y, box.narrow) +
      bands +
      '<path d="' + brokenPath(usual.map(function (band, index) { return { i: index, x: x(index), y: band ? y(band[2]) : null }; })) +
        '" fill="none" stroke="#6B6156" stroke-width="1.25" stroke-dasharray="4 3"/>' +
      '<path d="' + brokenPath(days.map(function (day) {
          return { i: dayNumber(day.date), x: x(dayNumber(day.date) - 1), y: depthOf(day) == null ? null : y(depthOf(day)) };
        })) + '" fill="none" stroke="var(--hold-creek)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<line x1="' + frame.left + '" x2="' + frame.right + '" y1="' + frame.bottom + '" y2="' + frame.bottom + '" stroke="rgba(80,44,8,0.28)" stroke-width="1"/>' +
      ticks + '</svg>';
  }

  function renderCreekMonth(days, key) {
    var body = byId('creekMonth');
    if (!body) return;
    setText('creekMonthName', monthProse(key));
    if (!days.length) {
      body.innerHTML = '<div class="empty">&mdash;</div>';
      return;
    }
    var high = null, low = null, most = null, least = null;
    var depths = [];
    var usual = [];
    var ranged = false;
    days.forEach(function (day) {
      if (highOf(day) != null && (!high || highOf(day) > highOf(high))) high = day;
      if (lowOf(day) != null && (!low || lowOf(day) < lowOf(low))) low = day;
      if (reading(day.cfs) != null && (!most || reading(day.cfs) > reading(most.cfs))) most = day;
      if (reading(day.cfs) != null && (!least || reading(day.cfs) < reading(least.cfs))) least = day;
      if (depthOf(day) != null) {
        depths.push(depthOf(day));
        var band = creek.bands[slotOf(day.date)];
        if (band) usual.push(band[2]);
      }
      if (reading(day.low) != null && reading(day.high) != null) ranged = true;
    });

    var rows = '<div class="d-rows">' +
      (high ? cell((reading(high.high) != null ? 'Highest' : 'Highest mean') + ' &middot; ' + esc(shortDate(high.date)), feet(highOf(high)), '⬆️') : '') +
      (low ? cell((reading(low.low) != null ? 'Lowest' : 'Lowest mean') + ' &middot; ' + esc(shortDate(low.date)), feet(lowOf(low)), '⬇️') : '') +
      cell('Average for the month', feet(average(depths)), '🌊') +
      cell('Usual for the month', feet(average(usual)), '🕰️') +
      (most ? cell('Most flow &middot; ' + esc(shortDate(most.date)), cfs(reading(most.cfs)), '💧') : '') +
      (least ? cell('Least flow &middot; ' + esc(shortDate(least.date)), cfs(reading(least.cfs)), '💧') : '') +
      '</div>';

    /* Low and high only where the month has them. A column of dashes the whole
       way down is a column that says nothing. */
    var table = '<table class="arc-table">' +
      '<thead><tr><th scope="col">Day</th>' +
        (ranged ? '<th scope="col">Low</th><th scope="col">High</th>' : '') +
        '<th scope="col">Mean</th><th scope="col"' + (ranged ? ' class="opt"' : '') + '>Flow</th></tr></thead><tbody>' +
      days.map(function (day) {
        function figure(value, digits) { return value == null ? '&mdash;' : value.toFixed(digits); }
        return '<tr>' +
          '<th scope="row"><span>' + esc(weekday(day.date)) + '</span>' + esc(dayNumber(day.date)) + '</th>' +
          (ranged
            ? '<td' + (day === low ? ' class="peak"' : '') + '>' + figure(reading(day.low), 2) + '</td>' +
              '<td' + (day === high ? ' class="peak"' : '') + '>' + figure(reading(day.high), 2) + '</td>'
            : '') +
          '<td' + (!ranged && (day === low || day === high) ? ' class="peak"' : '') + '>' + figure(depthOf(day), 2) + '</td>' +
          '<td' + (ranged ? ' class="opt"' : '') + '>' + (reading(day.cfs) == null ? '&mdash;' : flowFigure(reading(day.cfs))) + '</td>' +
          '</tr>';
      }).join('') +
      '</tbody></table>';

    body.innerHTML = rows +
      '<div class="arc-plot" id="creekMonthChart"></div>' +
      legend([['sw-line', 'Daily mean']].concat(ranged ? [['sw-range', 'Low to high']] : []).concat([['sw-usual', 'Usual']])) +
      table;
    creek.redraws.month = function () { drawMonthChart(byId('creekMonthChart'), days, key); };
    creek.redraws.month();
  }

  /* The month reel belongs to the year on screen, so it is rebuilt when the
     year changes. The host is swapped for a clean copy first, because the reel
     adds its click handler to whatever host it is given and a second handler
     on the same strip would open two months at once. */
  function buildMonthReel(stats) {
    var host = byId('creekReel');
    if (!host) return;
    var fresh = host.cloneNode(false);
    host.parentNode.replaceChild(fresh, host);
    var months = groupByMonth(stats.rows, function (day) { return day.date; });
    var keys = Object.keys(months).sort().reverse();
    buildReel(fresh, keys, function (key) {
      var depth = average(months[key].map(depthOf).filter(present));
      return depth == null ? '&mdash;' : depth.toFixed(2) + ' ft';
    }, function (key) {
      renderCreekMonth(months[key], key);
    });
    /* The grid asks for a particular month when it opens a year. The reel has
       already opened the latest one, so this presses the one asked for. */
    var wanted = creek.wantMonth;
    creek.wantMonth = '';
    var chip = wanted ? fresh.querySelector('[data-month="' + wanted + '"]') : null;
    if (chip) {
      chip.click();
      fresh.scrollLeft = chip.offsetLeft - (fresh.clientWidth - chip.offsetWidth) / 2;
    }
  }

  /* Season against season. One season, a set of years, and the one the reader
     is looking at drawn in the creek green over the rest. */
  function drawSeasonChart(host) {
    if (!host) return;
    var focus = seasonFor(creek.focus);
    if (!focus) return;
    var box = boxOf(host, true);
    var frame = frameOf(box);
    var plot = frame.right - frame.left;
    var picked = creek.picked.map(seasonFor).filter(present);
    var length = Math.max.apply(null, picked.map(function (stats) { return stats.window.length; }));
    var usual = [];
    for (var i = 0; i < length; i++) usual.push(creek.bands[slotOf(addDays(focus.window.start, i))]);
    var values = [];
    picked.forEach(function (stats) { stats.rows.forEach(function (day) { values.push(depthOf(day)); }); });
    var scale = depthScale(values, usual);
    function x(index) { return frame.left + ((index + 0.5) / length) * plot; }
    function y(value) { return frame.bottom - ((value - scale.lo) / (scale.hi - scale.lo)) * (frame.bottom - frame.top); }
    function line(stats) {
      return brokenPath(stats.rows.map(function (day) {
        var index = daysApart(stats.window.start, day.date);
        return { i: index, x: x(index), y: depthOf(day) == null ? null : y(depthOf(day)) };
      }));
    }

    var usualPoints = usual.map(function (band, index) { return { x: x(index), band: band, y: y }; });
    var spans = [];
    var cursor = focus.window.start;
    for (var m = 0; m < 3; m++) {
      var monthIndex = Number(cursor.slice(5, 7)) - 1;
      var days = new Date(Number(cursor.slice(0, 4)), monthIndex + 1, 0).getDate();
      var from = daysApart(focus.window.start, cursor);
      spans.push({ month: monthIndex, x0: frame.left + (from / length) * plot, x1: frame.left + (Math.min(length, from + days) / length) * plot });
      cursor = addDays(cursor, days);
    }
    var others = picked.filter(function (stats) { return stats.year !== focus.year; });

    host.innerHTML = svgOpen(box, seasonName(focus.id, focus.year) + ' creek depth against ' + (picked.length - 1) + ' other years') +
      '<defs><clipPath id="creekSeasonClip"><rect x="' + frame.left + '" y="' + frame.top + '" width="' + plot +
        '" height="' + (frame.bottom - frame.top) + '"/></clipPath></defs>' +
      depthAxis(scale, frame, y, box.narrow) +
      monthAxis(spans, frame, box.height - 8) +
      '<g clip-path="url(#creekSeasonClip)">' +
        '<polygon points="' + bandPolygon(usualPoints, 1, 3) + '" fill="var(--hold-creek)" fill-opacity="0.24"/>' +
        '<path d="' + brokenPath(usual.map(function (band, index) { return { i: index, x: x(index), y: band ? y(band[2]) : null }; })) +
          '" fill="none" stroke="#6B6156" stroke-width="1.25" stroke-dasharray="4 3"/>' +
        others.map(function (stats) {
          return '<path d="' + line(stats) + '" fill="none" stroke="' + OTHER_YEAR + '" stroke-width="1.25" stroke-opacity="0.75" stroke-linejoin="round" stroke-linecap="round"/>';
        }).join('') +
        '<path d="' + line(focus) + '" fill="none" stroke="var(--hold-creek)" stroke-width="2.75" stroke-linejoin="round" stroke-linecap="round"/>' +
      '</g>' +
      offTheTop(focus.rows, function (day) { return x(daysApart(focus.window.start, day.date)); }, scale, frame) +
      '<line x1="' + frame.left + '" x2="' + frame.right + '" y1="' + frame.bottom + '" y2="' + frame.bottom + '" stroke="rgba(80,44,8,0.28)" stroke-width="1"/>' +
      '</svg>';
  }

  function seasonFor(year) {
    var info = creek.seasons[creek.season];
    return info ? info.list.filter(function (stats) { return stats.year === year; })[0] || null : null;
  }

  function seasonRank(stats, count) {
    if (stats.open) return 'so far';
    return stats.rank ? rankPhrase(stats.rank, count) : '&mdash;';
  }

  function renderSeason() {
    var body = byId('creekSeason');
    var info = creek.seasons[creek.season];
    var focus = seasonFor(creek.focus);
    if (!body || !info || !focus) return;
    var details = body.querySelector('details');
    var wasOpen = details ? details.open : false;
    var hadFocus = document.activeElement && body.contains(document.activeElement)
      ? document.activeElement.getAttribute('data-year') : null;
    var name = seasonById(creek.season).name;
    var count = info.full.length;

    setText('creekSeasonName', name);
    setText('creekSeasonSpan', windowLabel(focus.window));

    var picked = creek.picked.map(seasonFor).filter(present);
    var table = '<table class="arc-table arc-cmp">' +
      '<thead><tr><th scope="col">' + esc(name) + '</th><th scope="col">Depth</th><th scope="col">Flow</th>' +
        '<th scope="col">Of ' + count + '</th></tr></thead><tbody>' +
      picked.map(function (stats) {
        var on = stats.year === focus.year;
        return '<tr' + (on ? ' class="on"' : '') + '>' +
          '<th scope="row"><button type="button" class="yr-btn" data-year="' + stats.year + '" aria-pressed="' + on + '">' +
            esc(seasonShort(stats.id, stats.year)) + '</button></th>' +
          '<td>' + (stats.depth == null ? '&mdash;' : stats.depth.toFixed(2)) + '</td>' +
          '<td>' + flowFigure(stats.flow) + '</td>' +
          '<td class="rank">' + seasonRank(stats, count) + '</td></tr>';
      }).join('') +
      '<tr class="usual"><th scope="row">Usual</th>' +
        '<td>' + (info.usualDepth == null ? '&mdash;' : info.usualDepth.toFixed(2)) + '</td>' +
        '<td>' + flowFigure(info.usualFlow) + '</td><td class="rank">&mdash;</td></tr>' +
      '</tbody></table>';

    var ranked = '<details class="arc-all"' + (wasOpen ? ' open' : '') + '>' +
      '<summary>Every ' + name.toLowerCase() + ' on file, wettest first</summary>' +
      '<table class="arc-table arc-ranked"><thead><tr><th scope="col">' + esc(name) + '</th><th scope="col">Depth</th>' +
        '<th scope="col">Flow</th><th scope="col">Rank</th></tr></thead><tbody>' +
      info.full.map(function (stats) {
        return '<tr' + (creek.picked.indexOf(stats.year) > -1 ? ' class="on"' : '') + '>' +
          '<th scope="row">' + esc(seasonShort(stats.id, stats.year)) + '</th>' +
          '<td>' + (stats.depth == null ? '&mdash;' : stats.depth.toFixed(2)) + '</td>' +
          '<td>' + flowFigure(stats.flow) + '</td>' +
          '<td>' + ordinal(stats.rank) + '</td></tr>';
      }).join('') +
      '</tbody></table></details>';

    body.innerHTML = '<div class="arc-plot" id="creekSeasonChart"></div>' +
      legend([['sw-line', esc(seasonName(focus.id, focus.year))]]
        .concat(picked.length > 1 ? [['sw-other', 'The other years']] : [])
        .concat([['sw-usual', 'Usual'], ['sw-mid', 'Half of years']])) +
      table + ranked;
    creek.redraws.season = function () { drawSeasonChart(byId('creekSeasonChart')); };
    creek.redraws.season();
    Array.prototype.forEach.call(document.querySelectorAll('#creekSeasonYears .reel-btn'), function (button) {
      button.classList.toggle('is-focus', Number(button.getAttribute('data-year')) === focus.year);
    });
    if (hadFocus) {
      var again = body.querySelector('.yr-btn[data-year="' + hadFocus + '"]');
      if (again) again.focus();
    }
  }

  function renderSeasonYears() {
    var host = byId('creekSeasonYears');
    var info = creek.seasons[creek.season];
    if (!host || !info) return;
    host.innerHTML = info.list.map(function (stats) {
      return '<button type="button" class="reel-btn" data-year="' + stats.year + '" aria-pressed="' +
        (creek.picked.indexOf(stats.year) > -1) + '">' + esc(seasonShort(stats.id, stats.year)) +
        '<small>' + (stats.depth == null ? '&mdash;' : stats.depth.toFixed(2) + ' ft') + '</small></button>';
    }).join('');
  }

  /* The default a reader asked for in so many words: this season, the same
     season last year, and the five before that. */
  function chooseSeason(id) {
    var info = creek.seasons[id];
    if (!info || !info.list.length) return;
    creek.season = id;
    Array.prototype.forEach.call(document.querySelectorAll('#creekSeasonPick .seg-btn'), function (button) {
      button.setAttribute('aria-pressed', button.getAttribute('data-season') === id ? 'true' : 'false');
    });
    var latest = info.list.filter(function (stats) { return stats.rows.length >= 30; })[0] || info.list[0];
    creek.picked = info.list
      .filter(function (stats) { return stats.year <= latest.year && stats.year > latest.year - 7; })
      .map(function (stats) { return stats.year; });
    creek.focus = latest.year;
    renderSeasonYears();
    renderSeason();
    var reel = byId('creekSeasonYears');
    if (reel) reel.scrollLeft = 0;
  }

  /* Tapping a year puts it in and makes it the one drawn in green. Tapping it
     again takes it out. The last year left cannot be taken out, because a
     comparison of nothing is an empty chart. */
  function toggleSeasonYear(year) {
    var at = creek.picked.indexOf(year);
    if (at > -1) {
      if (creek.picked.length === 1) return;
      creek.picked.splice(at, 1);
      if (creek.focus === year) creek.focus = creek.picked[0];
    } else {
      creek.picked.push(year);
      creek.focus = year;
    }
    creek.picked.sort(function (a, b) { return b - a; });
    if (creek.picked.indexOf(creek.focus) === -1) creek.focus = creek.picked[0];
    Array.prototype.forEach.call(document.querySelectorAll('#creekSeasonYears .reel-btn'), function (button) {
      button.setAttribute('aria-pressed', creek.picked.indexOf(Number(button.getAttribute('data-year'))) > -1 ? 'true' : 'false');
    });
    renderSeason();
  }

  function defaultSeason() {
    var best = null;
    SEASONS.forEach(function (season) {
      var info = creek.seasons[season.id];
      var latest = info && info.list.filter(function (stats) { return stats.rows.length >= 30; })[0];
      if (latest && (!best || latest.window.start > best.window.start)) best = latest;
    });
    return best ? best.id : 'spring';
  }

  /* Every month of every year, newest year on top. */
  function drawGrid(host) {
    if (!host || !creek.grid) return;
    var box = boxOf(host, false);
    var years = creek.grid.years;
    var rowH = box.narrow ? 8 : 10;
    var left = 38;
    var right = box.width - 2;
    var top = 2;
    var cellW = (right - left) / 12;
    var bottom = top + years.length * rowH;
    var height = bottom + 24;
    creek.grid.geometry = { width: box.width, height: height, left: left, top: top, rowH: rowH, cellW: cellW };

    /* A pixel of card between cells, so the grid reads as months laid side by
       side rather than as one smear of colour. */
    var rects = '';
    years.forEach(function (year, row) {
      creek.grid.cells[year].forEach(function (entry, month) {
        if (!entry) return;
        rects += '<rect x="' + (left + month * cellW).toFixed(2) + '" y="' + (top + row * rowH) + '" width="' + (cellW - 1).toFixed(2) +
          '" height="' + (rowH - 1) + '" fill="' + entry.step.fill + '"/>';
      });
    });

    /* A year label every five years and one on the top row, dropped wherever
       it would sit on the one before it. Eight pixels a row puts 2025 and 2026
       on top of each other, and that is exactly the overlap this page exists
       to be without. */
    var labels = '';
    var placed = [];
    years.forEach(function (year, row) {
      if (row !== 0 && year % 5 !== 0) return;
      var at = top + row * rowH + rowH / 2 + 3;
      if (placed.some(function (other) { return Math.abs(other - at) < 13; })) return;
      placed.push(at);
      labels += '<text class="arc-axis" x="' + (left - 6) + '" y="' + at.toFixed(1) + '" text-anchor="end">' + year + '</text>';
    });

    var spans = MONTHS.map(function (name, month) {
      return { month: month, x0: left + month * cellW, x1: left + (month + 1) * cellW - 1 };
    });

    var row = years.indexOf(creek.year);
    var outline = row > -1
      ? '<rect x="' + (left - 1.5) + '" y="' + (top + row * rowH - 1.5) + '" width="' + (right - left + 2).toFixed(1) +
        '" height="' + (rowH + 2) + '" fill="none" stroke="#1C1208" stroke-width="1.25" rx="1"/>'
      : '';

    host.innerHTML = '<svg viewBox="0 0 ' + box.width + ' ' + height + '" role="img" aria-label="Every month since ' +
        years[years.length - 1] + ', wetter or drier than the same month in the other years">' +
      rects + outline +
      '<rect id="creekGridCursor" x="0" y="0" width="' + (cellW + 2).toFixed(2) + '" height="' + (rowH + 2) +
        '" fill="none" stroke="#1C1208" stroke-width="2" visibility="hidden"/>' +
      labels + monthAxis(spans, null, height - 7, true) + '</svg>';
    if (creek.grid.shown) showGridCell(creek.grid.shown.year, creek.grid.shown.month);
  }

  function showGridCell(year, month) {
    var grid = creek.grid;
    var entry = grid && grid.cells[year] ? grid.cells[year][month] : null;
    var text = byId('creekGridText');
    var go = byId('creekGridGo');
    var cursor = byId('creekGridCursor');
    if (!entry || !text) return;
    grid.shown = { year: year, month: month };
    text.textContent = MONTHS_FULL[month] + ' ' + year + ' ran ' + entry.step.word + ', at ' +
      flowFigure(entry.flow) + ' cfs on average.';
    if (go) {
      go.setAttribute('data-month', year + '-' + pad2(month + 1));
      go.textContent = MONTHS[month] + ' ' + year + ' ↑';
      go.hidden = false;
    }
    if (cursor && grid.geometry) {
      var g = grid.geometry;
      cursor.setAttribute('x', (g.left + month * g.cellW - 1.5).toFixed(2));
      cursor.setAttribute('y', String(g.top + grid.years.indexOf(year) * g.rowH - 1.5));
      cursor.setAttribute('visibility', 'visible');
    }
  }

  function renderGrid() {
    var body = byId('creekGrid');
    if (!body || !creek.grid) return;
    body.innerHTML = '<div class="grid-read"><p id="creekGridText" aria-live="polite">&mdash;</p>' +
        '<button type="button" class="grid-go" id="creekGridGo" hidden></button></div>' +
      '<div class="arc-plot" id="creekGridPlot"></div>' +
      '<div class="arc-legend grid-key"><span>Drier</span>' + WETNESS.map(function (step) {
        return '<i class="sw" style="background:' + step.fill + '" aria-hidden="true"></i>';
      }).join('') + '<span>Wetter</span></div>';
    creek.redraws.grid = function () { drawGrid(byId('creekGridPlot')); };
    creek.redraws.grid();

    var latest = creek.grid.cells[creek.lastYear] || [];
    for (var month = latest.length - 1; month >= 0; month--) {
      if (latest[month]) { showGridCell(creek.lastYear, month); break; }
    }

    var plot = byId('creekGridPlot');
    function locate(event) {
      var svg = plot.querySelector('svg');
      var g = creek.grid.geometry;
      if (!svg || !g) return null;
      var rect = svg.getBoundingClientRect();
      var px = (event.clientX - rect.left) * (g.width / rect.width);
      var py = (event.clientY - rect.top) * (g.height / rect.height);
      var row = Math.floor((py - g.top) / g.rowH);
      var col = Math.floor((px - g.left) / g.cellW);
      if (row < 0 || row >= creek.grid.years.length || col < 0 || col > 11) return null;
      return { year: creek.grid.years[row], month: col };
    }
    function follow(event) {
      var spot = locate(event);
      if (spot) showGridCell(spot.year, spot.month);
    }
    plot.addEventListener('click', follow);
    plot.addEventListener('pointermove', function (event) {
      if (event.pointerType === 'mouse') follow(event);
    });
    /* Opens the year at the top of the page with that month's day table
       under it. */
    byId('creekGridGo').addEventListener('click', function () {
      var key = this.getAttribute('data-month') || '';
      var year = Number(key.slice(0, 4));
      if (!creek.years[year] || !creek.pickYear) return;
      creek.wantMonth = key;
      creek.pickYear(year);
      var reel = byId('creekYearReel');
      var chip = reel && reel.querySelector('[data-year="' + year + '"]');
      if (chip) reel.scrollLeft = chip.offsetLeft - (reel.clientWidth - chip.offsetWidth) / 2;
      var card = byId('creek-year');
      var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (card) card.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
    });
  }

  function renderCreekRecords() {
    var host = byId('creekRecords');
    if (!host) return;
    var most = null;
    var least = null;
    creek.days.forEach(function (day) {
      var flow = reading(day.cfs);
      if (flow == null) return;
      if (!most || flow > reading(most.cfs)) most = day;
      /* Ties go to the most recent, which is the one a reader might remember. */
      if (!least || flow <= reading(least.cfs)) least = day;
    });
    var crest = creek.peaks && creek.peaks.highest;
    var wet = creek.fullYears[0];
    var dry = creek.fullYears[creek.fullYears.length - 1];
    host.innerHTML = '<div class="d-rows list">' +
      (crest ? cell('Highest crest &middot; ' + esc(longDate(crest.date)), feet(crest.stage_ft), '🌊') : '') +
      (most ? cell('Most water in a day &middot; ' + esc(longDate(most.date)), cfs(reading(most.cfs)), '⬆️') : '') +
      (least ? cell('Least water in a day &middot; ' + esc(longDate(least.date)), cfs(reading(least.cfs)), '⬇️') : '') +
      (wet ? cell('Wettest year &middot; ' + wet.year, cfs(wet.flow) + ' on average', '📅') : '') +
      (dry ? cell('Driest year &middot; ' + dry.year, cfs(dry.flow) + ' on average', '📅') : '') +
      cell('On file since', esc(longDate(creek.first)), '🕰️') +
      '</div>';
  }

  function loadCreek() {
    var reel = byId('creekYearReel');
    if (!reel) return;
    Promise.all([
      loadArchive(CREEK_DIR),
      loadJson(CREEK_PEAKS).catch(function () { return null; })
    ]).then(function (parts) {
      var days = sortedDays(parts[0]);
      if (!days.length) return;
      creek.days = days;
      creek.peaks = parts[1];
      creek.first = days[0].date;
      creek.last = days[days.length - 1].date;
      creek.lastYear = Number(creek.last.slice(0, 4));
      creek.nowYear = new Date().getFullYear();
      days.forEach(function (day) {
        creek.byDate[day.date] = day;
        var year = day.date.slice(0, 4);
        (creek.byYear[year] = creek.byYear[year] || []).push(day);
      });
      buildBands();
      buildCreekYears();
      buildSeasons();
      buildGrid();

      setText('creekStamp', days.length.toLocaleString('en-US') + ' days · back to ' + longDate(creek.first));

      var yearRows = Object.keys(creek.years).map(Number).sort(function (a, b) { return b - a; }).map(function (year) {
        var depth = creek.years[year].depth;
        return { year: year, total: depth == null ? '&mdash;' : depth.toFixed(2) + ' ft' };
      });
      creek.pickYear = buildYearReel(reel, yearRows, renderCreekYear);
      renderGrid();
      if (creek.pickYear) creek.pickYear(creek.lastYear);

      var seasonPick = byId('creekSeasonPick');
      if (seasonPick) {
        seasonPick.innerHTML = SEASONS.map(function (season) {
          return '<button type="button" class="seg-btn" data-season="' + season.id + '" aria-pressed="false">' + season.name + '</button>';
        }).join('');
        seasonPick.addEventListener('click', function (event) {
          var button = event.target.closest ? event.target.closest('.seg-btn') : null;
          if (button) chooseSeason(button.getAttribute('data-season'));
        });
      }
      function yearTap(event) {
        var button = event.target.closest ? event.target.closest('[data-year]') : null;
        if (!button) return;
        var year = Number(button.getAttribute('data-year'));
        if (button.classList.contains('yr-btn')) {
          creek.focus = year;
          renderSeason();
        } else {
          toggleSeasonYear(year);
        }
      }
      var seasonYears = byId('creekSeasonYears');
      if (seasonYears) seasonYears.addEventListener('click', yearTap);
      var seasonBody = byId('creekSeason');
      if (seasonBody) seasonBody.addEventListener('click', yearTap);
      chooseSeason(defaultSeason());

      renderCreekRecords();

      /* Redrawn when the measure changes, and only then. A phone firing resize
         as its address bar slides away has not changed width. */
      var drawnAt = byId('main') ? byId('main').clientWidth : 0;
      var timer = null;
      window.addEventListener('resize', function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          var width = byId('main') ? byId('main').clientWidth : 0;
          if (width === drawnAt) return;
          drawnAt = width;
          Object.keys(creek.redraws).forEach(function (name) { creek.redraws[name](); });
        }, 150);
      });
    }).catch(function (error) {
      /* The empty state is already on the page. The error still goes to the
         console, because a room that fails quietly is a room nobody fixes. */
      if (window.console) console.error('Creek room:', error);
    });
  }

  /* -------------------------------------------------------------------------
     THE WEATHER

     Two records on one page, and they are never mixed into one list.

     The first is the FIVEMILE station, every day it has reported, a month at a
     time. That is the log of what happened here.

     The second is the official record at the Birmingham airport, every day
     since January 1, 1930, and NOAA's 1991 to 2020 normals for it. That is the
     record a normal year is measured against, and it is not a reading from
     here, which the page says in a notice before any of it appears. Everything
     from that notice down reads the airport and nothing else, with one
     exception: the notice itself sets the two side by side for the days both
     have, so a reader can see how far apart they run.

     It reuses the creek room's arithmetic and drawing: the leap year slots,
     the seasons, the measured charts, the reels. See DECISIONS.md 71 and 72.
     ------------------------------------------------------------------------- */
  var AIRPORT_DIR = 'fivemile-airport-archive';
  var AIRPORT_NORMALS = 'fivemile-airport-normals.json';
  var TEMP_INK = '#5A3E22';
  var RAIN_INK = 'var(--hold-weather)';
  var HEAT_STEPS = [
    { below: 0.1, fill: '#2F6E92', word: 'far cooler than usual' },
    { below: 0.3, fill: '#9CC3D6', word: 'cooler than usual' },
    { below: 0.7, fill: '#EDE3D1', word: 'about usual' },
    { below: 0.9, fill: '#E2A37C', word: 'warmer than usual' },
    { below: 2, fill: '#B4462C', word: 'far warmer than usual' }
  ];
  var RAIN_STEPS = [
    { below: 0.1, fill: '#8B5E34', word: 'far drier than usual' },
    { below: 0.3, fill: '#D6BA90', word: 'drier than usual' },
    { below: 0.7, fill: '#EDE3D1', word: 'about usual' },
    { below: 0.9, fill: '#9CC3D6', word: 'wetter than usual' },
    { below: 2, fill: '#2E86AB', word: 'far wetter than usual' }
  ];

  var wx = {
    station: [], days: [], byDate: {}, byYear: {}, first: '', last: '', lastYear: 0, nowYear: 0,
    normals: null, extremes: null, years: {}, seasons: {}, grid: {},
    year: 0, season: '', metric: 'rain', gridMetric: 'heat', picked: [], focus: 0,
    pickYear: null, wantMonth: '', redraws: {}
  };

  /* The top half of a ranked list counted from one end and the bottom half
     from the other, so nobody reads that a summer was the ninetieth hottest. */
  function rankWords(position, count, top, bottom) {
    if (position <= Math.ceil(count / 2)) return position === 1 ? top : ordinal(position) + ' ' + top;
    var fromBottom = count - position + 1;
    return fromBottom === 1 ? bottom : ordinal(fromBottom) + ' ' + bottom;
  }
  function degrees(value) { return value == null ? '&mdash;' : Math.round(value) + '&deg;'; }
  function degreesFine(value) { return value == null ? '&mdash;' : value.toFixed(1) + '&deg;'; }
  function rainOf(day) { return reading(day.rain); }
  function meanTemp(day) {
    var high = reading(day.high);
    var low = reading(day.low);
    return high == null || low == null ? null : (high + low) / 2;
  }
  function normalFor(key) { return wx.normals ? wx.normals[slotOf(key)] : null; }
  function sumRain(rows) {
    return rows.reduce(function (total, day) { return total + (rainOf(day) || 0); }, 0);
  }
  function rainyDays(rows) {
    return rows.filter(function (day) { return (rainOf(day) || 0) >= 0.01; }).length;
  }
  function hottestOf(rows) {
    return rows.reduce(function (best, day) {
      return reading(day.high) != null && (!best || reading(day.high) >= reading(best.high)) ? day : best;
    }, null);
  }
  function coldestOf(rows) {
    return rows.reduce(function (best, day) {
      return reading(day.low) != null && (!best || reading(day.low) <= reading(best.low)) ? day : best;
    }, null);
  }
  function wettestOf(rows) {
    return rows.reduce(function (best, day) {
      return (rainOf(day) || 0) > 0 && (!best || rainOf(day) >= rainOf(best)) ? day : best;
    }, null);
  }
  /* A difference in words, for the notice and the year sentence. */
  function warmerCooler(delta, what) {
    if (delta == null) return '';
    if (Math.abs(delta) < 0.5) return 'within half a degree of ' + what;
    return Math.abs(delta).toFixed(1) + ' degrees ' + (delta > 0 ? 'warmer' : 'cooler') + ' than ' + what;
  }

  /* -------------------------------------------------------------------------
     What the page works out from the airport's days
     ------------------------------------------------------------------------- */

  function buildWeatherNormals(data) {
    var days = data && Array.isArray(data.days) ? data.days : [];
    wx.normals = [];
    for (var slot = 0; slot < 366; slot++) wx.normals.push(null);
    days.forEach(function (day) {
      var key = '2024-' + day.md;
      wx.normals[slotOf(key)] = { high: reading(day.high), low: reading(day.low), rain: reading(day.rain) || 0 };
    });
    wx.normalsPeriod = data && data.period ? String(data.period).replace('-', ' to ') : '1991 to 2020';
  }

  /* The record high and low for every date, and the year each was set, with
     the runner up kept too, so a day can be checked against every other year
     without counting itself. Ties go to the most recent year, which is how the
     weather service writes them. */
  function buildExtremes() {
    var slots = [];
    for (var s = 0; s < 366; s++) slots.push({ hi: [], lo: [], wet: null });
    wx.days.forEach(function (day) {
      var slot = slots[slotOf(day.date)];
      var high = reading(day.high);
      var low = reading(day.low);
      if (high != null) slot.hi.push({ value: high, day: day });
      if (low != null) slot.lo.push({ value: low, day: day });
      if ((rainOf(day) || 0) > 0 && (!slot.wet || rainOf(day) >= rainOf(slot.wet))) slot.wet = day;
    });
    wx.extremes = slots.map(function (slot) {
      slot.hi.sort(function (a, b) { return b.value - a.value || b.day.date.localeCompare(a.day.date); });
      slot.lo.sort(function (a, b) { return a.value - b.value || b.day.date.localeCompare(a.day.date); });
      return {
        high: slot.hi[0] || null,
        highNext: slot.hi[1] || null,
        low: slot.lo[0] || null,
        lowNext: slot.lo[1] || null,
        wet: slot.wet
      };
    });
  }
  /* Whether a day's high stands at or above every other year's on that date. */
  function setHighRecord(day) {
    var high = reading(day.high);
    var entry = wx.extremes[slotOf(day.date)];
    if (high == null || !entry || !entry.high) return false;
    var other = entry.high.day === day ? entry.highNext : entry.high;
    return !other || high >= other.value;
  }
  function setLowRecord(day) {
    var low = reading(day.low);
    var entry = wx.extremes[slotOf(day.date)];
    if (low == null || !entry || !entry.low) return false;
    var other = entry.low.day === day ? entry.lowNext : entry.low;
    return !other || low <= other.value;
  }

  function buildWeatherYears() {
    Object.keys(wx.byYear).forEach(function (key) {
      var year = Number(key);
      var rows = wx.byYear[key];
      var means = [];
      var normalMeans = [];
      var normalRain = 0;
      rows.forEach(function (day) {
        var normal = normalFor(day.date);
        if (normal) normalRain += normal.rain;
        var mean = meanTemp(day);
        if (mean != null && normal) {
          means.push(mean);
          normalMeans.push((normal.high + normal.low) / 2);
        }
      });
      wx.years[year] = {
        year: year,
        rows: rows,
        rain: sumRain(rows),
        normalRain: normalRain,
        mean: average(means),
        normalMean: average(normalMeans),
        hottest: hottestOf(rows),
        coldest: coldestOf(rows),
        hot: rows.filter(function (day) { return reading(day.high) != null && reading(day.high) >= 90; }).length,
        freezing: rows.filter(function (day) { return reading(day.low) != null && reading(day.low) <= 32; }).length,
        full: year < wx.nowYear && rows.length >= 360
      };
    });
    var full = Object.keys(wx.years).map(function (key) { return wx.years[key]; })
      .filter(function (stats) { return stats.full; });
    wx.fullCount = full.length;
    full.slice().sort(function (a, b) { return b.rain - a.rain; })
      .forEach(function (stats, index) { stats.rainRank = index + 1; });
    full.filter(function (stats) { return stats.mean != null; })
      .sort(function (a, b) { return b.mean - a.mean; })
      .forEach(function (stats, index) { stats.heatRank = index + 1; });
    wx.fullYears = full;
  }

  function weatherSeasonStats(id, year) {
    var win = seasonWindow(id, year);
    var rows = [];
    var normal = { high: [], low: [], rain: 0 };
    var date = dateFromKey(win.start);
    for (var i = 0; i < win.length; i++) {
      var key = keyOf(date);
      var day = wx.byDate[key];
      if (day) rows.push(day);
      var n = normalFor(key);
      if (n) {
        normal.high.push(n.high);
        normal.low.push(n.low);
        normal.rain += n.rain;
      }
      date.setDate(date.getDate() + 1);
    }
    var open = win.end > wx.last;
    return {
      id: id,
      year: year,
      window: win,
      rows: rows,
      high: average(rows.map(function (day) { return reading(day.high); }).filter(present)),
      low: average(rows.map(function (day) { return reading(day.low); }).filter(present)),
      mean: average(rows.map(meanTemp).filter(present)),
      rain: sumRain(rows),
      wet: rainyDays(rows),
      normalHigh: average(normal.high),
      normalLow: average(normal.low),
      normalRain: normal.rain,
      open: open,
      full: !open && rows.length >= win.length * 0.9
    };
  }

  function buildWeatherSeasons() {
    var firstYear = Number(wx.first.slice(0, 4));
    SEASONS.forEach(function (season) {
      var list = [];
      for (var year = wx.lastYear + (season.id === 'winter' ? 1 : 0); year >= firstYear; year--) {
        var stats = weatherSeasonStats(season.id, year);
        if (stats.rows.length >= 7) list.push(stats);
      }
      var full = list.filter(function (stats) { return stats.full; });
      full.slice().sort(function (a, b) { return b.rain - a.rain; })
        .forEach(function (stats, index) { stats.rainRank = index + 1; });
      full.filter(function (stats) { return stats.mean != null; })
        .sort(function (a, b) { return b.mean - a.mean; })
        .forEach(function (stats, index) { stats.heatRank = index + 1; });
      wx.seasons[season.id] = { list: list, full: full };
    });
  }

  /* Every month of every year against the same month in all the others. Heat
     is the month's average of the daily mean. Rain is the month's total, and a
     month still under way has no total yet, so it is left blank rather than
     being called the driest July on record on the eighth. */
  function buildWeatherGrid() {
    var sums = {};
    wx.days.forEach(function (day) {
      var year = day.date.slice(0, 4);
      var month = Number(day.date.slice(5, 7)) - 1;
      if (!sums[year]) sums[year] = [];
      if (!sums[year][month]) sums[year][month] = { heat: 0, heatDays: 0, rain: 0, days: 0 };
      var bucket = sums[year][month];
      var mean = meanTemp(day);
      if (mean != null) { bucket.heat += mean; bucket.heatDays += 1; }
      bucket.rain += rainOf(day) || 0;
      bucket.days += 1;
    });
    var years = Object.keys(sums).map(Number).sort(function (a, b) { return b - a; });
    ['heat', 'rain'].forEach(function (metric) {
      var cells = {};
      var columns = [];
      for (var m = 0; m < 12; m++) columns.push([]);
      years.forEach(function (year) {
        cells[year] = [];
        for (var month = 0; month < 12; month++) {
          var bucket = sums[year][month];
          var length = new Date(year, month + 1, 0).getDate();
          var monthEnd = year + '-' + pad2(month + 1) + '-' + pad2(length);
          var figure = null;
          if (bucket && metric === 'heat' && bucket.heatDays >= 10) figure = bucket.heat / bucket.heatDays;
          if (bucket && metric === 'rain' && monthEnd <= wx.last && bucket.days >= length - 2) figure = bucket.rain;
          cells[year].push(figure == null ? null : { value: figure });
          if (figure != null) columns[month].push(figure);
        }
      });
      var steps = metric === 'heat' ? HEAT_STEPS : RAIN_STEPS;
      years.forEach(function (year) {
        cells[year].forEach(function (entry, month) {
          if (!entry) return;
          var below = 0;
          var equal = 0;
          columns[month].forEach(function (other) {
            if (other < entry.value) below += 1;
            else if (other === entry.value) equal += 1;
          });
          entry.share = (below + (equal - 1) / 2) / Math.max(1, columns[month].length - 1);
          entry.step = steps.filter(function (step) { return entry.share < step.below; })[0];
        });
      });
      wx.grid[metric] = { years: years, cells: cells };
    });
  }

  /* -------------------------------------------------------------------------
     Drawing
     ------------------------------------------------------------------------- */

  function niceStep(span, most, steps) {
    return steps.filter(function (step) { return span / step <= most; })[0] || steps[steps.length - 1];
  }
  function valueAxis(lo, hi, step, frame, y, format) {
    var out = '';
    for (var i = Math.ceil(lo / step - 1e-9); i * step <= hi + 1e-9; i++) {
      var value = i * step;
      var at = y(value).toFixed(1);
      out += '<line x1="' + frame.left + '" x2="' + frame.right + '" y1="' + at + '" y2="' + at + '" stroke="' + RULE + '" stroke-width="1"/>' +
        '<text class="arc-axis" x="' + (frame.left - 6) + '" y="' + (Number(at) + 4) + '" text-anchor="end">' + format(value) + '</text>';
    }
    return out;
  }
  function baseline(frame) {
    return '<line x1="' + frame.left + '" x2="' + frame.right + '" y1="' + frame.bottom + '" y2="' + frame.bottom + '" stroke="rgba(80,44,8,0.28)" stroke-width="1"/>';
  }
  function yearSpans(frame) {
    var plot = frame.right - frame.left;
    return SLOT_START.map(function (first, month) {
      return { month: month, x0: frame.left + (first / 366) * plot, x1: frame.left + ((SLOT_START[month + 1] || 366) / 366) * plot };
    });
  }

  /* A year of temperature the way a weather page has always drawn one: every
     day a stroke from its low to its high, standing in the normal range, which
     stands inside the range of every year on file. A day that set or tied the
     record for its date gets a dot. */
  function drawTempYear(host, stats) {
    if (!host) return;
    var box = boxOf(host, true);
    var frame = frameOf(box);
    frame.left = box.narrow ? 32 : 44;
    var plot = frame.right - frame.left;
    var lows = wx.extremes.map(function (entry) { return entry.low ? entry.low.value : null; }).filter(present);
    var highs = wx.extremes.map(function (entry) { return entry.high ? entry.high.value : null; }).filter(present);
    var lo = Math.floor((Math.min.apply(null, lows) - 2) / 10) * 10;
    var hi = Math.ceil((Math.max.apply(null, highs) + 2) / 10) * 10;
    function x(slot) { return frame.left + ((slot + 0.5) / 366) * plot; }
    function y(value) { return frame.bottom - ((value - lo) / (hi - lo)) * (frame.bottom - frame.top); }

    var recordBand = [];
    var normalBand = [];
    var topEdge = [];
    var bottomEdge = [];
    var normalTop = [];
    var normalBottom = [];
    for (var slot = 0; slot < 366; slot++) {
      var entry = wx.extremes[slot];
      if (entry.high && entry.low) {
        topEdge.push(x(slot).toFixed(1) + ',' + y(entry.high.value).toFixed(1));
        bottomEdge.push(x(slot).toFixed(1) + ',' + y(entry.low.value).toFixed(1));
      }
      var normal = wx.normals[slot];
      if (normal) {
        normalTop.push(x(slot).toFixed(1) + ',' + y(normal.high).toFixed(1));
        normalBottom.push(x(slot).toFixed(1) + ',' + y(normal.low).toFixed(1));
      }
    }
    recordBand = topEdge.concat(bottomEdge.reverse()).join(' ');
    normalBand = normalTop.concat(normalBottom.reverse()).join(' ');

    var width = Math.max(1, plot / 366 - 0.25);
    var strokes = '';
    var hotDots = '';
    var coldDots = '';
    stats.rows.forEach(function (day) {
      var high = reading(day.high);
      var low = reading(day.low);
      if (high == null || low == null) return;
      var at = x(slotOf(day.date)).toFixed(1);
      strokes += 'M' + at + ' ' + y(high).toFixed(1) + 'V' + y(low).toFixed(1);
      if (setHighRecord(day)) hotDots += '<circle cx="' + at + '" cy="' + (y(high) - 3).toFixed(1) + '" r="2.4" fill="var(--red)"/>';
      if (setLowRecord(day)) coldDots += '<circle cx="' + at + '" cy="' + (y(low) + 3).toFixed(1) + '" r="2.4" fill="' + RAIN_INK + '"/>';
    });

    host.innerHTML = svgOpen(box, stats.year + ' daily highs and lows at the Birmingham airport against the normal and record range') +
      valueAxis(lo, hi, niceStep(hi - lo, 5, [10, 20, 25]), frame, y, function (v) { return v + '&deg;'; }) +
      monthAxis(yearSpans(frame), frame, box.height - 8) +
      '<polygon points="' + recordBand + '" fill="#EDE3D1"/>' +
      '<polygon points="' + normalBand + '" fill="#D6BA90" fill-opacity="0.75"/>' +
      '<path d="' + strokes + '" stroke="' + TEMP_INK + '" stroke-width="' + width.toFixed(2) + '" fill="none"/>' +
      hotDots + coldDots + baseline(frame) + '</svg>';
    return { hot: !!hotDots, cold: !!coldDots };
  }

  /* Rain added up through the year against the normal adding up beside it. */
  function drawRainYear(host, stats) {
    if (!host) return;
    var box = boxOf(host, false);
    var frame = frameOf(box);
    frame.left = box.narrow ? 32 : 44;
    var plot = frame.right - frame.left;
    var normalTotal = 0;
    var normalPoints = [];
    for (var slot = 0; slot < 366; slot++) {
      if (wx.normals[slot]) normalTotal += wx.normals[slot].rain;
      normalPoints.push({ slot: slot, total: normalTotal });
    }
    var running = 0;
    var points = stats.rows.map(function (day) {
      running += rainOf(day) || 0;
      return { slot: slotOf(day.date), total: running, i: daysApart(stats.year + '-01-01', day.date) };
    });
    var hi = Math.ceil(Math.max(normalTotal, running) / 10) * 10 + 2;
    function x(slot) { return frame.left + ((slot + 0.5) / 366) * plot; }
    function y(value) { return frame.bottom - (value / hi) * (frame.bottom - frame.top); }
    var line = brokenPath(points.map(function (point) { return { i: point.i, x: x(point.slot), y: y(point.total) }; }));
    var area = points.length
      ? 'M' + x(points[0].slot).toFixed(1) + ' ' + frame.bottom + line.replace(/^M/, 'L') +
        'L' + x(points[points.length - 1].slot).toFixed(1) + ' ' + frame.bottom + 'Z'
      : '';

    host.innerHTML = svgOpen(box, stats.year + ' rain added up through the year at the Birmingham airport against normal') +
      valueAxis(0, hi, niceStep(hi, 4, [10, 20, 25, 50]), frame, y, function (v) { return v + (box.narrow ? '' : ' in'); }) +
      monthAxis(yearSpans(frame), frame, box.height - 8) +
      (area ? '<path d="' + area + '" fill="' + RAIN_INK + '" fill-opacity="0.12"/>' : '') +
      '<path d="' + brokenPath(normalPoints.map(function (point) { return { i: point.slot, x: x(point.slot), y: y(point.total) }; })) +
        '" fill="none" stroke="#6B6156" stroke-width="1.25" stroke-dasharray="4 3"/>' +
      '<path d="' + line + '" fill="none" stroke="' + RAIN_INK + '" stroke-width="2.25" stroke-linejoin="round"/>' +
      baseline(frame) + '</svg>';
  }

  /* A month of days: highs and lows as strokes, and the rain as columns under
     them. Used for the airport and for the station, and the normal range is
     only drawn behind the airport's, because the normals are the airport's. */
  function drawTempMonth(host, days, key, withNormals) {
    if (!host || !days.length) return;
    var box = boxOf(host, false);
    var frame = frameOf(box);
    frame.left = box.narrow ? 32 : 44;
    var plot = frame.right - frame.left;
    var year = Number(key.slice(0, 4));
    var month = Number(key.slice(5, 7));
    var length = new Date(year, month, 0).getDate();
    var values = [];
    days.forEach(function (day) { values.push(reading(day.high), reading(day.low)); });
    var normals = [];
    for (var d = 1; d <= length; d++) normals.push(withNormals ? normalFor(key + '-' + pad2(d)) : null);
    normals.forEach(function (normal) { if (normal) values.push(normal.high, normal.low); });
    values = values.filter(present);
    if (!values.length) return;
    var lo = Math.floor((Math.min.apply(null, values) - 3) / 10) * 10;
    var hi = Math.ceil((Math.max.apply(null, values) + 3) / 10) * 10;
    function x(index) { return frame.left + ((index + 0.5) / length) * plot; }
    function y(value) { return frame.bottom - ((value - lo) / (hi - lo)) * (frame.bottom - frame.top); }
    var band = '';
    if (withNormals) {
      var top = [];
      var bottom = [];
      normals.forEach(function (normal, index) {
        if (!normal) return;
        var edgeLeft = frame.left + (index / length) * plot;
        var edgeRight = frame.left + ((index + 1) / length) * plot;
        top.push(edgeLeft.toFixed(1) + ',' + y(normal.high).toFixed(1), edgeRight.toFixed(1) + ',' + y(normal.high).toFixed(1));
        bottom.push(edgeLeft.toFixed(1) + ',' + y(normal.low).toFixed(1), edgeRight.toFixed(1) + ',' + y(normal.low).toFixed(1));
      });
      band = '<polygon points="' + top.concat(bottom.reverse()).join(' ') + '" fill="#D6BA90" fill-opacity="0.6"/>';
    }
    var width = Math.max(2, Math.min(9, plot / length - 3));
    var strokes = '';
    days.forEach(function (day) {
      var high = reading(day.high);
      var low = reading(day.low);
      if (high == null || low == null) return;
      var at = x(dayNumber(day.date) - 1).toFixed(1);
      strokes += 'M' + at + ' ' + y(high).toFixed(1) + 'V' + y(low).toFixed(1);
    });
    var ticks = '';
    [1, 8, 15, 22, 29].forEach(function (n) {
      if (n <= length) ticks += '<text class="arc-axis" x="' + x(n - 1).toFixed(1) + '" y="' + (box.height - 8) + '" text-anchor="middle">' + n + '</text>';
    });
    host.innerHTML = svgOpen(box, monthProse(key) + ' daily highs and lows') +
      valueAxis(lo, hi, niceStep(hi - lo, 4, [5, 10, 20]), frame, y, function (v) { return v + '&deg;'; }) +
      band +
      '<path d="' + strokes + '" stroke="' + TEMP_INK + '" stroke-width="' + width.toFixed(1) + '" stroke-linecap="round" fill="none"/>' +
      baseline(frame) + ticks + '</svg>';
  }

  function drawRainMonth(host, days, key) {
    if (!host) return;
    var total = sumRain(days);
    if (!(total > 0)) { host.innerHTML = ''; return; }
    var box = boxOf(host, false);
    box.height = box.narrow ? 110 : 130;
    var frame = frameOf(box);
    frame.left = box.narrow ? 32 : 44;
    var plot = frame.right - frame.left;
    var year = Number(key.slice(0, 4));
    var month = Number(key.slice(5, 7));
    var length = new Date(year, month, 0).getDate();
    var peak = Math.max.apply(null, days.map(function (day) { return rainOf(day) || 0; }));
    var hi = peak <= 1 ? Math.ceil(peak * 4) / 4 : Math.ceil(peak);
    function y(value) { return frame.bottom - (value / hi) * (frame.bottom - frame.top); }
    var slotW = plot / length;
    var width = Math.max(2, Math.min(14, slotW - 2));
    var bars = days.map(function (day) {
      var value = rainOf(day) || 0;
      if (!value) return '';
      var tall = Math.max(1.5, frame.bottom - y(value));
      var left = frame.left + (dayNumber(day.date) - 1) * slotW + (slotW - width) / 2;
      return '<rect x="' + left.toFixed(1) + '" y="' + (frame.bottom - tall).toFixed(1) + '" width="' + width.toFixed(1) +
        '" height="' + tall.toFixed(1) + '" rx="1" fill="' + RAIN_INK + '"/>';
    }).join('');
    host.innerHTML = svgOpen(box, monthProse(key) + ' rain, day by day') +
      valueAxis(0, hi, hi <= 1 ? 0.5 : niceStep(hi, 2, [1, 2, 5]), frame, y, function (v) { return (hi <= 1 ? v.toFixed(1) : v) + (box.narrow ? '' : ' in'); }) +
      bars + baseline(frame) + '</svg>';
  }

  /* -------------------------------------------------------------------------
     Our station
     ------------------------------------------------------------------------- */
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
      (sum.warm ? cell('Warmest &middot; ' + esc(shortDate(sum.warm.date)), esc(num(sum.warm.high)) + '&deg;', '⬆️') : '') +
      (sum.cold ? cell('Coldest &middot; ' + esc(shortDate(sum.cold.date)), esc(num(sum.cold.low)) + '&deg;', '⬇️') : '') +
      cell('Rain for the month', inches(sum.rain), '🌧️') +
      (sum.wet && (rainOf(sum.wet) || 0) > 0 ? cell('Wettest day &middot; ' + esc(shortDate(sum.wet.date)), inches(sum.wet.rain), '💧') : cell('Wettest day', '&mdash;', '💧')) +
      cell('Days with rain', esc(sum.wetDays) + ' of ' + esc(days.length), '📅') +
      (sum.gust ? cell('Hardest gust &middot; ' + esc(shortDate(sum.gust.date)), esc(num(sum.gust.maxGust)) + ' mph', '🌬️') : '') +
      '</div>';

    var table = '<table class="arc-table">' +
      '<thead><tr><th scope="col">Day</th><th scope="col">High</th><th scope="col">Low</th>' +
        '<th scope="col">Rain</th><th scope="col" class="opt">Gust</th></tr></thead><tbody>' +
      days.map(function (day) {
        var rainValue = num(day.rain) || 0;
        return '<tr>' +
          '<th scope="row"><span>' + esc(weekday(day.date)) + '</span>' + esc(dayNumber(day.date)) + '</th>' +
          '<td' + (day === sum.warm ? ' class="peak"' : '') + '>' + (reading(day.high) == null ? '&mdash;' : esc(num(day.high))) + '</td>' +
          '<td' + (day === sum.cold ? ' class="peak"' : '') + '>' + (reading(day.low) == null ? '&mdash;' : esc(num(day.low))) + '</td>' +
          '<td class="' + (rainValue ? (day === sum.wet ? 'peak' : '') : 'zero') + '">' + rainValue.toFixed(2) + '</td>' +
          '<td class="opt">' + (reading(day.maxGust) == null ? '&mdash;' : esc(num(day.maxGust))) + '</td>' +
          '</tr>';
      }).join('') +
      '</tbody></table>';

    body.innerHTML = rows +
      '<div class="arc-plot" id="weatherMonthTemps"></div>' +
      legend([['sw-temp', 'Each day, low to high']]) +
      '<div class="arc-plot" id="weatherMonthRain"></div>' +
      table;
    wx.redraws.stationMonth = function () {
      drawTempMonth(byId('weatherMonthTemps'), days, key, false);
      drawRainMonth(byId('weatherMonthRain'), days, key);
    };
    wx.redraws.stationMonth();
  }

  function renderWeatherRecords(days) {
    var host = byId('weatherRecords');
    if (!host || !days.length) return;
    var sum = weatherSummary(days);
    var wettest = wettestMonth(days);
    var dry = longestDryRun(days);
    host.innerHTML = '<div class="d-rows">' +
      cell('Hottest &middot; ' + esc(shortDate(sum.warm.date)), esc(num(sum.warm.high)) + '&deg;', '⬆️') +
      cell('Coldest &middot; ' + esc(shortDate(sum.cold.date)), esc(num(sum.cold.low)) + '&deg;', '⬇️') +
      cell('Wettest day &middot; ' + esc(shortDate(sum.wet.date)), inches(sum.wet.rain), '💧') +
      cell('Wettest month &middot; ' + esc(monthLabel(wettest.month)), inches(wettest.total), '🌧️') +
      cell('Longest dry run &middot; to ' + esc(shortDate(dry.endedOn)), esc(dry.days) + ' days', '☀️') +
      cell('Rain on the books', inches(sum.rain), '🕰️') +
      '</div>';
  }

  /* -------------------------------------------------------------------------
     The airport
     ------------------------------------------------------------------------- */

  /* The notice sets the two records side by side over the days both have, so
     "the airport is not here" comes with a number attached. */
  function renderComparison() {
    var host = byId('airportCompare');
    if (!host || !wx.station.length || !wx.days.length) return;
    var highs = [];
    var lows = [];
    var ours = 0;
    var theirs = 0;
    var shared = 0;
    wx.station.forEach(function (mine) {
      var other = wx.byDate[mine.date];
      if (!other) return;
      shared += 1;
      if (reading(mine.high) != null && reading(other.high) != null) highs.push(reading(other.high) - reading(mine.high));
      if (reading(mine.low) != null && reading(other.low) != null) lows.push(reading(other.low) - reading(mine.low));
      if (rainOf(mine) != null && rainOf(other) != null) {
        ours += rainOf(mine);
        theirs += rainOf(other);
      }
    });
    if (shared < 30) return;
    host.textContent = 'Over the ' + shared.toLocaleString('en-US') + ' days both have on file, the airport’s highs ran ' +
      warmerCooler(average(highs), 'ours') + ' on average and its lows ' +
      warmerCooler(average(lows), 'ours') + ', and it measured ' + theirs.toFixed(2) + ' inches of rain to our ' +
      ours.toFixed(2) + '.';
  }

  /* Today's date in the long record: what is normal for it and what the
     record is. */
  function renderOnThisDate() {
    var body = byId('airportToday');
    if (!body) return;
    var today = keyOf(new Date());
    var slot = slotOf(today);
    var normal = wx.normals[slot];
    var entry = wx.extremes[slot];
    setText('airportTodayName', MONTHS_FULL[Number(today.slice(5, 7)) - 1] + ' ' + dayNumber(today));
    var lastYearKey = (Number(today.slice(0, 4)) - 1) + today.slice(4);
    var last = wx.byDate[lastYearKey];
    body.innerHTML = '<div class="d-rows">' +
      cell('Normal high', normal ? degrees(normal.high) : '&mdash;', '🌡️') +
      cell('Normal low', normal ? degrees(normal.low) : '&mdash;', '🌡️') +
      (entry.high ? cell('Record high &middot; ' + entry.high.day.date.slice(0, 4), degrees(entry.high.value), '⬆️') : '') +
      (entry.low ? cell('Record low &middot; ' + entry.low.day.date.slice(0, 4), degrees(entry.low.value), '⬇️') : '') +
      (entry.wet ? cell('Most rain &middot; ' + entry.wet.date.slice(0, 4), inches(entry.wet.rain), '🌧️') : '') +
      (last ? cell('A year ago', degrees(reading(last.high)) + '<span class="wx-lo">' + degrees(reading(last.low)) + '</span>', '📅') : '') +
      '</div>';
  }

  function yearWeatherSentence(stats) {
    var first = stats.rows[0];
    var lastRow = stats.rows[stats.rows.length - 1];
    var rainPart = stats.rain.toFixed(2) + ' inches of rain against a normal ' + stats.normalRain.toFixed(2);
    var heatPart = warmerCooler(stats.mean != null && stats.normalMean != null ? stats.mean - stats.normalMean : null, 'normal');
    if (stats.full) {
      var line = 'In ' + stats.year + ' the airport ran ' + heatPart + ' and measured ' + rainPart + '.';
      var ranks = [];
      if (stats.heatRank) ranks.push('the ' + rankWords(stats.heatRank, wx.fullCount, 'warmest', 'coolest'));
      if (stats.rainRank) ranks.push('the ' + rankWords(stats.rainRank, wx.fullCount, 'wettest', 'driest'));
      return line + (ranks.length ? ' It was ' + ranks.join(' and ') + ' of the ' + wx.fullCount + ' full years on file.' : '');
    }
    if (stats.year === wx.lastYear) {
      return 'So far in ' + stats.year + ' the airport has run ' + heatPart + ', and it has measured ' +
        stats.rain.toFixed(2) + ' inches of rain against the ' + stats.normalRain.toFixed(2) + ' a normal year brings by ' +
        shortDate(lastRow.date) + '.';
    }
    return 'From ' + shortDate(first.date) + ' on, ' + stats.year + ' ran ' + heatPart + ' at the airport and measured ' + rainPart + '.';
  }

  function renderAirportYear(year) {
    var stats = wx.years[year];
    var body = byId('airportYear');
    if (!stats || !body) return;
    wx.year = year;
    setText('airportYearName', String(year));
    var hot = stats.hottest;
    var cold = stats.coldest;
    var through = stats.full ? 'Normal for the year' : 'Normal by ' + shortDate(stats.rows[stats.rows.length - 1].date);
    body.innerHTML = '<div class="d-rows">' +
      (hot ? cell('Hottest &middot; ' + esc(shortDate(hot.date)), degrees(reading(hot.high)), '⬆️') : '') +
      (cold ? cell('Coldest &middot; ' + esc(shortDate(cold.date)), degrees(reading(cold.low)), '⬇️') : '') +
      cell('Rain', inches(stats.rain), '🌧️') +
      cell(through, inches(stats.normalRain), '🕰️') +
      cell('Days at 90&deg; or more', String(stats.hot), '☀️') +
      cell('Nights at freezing', String(stats.freezing), '❄️') +
      '</div>' +
      '<div class="arc-plot" id="airportYearTemps"></div>' +
      '<div id="airportYearTempKey"></div>' +
      '<div class="arc-plot" id="airportYearRain"></div>' +
      legend([['sw-rain', 'Rain so far in the year'], ['sw-usual', 'Normal']]) +
      '<p class="arc-say">' + esc(yearWeatherSentence(stats)) + '</p>';
    wx.redraws.year = function () {
      var marks = drawTempYear(byId('airportYearTemps'), stats) || {};
      var key = byId('airportYearTempKey');
      if (key) {
        key.innerHTML = legend([['sw-temp', 'Each day, low to high'], ['sw-normal', 'Normal range'], ['sw-record', 'Record range']]
          .concat(marks.hot ? [['sw-dot-hot', 'Record high set or tied']] : [])
          .concat(marks.cold ? [['sw-dot-cold', 'Record low set or tied']] : []));
      }
      drawRainYear(byId('airportYearRain'), stats);
    };
    wx.redraws.year();
    buildAirportMonthReel(stats);
    if (wx.redraws.grid) wx.redraws.grid();
  }

  function renderAirportMonth(days, key) {
    var body = byId('airportMonth');
    if (!body) return;
    setText('airportMonthName', monthProse(key));
    var hot = hottestOf(days);
    var cold = coldestOf(days);
    var wet = wettestOf(days);
    var rain = sumRain(days);
    var snow = days.reduce(function (total, day) { return total + (reading(day.snow) || 0); }, 0);
    var normalRain = 0;
    days.forEach(function (day) { var n = normalFor(day.date); if (n) normalRain += n.rain; });
    var monthLength = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0).getDate();
    var complete = days.length >= monthLength;
    var rows = '<div class="d-rows">' +
      (hot ? cell('Hottest &middot; ' + esc(shortDate(hot.date)), degrees(reading(hot.high)), '⬆️') : '') +
      (cold ? cell('Coldest &middot; ' + esc(shortDate(cold.date)), degrees(reading(cold.low)), '⬇️') : '') +
      cell('Rain for the month', inches(rain), '🌧️') +
      cell(complete ? 'Normal for the month' : 'Normal by ' + shortDate(days[days.length - 1].date), inches(normalRain), '🕰️') +
      cell(wet ? 'Wettest day &middot; ' + esc(shortDate(wet.date)) : 'Wettest day', wet ? inches(wet.rain) : '&mdash;', '💧') +
      cell('Days with rain', rainyDays(days) + ' of ' + days.length, '📅') +
      (snow > 0 ? cell('Snow', snow.toFixed(1) + ' in', '❄️') : '') +
      '</div>';
    var table = '<table class="arc-table">' +
      '<thead><tr><th scope="col">Day</th><th scope="col">High</th><th scope="col">Low</th><th scope="col">Rain</th>' +
        (snow > 0 ? '<th scope="col">Snow</th>' : '') + '</tr></thead><tbody>' +
      days.map(function (day) {
        var rainValue = rainOf(day);
        return '<tr>' +
          '<th scope="row"><span>' + esc(weekday(day.date)) + '</span>' + esc(dayNumber(day.date)) + '</th>' +
          '<td' + (day === hot ? ' class="peak"' : '') + '>' + (reading(day.high) == null ? '&mdash;' : reading(day.high)) + '</td>' +
          '<td' + (day === cold ? ' class="peak"' : '') + '>' + (reading(day.low) == null ? '&mdash;' : reading(day.low)) + '</td>' +
          '<td class="' + (rainValue ? (day === wet ? 'peak' : '') : 'zero') + '">' + (rainValue == null ? '&mdash;' : rainValue.toFixed(2)) + '</td>' +
          (snow > 0 ? '<td class="' + (reading(day.snow) ? '' : 'zero') + '">' + (reading(day.snow) || 0).toFixed(1) + '</td>' : '') +
          '</tr>';
      }).join('') +
      '</tbody></table>';
    body.innerHTML = rows +
      '<div class="arc-plot" id="airportMonthTemps"></div>' +
      legend([['sw-temp', 'Each day, low to high'], ['sw-normal', 'Normal range']]) +
      '<div class="arc-plot" id="airportMonthRain"></div>' +
      table;
    wx.redraws.month = function () {
      drawTempMonth(byId('airportMonthTemps'), days, key, true);
      drawRainMonth(byId('airportMonthRain'), days, key);
    };
    wx.redraws.month();
  }

  function buildAirportMonthReel(stats) {
    var host = byId('airportReel');
    if (!host) return;
    var fresh = host.cloneNode(false);
    host.parentNode.replaceChild(fresh, host);
    var months = groupByMonth(stats.rows, function (day) { return day.date; });
    var keys = Object.keys(months).sort().reverse();
    buildReel(fresh, keys, function (key) {
      return sumRain(months[key]).toFixed(2) + ' in';
    }, function (key) {
      renderAirportMonth(months[key], key);
    });
    var wanted = wx.wantMonth;
    wx.wantMonth = '';
    var chip = wanted ? fresh.querySelector('[data-month="' + wanted + '"]') : null;
    if (chip) {
      chip.click();
      fresh.scrollLeft = chip.offsetLeft - (fresh.clientWidth - chip.offsetWidth) / 2;
    }
  }

  /* Season against season. Rain is drawn added up through the season, which
     is how a wet spring and a dry one actually part company. Heat is each day's
     mean run through a week either side, because a line per day per year is a
     tangle nobody can follow. */
  function seasonSeries(stats, metric) {
    var out = [];
    var start = stats.window.start;
    if (metric === 'rain') {
      var running = 0;
      var byIndex = {};
      stats.rows.forEach(function (day) { byIndex[daysApart(start, day.date)] = day; });
      for (var i = 0; i < stats.window.length; i++) {
        if (byIndex[i]) running += rainOf(byIndex[i]) || 0;
        if (byIndex[i] || !(stats.open && i > daysApart(start, wx.last))) out.push({ i: i, value: running });
      }
      return out;
    }
    var means = [];
    for (var j = 0; j < stats.window.length; j++) means.push(null);
    stats.rows.forEach(function (day) { means[daysApart(start, day.date)] = meanTemp(day); });
    for (var k = 0; k < means.length; k++) {
      if (means[k] == null) continue;
      var pool = [];
      for (var w = Math.max(0, k - 3); w <= Math.min(means.length - 1, k + 3); w++) if (means[w] != null) pool.push(means[w]);
      out.push({ i: k, value: average(pool) });
    }
    return out;
  }

  function weatherSeasonFor(year) {
    var info = wx.seasons[wx.season];
    return info ? info.list.filter(function (stats) { return stats.year === year; })[0] || null : null;
  }

  function drawWeatherSeason(host) {
    if (!host) return;
    var info = wx.seasons[wx.season];
    var focus = weatherSeasonFor(wx.focus);
    if (!info || !focus) return;
    var metric = wx.metric;
    var box = boxOf(host, true);
    var frame = frameOf(box);
    frame.left = box.narrow ? 32 : 44;
    var plot = frame.right - frame.left;
    var picked = wx.picked.map(weatherSeasonFor).filter(present);
    var length = Math.max.apply(null, picked.map(function (stats) { return stats.window.length; }));

    /* The band is the middle half of every full season of this kind, day by
       day through the season, on the same measure as the lines. */
    var columns = [];
    for (var c = 0; c < length; c++) columns.push([]);
    info.full.forEach(function (stats) {
      seasonSeries(stats, metric).forEach(function (point) { if (point.i < length) columns[point.i].push(point.value); });
    });
    var band = columns.map(function (values) {
      values.sort(numeric);
      return values.length ? [quantile(values, 0.25), quantile(values, 0.75)] : null;
    });
    var normalLine = [];
    var normalRunning = 0;
    for (var n = 0; n < length; n++) {
      var normal = normalFor(addDays(focus.window.start, n));
      if (!normal) { normalLine.push(null); continue; }
      normalRunning += normal.rain;
      normalLine.push(metric === 'rain' ? normalRunning : (normal.high + normal.low) / 2);
    }
    var series = picked.map(function (stats) { return { stats: stats, points: seasonSeries(stats, metric) }; });
    var values = [];
    series.forEach(function (entry) { entry.points.forEach(function (point) { values.push(point.value); }); });
    band.forEach(function (pair) { if (pair) values.push(pair[0], pair[1]); });
    normalLine.forEach(function (value) { if (value != null) values.push(value); });
    var lo = metric === 'rain' ? 0 : Math.floor((Math.min.apply(null, values) - 2) / 5) * 5;
    var hi = metric === 'rain' ? Math.ceil(Math.max.apply(null, values) / 5) * 5 + 1 : Math.ceil((Math.max.apply(null, values) + 2) / 5) * 5;
    function x(index) { return frame.left + ((index + 0.5) / length) * plot; }
    function y(value) { return frame.bottom - ((value - lo) / (hi - lo)) * (frame.bottom - frame.top); }

    var bandTop = [];
    var bandBottom = [];
    band.forEach(function (pair, index) {
      if (!pair) return;
      bandTop.push(x(index).toFixed(1) + ',' + y(pair[1]).toFixed(1));
      bandBottom.push(x(index).toFixed(1) + ',' + y(pair[0]).toFixed(1));
    });
    var spans = [];
    var cursor = focus.window.start;
    for (var m = 0; m < 3; m++) {
      var monthIndex = Number(cursor.slice(5, 7)) - 1;
      var monthDays = new Date(Number(cursor.slice(0, 4)), monthIndex + 1, 0).getDate();
      var from = daysApart(focus.window.start, cursor);
      spans.push({ month: monthIndex, x0: frame.left + (from / length) * plot, x1: frame.left + (Math.min(length, from + monthDays) / length) * plot });
      cursor = addDays(cursor, monthDays);
    }
    var ink = metric === 'rain' ? RAIN_INK : TEMP_INK;
    function path(points) {
      return brokenPath(points.map(function (point) { return { i: point.i, x: x(point.i), y: y(point.value) }; }));
    }
    var format = metric === 'rain'
      ? function (v) { return v + (box.narrow ? '' : ' in'); }
      : function (v) { return v + '&deg;'; };

    host.innerHTML = svgOpen(box, seasonName(focus.id, focus.year) + (metric === 'rain' ? ' rain added up' : ' temperature') + ' against ' + (picked.length - 1) + ' other years') +
      valueAxis(lo, hi, niceStep(hi - lo, 5, metric === 'rain' ? [2, 5, 10, 20] : [5, 10, 20]), frame, y, format) +
      monthAxis(spans, frame, box.height - 8) +
      (bandTop.length ? '<polygon points="' + bandTop.concat(bandBottom.reverse()).join(' ') + '" fill="' + (metric === 'rain' ? '#9CC3D6' : '#D6BA90') + '" fill-opacity="0.45"/>' : '') +
      '<path d="' + brokenPath(normalLine.map(function (value, index) { return { i: index, x: x(index), y: value == null ? null : y(value) }; })) +
        '" fill="none" stroke="#6B6156" stroke-width="1.25" stroke-dasharray="4 3"/>' +
      series.filter(function (entry) { return entry.stats.year !== focus.year; }).map(function (entry) {
        return '<path d="' + path(entry.points) + '" fill="none" stroke="' + OTHER_YEAR + '" stroke-width="1.25" stroke-opacity="0.8" stroke-linejoin="round"/>';
      }).join('') +
      '<path d="' + path(seasonSeries(focus, metric)) + '" fill="none" stroke="' + ink + '" stroke-width="2.75" stroke-linejoin="round" stroke-linecap="round"/>' +
      baseline(frame) + '</svg>';
  }

  function renderWeatherSeason() {
    var body = byId('airportSeason');
    var info = wx.seasons[wx.season];
    var focus = weatherSeasonFor(wx.focus);
    if (!body || !info || !focus) return;
    var details = body.querySelector('details');
    var wasOpen = details ? details.open : false;
    var name = seasonById(wx.season).name;
    var rainMetric = wx.metric === 'rain';
    var count = info.full.filter(function (stats) { return rainMetric || stats.mean != null; }).length;
    function rank(stats) {
      if (stats.open) return 'so far';
      var position = rainMetric ? stats.rainRank : stats.heatRank;
      return position ? rankWords(position, count, rainMetric ? 'wettest' : 'warmest', rainMetric ? 'driest' : 'coolest') : '&mdash;';
    }
    function figures(stats) {
      return rainMetric
        ? '<td>' + stats.rain.toFixed(2) + '</td><td>' + stats.wet + '</td>'
        : '<td>' + degreesFine(stats.high) + '</td><td>' + degreesFine(stats.low) + '</td>';
    }

    setText('airportSeasonName', name);
    setText('airportSeasonSpan', windowLabel(focus.window));
    var picked = wx.picked.map(weatherSeasonFor).filter(present);
    var head = '<th scope="col">' + esc(name) + '</th>' +
      (rainMetric ? '<th scope="col">Rain</th><th scope="col">Days</th>' : '<th scope="col">High</th><th scope="col">Low</th>');
    var table = '<table class="arc-table arc-cmp">' +
      '<thead><tr>' + head + '<th scope="col">Of ' + count + '</th></tr></thead><tbody>' +
      picked.map(function (stats) {
        var on = stats.year === focus.year;
        return '<tr' + (on ? ' class="on"' : '') + '>' +
          '<th scope="row"><button type="button" class="yr-btn" data-year="' + stats.year + '" aria-pressed="' + on + '">' +
            esc(seasonShort(stats.id, stats.year)) + '</button></th>' +
          figures(stats) + '<td class="rank">' + rank(stats) + '</td></tr>';
      }).join('') +
      '<tr class="usual"><th scope="row">Normal</th>' +
        (rainMetric
          ? '<td>' + focus.normalRain.toFixed(2) + '</td><td>&mdash;</td>'
          : '<td>' + degreesFine(focus.normalHigh) + '</td><td>' + degreesFine(focus.normalLow) + '</td>') +
        '<td class="rank">&mdash;</td></tr>' +
      '</tbody></table>';

    var ordered = info.full.filter(function (stats) { return rainMetric || stats.mean != null; })
      .slice().sort(function (a, b) { return rainMetric ? a.rainRank - b.rainRank : a.heatRank - b.heatRank; });
    var ranked = '<details class="arc-all"' + (wasOpen ? ' open' : '') + '>' +
      '<summary>Every ' + name.toLowerCase() + ' on file, ' + (rainMetric ? 'wettest' : 'warmest') + ' first</summary>' +
      '<table class="arc-table arc-ranked"><thead><tr>' + head + '<th scope="col">Rank</th></tr></thead><tbody>' +
      ordered.map(function (stats) {
        return '<tr' + (wx.picked.indexOf(stats.year) > -1 ? ' class="on"' : '') + '>' +
          '<th scope="row">' + esc(seasonShort(stats.id, stats.year)) + '</th>' + figures(stats) +
          '<td>' + ordinal(rainMetric ? stats.rainRank : stats.heatRank) + '</td></tr>';
      }).join('') +
      '</tbody></table></details>';

    body.innerHTML = '<div class="arc-plot" id="airportSeasonChart"></div>' +
      legend([[rainMetric ? 'sw-rain' : 'sw-heat', esc(seasonName(focus.id, focus.year))]]
        .concat(picked.length > 1 ? [['sw-other', 'The other years']] : [])
        .concat([['sw-usual', 'Normal'], [rainMetric ? 'sw-mid-rain' : 'sw-mid-heat', 'Half of years']])) +
      (rainMetric ? '' : '<p class="arc-note">Each day is the average of its high and low, smoothed over the week around it.</p>') +
      table + ranked;
    wx.redraws.season = function () { drawWeatherSeason(byId('airportSeasonChart')); };
    wx.redraws.season();
    /* The year's marks take the colour its line is drawn in: blue for rain,
       brown for heat. */
    body.setAttribute('data-metric', wx.metric);
    var reelHost = byId('airportSeasonYears');
    if (reelHost) reelHost.setAttribute('data-metric', wx.metric);
    Array.prototype.forEach.call(document.querySelectorAll('#airportSeasonYears .reel-btn'), function (button) {
      button.classList.toggle('is-focus', Number(button.getAttribute('data-year')) === focus.year);
    });
  }

  function renderWeatherSeasonYears() {
    var host = byId('airportSeasonYears');
    var info = wx.seasons[wx.season];
    if (!host || !info) return;
    host.innerHTML = info.list.map(function (stats) {
      return '<button type="button" class="reel-btn" data-year="' + stats.year + '" aria-pressed="' +
        (wx.picked.indexOf(stats.year) > -1) + '">' + esc(seasonShort(stats.id, stats.year)) +
        '<small>' + (wx.metric === 'rain' ? stats.rain.toFixed(1) + ' in' : degreesFine(stats.mean)) + '</small></button>';
    }).join('');
  }

  function chooseWeatherSeason(id) {
    var info = wx.seasons[id];
    if (!info || !info.list.length) return;
    wx.season = id;
    Array.prototype.forEach.call(document.querySelectorAll('#airportSeasonPick .seg-btn'), function (button) {
      button.setAttribute('aria-pressed', button.getAttribute('data-season') === id ? 'true' : 'false');
    });
    var latest = info.list.filter(function (stats) { return stats.rows.length >= 30; })[0] || info.list[0];
    wx.picked = info.list
      .filter(function (stats) { return stats.year <= latest.year && stats.year > latest.year - 7; })
      .map(function (stats) { return stats.year; });
    wx.focus = latest.year;
    renderWeatherSeasonYears();
    renderWeatherSeason();
    var reel = byId('airportSeasonYears');
    if (reel) reel.scrollLeft = 0;
  }

  function chooseWeatherMetric(metric) {
    wx.metric = metric;
    Array.prototype.forEach.call(document.querySelectorAll('#airportSeasonMetric .seg-btn'), function (button) {
      button.setAttribute('aria-pressed', button.getAttribute('data-metric') === metric ? 'true' : 'false');
    });
    renderWeatherSeasonYears();
    renderWeatherSeason();
  }

  function toggleWeatherSeasonYear(year) {
    var at = wx.picked.indexOf(year);
    if (at > -1) {
      if (wx.picked.length === 1) return;
      wx.picked.splice(at, 1);
      if (wx.focus === year) wx.focus = wx.picked[0];
    } else {
      wx.picked.push(year);
      wx.focus = year;
    }
    wx.picked.sort(function (a, b) { return b - a; });
    if (wx.picked.indexOf(wx.focus) === -1) wx.focus = wx.picked[0];
    Array.prototype.forEach.call(document.querySelectorAll('#airportSeasonYears .reel-btn'), function (button) {
      button.setAttribute('aria-pressed', wx.picked.indexOf(Number(button.getAttribute('data-year'))) > -1 ? 'true' : 'false');
    });
    renderWeatherSeason();
  }

  function defaultWeatherSeason() {
    var best = null;
    SEASONS.forEach(function (season) {
      var info = wx.seasons[season.id];
      var latest = info && info.list.filter(function (stats) { return stats.rows.length >= 30; })[0];
      if (latest && (!best || latest.window.start > best.window.start)) best = latest;
    });
    return best ? best.id : 'spring';
  }

  /* Every month of every year since 1930, newest on top. */
  function drawWeatherGrid(host) {
    var grid = wx.grid[wx.gridMetric];
    if (!host || !grid) return;
    var box = boxOf(host, false);
    var years = grid.years;
    var rowH = box.narrow ? 6 : 8;
    var left = 38;
    var right = box.width - 2;
    var top = 2;
    var cellW = (right - left) / 12;
    var height = top + years.length * rowH + 24;
    grid.geometry = { width: box.width, height: height, left: left, top: top, rowH: rowH, cellW: cellW };
    var rects = '';
    years.forEach(function (year, row) {
      grid.cells[year].forEach(function (entry, month) {
        if (!entry) return;
        rects += '<rect x="' + (left + month * cellW).toFixed(2) + '" y="' + (top + row * rowH) + '" width="' + (cellW - 1).toFixed(2) +
          '" height="' + (rowH - 1) + '" fill="' + entry.step.fill + '"/>';
      });
    });
    var labels = '';
    var placed = [];
    years.forEach(function (year, row) {
      if (row !== 0 && year % 10 !== 0) return;
      var at = top + row * rowH + rowH / 2 + 3;
      if (placed.some(function (other) { return Math.abs(other - at) < 13; })) return;
      placed.push(at);
      labels += '<text class="arc-axis" x="' + (left - 6) + '" y="' + at.toFixed(1) + '" text-anchor="end">' + year + '</text>';
    });
    var spans = MONTHS.map(function (name, month) {
      return { month: month, x0: left + month * cellW, x1: left + (month + 1) * cellW - 1 };
    });
    var row = years.indexOf(wx.year);
    var outline = row > -1
      ? '<rect x="' + (left - 1.5) + '" y="' + (top + row * rowH - 1.5) + '" width="' + (right - left + 2).toFixed(1) +
        '" height="' + (rowH + 2) + '" fill="none" stroke="#1C1208" stroke-width="1.25" rx="1"/>'
      : '';
    host.innerHTML = '<svg viewBox="0 0 ' + box.width + ' ' + height + '" role="img" aria-label="Every month since ' +
        years[years.length - 1] + ' at the Birmingham airport, ' + (wx.gridMetric === 'heat' ? 'warmer or cooler' : 'wetter or drier') +
        ' than the same month in the other years">' +
      rects + outline +
      '<rect id="airportGridCursor" x="0" y="0" width="' + (cellW + 2).toFixed(2) + '" height="' + (rowH + 2) +
        '" fill="none" stroke="#1C1208" stroke-width="2" visibility="hidden"/>' +
      labels + monthAxis(spans, null, height - 7, true) + '</svg>';
    if (wx.gridShown) showWeatherGridCell(wx.gridShown.year, wx.gridShown.month);
  }

  function showWeatherGridCell(year, month) {
    var grid = wx.grid[wx.gridMetric];
    var entry = grid && grid.cells[year] ? grid.cells[year][month] : null;
    var text = byId('airportGridText');
    var go = byId('airportGridGo');
    var cursor = byId('airportGridCursor');
    if (!text) return;
    wx.gridShown = { year: year, month: month };
    if (!entry) {
      text.textContent = MONTHS_FULL[month] + ' ' + year + ' has no ' + (wx.gridMetric === 'rain' ? 'total' : 'average') + ' yet.';
      if (cursor) cursor.setAttribute('visibility', 'hidden');
      return;
    }
    text.textContent = wx.gridMetric === 'heat'
      ? MONTHS_FULL[month] + ' ' + year + ' ran ' + entry.step.word + ', averaging ' + entry.value.toFixed(1) + '°.'
      : MONTHS_FULL[month] + ' ' + year + ' brought ' + entry.value.toFixed(2) + ' inches of rain, ' + entry.step.word + '.';
    if (go) {
      go.setAttribute('data-month', year + '-' + pad2(month + 1));
      go.textContent = MONTHS[month] + ' ' + year + ' ↑';
      go.hidden = false;
    }
    if (cursor && grid.geometry) {
      var g = grid.geometry;
      cursor.setAttribute('x', (g.left + month * g.cellW - 1.5).toFixed(2));
      cursor.setAttribute('y', String(g.top + grid.years.indexOf(year) * g.rowH - 1.5));
      cursor.setAttribute('visibility', 'visible');
    }
  }

  function chooseGridMetric(metric) {
    wx.gridMetric = metric;
    Array.prototype.forEach.call(document.querySelectorAll('#airportGridMetric .seg-btn'), function (button) {
      button.setAttribute('aria-pressed', button.getAttribute('data-metric') === metric ? 'true' : 'false');
    });
    setText('airportGridTitle', metric === 'heat' ? 'Warmer or cooler' : 'Wetter or drier');
    var steps = metric === 'heat' ? HEAT_STEPS : RAIN_STEPS;
    var key = byId('airportGridKey');
    if (key) {
      key.innerHTML = '<span>' + (metric === 'heat' ? 'Cooler' : 'Drier') + '</span>' + steps.map(function (step) {
        return '<i class="sw" style="background:' + step.fill + '" aria-hidden="true"></i>';
      }).join('') + '<span>' + (metric === 'heat' ? 'Warmer' : 'Wetter') + '</span>';
    }
    /* A month still under way has an average but no total, so a switch to
       rain moves the readout back to the newest month that has one. */
    var grid = wx.grid[metric];
    var shown = wx.gridShown;
    if (grid && shown && !(grid.cells[shown.year] && grid.cells[shown.year][shown.month])) {
      wx.gridShown = null;
      for (var y = 0; y < grid.years.length && !wx.gridShown; y++) {
        var row = grid.cells[grid.years[y]];
        for (var m = 11; m >= 0; m--) {
          if (row[m]) { wx.gridShown = { year: grid.years[y], month: m }; break; }
        }
      }
    }
    if (wx.redraws.grid) wx.redraws.grid();
  }

  function renderWeatherGrid() {
    var body = byId('airportGrid');
    if (!body || !wx.grid.heat) return;
    body.innerHTML = '<div class="grid-read"><p id="airportGridText" aria-live="polite">&mdash;</p>' +
        '<button type="button" class="grid-go" id="airportGridGo" hidden></button></div>' +
      '<div class="arc-plot" id="airportGridPlot"></div>' +
      '<div class="arc-legend grid-key" id="airportGridKey"></div>';
    wx.redraws.grid = function () { drawWeatherGrid(byId('airportGridPlot')); };
    chooseGridMetric(wx.gridMetric);
    var latest = wx.grid.heat.cells[wx.lastYear] || [];
    for (var month = latest.length - 1; month >= 0; month--) {
      if (latest[month]) { showWeatherGridCell(wx.lastYear, month); break; }
    }
    var plot = byId('airportGridPlot');
    function locate(event) {
      var grid = wx.grid[wx.gridMetric];
      var svg = plot.querySelector('svg');
      var g = grid && grid.geometry;
      if (!svg || !g) return null;
      var rect = svg.getBoundingClientRect();
      var px = (event.clientX - rect.left) * (g.width / rect.width);
      var py = (event.clientY - rect.top) * (g.height / rect.height);
      var row = Math.floor((py - g.top) / g.rowH);
      var col = Math.floor((px - g.left) / g.cellW);
      if (row < 0 || row >= grid.years.length || col < 0 || col > 11) return null;
      return { year: grid.years[row], month: col };
    }
    function follow(event) {
      var spot = locate(event);
      if (spot) showWeatherGridCell(spot.year, spot.month);
    }
    plot.addEventListener('click', follow);
    plot.addEventListener('pointermove', function (event) {
      if (event.pointerType === 'mouse') follow(event);
    });
    byId('airportGridGo').addEventListener('click', function () {
      var key = this.getAttribute('data-month') || '';
      var year = Number(key.slice(0, 4));
      if (!wx.years[year] || !wx.pickYear) return;
      wx.wantMonth = key;
      wx.pickYear(year);
      var reel = byId('airportYearReel');
      var chip = reel && reel.querySelector('[data-year="' + year + '"]');
      if (chip) reel.scrollLeft = chip.offsetLeft - (reel.clientWidth - chip.offsetWidth) / 2;
      var card = byId('airport-year');
      var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (card) card.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
    });
  }

  function renderAirportRecords() {
    var host = byId('airportRecords');
    if (!host) return;
    var hot = hottestOf(wx.days);
    var cold = coldestOf(wx.days);
    var wet = wettestOf(wx.days);
    var snowy = wx.days.reduce(function (best, day) {
      return reading(day.snow) && (!best || reading(day.snow) >= reading(best.snow)) ? day : best;
    }, null);
    var byRain = wx.fullYears.slice().sort(function (a, b) { return b.rain - a.rain; });
    var summers = (wx.seasons.summer ? wx.seasons.summer.full : []).filter(function (stats) { return stats.mean != null; })
      .slice().sort(function (a, b) { return b.mean - a.mean; });
    var winters = (wx.seasons.winter ? wx.seasons.winter.full : []).filter(function (stats) { return stats.mean != null; })
      .slice().sort(function (a, b) { return a.mean - b.mean; });
    host.innerHTML = '<div class="d-rows list">' +
      (hot ? cell('Hottest day &middot; ' + esc(longDate(hot.date)), degrees(reading(hot.high)), '⬆️') : '') +
      (cold ? cell('Coldest day &middot; ' + esc(longDate(cold.date)), degrees(reading(cold.low)), '⬇️') : '') +
      (wet ? cell('Wettest day &middot; ' + esc(longDate(wet.date)), inches(wet.rain), '💧') : '') +
      (snowy ? cell('Most snow in a day &middot; ' + esc(longDate(snowy.date)), reading(snowy.snow).toFixed(1) + ' in', '❄️') : '') +
      (byRain.length ? cell('Wettest year &middot; ' + byRain[0].year, inches(byRain[0].rain), '🌧️') : '') +
      (byRain.length ? cell('Driest year &middot; ' + byRain[byRain.length - 1].year, inches(byRain[byRain.length - 1].rain), '☀️') : '') +
      (summers.length ? cell('Hottest summer &middot; ' + summers[0].year, degreesFine(summers[0].mean) + ' average', '🌡️') : '') +
      (winters.length ? cell('Coldest winter &middot; ' + esc(seasonShort('winter', winters[0].year)), degreesFine(winters[0].mean) + ' average', '🌡️') : '') +
      cell('On file since', esc(longDate(wx.first)), '🕰️') +
      '</div>';
  }

  function loadWeather() {
    var reel = byId('weatherReel');
    if (!reel) return;
    wx.nowYear = new Date().getFullYear();

    var station = loadArchive(WEATHER_DIR).then(function (data) {
      var days = sortedDays(data);
      if (!days.length) return;
      wx.station = days;
      var months = groupByMonth(days, function (day) { return day.date; });
      var keys = Object.keys(months).sort().reverse();
      setText('weatherStamp', plural(days.length, 'day', 'days') + ' · back to ' + monthLabel(days[0].date));
      buildReel(reel, keys, function (key) {
        return sumRain(months[key]).toFixed(2) + ' in';
      }, function (key) {
        renderWeatherMonth(months[key], key);
      });
      renderWeatherRecords(days);
    }).catch(function (error) {
      if (window.console) console.error('Weather room, station:', error);
    });

    var airport = Promise.all([loadArchive(AIRPORT_DIR), loadJson(AIRPORT_NORMALS)]).then(function (parts) {
      var days = sortedDays(parts[0]);
      if (!days.length) return;
      wx.days = days;
      wx.first = days[0].date;
      wx.last = days[days.length - 1].date;
      wx.lastYear = Number(wx.last.slice(0, 4));
      days.forEach(function (day) {
        wx.byDate[day.date] = day;
        var year = day.date.slice(0, 4);
        (wx.byYear[year] = wx.byYear[year] || []).push(day);
      });
      buildWeatherNormals(parts[1]);
      buildExtremes();
      buildWeatherYears();
      buildWeatherSeasons();
      buildWeatherGrid();

      setText('airportStamp', days.length.toLocaleString('en-US') + ' days · back to ' + longDate(wx.first));
      renderOnThisDate();

      var yearReel = byId('airportYearReel');
      var yearRows = Object.keys(wx.years).map(Number).sort(function (a, b) { return b - a; }).map(function (year) {
        return { year: year, total: wx.years[year].rain.toFixed(1) + ' in' };
      });
      renderWeatherGrid();
      wx.pickYear = buildYearReel(yearReel, yearRows, renderAirportYear);
      if (wx.pickYear) wx.pickYear(wx.lastYear);

      var seasonPick = byId('airportSeasonPick');
      if (seasonPick) {
        seasonPick.innerHTML = SEASONS.map(function (season) {
          return '<button type="button" class="seg-btn" data-season="' + season.id + '" aria-pressed="false">' + season.name + '</button>';
        }).join('');
        seasonPick.addEventListener('click', function (event) {
          var button = event.target.closest ? event.target.closest('.seg-btn') : null;
          if (button) chooseWeatherSeason(button.getAttribute('data-season'));
        });
      }
      [['airportSeasonMetric', chooseWeatherMetric], ['airportGridMetric', chooseGridMetric]].forEach(function (pair) {
        var host = byId(pair[0]);
        if (!host) return;
        host.addEventListener('click', function (event) {
          var button = event.target.closest ? event.target.closest('.seg-btn') : null;
          if (button) pair[1](button.getAttribute('data-metric'));
        });
      });
      function yearTap(event) {
        var button = event.target.closest ? event.target.closest('[data-year]') : null;
        if (!button) return;
        var year = Number(button.getAttribute('data-year'));
        if (button.classList.contains('yr-btn')) {
          wx.focus = year;
          renderWeatherSeason();
        } else {
          toggleWeatherSeasonYear(year);
        }
      }
      var seasonYears = byId('airportSeasonYears');
      if (seasonYears) seasonYears.addEventListener('click', yearTap);
      var seasonBody = byId('airportSeason');
      if (seasonBody) seasonBody.addEventListener('click', yearTap);
      chooseWeatherMetric(wx.metric);
      chooseWeatherSeason(defaultWeatherSeason());
      renderAirportRecords();
    }).catch(function (error) {
      if (window.console) console.error('Weather room, airport:', error);
    });

    Promise.all([station, airport]).then(renderComparison);

    var drawnAt = byId('main') ? byId('main').clientWidth : 0;
    var timer = null;
    window.addEventListener('resize', function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        var width = byId('main') ? byId('main').clientWidth : 0;
        if (width === drawnAt) return;
        drawnAt = width;
        Object.keys(wx.redraws).forEach(function (name) { wx.redraws[name](); });
      }, 150);
    });
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
     WHAT THE WATER CARRIES

     fivemile-creek-quality.json is the Republic gauge's other two daily
     records, specific conductance and water temperature, gathered into years
     by scripts/fetch/usgs-creek-quality.mjs. The room already holds how much
     water went past. This is what was in it.

     Only whole years are drawn. A year to date would sit above every finished
     year for no reason but the calendar, since the months it is missing are
     the cold ones.

     Conductance carries two lines, because the honest version needs both. One
     is every day of the year. The other is the same year's low flow days only,
     where there is least water to spread the mineral through, and it answers
     the obvious objection that a run of wet years would look like a creek
     getting cleaner. See DECISIONS.md 85.
     ------------------------------------------------------------------------- */
  var QUALITY_FILE = 'fivemile-creek-quality.json';

  function qualityYears(data) {
    return (data && Array.isArray(data.years) ? data.years : [])
      .filter(function (row) { return row && row.conductance && row.conductance.whole_year; });
  }

  /* One chart: the years along the bottom, the reading up the side, a line per
     series. Same box, frame and axis the rest of the room draws with. */
  function drawYearSeries(host, rows, series, options) {
    if (!host || !rows.length) return;
    var box = boxOf(host, false);
    var frame = frameOf(box);
    var values = [];
    series.forEach(function (line) {
      rows.forEach(function (row) { var v = line.of(row); if (v != null) values.push(v); });
    });
    if (!values.length) return;

    var lo = Math.min.apply(null, values);
    var hi = Math.max.apply(null, values);
    var pad = (hi - lo) * 0.15 || 1;
    lo = Math.floor((lo - pad) / options.step) * options.step;
    hi = Math.ceil((hi + pad) / options.step) * options.step;

    var first = rows[0].year;
    var last = rows[rows.length - 1].year;
    var xOf = function (year) {
      return frame.left + ((year - first) / Math.max(1, last - first)) * (frame.right - frame.left);
    };
    var yOf = function (value) {
      return frame.bottom - ((value - lo) / (hi - lo)) * (frame.bottom - frame.top);
    };

    /* Microsiemens and degrees are whole numbers. Flashiness runs between 0.3
       and 0.9, where rounding the axis to whole numbers labels the whole chart
       0 and 1. */
    var out = svgOpen(box, options.label);
    out += valueAxis(lo, hi, options.step, frame, yOf, options.format || function (v) { return String(Math.round(v)); });
    out += baseline(frame);

    /* Every tenth year, and the last one, which is the year a reader is
       looking for. A decade mark sitting on top of it is dropped rather than
       drawn through it, and the last label hugs the right edge so it cannot
       run off the end of the chart. */
    var marks = [];
    for (var year = Math.ceil(first / 10) * 10; year <= last; year += 10) marks.push(year);
    var room = 4 * AXIS_CHAR + 10;
    marks = marks.filter(function (mark) { return mark !== last && xOf(last) - xOf(mark) > room; });
    marks.push(last);
    marks.forEach(function (mark) {
      var at = xOf(mark);
      var anchor = mark === last && at + 2 * AXIS_CHAR > frame.right ? 'end' : 'middle';
      out += '<text class="arc-axis" x="' + (anchor === 'end' ? frame.right : at).toFixed(1) + '" y="' +
        (frame.bottom + 16) + '" text-anchor="' + anchor + '">' + mark + '</text>';
    });

    series.forEach(function (line) {
      var d = '';
      var pen = false;
      rows.forEach(function (row) {
        var v = line.of(row);
        if (v == null) { pen = false; return; }
        d += (pen ? 'L' : 'M') + xOf(row.year).toFixed(1) + ' ' + yOf(v).toFixed(1);
        pen = true;
      });
      if (d) {
        out += '<path d="' + d + '" fill="none" stroke="' + line.color + '" stroke-width="' +
          (line.weight || 2.5) + '" stroke-linejoin="round" stroke-linecap="round"' +
          (line.dash ? ' stroke-dasharray="6 4"' : '') + '/>';
      }
      var lastRow = rows.filter(function (row) { return line.of(row) != null; }).pop();
      if (lastRow) {
        out += '<circle cx="' + xOf(lastRow.year).toFixed(1) + '" cy="' + yOf(line.of(lastRow)).toFixed(1) +
          '" r="3.5" fill="' + line.color + '"/>';
      }
    });
    out += '</svg>';
    host.innerHTML = out;
  }

  /* The ends of the record, five years at each end so one odd year cannot
     carry the sentence. */
  function qualityEnds(rows, of) {
    var head = rows.slice(0, 5).map(of).filter(function (v) { return v != null; });
    var tail = rows.slice(-5).map(of).filter(function (v) { return v != null; });
    if (head.length < 2 || tail.length < 2) return null;
    return { was: median(head.slice().sort(numeric)), now: median(tail.slice().sort(numeric)) };
  }

  function renderQuality(data) {
    var block = byId('quality');
    if (!block) return;
    var rows = qualityYears(data);
    if (rows.length < 10) { block.hidden = true; return; }
    block.hidden = false;

    var first = rows[0].year;
    var last = rows[rows.length - 1].year;
    setText('qualityStamp', plural(rows.length, 'whole year', 'whole years') + ' \u00b7 ' + first + ' to ' + last);

    drawYearSeries(byId('qualitySaltPlot'), rows, [
      { of: function (row) { return row.conductance.at_low_flow; }, color: '#8B6914', dash: true },
      { of: function (row) { return row.conductance.median; }, color: 'var(--hold-creek)' }
    ], { step: 100, label: 'Specific conductance at the Republic gauge by year, ' + first + ' to ' + last });
    var key = byId('qualitySaltKey');
    if (key) key.innerHTML = legend([['sw-line', 'Every day'], ['sw-usual', 'Its low flow days']]);

    var all = qualityEnds(rows, function (row) { return row.conductance.median; });
    var low = qualityEnds(rows, function (row) { return row.conductance.at_low_flow; });
    var flow = qualityEnds(rows, function (row) { return row.flow ? row.flow.median : null; });
    if (all && low) {
      var say = 'The first five whole years read about ' + Math.round(all.was) +
        ' microsiemens through the year and the last five about ' + Math.round(all.now) +
        '. Taking only each year\u2019s low flow days, when there is least water to spread it through, the same two figures are ' +
        Math.round(low.was) + ' and ' + Math.round(low.now) + '.';
      if (flow) {
        say += ' Flow over the same years went from a median of ' + flow.was.toFixed(0) +
          ' cubic feet a second to ' + flow.now.toFixed(0) + ', so the fall is not the creek simply running higher.';
      }
      setText('qualitySaltSay', say);
    }

    drawYearSeries(byId('qualityWarmPlot'), rows, [
      { of: function (row) { return row.temperature ? row.temperature.median : null; }, color: '#B23A2E' }
    ], { step: 2, label: 'Water temperature at the Republic gauge by year, ' + first + ' to ' + last });

    var warm = qualityEnds(rows, function (row) { return row.temperature ? row.temperature.median : null; });
    if (warm) {
      var move = warm.now - warm.was;
      setText('qualityWarmSay', 'The first five whole years run about ' + warm.was.toFixed(1) +
        ' degrees through the year and the last five about ' + warm.now.toFixed(1) + ', ' +
        (move >= 0 ? 'up ' : 'down ') + Math.abs(move).toFixed(1) + ' degrees across ' + (last - first) + ' years.');
    }
  }

  function loadQuality() {
    if (!byId('quality')) return;
    loadJson(QUALITY_FILE).then(renderQuality).catch(function () {
      var block = byId('quality');
      if (block) block.hidden = true;
    });
  }

  /* -------------------------------------------------------------------------
     HOW HARD IT RISES AND FALLS

     fivemile-creek-flashiness.json is the same daily flow the rest of this
     room is drawn from, asked how steadily it came rather than how much of it
     there was. scripts/build-creek-flashiness.mjs works it out and fetches
     nothing.

     Only whole years are drawn, same rule as the block below and for the same
     reason: the wet season here is the winter and the spring, so a year to
     date is not a year.

     The sentence under the chart has to carry the wet year trap, because
     flashiness follows how wet a year was and a run of wet years would
     otherwise read as a creek getting flashier. The file counts it: how many
     of the wettest years are in the flashier half of the record, and how many
     of the driest. See DECISIONS.md 86.
     ------------------------------------------------------------------------- */
  var FLASH_FILE = 'fivemile-creek-flashiness.json';

  function flashYears(data) {
    return (data && Array.isArray(data.years) ? data.years : [])
      .filter(function (row) { return row && row.whole_year && row.flashiness != null; });
  }

  /* Decade by decade, which is the shape of the question people ask about a
     creek. The note under it says whether the decades run in order, because a
     column of four numbers that goes up, down and up again is a reader's whole
     answer and it should not be left to them to notice. */
  function flashDecades(rows) {
    var host = byId('flashDecades');
    if (!host) return;
    if (!rows || rows.length < 2) { host.innerHTML = '<div class="empty">&mdash;</div>'; return; }

    var table = '<table class="arc-table"><thead><tr>' +
      '<th scope="col">Decade</th><th scope="col">Whole years</th><th scope="col">Flashiness</th>' +
      '</tr></thead><tbody>' +
      rows.map(function (row) {
        return '<tr><th scope="row">' + esc(String(row.decade)) + 's</th>' +
          '<td>' + esc(String(row.years)) + '</td>' +
          '<td>' + row.median.toFixed(2) + '</td></tr>';
      }).join('') +
      '</tbody></table>';

    var rising = rows.every(function (row, i) { return i === 0 || row.median > rows[i - 1].median; });
    var falling = rows.every(function (row, i) { return i === 0 || row.median < rows[i - 1].median; });
    var note = rising ? 'Every decade on file runs flashier than the one before it.'
      : falling ? 'Every decade on file runs steadier than the one before it.'
      : 'These do not run in order. On this record the creek is not getting flashier, and it is not getting steadier either.';

    host.innerHTML = table + '<p class="arc-say">' + note + '</p>';
  }

  function renderFlashiness(data) {
    var block = byId('flashiness');
    if (!block) return;
    var rows = flashYears(data);
    if (rows.length < 10) { block.hidden = true; return; }
    block.hidden = false;

    var first = rows[0].year;
    var last = rows[rows.length - 1].year;
    setText('flashStamp', plural(rows.length, 'whole year', 'whole years') + ' \u00b7 ' + first + ' to ' + last);

    drawYearSeries(byId('flashPlot'), rows, [
      { of: function (row) { return row.flashiness; }, color: 'var(--hold-creek)' }
    ], {
      step: 0.1,
      format: function (value) { return value.toFixed(1); },
      label: 'How hard Five Mile Creek rose and fell at the Republic gauge by year, ' + first + ' to ' + last
    });

    var counts = data.counts || {};
    var say = [];
    if (counts.median != null) {
      say.push('The middle year on this record scores ' + counts.median.toFixed(2) + '.');
    }
    if (counts.steadiest && counts.flashiest) {
      say.push('The steadiest was ' + counts.steadiest.year + ' at ' + counts.steadiest.flashiness.toFixed(2) +
        '. The flashiest was ' + counts.flashiest.year + ' at ' + counts.flashiest.flashiness.toFixed(2) + '.');
    }
    /* One day out of the record, because an index is an abstraction and a
       reader who has seen this creek do it will recognise the day. */
    var rise = data.biggest_rise;
    if (rise && rise.times) {
      var day = 'The sharpest rise on the record is ' + esc(prosaicDate(rise.date)) + ', when the creek went from ' +
        Math.round(rise.from).toLocaleString('en-US') + ' cubic feet a second to ' +
        Math.round(rise.to).toLocaleString('en-US') + ' in a day';
      if (rise.crest != null && rise.depth_from != null) {
        day += ', and crested at ' + rise.crest.toFixed(1) + ' feet after sitting at ' +
          rise.depth_from.toFixed(1) + ' feet the day before';
      }
      say.push(day + '.');
    }
    var wet = data.wet_test;
    if (wet) {
      /* Short sentences on purpose. This is the caveat that keeps the chart
         honest and it is no use to anybody who gives up halfway through it. */
      say.push('Wet years score higher. Of the ' + wet.take + ' wettest years on file, ' +
        wet.wettest_in_flashier_half + ' are in the flashier half. Of the ' + wet.take + ' driest, ' +
        wet.driest_in_flashier_half + (wet.driest_in_flashier_half === 1 ? ' is.' : ' are.'));
    }
    setText('flashSay', say.join(' '));

    flashDecades(Array.isArray(data.decades) ? data.decades : []);
  }

  function loadFlashiness() {
    if (!byId('flashiness')) return;
    loadJson(FLASH_FILE).then(renderFlashiness).catch(function () {
      var block = byId('flashiness');
      if (block) block.hidden = true;
    });
  }

  /* -------------------------------------------------------------------------
     WHO ELSE HAS BEEN SAMPLING

     fivemile-creek-samples.json is the Water Quality Portal summarised by
     scripts/fetch/wqp-samples.mjs: every water sample the USGS, the EPA and
     the states have taken inside the two hydrologic units that are Five Mile
     Creek, one row per station and one row per thing measured.

     Three of those stations get a table of their own. On one day in June 2006
     the USGS sampled two points on Black Creek and one on Five Mile Creek just
     above where Black Creek comes in, and gave the top one the name "Black
     Creek at bridge above acid mine drainage". The table prints what the
     meters read. It does not say what caused any of it, which is decision 63
     doing the same job here that it does on the discharge page.

     Every count here is of samples somebody took. The portal also returns a
     datasonde logging itself every few minutes at eight stations, a fifth of
     the rows, and the fetcher keeps those apart. Anything that reads them
     together will make this record look twenty times denser than it is.

     Dissolved oxygen is a paragraph rather than a chart for that exact
     reason. See DECISIONS.md 86.
     ------------------------------------------------------------------------- */
  var SAMPLES_FILE = 'fivemile-creek-samples.json';

  /* 1952-06-24 reads as a date to a database. A reader wants the year, and
     wants both years when a station has been worked for thirty of them. */
  function sampleSpan(row) {
    var from = String(row.first || '').slice(0, 4);
    var to = String(row.last || '').slice(0, 4);
    if (!from) return '\u2014';
    return from === to ? from : from + ' to ' + to;
  }

  /* The name of the place, which for ADEM is in the description and not in the
     name: its stations are called FM-2 and FMCJ-1B. */
  function sampleWhere(row) {
    return row.where || row.name || row.id;
  }

  function blackCreek(block) {
    var host = byId('blackCreek');
    if (!host) return;
    if (!block || !block.stations || !block.stations.length) {
      host.innerHTML = '<div class="empty">&mdash;</div>';
      return;
    }
    var stations = block.stations;
    setText('blackCreekDate', longDate(block.date) || '\u2014');

    /* The rows, in the order the fetcher put them in, which is the order they
       are worth reading. Collecting them off the stations instead would order
       the table by whichever station happens to be first, and that one is
       missing its metals. */
    var names = Array.isArray(block.readings) ? block.readings.slice() : [];
    if (!names.length) {
      stations.forEach(function (station) {
        station.readings.forEach(function (reading) {
          if (names.indexOf(reading.name) === -1) names.push(reading.name);
        });
      });
    }

    var head = '<table class="arc-table arc-named"><thead><tr><th scope="col">Reading</th>' +
      stations.map(function (station) {
        return '<th scope="col">' + esc(shortStation(station)) + '</th>';
      }).join('') + '</tr></thead><tbody>';

    var cellOf = function (station, name) {
      var found = null;
      station.readings.forEach(function (reading) { if (reading.name === name) found = reading; });
      return found;
    };

    var rows = names.map(function (name) {
      var cells = stations.map(function (station) { return cellOf(station, name); });
      var units = cells.filter(Boolean).map(function (cell) { return unitWord(cell.unit); });
      /* When every reading in a row is in the same unit, the unit belongs at
         the head of the row and the cells are just numbers. Printing it three
         times is noise a reader has to look past. When the units differ, and
         turbidity here is FNU on one meter and NTRU on another, each cell
         keeps its own or the row would claim they are the same measurement. */
      var shared = units.length && units.every(function (unit) { return unit === units[0]; }) ? units[0] : null;
      return '<tr><th scope="row">' + esc(readingName(name)) +
        (shared ? ' <span class="u">' + esc(shared) + '</span>' : '') + '</th>' +
        cells.map(function (cell) {
          if (!cell) return '<td class="zero">&mdash;</td>';
          var unit = unitWord(cell.unit);
          return '<td>' + esc(String(cell.value)) +
            (!shared && unit ? ' <span class="u">' + esc(unit) + '</span>' : '') + '</td>';
        }).join('') + '</tr>';
    }).join('');

    /* Which cells are empty and why. One of the three was sampled again three
       days later and its metals were taken then, so the gap is a date and not
       a thing nobody looked for. */
    var late = stations.filter(function (station) { return (station.also_sampled || []).length; });
    var note = 'Black Creek runs down past the first two of these and into Five Mile Creek just below the third, ' +
      'so the last column is that creek before any of Black Creek has reached it.';
    /* The name of the top station is the evidence, so it is printed rather
       than left for whoever follows the link. It is the USGS's, and it is the
       USGS that is saying it. */
    if (stations[0] && stations[0].name) {
      note += ' The USGS named the first one itself: ' + esc(sentenceName(stations[0].name)) + '.';
    }
    if (late.length === 1) {
      /* Said as a gap rather than a date, because the date is already at the
         top of the card and a second one in the sentence reads like a
         timetable. */
      var apart = Math.round(Math.abs(Date.parse(late[0].also_sampled[0]) - Date.parse(block.date)) / 864e5);
      note += ' The empty cells are readings it took there ' +
        (apart === 1 ? 'a day later' : apart + ' days later') + ' instead.';
    }

    /* THE TABLE, READ OUT. Nine readings across three columns is arithmetic
       most people will not do standing on a phone, so the page does it: how
       many times over the Black Creek column runs against the Five Mile Creek
       column above it. Ratios only, no adjective and no cause. The numbers do
       not need the help and decision 63 does not allow it. */
    var compare = Array.isArray(block.compare) ? block.compare : [];
    var bigger = compare.filter(function (row) { return row.times >= 2; }).slice(0, 3);
    var reads = '';
    if (bigger.length) {
      reads = 'Set against the Five Mile Creek reading above them, the Black Creek water carried ' +
        bigger.map(function (row, i) {
          return (i && i === bigger.length - 1 ? 'and ' : '') + timesWord(row.times) + ' times the ' + esc(readingWord(row.name));
        }).join(bigger.length > 2 ? ', ' : ' ') + '.';
    }
    var less = compare.filter(function (row) { return /oxygen/i.test(row.name) && row.times < 1; })[0];
    if (less) {
      reads += (reads ? ' ' : '') + 'It held less oxygen: ' + less.black + ' milligrams a litre against ' +
        less.fivemile + '.';
    }

    /* THE SIZE OF THE STREAM, straight after the ratios and never apart from
       them. Fourteen times the manganese in a trickle is not fourteen times the
       manganese in the creek, and a reader told the first without the second
       will reasonably think Black Creek is poisoning Five Mile Creek. The days
       differ and the page says which, and where nobody measured the flow the
       page says that too rather than guessing. */
    var blackFlow = stations.filter(function (station) { return station.creek !== 'Five Mile Creek' && station.flow; })[0];
    var mainFlow = stations.filter(function (station) { return station.creek === 'Five Mile Creek' && station.flow; })[0];
    if (blackFlow && mainFlow) {
      var cfs = function (value) { return value < 1 ? 'less than one cubic foot of water a second' : Math.round(value) + ' cubic feet a second'; };
      reads += (reads ? ' ' : '') + 'Black Creek is a much smaller stream. Above the drainage it was carrying ' +
        cfs(blackFlow.flow.cfs) + ' on ' + esc(prosaicDate(blackFlow.flow.date).replace(/, \d{4}$/, '')) +
        '. Five Mile Creek above both was carrying ' + cfs(mainFlow.flow.cfs) + ' on ' +
        esc(prosaicDate(mainFlow.flow.date).replace(/, \d{4}$/, '')) + '.';
      var unmeasured = stations.filter(function (station) { return station.creek !== 'Five Mile Creek' && !station.flow; });
      if (unmeasured.length) {
        reads += ' Nobody measured the flow at ' + esc(unmeasured.map(function (station) {
          return String(station.reads || '').split(', ').slice(1).join(', ').replace(/^at /, '');
        }).join(' or ')) + '.';
      }
    }

    /* USGS never marked these final, and that much is a fact. What the
       Preliminary label means beyond that is not: the portal's own definition
       of it is internal use only, not released to the public, which cannot be
       true of a reading on a public portal. So the page says the fact and
       stops. See DECISIONS.md 86. */
    var unfinal = stations.filter(function (station) { return !/^(final|accepted|validated)$/i.test(station.status || ''); });
    var caveat = unfinal.length === stations.length
      ? 'The USGS has never marked any of these readings as final.'
      : unfinal.length
        ? 'The USGS has never marked some of these readings as final.'
        : '';

    /* Prose sized, because an 11.5px caption is the smallest link on the page
       and these three are the only way to the record behind the table. */
    var links = 'All three are on the USGS site: ' + stations.map(function (station, i) {
      return (i && i === stations.length - 1 ? 'and ' : '') +
        '<a href="' + esc(station.usgs_url) + '" target="_blank" rel="noopener">' +
        esc(shortStation(station).replace(', ', ' ')) + '</a>';
    }).join(', ') + '.';

    host.innerHTML = '<div class="arc-scroll">' + head + rows + '</tbody></table></div>' +
      (reads ? '<p class="arc-say">' + reads + '</p>' : '') +
      '<p class="arc-say">' + note + (caveat ? ' ' + caveat : '') + '</p>' +
      '<p class="arc-say">' + links + '</p>';
  }

  /* The portal writes "Temperature, water" and "Dissolved oxygen (DO)", which
     are column headings in a database. This is the same reading said the way a
     person says it. Anything not on this list is printed as the portal has it,
     because inventing a friendlier name for a lab analyte is how a reader ends
     up unable to find it again. */
  var READING_WORDS = {
    'Temperature, water': 'Water temperature',
    'Dissolved oxygen (DO)': 'Dissolved oxygen',
    'Oxygen': 'Dissolved oxygen',
    /* The plain word first and the portal's word after it, so a reader knows
       what they are looking at and can still find it again at the portal.
       Same habit as the old words in the monthly edition. */
    'Specific conductance': 'Dissolved mineral (conductance)',
    'Conductivity': 'Dissolved mineral (conductivity)',
    'Turbidity': 'Muddiness (turbidity)',
    'Alkalinity, total': 'Alkalinity',
    'Total dissolved solids': 'Dissolved solids',
    'Total suspended solids': 'Suspended solids',
    'Biochemical oxygen demand, standard conditions': 'Biochemical oxygen demand',
    'Inorganic nitrogen (nitrate and nitrite)': 'Nitrate and nitrite',
    'Stream flow, instantaneous': 'Stream flow',
    'Hardness, Ca, Mg': 'Hardness',
    'Fecal Coliform': 'Fecal coliform',
    'Escherichia coli': 'E. coli'
  };
  function readingName(name) { return READING_WORDS[name] || name; }
  /* The same name inside a sentence rather than at the head of a row. */
  function readingWord(name) {
    return readingName(name).replace(/\s*\([^)]*\)/, '').toLowerCase();
  }

  /* The portal writes its units for a database. These are the same units
     written for a person, and anything not on the list is printed as the
     portal has it rather than guessed at. */
  var UNIT_WORDS = {
    'deg F': '\u00b0F',
    'deg C': '\u00b0C',
    'uS/cm @25C': '\u00b5S/cm',
    'umho/cm': '\u00b5S/cm',
    'ug/l': '\u00b5g/L',
    'ug/L': '\u00b5g/L',
    'mg/l': 'mg/L',
    'mg/l CaCO3': 'mg/L',
    'mg/l as N': 'mg/L',
    'mg/l as P': 'mg/L',
    'std units': '',
    'None': '',
    'ft3/s': 'cu ft/s',
    'ft3/sec': 'cu ft/s',
    'cfu/100ml': 'cfu/100mL'
  };
  function unitWord(unit) {
    var key = String(unit || '');
    /* The portal records water temperature in Celsius and the file keeps it
       that way. Nothing on this site is shown in Celsius, the readings in the
       table beside this one are converted, and a column headed °C next to one
       headed °F reads like a mistake. */
    if (/^deg\s*C$/i.test(key)) return '\u00b0F';
    return Object.prototype.hasOwnProperty.call(UNIT_WORDS, key) ? UNIT_WORDS[key] : key;
  }

  /* A ratio inside a sentence. Thirteen point nine times the manganese is a
     lab result read aloud; fourteen times is what a person says. Under ten the
     decimal is still carrying information, so it stays. */
  function timesWord(times) {
    return times >= 10 ? String(Math.round(times)) : String(times);
  }

  /* longDate abbreviates the month, which is right on a card bar and wrong in
     the middle of a sentence. */
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  function prosaicDate(value) {
    var parts = String(value || '').slice(0, 10).split('-');
    if (parts.length !== 3) return longDate(value);
    return MONTHS[Number(parts[1]) - 1] + ' ' + Number(parts[2]) + ', ' + parts[0];
  }

  /* A column heading has room for about thirty characters on a phone. The
     fetcher writes the short name, because which creek a column is reading is
     the whole point of that table and not something to trim off here. The full
     name is under the table and linked. */
  function shortStation(station) {
    return String(station.short || station.reads || station.name || '');
  }

  /* USGS writes its station names in capitals: BLACK CREEK AT BRIDGE ABOVE
     ACID MINE DRAINAGE. Set in a sentence that is shouting, and this site has
     no italics to set a name apart with, so the words stay the USGS's and the
     case becomes ours. Title case rather than sentence case, because a plain
     lowercasing turns Black Creek into black creek. */
  var NAME_SMALL = ['a', 'an', 'and', 'at', 'above', 'below', 'by', 'for', 'in', 'near', 'nr', 'of', 'on', 'the', 'to'];
  function sentenceName(name) {
    return String(name).toLowerCase().replace(/\s+/g, ' ').trim().split(' ')
      .map(function (word, i) {
        if (i && NAME_SMALL.indexOf(word) !== -1) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }

  function renderSamples(data) {
    var block = byId('samples');
    if (!block) return;
    var stations = (data && Array.isArray(data.stations) ? data.stations : [])
      .filter(function (row) { return row && row.results; });
    if (stations.length < 5) { block.hidden = true; return; }
    block.hidden = false;

    var counts = (data && data.counts) || {};
    setText('samplesStamp', plural(stations.length, 'station', 'stations') + ' \u00b7 ' +
      tally(counts.results || 0, 'sample', 'samples') + ' \u00b7 ' +
      String(counts.first || '').slice(0, 4) + ' to ' + String(counts.last || '').slice(0, 4));

    blackCreek(data.black_creek);

    /* Dissolved oxygen: a paragraph, not a chart. The zeros are counted out
       loud rather than quietly dropped, because a dozen of them come off one
       volunteer station in one summer and a reader is entitled to know that
       before they read anything into the low end. */
    var oxygen = data.oxygen;
    if (oxygen && oxygen.samples) {
      /* Thin, uneven, and said so. 728 samples over 32 years is about
         fifteen in a year, and two of those years have none, which is why
         there is no line drawn through it. Every figure is off the file, so
         the sentence stays true if the record ever fills in. */
      var say = 'Somebody has measured it ' + tally(oxygen.samples, 'time', 'times') + ' between ' +
        String(oxygen.first || '').slice(0, 4) + ' and ' + String(oxygen.last || '').slice(0, 4) +
        ', at ' + plural(oxygen.stations, 'place', 'places') + ' along the creek.';
      if (oxygen.median_per_year && oxygen.years_with_any) {
        say += ' That is thinner than it sounds: about ' +
          plural(oxygen.median_per_year, 'sample', 'samples') + ' in a year, spread over ' +
          oxygen.years_with_any + ' of those ' + oxygen.years_in_span + ' years';
        if (oxygen.thinnest_year != null) {
          say += ', and the leanest of them holds ' + oxygen.thinnest_year;
        }
        say += '.';
      }
      say += ' The middle reading is ' + oxygen.median.toFixed(1) + ' milligrams a litre.';
      if (oxygen.under_five) {
        say += ' There are ' + tally(oxygen.under_five, 'reading', 'readings') + ' under 5';
        /* The zeros are said out loud, and so is the fact that they are one
           station in one year, because a reader who is told the creek read
           zero and not told that is being misled by arithmetic. */
        if (oxygen.zeros) {
          say += ', and ' + oxygen.zeros + ' of those are zero';
          if (oxygen.zeros_at_one_station === oxygen.zeros && oxygen.zeros_at_one_station_years.length === 1) {
            say += ', all of them at one station in ' + oxygen.zeros_at_one_station_years[0];
          } else if (oxygen.zeros_at_one_station > 1 && oxygen.zeros_at_one_station_years.length === 1) {
            say += ', ' + oxygen.zeros_at_one_station + ' of them at one station in ' +
              oxygen.zeros_at_one_station_years[0];
          }
        }
        say += '.';
      }
      setText('oxygenCount', say);
    }

    var things = (data && Array.isArray(data.characteristics) ? data.characteristics : []).slice(0, 14);
    var thingsHost = byId('samplesThings');
    if (thingsHost) {
      thingsHost.innerHTML = things.length
        ? '<div class="arc-scroll"><table class="arc-table arc-named"><thead><tr>' +
          '<th scope="col">Reading</th><th scope="col">Samples</th><th scope="col">Stations</th><th scope="col">Years</th>' +
          '</tr></thead><tbody>' +
          things.map(function (row) {
            var unit = unitWord(row.unit);
            return '<tr><th scope="row">' + esc(readingName(row.name)) +
              (unit ? ' <span class="u">' + esc(unit) + '</span>' : '') + '</th>' +
              '<td>' + esc(row.results.toLocaleString('en-US')) + '</td>' +
              '<td>' + esc(String(row.stations)) + '</td>' +
              '<td>' + esc(sampleSpan(row)) + '</td></tr>';
          }).join('') +
          '</tbody></table></div>' +
          '<p class="arc-note">' + esc(String(counts.characteristics || things.length)) +
          ' different things have been measured in this water. These are the ones measured most.</p>'
        : '<div class="empty">&mdash;</div>';
    }

    var stationsHost = byId('samplesStations');
    if (stationsHost) {
      stationsHost.innerHTML = '<div class="arc-scroll"><table class="arc-table arc-named"><thead><tr>' +
        '<th scope="col">Where</th><th scope="col">Samples</th><th scope="col">Years</th>' +
        '</tr></thead><tbody>' +
        stations.map(function (row) {
          return '<tr><th scope="row">' + esc(sampleWhere(row)) + '</th>' +
            '<td>' + esc(row.results.toLocaleString('en-US')) + '</td>' +
            '<td>' + esc(sampleSpan(row)) + '</td></tr>';
        }).join('') +
        '</tbody></table></div>' +
        '<p class="arc-say">Every one of these is on the Water Quality Portal under the name it is listed by here, ' +
        'and the whole record, sample by sample, can be pulled from ' +
        '<a href="https://www.waterqualitydata.us/" target="_blank" rel="noopener">waterqualitydata.us</a> ' +
        'by hydrologic unit.</p>' +
        '<p class="arc-note">' + Object.keys((data && data.hucs) || {}).map(function (huc) {
          return esc(huc) + ' ' + esc(data.hucs[huc]);
        }).join(' \u00b7 ') + '</p>';
    }
  }

  function loadSamples() {
    if (!byId('samples')) return;
    loadJson(SAMPLES_FILE).then(renderSamples).catch(function () {
      var block = byId('samples');
      if (block) block.hidden = true;
    });
  }

  /* -------------------------------------------------------------------------
     THE SPECIES

     The roll in fivemile-observations.json, which the iNaturalist fetcher
     extends every run and never prunes. Nature Watch shows the last year of
     records out of the same file; this is every species the roll has ever
     held, newest sighting first, with a row of kinds to narrow it and a search
     over the names. See DECISIONS.md 82.

     A row is not a link, because it has two places to go and neither is the
     obvious one: the latest record on iNaturalist, and the field guide entry
     where there is one. Each gets its own 44px line, the .k-more the calendar
     rows already use for the same job.
     ------------------------------------------------------------------------- */
  var speciesRoll = [];
  var speciesKind = '';
  var speciesShots = {};
  var LICENSE_WORDS = { cc0: 'CC0', 'cc-by': 'CC BY', 'cc-by-sa': 'CC BY-SA' };

  function rollOf(data) {
    return (data && Array.isArray(data.roll) ? data.roll : [])
      .filter(function (row) { return row && row.name && row.first; });
  }

  function speciesSpan(row) {
    if (!row.last || row.last === row.first) return longDate(row.first);
    if (row.first.slice(0, 4) === row.last.slice(0, 4)) return shortDate(row.first) + ' to ' + longDate(row.last);
    return longDate(row.first) + ' to ' + longDate(row.last);
  }

  function speciesRow(row) {
    var count = num(row.count) || 0;
    var links = '';
    if (row.latest) {
      links += '<a class="k-more" href="https://www.inaturalist.org/observations/' + esc(row.latest) +
        '" target="_blank" rel="noopener">' + (count === 1 ? 'The record' : 'The latest record') +
        ' on iNaturalist <span aria-hidden="true">&rarr;</span></a>';
    }
    if (row.guide) {
      links += '<a class="k-more" href="fivemile-guide.html#' + esc(row.guide) +
        '">In the field guide <span aria-hidden="true">&rarr;</span></a>';
    }
    var shot = speciesShots[String(row.taxon)];
    /* The name is the next thing in the row, so the photograph says nothing a
       screen reader needs and carries no alt text. A species with no
       photograph free to use gets the paper block CLAUDE.md keeps for exactly
       this, which holds the row in line with the rest of the list. */
    var picture = shot
      ? '<div class="sp-shot"><img src="' + esc(shot.file) + '" alt="" aria-hidden="true" ' +
        'width="64" height="64" loading="lazy" decoding="async"></div>'
      : '<div class="sp-shot"><span class="sp-blank" aria-hidden="true"></span></div>';

    return '<div class="card-stub species">' + picture + '<div class="k-bd">' +
      '<div class="k-top">' +
        '<span class="tag">' + esc(row.group || 'Living thing') + '</span>' +
        '<span class="k-src">' + esc(plural(count, 'record', 'records')) + ' &middot; ' + esc(speciesSpan(row)) + '</span>' +
      '</div>' +
      '<h3>' + esc(row.name) + '</h3>' +
      (row.latin ? '<div class="w">' + esc(row.latin) + '</div>' : '') +
      (links ? '<div class="k-links">' + links + '</div>' : '') +
    '</div></div>';
  }

  /* Whose photographs these are, and that they are of the species rather
     than of any sighting on the list. CC BY and CC BY-SA require the first
     part; the second is the site not implying something untrue. */
  function speciesCredit(rows) {
    var names = [];
    var licenses = [];
    rows.forEach(function (row) {
      var shot = speciesShots[String(row.taxon)];
      if (!shot) return;
      if (shot.credit && names.indexOf(shot.credit) < 0) names.push(shot.credit);
      var word = LICENSE_WORDS[shot.license];
      if (word && licenses.indexOf(word) < 0) licenses.push(word);
    });
    if (!names.length) return '';
    var list = names.length === 1 ? names[0]
      : names.length === 2 ? names[0] + ' and ' + names[1]
      : names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
    return '<p class="obs-credit">The pictures show the species and not the sighting. ' +
      'They were taken by ' + esc(list) + ', and come from iNaturalist under ' +
      esc(licenses.join(', ')) + '.</p>';
  }

  function showSpecies() {
    var host = byId('speciesRows');
    if (!host) return;
    var find = byId('speciesFind');
    var needle = find ? find.value.trim().toLowerCase() : '';
    var rows = speciesRoll.filter(function (row) {
      if (speciesKind && row.group !== speciesKind) return false;
      if (!needle) return true;
      return [row.name, row.latin, row.group].join(' ').toLowerCase().indexOf(needle) > -1;
    });
    host.innerHTML = rows.length ? rows.map(speciesRow).join('') + speciesCredit(rows) : '<div class="empty">&mdash;</div>';
    var count = byId('speciesCount');
    /* Short, because on a phone it shares a line with the search box and every
       letter it takes comes out of the box. */
    if (count) {
      count.textContent = needle ? plural(rows.length, 'match', 'matches')
        : speciesKind ? speciesKind + ' · ' + rows.length
        : plural(rows.length, 'species', 'species');
    }
  }

  /* The kinds, most recorded first, behind an All that opens pressed. The
     reel's look without its months, so it reads as the same control the other
     rooms use to narrow what is under it. */
  function buildKindReel(host) {
    var counts = {};
    speciesRoll.forEach(function (row) {
      var kind = row.group || 'Living thing';
      counts[kind] = (counts[kind] || 0) + 1;
    });
    var kinds = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b); });
    host.innerHTML = [''].concat(kinds).map(function (kind) {
      return '<button type="button" class="reel-btn" data-kind="' + esc(kind) + '" aria-pressed="' + (kind ? 'false' : 'true') + '">' +
        esc(kind || 'All') + '<small>' + (kind ? counts[kind] : speciesRoll.length) + '</small></button>';
    }).join('');
    host.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('.reel-btn') : null;
      if (!button) return;
      speciesKind = button.getAttribute('data-kind') || '';
      Array.prototype.forEach.call(host.querySelectorAll('.reel-btn'), function (other) {
        other.setAttribute('aria-pressed', other === button ? 'true' : 'false');
      });
      showSpecies();
    });
  }

  function loadSpecies() {
    var reel = byId('speciesReel');
    if (!reel) return;
    /* The photographs are optional. A room that cannot read them is the
       room as it opened, every row text and no picture on it. */
    loadJson(SPECIES_PHOTOS).then(function (data) {
      speciesShots = (data && data.photos) || {};
    }).catch(function () { speciesShots = {}; }).then(function () {
      return loadJson(SIGHTINGS_FILE);
    }).then(function (data) {
      speciesRoll = rollOf(data).sort(function (a, b) {
        return String(b.last || b.first).localeCompare(String(a.last || a.first)) || a.name.localeCompare(b.name);
      });
      if (!speciesRoll.length) return;

      var records = speciesRoll.reduce(function (sum, row) { return sum + (num(row.count) || 0); }, 0);
      var earliest = speciesRoll.map(function (row) { return row.first; }).sort()[0];
      setText('speciesStamp', plural(speciesRoll.length, 'species', 'species') + ' · ' +
        plural(records, 'record', 'records') + ' · back to ' + monthLabel(earliest));

      buildKindReel(reel);
      showSpecies();

      var find = byId('speciesFind');
      if (find) {
        var timer = null;
        find.addEventListener('input', function () {
          window.clearTimeout(timer);
          timer = window.setTimeout(showSpecies, 160);
        });
      }
    }).catch(function () { /* the empty state is already on the page */ });
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

  /* THE FOUR TILES AT THE TOP

     Four records, each filled from the file the room behind it reads, inside
     the panel function that already read it, so a tile costs no second fetch
     and cannot drift from the panel under it. A tile whose file does not come
     keeps its em dash. The three weather records come out of the airport
     archive's index, worked out by scripts/fetch/acis-airport.mjs when a record
     is broken, because a browser is not going to read ninety seven year files
     to find the hottest day. See DECISIONS.md 36, 59 and 72. */
  function setTile(id, value, unit, sentence) {
    var val = byId('arc' + id + 'Val');
    if (val) val.innerHTML = esc(value) + (unit ? '<span>' + esc(unit) + '</span>' : '');
    setText('arc' + id + 'Sub', sentence);
  }

  function hubWeather() {
    loadArchive(WEATHER_DIR).then(function (data) {
      var days = sortedDays(data);
      if (!days.length) return;
      var sum = weatherSummary(days);
      var wettest = wettestMonth(days);
      setText('hubWeatherDays', String(days.length));
      setText('hubWeatherSince', monthLabel(days[0].date));
      setText('hubWeatherHot', num(sum.warm.high) + '°');
      setText('hubWeatherNote', 'The wettest month on the books is ' + monthProse(wettest.month) +
        ', which brought ' + wettest.total.toFixed(2) + ' inches.');
      /* The room also holds the airport's record, and the hub says so off the
         shelf label alone rather than reading ninety seven year files. */
      loadJson(AIRPORT_DIR + '/index.json').then(function (index) {
        var years = index && Array.isArray(index.years) ? index.years : [];
        if (!years.length) return;
        setText('hubWeatherNote', 'The wettest month on the books is ' + monthProse(wettest.month) +
          ', and behind it sits the official Birmingham record, every day since ' + years[0].year + '.');
        var records = (index && index.records) || {};
        if (records.wettestDay) {
          setTile('Rain', num(records.wettestDay.value).toFixed(2), ' in',
            longDate(records.wettestDay.date) + ', the most rain the airport has measured in a day.');
        }
        if (records.hottest) {
          setTile('Heat', String(num(records.hottest.value)), '°F',
            longDate(records.hottest.date) + ', and nothing since has matched it.');
        }
        if (records.deepestSnow) {
          setTile('Snow', String(num(records.deepestSnow.value)), ' in',
            longDate(records.deepestSnow.date) + ', the deepest snow on the books here.');
        }
      }).catch(function () { /* the station line stands */ });
    }).catch(function () { /* the panel keeps its em dashes */ });
  }

  /* The shelf label and the peak record, not the thirty nine year files. The
     index already counts the days and knows the first one, and the highest the
     creek has come is a crest the daily figures cannot see: a flood can come
     and go inside a day. */
  function hubCreek() {
    Promise.all([
      loadJson(CREEK_DIR + '/index.json'),
      loadJson(CREEK_PEAKS).catch(function () { return null; })
    ]).then(function (parts) {
      var index = parts[0];
      var years = (index && Array.isArray(index.years) ? index.years : []);
      if (!years.length) return;
      setText('hubCreekDays', (num(index.total) || 0).toLocaleString('en-US'));
      setText('hubCreekSince', longDate(years[0].first));
      var crest = parts[1] && parts[1].highest;
      if (!crest || reading(crest.stage_ft) == null) return;
      setText('hubCreekHigh', num(crest.stage_ft).toFixed(2) + ' ft');
      setTile('Creek', num(crest.stage_ft).toFixed(2), ' ft',
        longDate(crest.date) + ', the highest Five Mile Creek has come at Republic.');
      setText('hubCreekNote', 'Since ' + years[0].year + ' the highest it has come is ' +
        num(crest.stage_ft).toFixed(2) + ' feet, on ' + longDate(crest.date) + '.');
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

  /* The sixth room. The index the Editions room is written from, read here for
     the same three figures every panel carries, and a line on how the newest
     edition's two calls came out. See DECISIONS.md 74. */
  function hubEditions() {
    loadJson(EDITION_INDEX).then(function (data) {
      var list = (data && Array.isArray(data.editions) ? data.editions : []);
      if (!list.length) return;
      var newest = list[0];
      setText('hubEditionCount', String(list.length));
      setText('hubEditionNewest', monthLabel(newest.month));
      setText('hubEditionSince', monthLabel(list[list.length - 1].month));
      var month = monthProse(newest.month);
      var one = function (who, verdict) {
        return who + (verdict === 'right' ? ' was right' : verdict === 'wrong' ? ' missed' : ' made no call');
      };
      var note = newest.noaa === newest.fivemile
        ? (newest.fivemile === 'right' ? 'Both calls for ' + month + ' were right.'
          : newest.fivemile === 'wrong' ? 'Both calls for ' + month + ' missed.'
          : 'Neither NOAA nor FIVEMILE made a call for ' + month + '.')
        : 'For ' + month + ', ' + one(newest.noaa ? 'NOAA' : 'NOAA, with no outlook on file,', newest.noaa) +
          ' and ' + one('FIVEMILE', newest.fivemile) + '.';
      setText('hubEditionNote', note);
    }).catch(function () { /* the panel keeps its em dashes */ });
  }

  /* The seventh room. Same three figures, off the roll the room reads, and a
     line naming the species that went on the list most recently. */
  function hubSpecies() {
    loadJson(SIGHTINGS_FILE).then(function (data) {
      var roll = rollOf(data);
      if (!roll.length) return;
      var records = roll.reduce(function (sum, row) { return sum + (num(row.count) || 0); }, 0);
      var earliest = roll.map(function (row) { return row.first; }).sort()[0];
      var newest = roll.slice().sort(function (a, b) {
        return b.first.localeCompare(a.first) || a.name.localeCompare(b.name);
      })[0];
      setText('hubSpeciesCount', String(roll.length));
      setText('hubSpeciesRecords', String(records));
      setText('hubSpeciesSince', monthLabel(earliest));
      setText('hubSpeciesNote', 'The most recent species to go on the list is the ' + newest.name +
        ', from a record on ' + MONTHS_FULL[Number(newest.first.slice(5, 7)) - 1] + ' ' +
        dayNumber(newest.first) + ', ' + newest.first.slice(0, 4) + '.');
    }).catch(function () { /* the panel keeps its em dashes */ });
  }

  function loadHub() {
    if (!byId('hubPhotoCount')) return;
    hubPhotos();
    hubWeather();
    hubCreek();
    hubNews();
    hubDates();
    hubEditions();
    hubSpecies();
  }

  /* The search on the hub lists a story the way the stories room lists one,
     so it asks for this row rather than drawing a second kind of its own. */
  window.FivemileArchiveRows = { story: storyRow };

  loadHub();
  loadPhotos();
  loadWeather();
  loadCreek();
  loadNews();
  loadDates();
  loadSpecies();
  loadQuality();
  loadFlashiness();
  loadSamples();
})();
