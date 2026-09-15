/* ===========================================================================
   fivemile-search.js

   The search on the Archive hub, and the one place a reader can put a
   question to everything the site keeps.

   Two halves.

   THE ANSWERS. A question that fits a rule written down in this file is
   answered from the files the pages themselves read: the creek archive and
   the live gauge, our station's log and the live weather, the Birmingham
   airport record and its normals, the forecast, the calendar engine, the sky
   engine, every story on file, the field guide, and the sightings roll. The
   rule does the arithmetic and a sentence written in advance says what came
   out. Nothing is generated and nothing is guessed. A question with no rule
   behind it gets no answer card at all, only the matches underneath, which is
   the promise the About page makes: there is no AI running on this site.
   See DECISIONS.md 13 and 73.

   THE MATCHES. Every page in sitemap.xml, read as the page itself, plus every
   story, every date on the calendar, every field guide entry, every species on
   the sightings roll and every photograph. The sitemap is the list of pages,
   so there is no list in here to fall out of step with the site, which is the
   rule every room in the archive keeps. See DECISIONS.md 36.

   Nothing loads until somebody searches, and a question only fetches the
   years it is about. The creek room reads thirty nine year files to draw its
   charts; "has the creek been high this month" reads one.

   Two things that will bite the next person, both inherited from the rooms.
   A date key is read as a local calendar date and never handed to the Date
   parser whole, because new Date('2026-08-01') is the evening of July 31
   here. And a missing reading is null, never nought: num() below returns null
   for null, which the archive's own num() does not.
   =========================================================================== */
(function () {
  'use strict';

  var form = document.getElementById('findForm');
  var input = document.getElementById('findInput');
  var out = document.getElementById('findOut');
  if (!form || !input || !out) return;

  var CREEK_DIR = 'fivemile-creek-archive';
  var STATION_DIR = 'fivemile-weather-archive';
  var AIRPORT_DIR = 'fivemile-airport-archive';
  var NORMALS_FILE = 'fivemile-airport-normals.json';
  var PEAKS_FILE = 'fivemile-creek-peaks.json';
  var WATERSHED_FILE = 'fivemile-watershed.json';
  var WEATHER_FILE = 'fivemile-weather.json';
  var AIR_FILE = 'fivemile-air-quality.json';
  var NEWS_INDEX = 'news-archive/index.json';
  var GUIDE_FILE = 'fivemile-guide.json';
  var PHOTO_FILE = 'fivemile-home-anchor.json';
  var SIGHTINGS_FILE = 'fivemile-observations.json';
  var GARDEN_PAGE = 'fivemile-garden.html';
  var SITEMAP = 'sitemap.xml';

  var CREEK_DOOR = { href: 'fivemile-creek-archive.html', label: 'Creek log' };
  var WEATHER_DOOR = { href: 'fivemile-weather-archive.html', label: 'Weather log' };
  var ALMANAC_DOOR = { href: 'fivemile-almanac.html', label: 'Almanac' };

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  var MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTH_NUM = {
    january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4, may: 5,
    june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8, september: 9, sept: 9, sep: 9,
    october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12
  };
  /* Longest first, so june is never read as jun and a stray e. */
  var MONTH_RE = '(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec)';

  /* West to east, and it is a rendering rule. See DECISIONS.md 1 and 29. */
  var TOWN_ORDER = ['Graysville', 'Cardiff', 'Brookside'];

  /* -------------------------------------------------------------------------
     DATES
     ------------------------------------------------------------------------- */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function keyOf(date) { return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()); }
  /* Noon, so a day never slips across midnight when the clocks change. */
  function dateOf(key) {
    var p = String(key).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12);
  }
  function yearOf(key) { return Number(String(key).slice(0, 4)); }
  function monthOf(key) { return Number(String(key).slice(5, 7)); }
  function dayOf(key) { return Number(String(key).slice(8, 10)); }
  function today() { return keyOf(new Date()); }
  function addDays(key, n) { var d = dateOf(key); d.setDate(d.getDate() + n); return keyOf(d); }
  function addMonths(key, n) {
    var d = dateOf(key);
    var target = new Date(d.getFullYear(), d.getMonth() + n, 1, 12);
    var last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(d.getDate(), last));
    return keyOf(target);
  }
  function daysApart(a, b) { return Math.round((dateOf(b) - dateOf(a)) / 86400000); }
  function monthStart(year, month) { return year + '-' + pad2(month) + '-01'; }
  function monthEnd(year, month) { return keyOf(new Date(year, month, 0, 12)); }
  function realDate(key) { return keyOf(dateOf(key)) === key; }
  function sooner(a, b) { return a < b ? a : b; }
  function later(a, b) { return a > b ? a : b; }
  function localKey(stamp) { var d = new Date(stamp); return isNaN(d) ? '' : keyOf(d); }

  /* A date in a sentence carries its year only when it is not this one. */
  function onDate(key) {
    var words = MONTHS[monthOf(key) - 1] + ' ' + dayOf(key);
    return yearOf(key) === yearOf(today()) ? words : words + ', ' + yearOf(key);
  }
  function dayName(key) { return WEEKDAYS[dateOf(key).getDay()]; }
  function fullDay(key) { return dayName(key) + ', ' + onDate(key); }
  function monthWithYear(key) { return MONTHS[monthOf(key) - 1] + ' ' + yearOf(key); }
  function labelDate(key) {
    var words = MONTH_SHORT[monthOf(key) - 1] + ' ' + dayOf(key);
    return yearOf(key) === yearOf(today()) ? words : words + ' ' + yearOf(key);
  }
  /* Jul 8 to Jul 9 2025, not Jul 8 2025 to Jul 9 2025. */
  function spanLabel(from, to) {
    if (from === to) return labelDate(from);
    if (yearOf(from) === yearOf(to)) return MONTH_SHORT[monthOf(from) - 1] + ' ' + dayOf(from) + ' to ' + labelDate(to);
    return labelDate(from) + ' to ' + labelDate(to);
  }
  function ago(key) {
    var n = daysApart(key, today());
    if (n <= 0) return 'today';
    if (n === 1) return 'yesterday';
    return counted(n, 'day', 'days') + ' ago';
  }
  function clock(date) { return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }

  /* -------------------------------------------------------------------------
     WORDS AND FIGURES
     ------------------------------------------------------------------------- */
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  /* The empty state is an em dash and nothing else. Built from its code so the
     source itself carries none. */
  var DASH = String.fromCharCode(8212);
  function cap(text) { return text ? text.charAt(0).toUpperCase() + text.slice(1) : text; }

  /* Small counts are words in a sentence, the way a person says them. */
  var SMALL = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  function counted(n, one, many) {
    return (n >= 0 && n <= 10 ? SMALL[n] : Number(n).toLocaleString('en-US')) + ' ' + (n === 1 ? one : many);
  }
  function times(n) { return n === 1 ? 'once' : n === 2 ? 'twice' : counted(n, 'time', 'times'); }

  function num(value) {
    if (value == null || value === '') return null;
    var n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  function feet(v) { return v.toFixed(2) + ' feet'; }
  function feetShort(v) { return v.toFixed(2) + ' ft'; }
  function looseFeet(v) { return String(Math.round(v * 100) / 100) + (v === 1 ? ' foot' : ' feet'); }
  function inches(v) { return v.toFixed(2) + (v === 1 ? ' inch' : ' inches'); }
  function inchesShort(v) { return v.toFixed(2) + ' in'; }
  function looseInches(v) { return v === 1 ? 'an inch' : String(Math.round(v * 100) / 100) + ' inches'; }
  function snowInches(v) { return v.toFixed(1) + (v === 1 ? ' inch' : ' inches'); }
  function degrees(v) { var r = Math.round(v); return r + (Math.abs(r) === 1 ? ' degree' : ' degrees'); }
  function deg(v) { return Math.round(v) + '°'; }
  function flow(v) { return v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString('en-US'); }
  function mph(v) { var r = Math.round(v); return r + (r === 1 ? ' mile an hour' : ' miles an hour'); }
  function percent(v) { return Math.round(v) + ' percent'; }
  /* A forecast with nothing in it says so rather than quoting a zero. */
  function rainChance(p) { return p > 0 ? ', with a ' + percent(p) + ' chance of rain.' : ', with no rain in the forecast.'; }

  function total(rows, pick) {
    return rows.reduce(function (sum, row) { var v = pick(row); return v == null ? sum : sum + v; }, 0);
  }
  function average(values) {
    var list = values.filter(function (v) { return v != null; });
    return list.length ? list.reduce(function (a, b) { return a + b; }, 0) / list.length : null;
  }
  /* The most of something, and on a tie the most recent, which is how the
     weather service writes a record. Rows arrive oldest first. */
  function most(rows, pick) {
    var best = null;
    rows.forEach(function (row) {
      var v = pick(row);
      if (v != null && (best === null || v >= pick(best))) best = row;
    });
    return best;
  }
  function least(rows, pick) {
    var best = null;
    rows.forEach(function (row) {
      var v = pick(row);
      if (v != null && (best === null || v <= pick(best))) best = row;
    });
    return best;
  }
  function byDate(a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }

  /* Unbroken stretches of days that pass a test. A day missing from the
     record breaks a stretch, because nobody knows what it did. */
  function runsOf(days, test) {
    var runs = [];
    var current = null;
    days.forEach(function (day) {
      if (!test(day)) { current = null; return; }
      if (current && addDays(current.to, 1) === day.date) {
        current.to = day.date;
        current.days.push(day);
      } else {
        current = { from: day.date, to: day.date, days: [day] };
        runs.push(current);
      }
    });
    return runs;
  }

  /* -------------------------------------------------------------------------
     LOADING

     Every file is fetched once a visit and kept. A year file is its own entry,
     so a question that walks back through the creek a year at a time and a
     second question about one of those years share the same download.
     ------------------------------------------------------------------------- */
  var memo = {};
  function once(key, make) {
    if (!memo[key]) {
      memo[key] = make();
      memo[key].catch(function () { delete memo[key]; });
    }
    return memo[key];
  }
  function fetchJson(url) {
    return once('json ' + url, function () {
      return fetch(url, { cache: 'no-cache' }).then(function (response) {
        if (!response.ok) throw new Error(url + ' ' + response.status);
        return response.json();
      });
    });
  }
  function fetchText(url) {
    return once('text ' + url, function () {
      return fetch(url, { cache: 'no-cache' }).then(function (response) {
        if (!response.ok) throw new Error(url + ' ' + response.status);
        return response.text();
      });
    });
  }

  function shelf(dir) {
    return fetchJson(dir + '/index.json').then(function (index) {
      var years = index && Array.isArray(index.years) ? index.years : [];
      return {
        first: years.length ? years[0].first : null,
        last: years.length ? years[years.length - 1].last : null
      };
    });
  }
  function yearRows(dir, year) {
    return fetchJson(dir + '/' + year + '.json').then(function (data) {
      return (data && Array.isArray(data.days) ? data.days : [])
        .filter(function (day) { return day && day.date; })
        .sort(byDate);
    }).catch(function () { return []; });
  }
  function rowsBetween(dir, from, to) {
    return shelf(dir).then(function (held) {
      if (!held.first || from > held.last || to < held.first) return { shelf: held, days: [] };
      var jobs = [];
      for (var year = yearOf(later(from, held.first)); year <= yearOf(sooner(to, held.last)); year++) {
        jobs.push(yearRows(dir, year));
      }
      return Promise.all(jobs).then(function (parts) {
        var days = [];
        parts.forEach(function (rows) {
          rows.forEach(function (day) { if (day.date >= from && day.date <= to) days.push(day); });
        });
        return { shelf: held, days: days };
      });
    });
  }
  /* Walks a record back from a date, a year file at a time, to the most recent
     day that passes. Stops at the front of the record. */
  function lastWhere(dir, onOrBefore, test) {
    return shelf(dir).then(function (held) {
      if (!held.first) return null;
      var year = yearOf(sooner(onOrBefore, held.last));
      function step() {
        if (year < yearOf(held.first)) return null;
        return yearRows(dir, year).then(function (rows) {
          for (var i = rows.length - 1; i >= 0; i--) {
            if (rows[i].date <= onOrBefore && test(rows[i])) return rows[i];
          }
          year -= 1;
          return step();
        });
      }
      return step();
    });
  }

  /* The creek. Today is not in the archive until it is over, so the live
     file's own readings stand in for it so far, and the row says so. */
  function leadGauge() {
    return fetchJson(WATERSHED_FILE).then(function (data) {
      var gauges = data && Array.isArray(data.gauges) ? data.gauges : [];
      return gauges.filter(function (g) { return g.role === 'lead'; })[0] || gauges[0] || null;
    });
  }
  function creekSoFar(gauge) {
    if (!gauge) return null;
    var now = today();
    var values = (Array.isArray(gauge.stage_history) ? gauge.stage_history : [])
      .filter(function (point) { return point && localKey(point.at) === now; })
      .map(function (point) { return num(point.stage_ft); });
    if (localKey(gauge.updated_at) === now) values.push(num(gauge.stage_ft));
    values = values.filter(function (v) { return v != null; });
    if (!values.length) return null;
    return { date: now, high: Math.max.apply(null, values), low: Math.min.apply(null, values), mean: null, partial: true };
  }
  function creekRows(win) {
    var now = today();
    return Promise.all([
      rowsBetween(CREEK_DIR, win.from, sooner(win.to, now)),
      win.to >= now ? leadGauge().catch(function () { return null; }) : null
    ]).then(function (parts) {
      var days = parts[0].days;
      var soFar = creekSoFar(parts[1]);
      if (soFar && soFar.date >= win.from && !days.some(function (d) { return d.date === soFar.date; })) {
        days = days.concat([soFar]);
      }
      return { days: days, shelf: parts[0].shelf, gauge: parts[1] };
    });
  }
  /* A day before October 2007 has a mean and no low or high. */
  function highOf(day) { return num(day.high) != null ? num(day.high) : num(day.mean); }
  function lowOf(day) { return num(day.low) != null ? num(day.low) : num(day.mean); }

  /* The weather. Our station when the whole question falls inside its log,
     the Birmingham airport when it reaches back past it. Never a mix of the
     two in one figure. See DECISIONS.md 72. */
  function stationSoFar(wx) {
    var report = wx && wx.rain && wx.rain.morningReport;
    if (!report || report.coverageStart !== today()) return null;
    return {
      date: today(), high: num(report.highTemp), low: num(report.lowTemp),
      rain: num(wx.rain.today), maxGust: num(report.windGust), partial: true
    };
  }
  function weatherRows(win, airportOnly) {
    var now = today();
    return shelf(STATION_DIR).then(function (station) {
      var ours = !airportOnly && !!station.first && win.from >= station.first;
      var dir = ours ? STATION_DIR : AIRPORT_DIR;
      return Promise.all([
        rowsBetween(dir, win.from, sooner(win.to, now)),
        ours && win.to >= now ? fetchJson(WEATHER_FILE).catch(function () { return null; }) : null
      ]).then(function (parts) {
        var days = parts[0].days;
        var soFar = stationSoFar(parts[1]);
        if (soFar && soFar.date >= win.from && !days.some(function (d) { return d.date === soFar.date; })) {
          days = days.concat([soFar]);
        }
        return { source: ours ? 'station' : 'airport', days: days, shelf: parts[0].shelf, station: station };
      });
    });
  }
  var SOURCES = {
    station: { who: 'Our station', at: 'at our station', tag: 'Our station' },
    airport: { who: 'The Birmingham airport', at: 'at the Birmingham airport', tag: 'Birmingham airport' }
  };
  function sourceNote(source, station) {
    if (source === 'station') {
      return 'From the FIVEMILE weather station' + (station && station.first ? ', whose log starts on ' + onDate(station.first) + '.' : '.');
    }
    return 'From the official National Weather Service record kept at the Birmingham airport, southeast of the three towns. ' +
      'It is the long record and the right one for knowing what normal is, and it is not a reading from here.';
  }

  function normalsByDate() {
    return fetchJson(NORMALS_FILE).then(function (data) {
      var map = {};
      (data && Array.isArray(data.days) ? data.days : []).forEach(function (row) { map[row.md] = row; });
      return map;
    });
  }
  function normalRainBetween(map, from, to) {
    var sum = 0;
    for (var key = from; key <= to; key = addDays(key, 1)) {
      var row = map[key.slice(5)];
      if (row && num(row.rain) != null) sum += num(row.rain);
    }
    return sum;
  }

  /* -------------------------------------------------------------------------
     READING A QUESTION

     The question is folded to plain words, the stretch of time in it is found
     and cut out, and what is left is read for a subject and a measure. The
     time comes out first so that "the last month" is never mistaken for
     "the last time", and 2019 is never mistaken for a depth.
     ------------------------------------------------------------------------- */
  var NUMBER_WORDS = {
    a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
    nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30
  };

  function normalize(raw) {
    var text = String(raw || '').toLowerCase()
      .replace(/[‘’ʼ']/g, '')
      .replace(/°\s*f?\b/g, ' degrees ')
      .replace(/(\d),(\d{3})\b/g, '$1$2')
      .replace(/(\d)(st|nd|rd|th)\b/g, '$1')
      .replace(/\bhalf an? (inch|foot)\b/g, '0.5 $1')
      .replace(/[^a-z0-9.\s]/g, ' ')
      .replace(/\.(?!\d)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text
      .replace(/\b(a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty) (inch|inches|foot|feet|day|days|week|weeks|month|months|year|years)\b/g,
        function (match, word, unit) { return NUMBER_WORDS[word] + ' ' + unit; })
      .replace(/\bhundred degree/g, '100 degree')
      .replace(/\bfourth of july\b/g, '4 of july');
  }

  function span(from, to, say, kind, extra) {
    var win = { from: from, to: to, end: to, say: say, kind: kind };
    Object.keys(extra || {}).forEach(function (key) { win[key] = extra[key]; });
    return win;
  }

  function seasonSpan(name, endYear) {
    if (name === 'winter') return { from: (endYear - 1) + '-12-01', to: monthEnd(endYear, 2) };
    var months = { spring: [3, 5], summer: [6, 8], fall: [9, 11] }[name];
    return { from: monthStart(endYear, months[0]), to: monthEnd(endYear, months[1]) };
  }

  function parseWindow(q) {
    var now = today();
    var Y = yearOf(now);
    var M = monthOf(now);

    function dayWindow(month, day, year) {
      if (!month || !day || day > 31) return null;
      var key = (year || Y) + '-' + pad2(month) + '-' + pad2(day);
      if (!realDate(key)) return null;
      if (year) return span(key, key, 'on ' + onDate(key), 'day');
      /* No year named. Looking back it is the last one that has come round,
         and looking ahead it is the next. */
      var back = key > now ? (Y - 1) + key.slice(4) : key;
      var ahead = key < now ? (Y + 1) + key.slice(4) : key;
      if (!realDate(back)) back = key;
      return span(back, back, 'on ' + onDate(back), 'day', {
        implicit: true, ahead: span(ahead, ahead, 'on ' + onDate(ahead), 'day')
      });
    }

    var HOLIDAYS = {
      'christmas eve': '12-24', 'christmas day': '12-25', 'christmas': '12-25', 'new years eve': '12-31',
      'new years day': '01-01', 'new years': '01-01', 'independence day': '07-04', 'halloween': '10-31',
      'valentines day': '02-14'
    };

    var rules = [
      [/\bbetween ((?:19|20)\d{2}) and ((?:19|20)\d{2})\b/, function (m) {
        var a = Math.min(+m[1], +m[2]);
        var b = Math.max(+m[1], +m[2]);
        return span(a + '-01-01', b + '-12-31', 'from ' + a + ' through ' + b, 'years');
      }],
      [new RegExp('\\bsince ' + MONTH_RE + '(?: ((?:19|20)\\d{2}))?\\b'), function (m) {
        var month = MONTH_NUM[m[1]];
        var year = m[2] ? +m[2] : (month <= M ? Y : Y - 1);
        return span(monthStart(year, month), now, 'since ' + MONTHS[month - 1] + (year !== Y ? ' ' + year : ''), 'since');
      }],
      [/\bsince ((?:19|20)\d{2})\b/, function (m) {
        return span(m[1] + '-01-01', now, 'since ' + m[1], 'since');
      }],
      [/\b(\d+) (day|week|month|year)s? ago\b/, function (m) {
        var n = +m[1];
        var key = m[2] === 'day' ? addDays(now, -n) : m[2] === 'week' ? addDays(now, -7 * n) :
          addMonths(now, m[2] === 'month' ? -n : -12 * n);
        return span(key, key, 'on ' + onDate(key), 'day');
      }],
      [/\b(christmas eve|christmas day|christmas|new years eve|new years day|new years|independence day|halloween|valentines day)(?: ((?:19|20)\d{2}))?\b/, function (m) {
        var md = HOLIDAYS[m[1]];
        var win = dayWindow(Number(md.slice(0, 2)), Number(md.slice(3)), m[2] ? +m[2] : null);
        /* A holiday is a date and also the name of something on the calendar. */
        if (win) win.holiday = true;
        return win;
      }],
      [new RegExp('\\b' + MONTH_RE + ' (\\d{1,2})(?:,? ((?:19|20)\\d{2}))?\\b'), function (m) {
        return dayWindow(MONTH_NUM[m[1]], +m[2], m[3] ? +m[3] : null);
      }],
      [new RegExp('\\b(?:the )?(\\d{1,2}) of ' + MONTH_RE + '(?:,? ((?:19|20)\\d{2}))?\\b'), function (m) {
        return dayWindow(MONTH_NUM[m[2]], +m[1], m[3] ? +m[3] : null);
      }],
      [/\b(?:(?:in|over|during|for|within) )?(the )?(last|past|previous) (?:(\d+) )?(day|week|month|year)s?\b/, function (m) {
        var n = m[3] ? +m[3] : 1;
        var unit = m[4];
        var rolling = !!m[1] || !!m[3] || m[2] === 'past';
        if (!rolling) {
          if (unit === 'week') {
            var sunday = addDays(now, -dateOf(now).getDay() - 7);
            return span(sunday, addDays(sunday, 6), 'last week', 'week');
          }
          if (unit === 'month') {
            var year = M === 1 ? Y - 1 : Y;
            var month = M === 1 ? 12 : M - 1;
            return span(monthStart(year, month), monthEnd(year, month), 'in ' + MONTHS[month - 1] + (year !== Y ? ' ' + year : ''), 'month');
          }
          if (unit === 'year') return span((Y - 1) + '-01-01', (Y - 1) + '-12-31', 'in ' + (Y - 1), 'year');
          return span(addDays(now, -1), addDays(now, -1), 'yesterday', 'day');
        }
        var from = unit === 'day' ? addDays(now, -(n - 1)) :
          unit === 'week' ? addDays(now, -(7 * n - 1)) :
          addDays(addMonths(now, unit === 'month' ? -n : -12 * n), 1);
        return span(from, now, 'in the past ' + (n === 1 ? unit : counted(n, unit, unit + 's')), 'rolling');
      }],
      [/\b(this|last|next|coming) weekend\b/, function (m) {
        var weekday = dateOf(now).getDay();
        var saturday = weekday === 0 ? addDays(now, -1) : addDays(now, 6 - weekday);
        if (m[1] === 'last') saturday = weekday === 6 ? addDays(now, -7) : addDays(now, -(weekday + 1) - (weekday === 0 ? 7 : 0));
        if (m[1] === 'next') saturday = addDays(saturday, 7);
        var sunday = addDays(saturday, 1);
        var say = m[1] === 'coming' ? 'this weekend' : m[1] + ' weekend';
        return span(saturday, sunday, say, 'weekend', { ahead: span(saturday, sunday, say, 'weekend') });
      }],
      [/\b(?:so far )?this (week|month|year)\b|\b(year) to date\b/, function (m) {
        var unit = m[1] || m[2];
        var from = unit === 'week' ? addDays(now, -dateOf(now).getDay()) : unit === 'month' ? monthStart(Y, M) : Y + '-01-01';
        var end = unit === 'week' ? addDays(from, 6) : unit === 'month' ? monthEnd(Y, M) : Y + '-12-31';
        return span(from, now, 'so far this ' + unit, unit, { ahead: span(now, end, 'this ' + unit, unit) });
      }],
      [/\b(?:the )?(next|coming) (week|month|year)\b/, function (m) {
        var days = m[2] === 'week' ? 7 : m[2] === 'month' ? 30 : 365;
        var ahead = span(now, addDays(now, days), 'in the ' + m[2] + ' ahead', 'next');
        return span(now, now, ahead.say, 'next', { ahead: ahead });
      }],
      [/\b(?:(this|last|past|previous|next|in|during|over|for|through) )?(the )?(spring|summer|fall|autumn|winter)(?: of)?(?: ((?:19|20)\d{2}))?\b/, function (m) {
        var pre = m[1] || '';
        var name = m[3] === 'autumn' ? 'fall' : m[3];
        var named = m[4] ? +m[4] : null;
        if (!pre && !m[2] && !named) return null;
        var endYear = named;
        if (!endYear) {
          endYear = Y + 1;
          while (seasonSpan(name, endYear).from > now) endYear -= 1;
          if (/last|past|previous/.test(pre) && seasonSpan(name, endYear).to >= now) endYear -= 1;
          if (pre === 'next') { while (seasonSpan(name, endYear).from <= now) endYear += 1; }
        }
        var s = seasonSpan(name, endYear);
        var say = name === 'winter'
          ? 'in the winter of ' + (endYear - 1) + ' to ' + String(endYear).slice(2)
          : 'in the ' + name + ' of ' + endYear;
        if (!named && s.from <= now && s.to >= now) say = 'so far this ' + name;
        else if (!named && pre === 'this') say = 'this ' + name;
        return span(s.from, s.to, say, 'season', { ahead: span(s.from, s.to, say, 'season') });
      }],
      [new RegExp('\\b(?:(this|last|in|during|for|of|through|throughout) )?(?:the month of )?' + MONTH_RE + '(?: ((?:19|20)\\d{2}))?\\b'), function (m) {
        var pre = m[1] || '';
        var word = m[2];
        var month = MONTH_NUM[word];
        var named = m[3] ? +m[3] : null;
        /* May and March are also a verb, and mar is a word on its own. */
        if (/^(may|march|mar)$/.test(word) && !pre && !named) return null;
        var year = named || (month <= M ? Y : Y - 1);
        if (!named && pre === 'last') year = month < M ? Y : Y - 1;
        var say = year === Y && month === M ? 'so far this month' : 'in ' + MONTHS[month - 1] + (year !== Y ? ' ' + year : '');
        var aheadYear = named || (month >= M ? Y : Y + 1);
        return span(monthStart(year, month), monthEnd(year, month), say, 'month', {
          implicit: !named,
          ahead: span(monthStart(aheadYear, month), monthEnd(aheadYear, month), 'in ' + MONTHS[month - 1] + (aheadYear !== Y ? ' ' + aheadYear : ''), 'month')
        });
      }],
      [/\b(?:in |during |through )?the ((?:19|20)\d0|\d0)s\b|\b((?:19|20)\d0)s\b/, function (m) {
        var digits = m[1] || m[2];
        /* "Days in the 90s" is a temperature, not a decade. */
        if (digits.length === 2 && /\b(degrees|temp\w*|highs?|lows?|hot|warm|cold|cool)\b/.test(q)) return null;
        var start = digits.length === 2 ? (Number(digits) >= 30 ? 1900 : 2000) + Number(digits) : Number(digits);
        return span(start + '-01-01', (start + 9) + '-12-31', 'in the ' + start + 's', 'years');
      }],
      [/\b(?:(in|during|for|of|from|through|throughout) )?((?:19|20)\d{2})\b(?! ?(?:cfs|feet|foot|ft|inch|inches|degrees?|mph|percent|stories))/, function (m) {
        var year = +m[2];
        if (year > Y) return null;
        if (year === Y) return span(Y + '-01-01', now, 'so far this year', 'year', { ahead: span(now, Y + '-12-31', 'this year', 'year') });
        return span(year + '-01-01', year + '-12-31', 'in ' + year, 'year');
      }],
      [/\byesterday\b/, function () {
        var key = addDays(now, -1);
        return span(key, key, 'yesterday', 'day');
      }],
      [/\b(tonight|this evening)\b/, function () {
        return span(now, now, 'tonight', 'tonight', { ahead: span(now, now, 'tonight', 'tonight') });
      }],
      [/\b(today|this morning|this afternoon)\b/, function () {
        return span(now, now, 'today', 'today', { ahead: span(now, now, 'today', 'today') });
      }],
      [/\btomorrow\b/, function () {
        var key = addDays(now, 1);
        return span(key, key, 'tomorrow', 'tomorrow', { ahead: span(key, key, 'tomorrow', 'tomorrow') });
      }],
      [/\b(right now|currently|at the moment|now)\b/, function () {
        return span(now, now, 'right now', 'now');
      }],
      [/\b(ever|on record|all time|of all time|in history|on file|ever recorded)\b/, function () {
        return span('1900-01-01', now, 'on record', 'all');
      }]
    ];

    for (var i = 0; i < rules.length; i++) {
      var match = q.match(rules[i][0]);
      if (!match) continue;
      var win = rules[i][1](match);
      if (win) return { win: win, text: match[0] };
    }
    return null;
  }

  function understand(raw) {
    var q = normalize(raw);
    var found = parseWindow(q);
    var rest = found ? q.replace(found.text, ' ').replace(/\s+/g, ' ').trim() : q;
    var aux = q.match(/^(is|are|was|were|did|does|do|has|have|will)\b/);
    return { raw: raw, q: q, rest: rest, win: found ? found.win : null, aux: aux ? aux[1] : null };
  }

  /* A question that asks yes or no gets told which, first. Only the word: the
     sentence after it says the rest, and "It has not. The creek has not"
     says it twice. */
  function yesNo(ctx, yes) {
    if (!ctx.aux) return '';
    return yes ? 'Yes. ' : 'No. ';
  }

  function thisYear() {
    var now = today();
    return span(yearOf(now) + '-01-01', now, 'so far this year', 'year');
  }
  function thisMonth() {
    var now = today();
    return span(monthStart(yearOf(now), monthOf(now)), now, 'so far this month', 'month');
  }
  function everything() { return span('1900-01-01', today(), 'on record', 'all'); }
  function isOver(win) { return win.to < today(); }
  /* A window for looking back: "now" is not a stretch of anything, and a
     window that only exists looking ahead has nothing in it yet. */
  function backWindow(ctx, fallback) {
    var win = ctx.win;
    if (!win || win.kind === 'now' || win.kind === 'next' || win.kind === 'tomorrow' || win.from > today()) return fallback();
    return win;
  }

  /* Pulls a threshold out of the question: "over 5 feet", "90 or hotter",
     "100 degree days", "more than an inch". */
  function threshold(text) {
    var below = /under|below|less|lower|colder|cooler|beneath|or less|or lower|or colder|or cooler|or below|or under/;
    var m = text.match(/\b(over|above|more than|higher than|greater than|at least|past|exceeding|exceeded|hit|reached|reach|got to|topped|hotter than|warmer than|under|below|less than|lower than|colder than|cooler than|beneath)\s+(\d+(?:\.\d+)?)\s*(feet|foot|ft|inches|inch|degrees|degree|mph|miles an hour|cfs)?\b/);
    if (m) return { dir: below.test(m[1]) ? 'below' : 'above', value: +m[2], unit: unitOf(m[3]) };
    m = text.match(/\b(\d+(?:\.\d+)?)\s*(feet|foot|ft|inches|inch|degrees|degree|mph|cfs)?\s+or\s+(more|higher|above|over|hotter|warmer|less|lower|below|under|colder|cooler)\b/);
    if (m) return { dir: below.test('or ' + m[3]) ? 'below' : 'above', value: +m[1], unit: unitOf(m[2]) };
    m = text.match(/\b(\d+(?:\.\d+)?)\s*(degree|inch|foot|mph)\s+(days?|nights?|rains?|rises?|gusts?)\b/);
    if (m) return { dir: 'above', value: +m[1], unit: unitOf(m[2]) };
    return null;
  }
  /* The amount of rain a question names, with or without a verb in front of
     it: "at least an inch", "an inch of rain", "2 inches in a day". */
  function rainLine(text) {
    var th = threshold(text);
    if (th && (th.unit === 'inches' || !th.unit) && th.value > 0 && th.value < 20) return th.value;
    var bare = text.match(/\b(\d+(?:\.\d+)?)\s*inch(?:es)?\b/);
    return bare && +bare[1] > 0 && +bare[1] < 20 ? +bare[1] : 0.01;
  }

  function unitOf(word) {
    if (!word) return '';
    if (/^(feet|foot|ft)$/.test(word)) return 'feet';
    if (/^inch/.test(word)) return 'inches';
    if (/^degree/.test(word)) return 'degrees';
    if (/mph|miles/.test(word)) return 'mph';
    return word;
  }

  /* -------------------------------------------------------------------------
     THE ANSWER CARD

     One department panel, which is the card the hub's doors already are: a
     sentence or two, the figures under it on the list grid, a table when there
     is a run of days worth seeing, a mono line saying exactly what was counted,
     and a door into the room that holds the rows.
     ------------------------------------------------------------------------- */
  function cell(mark, label, value) { return { mark: mark, label: label, value: value }; }

  function card(parts) {
    var a = { kicker: '', tag: '', say: [], cells: [], table: null, tip: '', note: '', door: null, extra: '', withMatches: false };
    Object.keys(parts).forEach(function (key) { a[key] = parts[key]; });
    a.say = a.say.filter(Boolean);
    return a;
  }

  function nothingOnFile(kicker, win, door) {
    return card({
      kicker: kicker,
      say: ['Nothing is on file ' + win.say + '.'],
      door: door
    });
  }

  function answerHtml(a) {
    var html = '<article class="card-dept brief find-answer">' +
      '<div class="d-bar"><h3>' + esc(a.kicker) + '</h3>' + (a.tag ? '<span class="r">' + esc(a.tag) + '</span>' : '') + '</div>' +
      '<div class="d-body">';
    a.say.forEach(function (line) { html += '<p class="find-say">' + esc(line) + '</p>'; });
    if (a.cells.length) {
      html += '<div class="d-rows list find-cells">' + a.cells.map(function (c) {
        return '<div class="d-cell"><em><i class="d-mark" aria-hidden="true">' + c.mark + '</i>' + esc(c.label) +
          '</em><b>' + esc(c.value) + '</b></div>';
      }).join('') + '</div>';
    }
    if (a.table && a.table.rows.length) {
      var table = '<div class="find-table"><table class="arc-table"><thead><tr>' +
        a.table.head.map(function (h) { return '<th scope="col">' + esc(h) + '</th>'; }).join('') +
        '</tr></thead><tbody>' +
        a.table.rows.map(function (row) {
          return '<tr>' + row.map(function (value, i) {
            return i === 0 ? '<th scope="row">' + esc(value) + '</th>' : '<td>' + esc(value) + '</td>';
          }).join('') + '</tr>';
        }).join('') +
        '</tbody></table></div>';
      /* Forty nights of frost is worth having and not worth scrolling past on
         a phone to reach the door, so a long run folds behind its count. */
      html += a.table.rows.length > 12
        ? '<details class="arc-all find-rows"><summary>' + esc(a.table.label || String(a.table.rows.length)) + '</summary>' + table + '</details>'
        : table;
    }
    if (a.tip) html += '<p class="d-tip">' + esc(a.tip) + '</p>';
    if (a.note) html += '<p class="arc-note">' + esc(a.note) + '</p>';
    if (a.door) html += '<a class="d-go" href="' + esc(a.door.href) + '">' + esc(a.door.label) + ' <span aria-hidden="true">&rarr;</span></a>';
    html += '</div></article>';
    if (a.extra) html += '<div class="rows find-extra">' + a.extra + '</div>';
    return html;
  }

  /* -------------------------------------------------------------------------
     THE CREEK
     ------------------------------------------------------------------------- */
  function lines() { return window.FivemileCreekLines; }

  function creekLine(ctx) {
    var th = threshold(ctx.rest);
    if (th && (th.unit === 'feet' || !th.unit) && th.value < 40) {
      return { dir: th.dir, value: th.value, named: null };
    }
    if (/\b(low|wadable|shallow)\b/.test(ctx.rest) && !/\bhigh\b/.test(ctx.rest)) {
      return { dir: 'below', value: lines().wadable, named: 'wadable' };
    }
    return { dir: 'above', value: lines().high, named: 'high' };
  }
  /* Above a line counts a day if any reading reached it. Low and wadable is
     the whole day under the line. Below a depth counts a day that dropped
     under it at any point. */
  function lineTest(line) {
    if (line.dir === 'above') return function (d) { var v = highOf(d); return v != null && v >= line.value; };
    if (line.named === 'wadable') return function (d) { var v = highOf(d); return v != null && v < line.value; };
    return function (d) { var v = lowOf(d); return v != null && v < line.value; };
  }
  function lineVerb(line, over, negative) {
    if (line.dir === 'above') {
      var what = line.named ? 'the high water line' : looseFeet(line.value);
      if (negative) return (over ? 'did not reach ' : 'has not reached ') + what;
      return (over ? 'reached ' : 'has reached ') + what;
    }
    if (line.named === 'wadable') {
      if (negative) return over ? 'was never low and wadable' : 'has not been low and wadable';
      return over ? 'was low and wadable' : 'has been low and wadable';
    }
    if (negative) return (over ? 'did not drop below ' : 'has not dropped below ') + looseFeet(line.value);
    return (over ? 'dropped below ' : 'has dropped below ') + looseFeet(line.value);
  }
  function lineNotes(line, days, win, held) {
    var notes = [];
    if (line.named === 'high') {
      notes.push('High water is ' + looseFeet(lines().high) + ' at the Republic gauge, the same line the masthead and the almanac draw. ' +
        'It is not a flood stage, because this gauge does not have one. A day counts if any reading in it reached the line.');
    } else if (line.named === 'wadable') {
      notes.push('Low and wadable is under ' + looseFeet(lines().wadable) + ' at the Republic gauge, the same line the almanac draws, and a day counts if it stayed under all day.');
    } else if (line.dir === 'above') {
      notes.push('A day counts if any reading in it at the Republic gauge reached ' + looseFeet(line.value) + '.');
    } else {
      notes.push('A day counts if any reading in it at the Republic gauge dropped below ' + looseFeet(line.value) + '.');
    }
    return notes.concat(creekCaveats(days, win, held));
  }
  function creekCaveats(days, win, held) {
    var notes = [];
    /* A day with a mean and no high is either from before the fifteen minute
       record starts in October 2007, or a later day the gauge sent too few
       readings for. Both go by the average, and the note says which. */
    var averaged = days.filter(function (d) { return num(d.high) == null && !d.partial; });
    var early = averaged.filter(function (d) { return d.date < '2007-10-01'; }).length;
    var since = averaged.length - early;
    if (early) {
      notes.push('Before October 2007 the gauge kept one average a day and no readings through it, so those days go by the average, which runs under the day\'s peak.');
    }
    if (since) {
      notes.push((early ? 'After that, ' : 'On ') + counted(since, 'day', 'days') + ' in that stretch the gauge sent too few readings for a high, so ' +
        (since === 1 ? 'that day goes' : 'those days go') + ' by the average' + (early ? ' too.' : ', which runs under the day\'s peak.'));
    }
    if (days.some(function (d) { return d.partial; })) notes.push('Today goes by the readings so far.');
    if (win && held && held.first) {
      var start = later(win.from, held.first);
      var hasToday = days.some(function (d) { return d.partial; });
      var end = sooner(win.to, hasToday ? today() : addDays(today(), -1));
      if (end >= start) {
        var gap = daysApart(start, end) + 1 - days.filter(function (d) { return d.date >= start && d.date <= end; }).length;
        if (gap > 0) notes.push(cap(counted(gap, 'day', 'days')) + ' in that stretch ' + (gap === 1 ? 'is' : 'are') + ' missing from the record.');
      }
    }
    return notes;
  }

  function answerCreek(ctx) {
    if (!/\b(creek|gauge|water levels?|stage|floods?|flooded|flooding|high water|low water|republic|cfs|flowing|wadable|water temp\w*|oxygen)\b/.test(ctx.q)) return null;
    if (/\b(forecast|going to|will it|supposed to)\b/.test(ctx.q) && !/\bcreek\b/.test(ctx.q)) return null;
    var r = ctx.rest;
    var win = ctx.win;
    var pastWords = /\b(was|were|been|did|had|got|gotten|get|went|came|come|reached|reach|rose|ever|times|days|last|first|highest|lowest|peak\w*|crest\w*|average|record|when)\b/;
    if (/\boxygen\b|\bwater temp|\bhow (warm|cold|hot) is the water\b/.test(r)) return creekNow(ctx);
    if ((win && (win.kind === 'now' || win.kind === 'today') && !pastWords.test(r)) || (!win && !pastWords.test(r))) return creekNow(ctx);
    if (/\b(last time|most recent\w*|how long (since|has it been|ago)|last (flood\w*|rise|crest|high water))\b/.test(r) ||
        (/\bwhen\b/.test(r) && !win && !/\bfirst\b/.test(r))) return creekLast(ctx);
    if (/\bfirst\b/.test(r)) return creekFirst(ctx);
    if (/\bhow (many|often)\b|\bnumber of\b/.test(r) || (/\bwhen\b/.test(r) && win) ||
        (ctx.aux && /\b(high|flood\w*|up|over|above|low|wadable|below|under)\b/.test(r))) return creekCount(ctx);
    if (/\b(highest|how high|peak\w*|crest\w*|biggest|record|max\w*|deepest|worst)\b/.test(r)) return creekExtreme(ctx, 'max');
    if (/\b(lowest|how low|min\w*|shallowest)\b/.test(r)) return creekExtreme(ctx, 'min');
    return creekSummary(ctx);
  }

  function creekNow(ctx) {
    return Promise.all([leadGauge(), fetchJson(WATERSHED_FILE)]).then(function (parts) {
      var gauge = parts[0];
      var stage = gauge ? num(gauge.stage_ft) : null;
      if (stage == null) return null;
      var L = lines();
      var r = ctx.rest;
      var band = stage < L.wadable ? 'low and wadable' : stage < L.lively ? 'at an ordinary level' :
        stage < L.high ? 'up and moving fast' : 'over the high water line';
      var trend = gauge.trend === 'rising' ? 'rising' : gauge.trend === 'falling' ? 'falling' : 'holding steady';
      var lead = '';
      if (ctx.aux) {
        if (/\brising\b|\bcoming up\b/.test(r)) lead = yesNo(ctx, gauge.trend === 'rising');
        else if (/\bfalling\b|\bgoing down\b/.test(r)) lead = yesNo(ctx, gauge.trend === 'falling');
        else if (/\b(low|wadable)\b/.test(r)) lead = yesNo(ctx, stage < L.wadable);
        else if (/\b(high|flood\w*|up|over|fast)\b/.test(r)) lead = yesNo(ctx, stage >= L.high);
      }
      var say = [lead + 'Five Mile Creek at Republic is at ' + feet(stage) + ' and ' + trend + ', which is ' + band + '.'];
      var cfs = num(gauge.discharge_cfs);
      var water = num(gauge.water_temp_f);
      var oxygen = num(gauge.dissolved_oxygen_mgl);
      var askedWater = /\bwater temp|\bhow (warm|cold|hot) is the water\b|\btemp\w* of the (water|creek)\b/.test(r);
      var more = [];
      if (cfs != null) more.push('about ' + flow(cfs) + ' cubic feet of water a second is going by');
      if (water != null && !askedWater) more.push('the water is ' + degrees(water));
      if (more.length) say.push(cap(more.join(', and ')) + '.');
      /* Asked about the water or the oxygen, the answer to that goes first. */
      if (askedWater && water != null) say.unshift('The water in Five Mile Creek at Republic is ' + degrees(water) + '.');
      if (oxygen != null && /\boxygen\b/.test(r)) {
        var enough = oxygen > 7 ? 'plenty for anything living in it' : oxygen >= 5 ? 'comfortable for fish' :
          oxygen >= 4 ? 'low enough that fish feed less' : 'low enough to stress fish';
        var oxygenSay = ['Dissolved oxygen in Five Mile Creek at Republic is ' + oxygen.toFixed(1) + ' milligrams a litre, which is ' + enough + '.'];
        var rec = parts[1] && parts[1].oxygenRecord;
        if (rec && num(rec.lowest) != null && rec.lowest_on && rec.first) {
          oxygenSay.push('The lowest daily minimum since ' + onDate(rec.first) + ' is ' + num(rec.lowest).toFixed(1) + ', on ' + onDate(rec.lowest_on) + '.');
        }
        say = oxygenSay.concat(say);
      }
      var arrow = gauge.trend === 'rising' ? '↑' : gauge.trend === 'falling' ? '↓' : '→';
      var cells = [cell('🌊', 'Stage', feetShort(stage)), cell(arrow, 'Trend', cap(trend))];
      if (cfs != null) cells.push(cell('💧', 'Flow', flow(cfs) + ' cfs'));
      if (water != null) cells.push(cell('🌡️', 'Water', deg(water)));
      return card({
        kicker: 'The creek', tag: 'Right now', say: say, cells: cells,
        note: 'Read at the USGS gauge at Republic. A gauge reading is not a safety call, so judge the water from the bank.',
        door: { href: 'fivemile-almanac.html#the-creek', label: 'The creek today' }
      });
    });
  }

  function creekCount(ctx) {
    var win = backWindow(ctx, thisYear);
    var line = creekLine(ctx);
    return creekRows(win).then(function (got) {
      var days = got.days;
      if (!days.length) return nothingOnFile('The creek', win, CREEK_DOOR);
      var test = lineTest(line);
      var hits = days.filter(test);
      var runs = runsOf(days, test);
      var over = isOver(win);
      var top = most(days, highOf);
      var say = [];
      var lead = yesNo(ctx, hits.length > 0);
      if (hits.length) {
        var first = 'Five Mile Creek ' + lineVerb(line, over) + ' on ' + counted(hits.length, 'day', 'days') + ' ' + win.say;
        if (line.dir === 'above' && runs.length > 1) first += ', in ' + counted(runs.length, 'separate rise', 'separate rises');
        else if (line.dir === 'above' && hits.length > 1) first += ', all in one rise';
        say.push(lead + first + '.');
        if (line.dir === 'above') {
          var peak = most(hits, highOf);
          say.push((runs.length > 1 ? 'The biggest crested at ' : 'It crested at ') + feet(highOf(peak)) + ', on ' + onDate(peak.date) + '.');
        } else {
          var bottom = least(hits, lowOf);
          say.push('The lowest it got was ' + feet(lowOf(bottom)) + ', on ' + onDate(bottom.date) + '.');
        }
        var live = got.gauge ? num(got.gauge.stage_ft) : null;
        if (win.to >= today() && live != null && test({ high: live, low: live })) {
          say.push('It is still there right now, at ' + feet(live) + '.');
        }
      } else {
        say.push(lead + 'Five Mile Creek ' + lineVerb(line, over, true) + ' ' + win.say + '.');
        if (line.dir === 'above' && top) say.push('The highest it came was ' + feet(highOf(top)) + ', on ' + onDate(top.date) + '.');
        if (line.dir === 'below') {
          var low = least(days, lowOf);
          if (low) say.push('The lowest it got was ' + feet(lowOf(low)) + ', on ' + onDate(low.date) + '.');
        }
      }
      var cells = [cell('📅', 'Days', String(hits.length))];
      if (line.dir === 'above' && runs.length) cells.push(cell('🌊', 'Separate rises', String(runs.length)));
      if (top) cells.push(cell('🌊', 'Highest', feetShort(highOf(top)) + ', ' + labelDate(top.date)));
      var table = null;
      if (line.dir === 'above' && runs.length) {
        table = {
          head: ['Rise', 'Days', 'Crest'], label: counted(runs.length, 'rise', 'rises'),
          rows: runs.slice().reverse().slice(0, 60).map(function (run) {
            return [spanLabel(run.from, run.to), String(run.days.length), feetShort(highOf(most(run.days, highOf)))];
          })
        };
      }
      return card({
        kicker: 'The creek', tag: spanLabel(days[0].date, days[days.length - 1].date),
        say: say, cells: cells, table: table,
        note: lineNotes(line, days, win, got.shelf).join(' '),
        door: CREEK_DOOR
      });
    });
  }

  function creekExtreme(ctx, which) {
    var win = backWindow(ctx, function () { return null; });
    if (which === 'max' && (!win || win.kind === 'all')) return creekCrestRecord();
    if (!win) win = everything();
    var pick = which === 'max' ? highOf : lowOf;
    return creekRows(win).then(function (got) {
      var days = got.days;
      if (!days.length) return nothingOnFile('The creek', win, CREEK_DOOR);
      var best = which === 'max' ? most(days, pick) : least(days, pick);
      var say = [(which === 'max' ? 'The highest Five Mile Creek came ' : 'The lowest Five Mile Creek got ') +
        win.say + ' was ' + feet(pick(best)) + ', on ' + onDate(best.date) + '.'];
      if (which === 'max' && pick(best) >= lines().high) say.push('That is over the high water line of ' + looseFeet(lines().high) + '.');
      var ranked = days.slice().sort(function (a, b) {
        return which === 'max' ? pick(b) - pick(a) : pick(a) - pick(b);
      }).filter(function (d) { return pick(d) != null; }).slice(0, 5);
      return card({
        kicker: 'The creek', tag: spanLabel(days[0].date, days[days.length - 1].date), say: say,
        table: { head: ['Day', which === 'max' ? 'High' : 'Low'], rows: ranked.map(function (d) { return [labelDate(d.date), feetShort(pick(d))]; }) },
        note: ['Each day goes by its ' + (which === 'max' ? 'highest' : 'lowest') + ' reading at the Republic gauge.']
          .concat(creekCaveats(days, win, got.shelf)).join(' '),
        door: CREEK_DOOR
      });
    });
  }

  /* The highest on record is a crest, off the gauge's yearly peak record, and
     not a daily figure. A flood can come and go inside a day. */
  function creekCrestRecord() {
    return fetchJson(PEAKS_FILE).then(function (data) {
      var peaks = (data && Array.isArray(data.peaks) ? data.peaks : []).filter(function (p) { return num(p.stage_ft) != null && p.date; });
      if (!peaks.length) return null;
      var top = most(peaks, function (p) { return num(p.stage_ft); });
      var latest = peaks[peaks.length - 1];
      var ranked = peaks.slice().sort(function (a, b) { return num(b.stage_ft) - num(a.stage_ft); }).slice(0, 5);
      return card({
        kicker: 'The creek', tag: 'Since ' + yearOf(peaks[0].date),
        say: [
          'The highest Five Mile Creek has come on record is ' + feet(num(top.stage_ft)) + ', on ' + onDate(top.date) + '.',
          'The most recent yearly peak was ' + feet(num(latest.stage_ft)) + ', on ' + onDate(latest.date) + '.'
        ],
        table: { head: ['Crest', 'Date'], rows: ranked.map(function (p) { return [feetShort(num(p.stage_ft)), onDate(p.date)]; }) },
        note: 'From the gauge\'s record of one peak a year, which goes back to ' + yearOf(peaks[0].date) + '. ' +
          'A crest is the single highest moment of a rise, so it runs above anything in the day tables.',
        door: CREEK_DOOR
      });
    });
  }

  function creekLast(ctx) {
    var line = creekLine(ctx);
    var test = lineTest(line);
    var howLong = /\bhow long\b/.test(ctx.rest);
    return Promise.all([leadGauge().catch(function () { return null; }), shelf(CREEK_DIR)]).then(function (parts) {
      var gauge = parts[0];
      var held = parts[1];
      var live = gauge ? num(gauge.stage_ft) : null;
      var notes = lineNotes(line, [], null, null);
      if (live != null && test({ high: live, low: live })) {
        return card({
          kicker: 'The creek', tag: 'Right now',
          say: ['Right now. Five Mile Creek at Republic is at ' + feet(live) + '.'],
          note: notes.join(' '), door: { href: 'fivemile-almanac.html#the-creek', label: 'The creek today' }
        });
      }
      var soFar = creekSoFar(gauge);
      var found = soFar && test(soFar) ? Promise.resolve(soFar) : lastWhere(CREEK_DIR, addDays(today(), -1), test);
      return found.then(function (day) {
        if (!day) {
          return card({
            kicker: 'The creek',
            say: ['Five Mile Creek ' + lineVerb(line, false).replace(/^has /, 'has not ') + ' on any day since the record starts, on ' + onDate(held.first) + '.'],
            note: notes.join(' '), door: CREEK_DOOR
          });
        }
        var n = daysApart(day.date, today());
        var first = 'The last time Five Mile Creek ' + lineVerb(line, true) + ' was ' + onDate(day.date) +
          (line.dir === 'above' ? ', when it came up to ' + feet(highOf(day)) : '') + '.';
        var say = howLong ? ['It has been ' + counted(n, 'day', 'days') + '.', first] : [first, n > 1 ? 'That was ' + ago(day.date) + '.' : ''];
        return card({
          kicker: 'The creek', tag: labelDate(day.date), say: say,
          cells: [cell('📅', 'Last time', labelDate(day.date)), cell('🕰️', 'Days since', String(n)), cell('🌊', 'Reading', feetShort(line.dir === 'above' ? highOf(day) : lowOf(day)))],
          note: notes.concat(creekCaveats([day], null, null)).join(' '), door: CREEK_DOOR
        });
      });
    });
  }

  function creekFirst(ctx) {
    var win = backWindow(ctx, thisYear);
    var line = creekLine(ctx);
    var test = lineTest(line);
    return creekRows(win).then(function (got) {
      if (!got.days.length) return nothingOnFile('The creek', win, CREEK_DOOR);
      var day = got.days.filter(test)[0];
      var say = day
        ? ['The first time Five Mile Creek ' + lineVerb(line, true) + ' ' + win.say.replace(/^so far /, '') + ' was ' + onDate(day.date) +
            ', at ' + feet(line.dir === 'above' ? highOf(day) : lowOf(day)) + '.']
        : ['Five Mile Creek ' + lineVerb(line, isOver(win), true) + ' ' + win.say + '.'];
      return card({
        kicker: 'The creek', tag: spanLabel(got.days[0].date, got.days[got.days.length - 1].date), say: say,
        note: lineNotes(line, got.days, win, got.shelf).join(' '), door: CREEK_DOOR
      });
    });
  }

  function creekSummary(ctx) {
    var win = backWindow(ctx, thisYear);
    return creekRows(win).then(function (got) {
      var days = got.days;
      var avg = average(days.map(function (d) { return num(d.mean); }));
      if (!days.length || avg == null) return nothingOnFile('The creek', win, CREEK_DOOR);
      var over = isOver(win);
      var cfs = average(days.map(function (d) { return num(d.cfs); }));
      var top = most(days, highOf);
      var bottom = least(days, lowOf);
      var highDays = days.filter(lineTest({ dir: 'above', value: lines().high, named: 'high' })).length;
      var say = [
        'Five Mile Creek ' + (over ? 'averaged ' : 'has averaged ') + feet(avg) + ' at Republic ' + win.say +
          (cfs != null ? ', with about ' + flow(cfs) + ' cubic feet of water a second going by' : '') + '.',
        'It ran from ' + feet(lowOf(bottom)) + ' on ' + onDate(bottom.date) + ' to ' + feet(highOf(top)) + ' on ' + onDate(top.date) + '.',
        highDays ? 'It reached the high water line on ' + counted(highDays, 'day', 'days') + '.'
          : (over ? 'It never reached the high water line.' : 'It has not reached the high water line.')
      ];
      var cells = [cell('🌊', 'Average', feetShort(avg)), cell('🌊', 'Lowest', feetShort(lowOf(bottom))), cell('🌊', 'Highest', feetShort(highOf(top)))];
      if (cfs != null) cells.push(cell('💧', 'Average flow', flow(cfs) + ' cfs'));
      return card({
        kicker: 'The creek', tag: spanLabel(days[0].date, days[days.length - 1].date), say: say, cells: cells,
        note: ['The average is of the gauge\'s daily means at Republic.'].concat(creekCaveats(days, win, got.shelf)).join(' '),
        door: CREEK_DOOR
      });
    });
  }

  /* -------------------------------------------------------------------------
     RAIN
     ------------------------------------------------------------------------- */
  function dayPhrase(day) {
    if (day.partial) return 'so far today';
    if (day.date === addDays(today(), -1)) return 'yesterday';
    return 'on ' + onDate(day.date);
  }

  function answerRain(ctx) {
    if (!/\b(rain\w*|precip\w*|wettest|driest|drought|dry|showers?|downpours?|wet)\b/.test(ctx.q)) return null;
    var r = ctx.rest;
    var win = ctx.win;
    if ((win && win.kind === 'now') || /\bis it raining\b/.test(ctx.q)) return rainNow(ctx);
    if (/\b(normal|normally|average|avg|typical|usual|usually)\b/.test(r) && (!win || win.implicit || /^(today|tomorrow|tonight)$/.test(win.kind))) return normalsAnswer(ctx, 'rain');
    if (/\b(dry spell|dry stretch|dry streak|without rain|no rain|in a row|straight days|longest)\b/.test(r)) return rainStreak(ctx);
    if (/\b(last time|last rain\w*|last rained|most recent\w*|how long (since|has it been|ago)|since it (last )?rained|when did (it|we|you) last)\b/.test(r) ||
        (/\bwhen did it rain\b/.test(r) && !win)) return rainLast(ctx);
    if (/\b(wettest|driest|rainiest)\s+(month|year)\b|\b(which|what)\s+(month|year)\b|\bdriest\b/.test(r)) return rainGrain(ctx);
    if (/\b(wettest|rainiest|most rain|biggest rain\w*|heaviest|hardest)\b/.test(r)) return rainWettestDay(ctx);
    if (/\bhow many inches\b/.test(r)) return rainTotal(ctx);
    if (/\bhow (many|often)\b|\bnumber of\b|\brainy days\b|\bdays (of|with) rain\b/.test(r) || (/\bwhen did it rain\b/.test(r) && win)) return rainCount(ctx);
    return rainTotal(ctx);
  }

  function rainNow(ctx) {
    return fetchJson(WEATHER_FILE).then(function (wx) {
      var current = wx && wx.current ? wx.current : {};
      var rate = num(current.precipRate);
      var hourly = num(current.hourlyRain);
      var soFar = stationSoFar(wx);
      var raining = (rate != null && rate > 0) || (hourly != null && hourly > 0);
      var todayRain = soFar ? soFar.rain : null;
      var say = [raining
        ? yesNo(ctx, true) + 'It is raining at our station right now.'
        : yesNo(ctx, false) + 'It is not raining at our station right now.'];
      if (todayRain != null) say.push(todayRain > 0 ? 'So far today ' + inches(todayRain) + ' has fallen.' : 'Nothing has fallen yet today.');
      return card({
        kicker: 'Rain', tag: 'Right now', say: say,
        cells: todayRain != null ? [cell('🌧️', 'So far today', inchesShort(todayRain))] : [],
        note: 'From the FIVEMILE weather station.', door: { href: 'fivemile-almanac.html', label: 'Almanac' }
      });
    });
  }

  function rainTotal(ctx) {
    var win = backWindow(ctx, thisMonth);
    return Promise.all([weatherRows(win), normalsByDate().catch(function () { return null; })]).then(function (parts) {
      var got = parts[0];
      var days = got.days.filter(function (d) { return num(d.rain) != null; });
      if (!days.length) return nothingOnFile('Rain', win, WEATHER_DOOR);
      var src = SOURCES[got.source];
      var rained = total(days, function (d) { return num(d.rain); });
      var wettest = most(days, function (d) { return num(d.rain); });
      var rainyDays = days.filter(function (d) { return num(d.rain) >= 0.01; }).length;
      var say = [];
      var notes = [sourceNote(got.source, got.station)];
      if (days.length === 1) {
        var d = days[0];
        say.push(yesNo(ctx, num(d.rain) > 0) + (num(d.rain) > 0
          ? src.who + (d.partial ? ' has measured ' : ' measured ') + inches(num(d.rain)) + ' of rain ' + dayPhrase(d) + '.'
          : src.who + (d.partial ? ' has stayed dry ' : ' stayed dry ') + dayPhrase(d) + '.'));
      } else {
        var over = isOver(win);
        say.push(yesNo(ctx, rained > 0) + src.who + (over ? ' measured ' : ' has measured ') + inches(rained) + ' of rain ' + win.say + '.');
        if (rained > 0) say.push('The most in one day was ' + inches(num(wettest.rain)) + ', on ' + onDate(wettest.date) + '.');
        var soFar = days.filter(function (x) { return x.partial; })[0];
        if (soFar && num(soFar.rain) > 0) say.push('That includes ' + inches(num(soFar.rain)) + ' so far today.');
        if (parts[1]) {
          var normal = normalRainBetween(parts[1], days[0].date, days[days.length - 1].date);
          if (normal > 0) {
            if (got.source === 'airport') {
              var diff = rained - normal;
              say.push(Math.abs(diff) < 0.005 ? 'That is right on normal for those days.'
                : 'That is ' + inches(Math.abs(diff)) + (diff > 0 ? ' over' : ' under') + ' normal for those days.');
            } else {
              say.push('Normal for the same days at the Birmingham airport is ' + inches(normal) + '.');
            }
            notes.push('Normal is NOAA\'s 1991 to 2020 figure for the Birmingham airport.');
          }
        }
      }
      return card({
        kicker: 'Rain', tag: src.tag + ', ' + spanLabel(days[0].date, days[days.length - 1].date), say: say,
        cells: days.length > 1 ? [
          cell('🌧️', 'Total', inchesShort(rained)),
          cell('📅', 'Days with rain', String(rainyDays)),
          cell('🌧️', 'Wettest day', rained > 0 ? inchesShort(num(wettest.rain)) + ', ' + labelDate(wettest.date) : '0.00 in')
        ] : [],
        note: notes.join(' '), door: WEATHER_DOOR
      });
    });
  }

  function rainCount(ctx) {
    var win = backWindow(ctx, thisMonth);
    var line = rainLine(ctx.rest);
    return weatherRows(win).then(function (got) {
      var days = got.days.filter(function (d) { return num(d.rain) != null; });
      if (!days.length) return nothingOnFile('Rain', win, WEATHER_DOOR);
      var src = SOURCES[got.source];
      var over = isOver(win);
      var hits = days.filter(function (d) { return num(d.rain) >= line; });
      var lead = yesNo(ctx, hits.length > 0);
      var say = [];
      if (line === 0.01) {
        say.push(lead + (over ? 'It rained on ' : 'It has rained on ') + counted(hits.length, 'day', 'days') + ' ' + win.say + ' ' + src.at + '.');
      } else {
        say.push(lead + 'At least ' + looseInches(line) + (over ? ' fell on ' : ' has fallen on ') + counted(hits.length, 'day', 'days') + ' ' + win.say + ' ' + src.at + '.');
      }
      var wettest = most(hits, function (d) { return num(d.rain); });
      if (wettest) say.push('The wettest was ' + onDate(wettest.date) + ', with ' + inches(num(wettest.rain)) + '.');
      return card({
        kicker: 'Rain', tag: src.tag + ', ' + spanLabel(days[0].date, days[days.length - 1].date), say: say,
        cells: [cell('📅', 'Days', String(hits.length)), cell('🌧️', 'Total on those days', inchesShort(total(hits, function (d) { return num(d.rain); })))],
        table: hits.length ? { head: ['Day', 'Rain'], label: counted(hits.length, 'day', 'days'), rows: hits.slice().reverse().slice(0, 60).map(function (d) { return [labelDate(d.date), inchesShort(num(d.rain))]; }) } : null,
        note: (line === 0.01 ? 'A day counts if at least a hundredth of an inch fell. ' : '') + sourceNote(got.source, got.station),
        door: WEATHER_DOOR
      });
    });
  }

  function rainWettestDay(ctx) {
    var win = backWindow(ctx, everything);
    var pick = function (d) { return num(d.rain); };
    return weatherRows(win).then(function (got) {
      var days = got.days.filter(function (d) { return pick(d) != null; });
      if (!days.length) return nothingOnFile('Rain', win, WEATHER_DOOR);
      var src = SOURCES[got.source];
      var best = most(days, pick);
      var say = ['The wettest day ' + src.at + ' ' + win.say + ' was ' + onDate(best.date) + ', with ' + inches(pick(best)) + '.'];
      var ranked = days.slice().sort(function (a, b) { return pick(b) - pick(a); }).slice(0, 5);
      var result = card({
        kicker: 'Rain', tag: src.tag, say: say,
        table: { head: ['Day', 'Rain'], rows: ranked.map(function (d) { return [onDate(d.date), inchesShort(pick(d))]; }) },
        note: sourceNote(got.source, got.station), door: WEATHER_DOOR
      });
      if (got.source !== 'airport' || win.kind !== 'all' || !got.station.first) return result;
      return weatherRows(span(got.station.first, today(), '', 'all')).then(function (ours) {
        var mine = most(ours.days.filter(function (d) { return pick(d) != null; }), pick);
        if (mine) result.say.push('Our station\'s wettest since its log starts is ' + inches(pick(mine)) + ', on ' + onDate(mine.date) + '.');
        return result;
      });
    });
  }

  function rainGrain(ctx) {
    var grain = /\byear\b/.test(ctx.rest) ? 'year' : 'month';
    var dry = /\b(driest|least)\b/.test(ctx.rest);
    var win = backWindow(ctx, everything);
    return weatherRows(win).then(function (got) {
      var days = got.days.filter(function (d) { return num(d.rain) != null; });
      if (!days.length) return nothingOnFile('Rain', win, WEATHER_DOOR);
      var src = SOURCES[got.source];
      var groups = {};
      days.forEach(function (d) {
        var key = grain === 'year' ? d.date.slice(0, 4) : d.date.slice(0, 7);
        if (!groups[key]) groups[key] = { key: key, rain: 0, days: 0 };
        groups[key].rain += num(d.rain);
        groups[key].days += 1;
      });
      var now = today();
      /* Only a whole month or year can be the driest, or the month in
         progress would win every time. A month still going can be the
         wettest, because nothing still to come can take rain back. */
      var ranked = Object.keys(groups).map(function (k) { return groups[k]; }).filter(function (g) {
        var size = grain === 'year' ? (Number(g.key) % 4 === 0 ? 366 : 365) : Number(monthEnd(Number(g.key.slice(0, 4)), Number(g.key.slice(5, 7))).slice(8));
        var whole = g.days >= size - (got.source === 'airport' ? 3 : 0);
        var current = grain === 'year' ? g.key === now.slice(0, 4) : g.key === now.slice(0, 7);
        return dry ? whole && !current : whole || current;
      }).sort(function (a, b) { return dry ? a.rain - b.rain : b.rain - a.rain; });
      if (!ranked.length) return nothingOnFile('Rain', win, WEATHER_DOOR);
      var best = ranked[0];
      var name = function (g) { return grain === 'year' ? g.key : (yearOf(g.key) === yearOf(now) ? MONTHS[monthOf(g.key + '-01') - 1] : monthWithYear(g.key + '-01')); };
      return card({
        kicker: 'Rain', tag: src.tag,
        say: ['The ' + (dry ? 'driest ' : 'wettest ') + grain + ' ' + src.at + ' ' + win.say + ' was ' + name(best) + ', with ' + inches(best.rain) + '.'],
        table: { head: [grain === 'year' ? 'Year' : 'Month', 'Rain'], rows: ranked.slice(0, 5).map(function (g) { return [name(g), inchesShort(g.rain)]; }) },
        note: (dry ? 'Only whole ' + grain + 's are ranked. ' : '') + sourceNote(got.source, got.station),
        door: WEATHER_DOOR
      });
    });
  }

  function rainLast(ctx) {
    var line = rainLine(ctx.rest);
    var howLong = /\bhow long\b/.test(ctx.rest);
    var test = function (d) { return num(d.rain) != null && num(d.rain) >= line; };
    var what = line === 0.01 ? 'rain' : looseInches(line) + ' or more';
    return Promise.all([fetchJson(WEATHER_FILE).catch(function () { return null; }), shelf(STATION_DIR)]).then(function (parts) {
      var soFar = stationSoFar(parts[0]);
      var station = parts[1];
      if (soFar && test(soFar)) {
        return card({
          kicker: 'Rain', tag: 'Today',
          say: ['It has rained today. Our station has measured ' + inches(soFar.rain) + ' so far.'],
          note: sourceNote('station', station), door: WEATHER_DOOR
        });
      }
      return lastWhere(STATION_DIR, addDays(today(), -1), test).then(function (day) {
        if (day) return { day: day, source: 'station' };
        return lastWhere(AIRPORT_DIR, addDays(today(), -1), test).then(function (d) { return d ? { day: d, source: 'airport' } : null; });
      }).then(function (found) {
        if (!found) return null;
        var src = SOURCES[found.source];
        var n = daysApart(found.day.date, today());
        var say = [];
        if (found.source === 'airport') say.push('Our station has not measured ' + what + (line === 0.01 ? '' : ' in a day') + ' since its log starts, on ' + onDate(station.first) + '.');
        var sentence = (line === 0.01 ? 'The last rain ' + src.at + ' was ' : 'The last time ' + what + ' fell in a day ' + src.at + ' was ') +
          onDate(found.day.date) + ', with ' + inches(num(found.day.rain)) + '.';
        if (howLong && found.source === 'station') say.push('It has been ' + counted(n, 'day', 'days') + ' since it rained at our station.');
        say.push(sentence);
        if (!howLong && n > 1) say.push('That was ' + ago(found.day.date) + '.');
        return card({
          kicker: 'Rain', tag: src.tag, say: say,
          cells: [cell('📅', 'Last time', labelDate(found.day.date)), cell('🕰️', 'Days since', String(n)), cell('🌧️', 'Rain', inchesShort(num(found.day.rain)))],
          note: sourceNote(found.source, station), door: WEATHER_DOOR
        });
      });
    });
  }

  function rainStreak(ctx) {
    var win = backWindow(ctx, thisYear);
    return weatherRows(win).then(function (got) {
      var days = got.days.filter(function (d) { return num(d.rain) != null; });
      if (!days.length) return nothingOnFile('Rain', win, WEATHER_DOOR);
      var src = SOURCES[got.source];
      var runs = runsOf(days, function (d) { return num(d.rain) < 0.01; });
      if (!runs.length) {
        return card({ kicker: 'Rain', tag: src.tag, say: ['It rained at least a little every day ' + win.say + ' ' + src.at + '.'], note: sourceNote(got.source, got.station), door: WEATHER_DOOR });
      }
      var longest = runs.reduce(function (best, run) { return run.days.length >= best.days.length ? run : best; }, runs[0]);
      var lastDay = days[days.length - 1].date;
      var current = runs[runs.length - 1].to === lastDay && lastDay >= addDays(today(), -1) ? runs[runs.length - 1] : null;
      var say = [];
      if (current) say.push('It has been dry ' + src.at + ' for ' + counted(current.days.length, 'day', 'days') + ', since ' + onDate(current.from) + '.');
      say.push('The longest dry stretch ' + win.say + ' ran ' + counted(longest.days.length, 'day', 'days') + ', from ' + onDate(longest.from) + ' to ' + onDate(longest.to) + '.');
      var ranked = runs.slice().sort(function (a, b) { return b.days.length - a.days.length; }).slice(0, 5);
      return card({
        kicker: 'Rain', tag: src.tag, say: say,
        cells: current ? [cell('📅', 'Dry now', current.days.length + (current.days.length === 1 ? ' day' : ' days')), cell('📅', 'Longest', longest.days.length + ' days')] : [],
        table: { head: ['Dry stretch', 'Days'], rows: ranked.map(function (run) { return [spanLabel(run.from, run.to), String(run.days.length)]; }) },
        note: 'A dry day is one with less than a hundredth of an inch. ' + sourceNote(got.source, got.station),
        door: WEATHER_DOOR
      });
    });
  }

  /* NOAA's 1991 to 2020 normals for the airport, for a date, a month, a
     season, or the year. */
  function normalsAnswer(ctx, subject) {
    return normalsByDate().then(function (map) {
      var win = ctx.win && ctx.win.kind !== 'now' ? ctx.win : null;
      var say = [];
      var cells = [];
      var tag = '';
      if (!win || win.kind === 'year' || win.kind === 'all' || win.kind === 'years') {
        if (subject === 'rain') {
          var year = normalRainBetween(map, '2024-01-01', '2024-12-31');
          say.push('Normal rain for a whole year at the Birmingham airport is ' + inches(year) + '.');
          cells.push(cell('🌧️', 'Normal year', inchesShort(year)));
          tag = 'A year';
        } else {
          win = span(today(), today(), 'today', 'today');
        }
      }
      if (!say.length && (win.kind === 'day' || win.kind === 'today' || win.kind === 'tomorrow' || win.kind === 'tonight')) {
        var row = map[win.from.slice(5)];
        if (!row) return null;
        var label = MONTHS[monthOf(win.from) - 1] + ' ' + dayOf(win.from);
        say.push('Normal for ' + label + ' at the Birmingham airport is a high of ' + row.high + ' and a low of ' + row.low +
          (num(row.rain) != null ? ', with ' + inches(num(row.rain)) + ' of rain.' : '.'));
        cells.push(cell('🌡️', 'Normal high', deg(row.high)), cell('🌡️', 'Normal low', deg(row.low)));
        if (num(row.rain) != null) cells.push(cell('🌧️', 'Normal rain', inchesShort(num(row.rain))));
        tag = label;
      } else if (!say.length) {
        var from = win.from;
        var to = win.to < win.from ? win.from : (win.kind === 'month' || win.kind === 'season' ? win.end : win.to);
        var first = map[from.slice(5)];
        var last = map[to.slice(5)];
        var rain = normalRainBetween(map, from, to);
        var name = win.kind === 'month' ? MONTHS[monthOf(from) - 1] : win.say.replace(/^(in|so far) (the )?(this )?/, '');
        if (first && last && subject !== 'rain') {
          say.push('Normal highs at the Birmingham airport run from ' + first.high + ' on ' + MONTHS[monthOf(from) - 1] + ' ' + dayOf(from) +
            ' to ' + last.high + ' on ' + MONTHS[monthOf(to) - 1] + ' ' + dayOf(to) + ', and normal lows from ' + first.low + ' to ' + last.low + '.');
        }
        say.push('Normal rain for ' + name + (say.length ? ' there is ' : ' at the Birmingham airport is ') + inches(rain) + '.');
        cells.push(cell('🌧️', 'Normal rain', inchesShort(rain)));
        tag = cap(name);
      }
      return card({
        kicker: subject === 'rain' ? 'Rain' : 'Temperature', tag: tag, say: say, cells: cells,
        note: 'NOAA\'s 1991 to 2020 normals for the official record at the Birmingham airport, southeast of the three towns.',
        door: WEATHER_DOOR
      });
    });
  }

  /* -------------------------------------------------------------------------
     HEAT, COLD AND FROST
     ------------------------------------------------------------------------- */
  function answerTemp(ctx) {
    var q = ctx.q;
    var r = ctx.rest;
    var win = ctx.win;
    /* A bare number over or under something, with no other unit named, is a
       temperature: "how many days over 90". */
    var bareDegrees = /\b(over|above|under|below|at least|more than|less than|hit|reached|topped|topped out at)\s+-?\d{1,3}\b(?!\s*(feet|foot|ft|inch|inches|mph|cfs|percent|%|stories|times))/.test(q);
    if (!bareDegrees && !/\b(hot\w*|heat|warm\w*|cold\w*|cool\w*|freez\w*|froze\w*|frost\w*|temp\w*|degrees?|chilly|muggy|highs|lows|the high|the low|weather)\b|\b(normal|average|usual|typical|record)\s+(highs?|lows?)\b/.test(q)) return null;
    if (/\b(average|usual|typical|normal|expected)\b.*\b(frost|freeze)\b|\b(frost|freeze) dates?\b|\bwhen (is|does) the (last|first) (frost|freeze)\b|\bplant\w*\b.*\bfrost\b/.test(q)) return frostDates(ctx);
    if (/\brecord (high|low|temp\w*)s?\b|\bon this (date|day)\b|\btoday in history\b/.test(q) && (!win || /^(day|today)$/.test(win.kind))) return recordsOnDate(ctx);
    if ((win && win.kind === 'now') || (/\bhow (hot|cold|warm) is it\b|\bwhats the temp\w*\b|\bwhat is the temp\w*\b|\bis it (hot|cold)\b/.test(q) && (!win || win.kind === 'today'))) return tempNow(ctx);
    if (/\b(last|first|latest|earliest)\s+(hard\s+)?(freeze|frost)\b|\bwhen did it (last )?(freeze|frost)\b|\bhas it (frozen|froze|frosted)\b/.test(q) && !/\bhow many\b/.test(q)) {
      return freezeEvent(ctx, /\b(first|earliest|yet)\b/.test(q) ? 'first' : 'last');
    }
    var normalWord = /\b(normal|normally|typical|usual|usually|average|avg)\b/.test(r);
    if (normalWord && (!win || win.implicit || /^(today|tomorrow|tonight)$/.test(win.kind))) return normalsAnswer(ctx, 'temp');
    if (win && /^(day|today)$/.test(win.kind) && !/\bhow many\b/.test(r)) return daySummary(ctx);
    if (/\bhow (many|often)\b|\bnumber of\b/.test(r)) return tempCount(ctx);
    if (/\b(in a row|straight|heat wave|longest)\b/.test(r)) return tempStreak(ctx);
    if (/\b(hottest|warmest|highest temp\w*|how hot|record high)\b/.test(r)) return tempExtreme(ctx, 'hot');
    if (/\b(coldest|coolest|lowest temp\w*|how cold|record low|chilliest)\b/.test(r)) return tempExtreme(ctx, 'cold');
    if (normalWord || win) return weatherSummary(ctx);
    return tempNow(ctx);
  }

  function tempRule(ctx) {
    var r = ctx.rest;
    var th = threshold(r);
    if (th && th.unit && th.unit !== 'degrees') th = null;
    if (!th && /\bfreez\w*|froze\w*|frost\w*/.test(r)) th = { dir: 'below', value: 32 };
    if (!th && /\b(hot|heat)\b/.test(r)) th = { dir: 'above', value: 90 };
    if (!th) return null;
    var nights = /\b(nights?|lows?|overnight|mornings?)\b/.test(r);
    var highs = /\bhighs?\b|\bafternoons?\b/.test(r);
    var field = th.dir === 'above' ? (nights ? 'low' : 'high') : (highs ? 'high' : 'low');
    return {
      dir: th.dir, value: th.value, field: field,
      test: th.dir === 'above'
        ? function (d) { return num(d[field]) != null && num(d[field]) >= th.value; }
        : function (d) { return num(d[field]) != null && num(d[field]) <= th.value; }
    };
  }
  function tempVerb(rule, over, negative) {
    var T = rule.value;
    if (rule.field === 'high' && rule.dir === 'above') return negative ? (over ? 'did not reach ' : 'has not reached ') + T : (over ? 'hit ' : 'has hit ') + T + ' or hotter';
    if (rule.field === 'low' && rule.dir === 'above') return negative ? (over ? 'never stayed at ' : 'has not stayed at ') + T + ' or warmer overnight' : (over ? 'stayed at ' : 'has stayed at ') + T + ' or warmer overnight';
    if (rule.field === 'low' && T === 32) return negative ? (over ? 'did not freeze' : 'has not frozen') : (over ? 'froze' : 'has frozen');
    if (rule.field === 'low') return negative ? (over ? 'did not drop to ' : 'has not dropped to ') + T : (over ? 'dropped to ' : 'has dropped to ') + T + ' or colder';
    return negative ? (over ? 'never topped out at ' : 'has not topped out at ') + T + ' or cooler' : (over ? 'topped out at ' : 'has topped out at ') + T + ' or cooler';
  }

  function tempCount(ctx) {
    var rule = tempRule(ctx);
    if (!rule) return weatherSummary(ctx);
    var win = backWindow(ctx, thisYear);
    return weatherRows(win).then(function (got) {
      var days = got.days.filter(function (d) { return num(d[rule.field]) != null; });
      if (!days.length) return nothingOnFile('Temperature', win, WEATHER_DOOR);
      var src = SOURCES[got.source];
      var over = isOver(win);
      var hits = days.filter(rule.test);
      var unit = rule.field === 'low' ? ['night', 'nights'] : ['day', 'days'];
      var freeze = rule.field === 'low' && rule.dir === 'below' && rule.value === 32;
      var lead = yesNo(ctx, hits.length > 0);
      var pick = function (d) { return num(d[rule.field]); };
      var say = [];
      if (hits.length) {
        say.push(lead + (freeze ? 'It ' + tempVerb(rule, over) + ' ' + src.at : src.who + ' ' + tempVerb(rule, over)) +
          ' on ' + counted(hits.length, unit[0], unit[1]) + ' ' + win.say + '.');
        var extreme = rule.dir === 'above' ? most(hits, pick) : least(hits, pick);
        var which = rule.dir === 'above' ? (rule.field === 'high' ? 'The hottest was ' : 'The warmest night was ')
          : (rule.field === 'low' ? 'The coldest was ' : 'The coolest was ');
        say.push(which + degrees(pick(extreme)) + ', on ' + onDate(extreme.date) + '.');
      } else {
        say.push(lead + (freeze ? 'It ' + tempVerb(rule, over, true) + ' ' + src.at : src.who + ' ' + tempVerb(rule, over, true)) + ' ' + win.say + '.');
        var closest = rule.dir === 'above' ? most(days, pick) : least(days, pick);
        if (closest) say.push('The closest it came was ' + degrees(pick(closest)) + ', on ' + onDate(closest.date) + '.');
      }
      return card({
        kicker: 'Temperature', tag: src.tag + ', ' + spanLabel(days[0].date, days[days.length - 1].date), say: say,
        cells: [cell('📅', cap(unit[1]), String(hits.length))],
        table: hits.length ? { head: ['Day', rule.field === 'low' ? 'Low' : 'High'], label: counted(hits.length, unit[0], unit[1]), rows: hits.slice().reverse().slice(0, 60).map(function (d) { return [labelDate(d.date), deg(pick(d))]; }) } : null,
        note: (rule.field === 'low' ? 'Each night goes by the day\'s low. ' : 'Each day goes by its high. ') + sourceNote(got.source, got.station),
        door: WEATHER_DOOR
      });
    });
  }

  function tempStreak(ctx) {
    var rule = tempRule(ctx);
    if (!rule) return weatherSummary(ctx);
    var win = backWindow(ctx, thisYear);
    return weatherRows(win).then(function (got) {
      var days = got.days.filter(function (d) { return num(d[rule.field]) != null; });
      if (!days.length) return nothingOnFile('Temperature', win, WEATHER_DOOR);
      var src = SOURCES[got.source];
      var runs = runsOf(days, rule.test);
      if (!runs.length) return tempCount(ctx);
      var longest = runs.reduce(function (best, run) { return run.days.length >= best.days.length ? run : best; }, runs[0]);
      var unit = rule.field === 'low' ? ['night', 'nights'] : ['day', 'days'];
      var ranked = runs.slice().sort(function (a, b) { return b.days.length - a.days.length; }).slice(0, 5);
      var phrase = tempVerb(rule, true).replace(/^(hit|stayed at|froze|dropped to|topped out at)/, function (w) {
        return { 'hit': 'at', 'stayed at': 'at', 'froze': 'below freezing', 'dropped to': 'down at', 'topped out at': 'topping out at' }[w];
      });
      return card({
        kicker: 'Temperature', tag: src.tag,
        say: ['The longest run ' + src.at + ' ' + win.say + ' of ' + unit[1] + ' ' + phrase + ' was ' + counted(longest.days.length, unit[0], unit[1]) +
          ', from ' + onDate(longest.from) + ' to ' + onDate(longest.to) + '.'],
        table: { head: ['Stretch', cap(unit[1])], rows: ranked.map(function (run) { return [spanLabel(run.from, run.to), String(run.days.length)]; }) },
        note: sourceNote(got.source, got.station), door: WEATHER_DOOR
      });
    });
  }

  function tempExtreme(ctx, which) {
    var r = ctx.rest;
    var nights = /\b(nights?|lows?|overnight|mornings?)\b/.test(r);
    var daytime = /\b(days?|highs?|afternoons?)\b/.test(r);
    var field = which === 'hot' ? (nights ? 'low' : 'high') : (daytime && !nights ? 'high' : 'low');
    var pick = function (d) { return num(d[field]); };
    var win = backWindow(ctx, everything);
    return weatherRows(win).then(function (got) {
      var days = got.days.filter(function (d) { return pick(d) != null; });
      if (!days.length) return nothingOnFile('Temperature', win, WEATHER_DOOR);
      var src = SOURCES[got.source];
      var best = which === 'hot' ? most(days, pick) : least(days, pick);
      var opener = which === 'hot'
        ? (field === 'high' ? 'The hottest it got ' : 'The warmest night ')
        : (field === 'low' ? 'The coldest it got ' : 'The coolest day ');
      var verb = field === 'high' && which === 'cold' ? ' topped out at ' : field === 'low' && which === 'hot' ? ' stayed at ' : ' was ';
      var say = [opener + src.at + ' ' + win.say + verb + degrees(pick(best)) + ', on ' + onDate(best.date) + '.'];
      var ranked = days.slice().sort(function (a, b) { return which === 'hot' ? pick(b) - pick(a) : pick(a) - pick(b); }).slice(0, 5);
      var result = card({
        kicker: 'Temperature', tag: src.tag, say: say,
        table: { head: ['Day', field === 'high' ? 'High' : 'Low'], rows: ranked.map(function (d) { return [onDate(d.date), deg(pick(d))]; }) },
        note: 'Ties go to the most recent year. ' + sourceNote(got.source, got.station), door: WEATHER_DOOR
      });
      if (got.source !== 'airport' || win.kind !== 'all' || !got.station.first) return result;
      return weatherRows(span(got.station.first, today(), '', 'all')).then(function (ours) {
        var list = ours.days.filter(function (d) { return pick(d) != null; });
        var mine = which === 'hot' ? most(list, pick) : least(list, pick);
        if (mine) {
          result.say.push('Our station\'s own ' + (which === 'hot' ? 'hottest' : 'coldest') + ' since its log starts is ' + degrees(pick(mine)) + ', on ' + onDate(mine.date) + '.');
        }
        return result;
      });
    });
  }

  function weatherSummary(ctx) {
    var win = backWindow(ctx, thisMonth);
    return Promise.all([weatherRows(win), normalsByDate().catch(function () { return null; })]).then(function (parts) {
      var got = parts[0];
      var days = got.days.filter(function (d) { return num(d.high) != null || num(d.low) != null; });
      if (!days.length) return nothingOnFile('Weather', win, WEATHER_DOOR);
      if (days.length === 1) return daySummary(ctx);
      var src = SOURCES[got.source];
      var over = isOver(win);
      var highs = average(days.filter(function (d) { return !d.partial; }).map(function (d) { return num(d.high); }));
      var lows = average(days.filter(function (d) { return !d.partial; }).map(function (d) { return num(d.low); }));
      var hot = most(days, function (d) { return num(d.high); });
      var cold = least(days, function (d) { return num(d.low); });
      var rain = total(days, function (d) { return num(d.rain); });
      var say = [];
      if (highs != null && lows != null) say.push('Highs ' + (over ? 'averaged ' : 'have averaged ') + Math.round(highs) + ' and lows ' + Math.round(lows) + ' ' + src.at + ' ' + win.say + '.');
      if (hot && cold) say.push('The hottest day was ' + degrees(num(hot.high)) + ' on ' + onDate(hot.date) + ', and the coldest night was ' + degrees(num(cold.low)) + ' on ' + onDate(cold.date) + '.');
      say.push('Rain came to ' + inches(rain) + '.');
      if (parts[1] && win.kind === 'month') {
        var first = parts[1][win.from.slice(5)];
        var last = parts[1][win.end.slice(5)];
        if (first && last) say.push('Normal highs at the Birmingham airport run from ' + first.high + ' to ' + last.high + ' across ' + MONTHS[monthOf(win.from) - 1] + '.');
      }
      return card({
        kicker: 'Weather', tag: src.tag + ', ' + spanLabel(days[0].date, days[days.length - 1].date), say: say,
        cells: [
          cell('🌡️', 'Average high', highs != null ? deg(highs) : DASH),
          cell('🌡️', 'Average low', lows != null ? deg(lows) : DASH),
          cell('🌧️', 'Rain', inchesShort(rain))
        ],
        note: sourceNote(got.source, got.station), door: WEATHER_DOOR
      });
    });
  }

  function daySummary(ctx) {
    var win = ctx.win;
    if (win.from > today()) return answerForecast(ctx, true);
    return Promise.all([weatherRows(win), creekRows(win).catch(function () { return null; })]).then(function (parts) {
      var got = parts[0];
      var d = got.days[0];
      if (!d || (num(d.high) == null && num(d.low) == null && num(d.rain) == null)) return nothingOnFile('Weather', win, WEATHER_DOOR);
      var src = SOURCES[got.source];
      var when = d.partial ? 'So far today' : d.date === addDays(today(), -1) ? 'Yesterday' : 'On ' + onDate(d.date) + ',';
      var verb = d.partial ? ' has seen ' : got.source === 'airport' ? ' recorded ' : ' saw ';
      var bits = [];
      if (num(d.high) != null) bits.push('a high of ' + Math.round(num(d.high)));
      if (num(d.low) != null) bits.push('a low of ' + Math.round(num(d.low)));
      var rain = num(d.rain);
      var sentence = when + ' ' + src.who.charAt(0).toLowerCase() + src.who.slice(1) + verb + bits.join(' and ') +
        (rain == null ? '.' : rain > 0 ? ', with ' + inches(rain) + ' of rain.' : ', and no rain.');
      var say = [(/\brain/.test(ctx.q) ? yesNo(ctx, rain > 0) : '') + sentence];
      if (num(d.snow) > 0) say.push('It snowed ' + snowInches(num(d.snow)) + '.');
      var creekDay = parts[1] && parts[1].days[0];
      if (creekDay && highOf(creekDay) != null) {
        say.push('Five Mile Creek ' + (creekDay.partial ? 'has topped out so far at ' : 'topped out at ') + feet(highOf(creekDay)) + ' at Republic.');
      }
      var cells = [];
      if (num(d.high) != null) cells.push(cell('🌡️', 'High', deg(num(d.high))));
      if (num(d.low) != null) cells.push(cell('🌡️', 'Low', deg(num(d.low))));
      if (rain != null) cells.push(cell('🌧️', 'Rain', inchesShort(rain)));
      if (creekDay && highOf(creekDay) != null) cells.push(cell('🌊', 'Creek high', feetShort(highOf(creekDay))));
      return card({
        kicker: 'Weather', tag: labelDate(d.date), say: say, cells: cells,
        note: sourceNote(got.source, got.station), door: WEATHER_DOOR
      });
    });
  }

  function tempNow(ctx) {
    return fetchJson(WEATHER_FILE).then(function (wx) {
      var current = wx && wx.current ? wx.current : {};
      var temp = num(current.temp) != null ? num(current.temp) : num(wx.temp);
      if (temp == null) return null;
      var feels = num(current.feelsLike);
      var humidity = num(current.humidity);
      var soFar = stationSoFar(wx);
      var say = ['It is ' + degrees(temp) + ' at our station' + (feels != null && Math.abs(feels - temp) >= 3 ? ', and it feels like ' + Math.round(feels) + '.' : '.')];
      if (soFar && soFar.high != null && soFar.low != null) say.push('The high so far today is ' + Math.round(soFar.high) + ' and the low was ' + Math.round(soFar.low) + '.');
      var cells = [cell('🌡️', 'Now', deg(temp))];
      if (feels != null) cells.push(cell('🌡️', 'Feels like', deg(feels)));
      if (humidity != null) cells.push(cell('💧', 'Humidity', Math.round(humidity) + '%'));
      return card({
        kicker: 'Temperature', tag: 'Right now', say: say, cells: cells,
        note: 'From the FIVEMILE weather station.', door: ALMANAC_DOOR
      });
    });
  }

  /* The freeze line is 32, the low for the day. The first freeze of a season
     is counted from July 1, so a fall and the winter after it are one season. */
  function freezeEvent(ctx, which) {
    var freezes = function (d) { return num(d.low) != null && num(d.low) <= 32; };
    var now = today();
    if (which === 'last') {
      return Promise.all([fetchJson(WEATHER_FILE).catch(function () { return null; }), shelf(STATION_DIR)]).then(function (parts) {
        var soFar = stationSoFar(parts[0]);
        var found = soFar && freezes(soFar) ? Promise.resolve({ day: soFar, source: 'station' })
          : lastWhere(STATION_DIR, addDays(now, -1), freezes).then(function (day) {
            return day ? { day: day, source: 'station' } : lastWhere(AIRPORT_DIR, addDays(now, -1), freezes).then(function (d) { return d ? { day: d, source: 'airport' } : null; });
          });
        return found.then(function (hit) {
          if (!hit) return null;
          var src = SOURCES[hit.source];
          var n = daysApart(hit.day.date, now);
          return card({
            kicker: 'Frost', tag: src.tag,
            say: ['The last freeze ' + src.at + ' was ' + onDate(hit.day.date) + ', when it got down to ' + degrees(num(hit.day.low)) + '.', n > 1 ? 'That was ' + ago(hit.day.date) + '.' : ''],
            cells: [cell('❄️', 'Last freeze', labelDate(hit.day.date)), cell('🕰️', 'Days since', String(n))],
            note: 'A freeze is a low of 32 or colder. ' + sourceNote(hit.source, parts[1]), door: WEATHER_DOOR
          });
        });
      });
    }
    var seasonYear = monthOf(now) >= 7 ? yearOf(now) : yearOf(now) - 1;
    var season = span(seasonYear + '-07-01', now, 'this season', 'season');
    return weatherRows(season).then(function (got) {
      var src = SOURCES[got.source];
      var hit = got.days.filter(freezes)[0];
      if (hit) {
        return card({
          kicker: 'Frost', tag: src.tag,
          say: [yesNo(ctx, true) + 'The first freeze of the season came on ' + onDate(hit.date) + ' ' + src.at + ', at ' + degrees(num(hit.low)) + '.'],
          note: 'A freeze is a low of 32 or colder, and a season runs from July 1. ' + sourceNote(got.source, got.station), door: WEATHER_DOOR
        });
      }
      var lastSeason = span((seasonYear - 1) + '-07-01', seasonYear + '-06-30', '', 'season');
      return Promise.all([weatherRows(lastSeason), gardenFrost().catch(function () { return null; })]).then(function (parts) {
        var prior = parts[0];
        var then = prior.days.filter(freezes)[0];
        var say = [yesNo(ctx, false) + 'There has not been a freeze yet this season ' + src.at + '.'];
        if (then) say.push('Last season the first one came on ' + onDate(then.date) + ' ' + SOURCES[prior.source].at + '.');
        if (parts[1]) say.push('The garden desk counts on the first fall frost ' + parts[1].fall + '.');
        return card({
          kicker: 'Frost', tag: src.tag, say: say,
          note: 'A freeze is a low of 32 or colder, and a season runs from July 1. ' + sourceNote(got.source, got.station),
          door: { href: 'fivemile-garden.html', label: 'Garden desk' }
        });
      });
    });
  }

  /* The frost dates are the garden desk's, read off the garden page itself,
     so there is one place they are written. */
  function gardenFrost() {
    return fetchText(GARDEN_PAGE).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var rows = Array.prototype.slice.call(doc.querySelectorAll('.t-row'));
      function read(pattern) {
        var row = rows.filter(function (r) { return pattern.test(r.textContent); })[0];
        var value = row && row.querySelector('b') ? row.querySelector('b').textContent.trim() : '';
        return value.replace(/^Around\s+/i, 'around ').replace(/\b([A-Z][a-z]{2})\s+(\d{1,2})\b/, function (m, mon, day) {
          var month = MONTH_NUM[mon.toLowerCase()];
          return month ? MONTHS[month - 1] + ' ' + day : m;
        });
      }
      var spring = read(/last spring frost/i);
      var fall = read(/first fall frost/i);
      if (!spring || !fall) return null;
      var holder = rows.length ? rows[0].closest('.card-tab') : null;
      var note = holder && holder.querySelector('.t-note') ? holder.querySelector('.t-note').textContent.replace(/\s+/g, ' ').trim() : '';
      return { spring: spring, fall: fall, note: note };
    });
  }

  function frostDates(ctx) {
    return gardenFrost().then(function (frost) {
      if (!frost) return null;
      var now = today();
      var springFreeze = lastWhere(STATION_DIR, sooner(addDays(now, -1), yearOf(now) + '-06-30'), function (d) { return num(d.low) != null && num(d.low) <= 32; })
        .catch(function () { return null; });
      return springFreeze.then(function (last) {
        var say = ['The garden desk counts on the last spring frost ' + frost.spring + ' and the first fall frost ' + frost.fall + '.'];
        if (last && yearOf(last.date) === yearOf(now)) say.push('This year the last freeze at our station came on ' + onDate(last.date) + '.');
        return card({
          kicker: 'Frost', tag: 'Garden desk', say: say, tip: frost.note,
          door: { href: 'fivemile-garden.html', label: 'Garden desk' }
        });
      });
    });
  }

  function recordsOnDate(ctx) {
    var key = ctx.win && ctx.win.from ? ctx.win.from : today();
    var md = key.slice(5);
    return Promise.all([shelf(AIRPORT_DIR), normalsByDate().catch(function () { return {}; })]).then(function (parts) {
      var held = parts[0];
      if (!held.first) return null;
      var jobs = [];
      for (var year = yearOf(held.first); year <= yearOf(held.last); year++) jobs.push(yearRows(AIRPORT_DIR, year));
      return Promise.all(jobs).then(function (years) {
        var rows = [];
        years.forEach(function (list) { list.forEach(function (d) { if (d.date.slice(5) === md) rows.push(d); }); });
        if (!rows.length) return null;
        var hi = most(rows, function (d) { return num(d.high); });
        var lo = least(rows, function (d) { return num(d.low); });
        var wet = most(rows, function (d) { return num(d.rain); });
        var label = MONTHS[monthOf(key) - 1] + ' ' + dayOf(key);
        var say = ['The record high for ' + label + ' at the Birmingham airport is ' + degrees(num(hi.high)) + ', set in ' + yearOf(hi.date) +
          ', and the record low is ' + degrees(num(lo.low)) + ', from ' + yearOf(lo.date) + '.'];
        if (wet && num(wet.rain) > 0) say.push('The most rain on the date was ' + inches(num(wet.rain)) + ', in ' + yearOf(wet.date) + '.');
        var normal = parts[1][md];
        if (normal) say.push('Normal is a high of ' + normal.high + ' and a low of ' + normal.low + '.');
        var cells = [cell('🌡️', 'Record high', deg(num(hi.high)) + ', ' + yearOf(hi.date)), cell('🌡️', 'Record low', deg(num(lo.low)) + ', ' + yearOf(lo.date))];
        if (normal) cells.push(cell('🌡️', 'Normal', normal.high + '° and ' + normal.low + '°'));
        return card({
          kicker: 'On this date', tag: label, say: say, cells: cells,
          note: 'Every ' + label + ' since ' + yearOf(held.first) + '. Ties go to the most recent year. ' + sourceNote('airport'),
          door: WEATHER_DOOR
        });
      });
    });
  }

  /* -------------------------------------------------------------------------
     SNOW, WIND, AIR
     ------------------------------------------------------------------------- */
  function answerSnow(ctx) {
    if (!/\b(snow\w*|flurr\w*|blizzard)\b/.test(ctx.q)) return null;
    var r = ctx.rest;
    var snow = function (d) { return num(d.snow); };
    var note = 'Our station does not measure snow, so this is the official National Weather Service record kept at the Birmingham airport, southeast of the three towns. A trace is not counted.';
    if (/\b(last time|last snow\w*|most recent\w*|how long (since|has it been))\b/.test(r) || (/\bwhen\b/.test(r) && !ctx.win)) {
      return lastWhere(AIRPORT_DIR, addDays(today(), -1), function (d) { return snow(d) != null && snow(d) >= 0.1; }).then(function (day) {
        if (!day) return null;
        return card({
          kicker: 'Snow', tag: 'Birmingham airport',
          say: ['The last measurable snow at the Birmingham airport fell on ' + onDate(day.date) + ', ' + snowInches(snow(day)) + '.', 'That was ' + ago(day.date) + '.'],
          note: note, door: WEATHER_DOOR
        });
      });
    }
    var biggest = /\b(biggest|most|deepest|record|heaviest)\b/.test(r);
    var seasonYear = monthOf(today()) >= 7 ? yearOf(today()) + 1 : yearOf(today());
    var lastWinter = span((seasonYear - 1) + '-07-01', seasonYear + '-06-30', 'this winter', 'season');
    if (seasonSpan('winter', seasonYear).from > today()) lastWinter = span((seasonYear - 2) + '-07-01', (seasonYear - 1) + '-06-30', 'last winter', 'season');
    var win = backWindow(ctx, biggest ? everything : function () { return lastWinter; });
    return weatherRows(win, true).then(function (got) {
      var days = got.days;
      if (!days.length) return nothingOnFile('Snow', win, WEATHER_DOOR);
      var snowy = days.filter(function (d) { return snow(d) != null && snow(d) >= 0.1; });
      if (biggest) {
        var best = most(snowy, snow);
        if (!best) return card({ kicker: 'Snow', tag: 'Birmingham airport', say: ['No measurable snow fell at the Birmingham airport ' + win.say + '.'], note: note, door: WEATHER_DOOR });
        var ranked = snowy.slice().sort(function (a, b) { return snow(b) - snow(a); }).slice(0, 5);
        return card({
          kicker: 'Snow', tag: 'Birmingham airport',
          say: ['The biggest snow in a day at the Birmingham airport ' + win.say + ' was ' + snowInches(snow(best)) + ', on ' + onDate(best.date) + '.'],
          table: { head: ['Day', 'Snow'], rows: ranked.map(function (d) { return [onDate(d.date), snow(d).toFixed(1) + ' in']; }) },
          note: note, door: WEATHER_DOOR
        });
      }
      var fell = total(snowy, snow);
      var over = isOver(win);
      return card({
        kicker: 'Snow', tag: 'Birmingham airport',
        say: [snowy.length
          ? yesNo(ctx, true) + 'The Birmingham airport ' + (over ? 'measured ' : 'has measured ') + snowInches(fell) + ' of snow ' + win.say + ', on ' + counted(snowy.length, 'day', 'days') + '.'
          : yesNo(ctx, false) + 'No measurable snow ' + (over ? 'fell' : 'has fallen') + ' at the Birmingham airport ' + win.say + '.'],
        table: snowy.length ? { head: ['Day', 'Snow'], label: counted(snowy.length, 'day', 'days'), rows: snowy.map(function (d) { return [onDate(d.date), snow(d).toFixed(1) + ' in']; }) } : null,
        note: note, door: WEATHER_DOOR
      });
    });
  }

  var COMPASS = { N: 'north', NE: 'northeast', E: 'east', SE: 'southeast', S: 'south', SW: 'southwest', W: 'west', NW: 'northwest',
    NNE: 'north northeast', ENE: 'east northeast', ESE: 'east southeast', SSE: 'south southeast',
    SSW: 'south southwest', WSW: 'west southwest', WNW: 'west northwest', NNW: 'north northwest' };

  function answerWind(ctx) {
    if (!/\b(wind\w*|gusts?|gusty|breez\w*)\b/.test(ctx.q)) return null;
    var r = ctx.rest;
    var pastWords = /\b(was|were|been|did|had|got|strongest|highest|biggest|windiest|most|record|ever|how many)\b/;
    if ((ctx.win && ctx.win.kind === 'now') || (!ctx.win && !pastWords.test(r))) {
      return fetchJson(WEATHER_FILE).then(function (wx) {
        var c = wx && wx.current ? wx.current : {};
        var speed = num(c.windSpeed);
        if (speed == null) return null;
        var gust = num(c.windGust);
        var from = COMPASS[String(c.windDir || '').toUpperCase()];
        return card({
          kicker: 'Wind', tag: 'Right now',
          say: [speed < 1 ? 'The air is still at our station right now' + (gust >= 3 ? ', with the odd gust to ' + mph(gust) + '.' : '.')
            : 'The wind at our station is ' + mph(speed) + (from ? ' out of the ' + from : '') + (gust > speed ? ', gusting to ' + Math.round(gust) : '') + '.'],
          cells: [cell('💨', 'Wind', Math.round(speed) + ' mph'), cell('💨', 'Gusts', gust != null ? Math.round(gust) + ' mph' : DASH)],
          note: 'From the FIVEMILE weather station.', door: ALMANAC_DOOR
        });
      });
    }
    var win = backWindow(ctx, thisYear);
    return shelf(STATION_DIR).then(function (station) {
      if (!station.first || win.from < station.first) {
        return card({ kicker: 'Wind', say: ['Our station\'s wind log starts on ' + onDate(station.first) + ', and the airport record carries no wind.'], door: WEATHER_DOOR });
      }
      return weatherRows(win).then(function (got) {
        var pick = function (d) { return num(d.maxGust); };
        var days = got.days.filter(function (d) { return pick(d) != null; });
        if (!days.length) return nothingOnFile('Wind', win, WEATHER_DOOR);
        var th = threshold(r);
        if (th && /how (many|often)/.test(r)) {
          var hits = days.filter(function (d) { return th.dir === 'above' ? pick(d) >= th.value : pick(d) <= th.value; });
          return card({
            kicker: 'Wind', tag: 'Our station',
            say: ['Gusts at our station ' + (th.dir === 'above' ? 'reached ' + th.value + ' miles an hour or more' : 'stayed at ' + th.value + ' or under') + ' on ' + counted(hits.length, 'day', 'days') + ' ' + win.say + '.'],
            table: hits.length ? { head: ['Day', 'Top gust'], label: counted(hits.length, 'day', 'days'), rows: hits.slice().reverse().slice(0, 60).map(function (d) { return [labelDate(d.date), Math.round(pick(d)) + ' mph']; }) } : null,
            note: sourceNote('station', station), door: WEATHER_DOOR
          });
        }
        var best = most(days, pick);
        var ranked = days.slice().sort(function (a, b) { return pick(b) - pick(a); }).slice(0, 5);
        return card({
          kicker: 'Wind', tag: 'Our station',
          say: ['The strongest gust at our station ' + win.say + ' was ' + Math.round(pick(best)) + ' miles an hour, on ' + onDate(best.date) + '.'],
          table: { head: ['Day', 'Top gust'], rows: ranked.map(function (d) { return [labelDate(d.date), Math.round(pick(d)) + ' mph']; }) },
          note: sourceNote('station', station), door: WEATHER_DOOR
        });
      });
    });
  }

  function answerAir(ctx) {
    if (!/\bair quality\b|\baqi\b|\bsmok\w*|\bhaz[ey]\b|\bozone\b|\bpollution\b|\bthe air\b/.test(ctx.q)) return null;
    return fetchJson(AIR_FILE).then(function (data) {
      var c = data && data.current;
      var aqi = c ? num(c.usAqi) : null;
      if (aqi == null) return null;
      var say = ['The air quality index here is ' + Math.round(aqi) + ' right now, which counts as ' + String(c.category || '').toLowerCase() + '.'];
      if (c.label) say.push(c.label);
      if (c.note) say.push(c.note);
      var cells = [cell('🌫️', 'Index', String(Math.round(aqi))), cell('🌫️', 'Category', c.category || DASH)];
      if (num(c.pm25) != null) cells.push(cell('🌫️', 'Fine particles', c.pm25 + ' ' + (c.pm25Unit || '')));
      return card({ kicker: 'Air', tag: 'Right now', say: say, cells: cells, door: { href: 'fivemile-almanac.html', label: 'Almanac' } });
    });
  }

  /* -------------------------------------------------------------------------
     THE FORECAST
     ------------------------------------------------------------------------- */
  function skyWords(text) {
    return String(text || '').toLowerCase()
      .replace(/^slight chance /, 'a slight chance of ')
      .replace(/^chance /, 'a chance of ');
  }

  function answerForecast(ctx, force) {
    var q = ctx.q;
    var win = ctx.win;
    var ahead = win && (win.kind === 'tomorrow' || win.kind === 'tonight' || win.kind === 'weekend' || win.kind === 'next' ||
      (win.ahead && win.ahead.from > today()));
    var asks = /\b(forecast|will it|is it going to|going to|gonna|supposed to|chance of|expected|expect|outlook)\b/.test(q);
    var weathery = /\b(rain\w*|storm\w*|hot|cold|warm|cool|temp\w*|weather|sunny|cloud\w*|high|low|freez\w*|forecast|chance|showers?)\b/.test(q);
    if (!force && !(weathery && (ahead || asks))) return null;
    if (/\bcreek\b/.test(q)) return null;
    var W = window.FivemileWx;
    if (!W) return null;
    return fetchJson(WEATHER_FILE).then(function (wx) {
      var periods = W.live(wx && wx.forecast);
      var days = W.days(wx && wx.forecast);
      if (!periods.length) return null;
      var rainQuestion = /\b(rain\w*|storm\w*|showers?|wet)\b/.test(q);
      var note = 'The National Weather Service forecast for this area.';
      var door = { href: 'fivemile-almanac.html', label: 'Almanac' };
      function popOf(entry) { return Math.max(W.pop(entry.day) || 0, entry.night ? W.pop(entry.night) || 0 : 0); }
      function rainLead(p) {
        if (!rainQuestion || !ctx.aux) return '';
        return p < 20 ? 'It does not look like it. ' : p < 50 ? 'There is a chance. ' : 'It looks likely. ';
      }
      if (win && win.kind === 'tonight') {
        var night = periods.filter(function (p) { return !p.isDaytime; })[0];
        if (!night) return null;
        var p = W.pop(night) || 0;
        return card({
          kicker: 'Forecast', tag: 'Tonight',
          say: [rainLead(p) + 'Tonight should drop to about ' + night.temperature + rainChance(p),
            'The weather service calls it ' + skyWords(night.shortForecast) + '.'],
          note: note, door: door
        });
      }
      var range = win ? (win.ahead || win) : null;
      var picked = days.filter(function (entry) {
        var key = keyOf(entry.start);
        return !range || (key >= range.from && key <= (range.end || range.to));
      });
      if (!picked.length) picked = days.slice(0, range ? 0 : 7);
      if (!picked.length) return null;
      if (picked.length === 1) {
        var e = picked[0];
        var key = keyOf(e.start);
        var name = key === today() ? 'Today' : key === addDays(today(), 1) ? 'Tomorrow' : dayName(key);
        var chance = popOf(e);
        return card({
          kicker: 'Forecast', tag: name,
          say: [rainLead(chance) + name + ' should reach ' + e.day.temperature + (e.night ? ' and drop to ' + e.night.temperature + ' overnight' : '') + rainChance(chance),
            'The weather service calls it ' + skyWords(e.day.shortForecast) + '.'],
          cells: [cell('🌡️', 'High', deg(e.day.temperature)), cell('🌡️', 'Low', e.night ? deg(e.night.temperature) : DASH), cell('🌧️', 'Chance of rain', chance + '%')],
          note: note, door: door
        });
      }
      var hottest = most(picked, function (entry) { return num(entry.day.temperature); });
      var wettest = most(picked.slice().reverse(), popOf);
      var best = popOf(wettest);
      return card({
        kicker: 'Forecast', tag: spanLabel(keyOf(picked[0].start), keyOf(picked[picked.length - 1].start)),
        say: (function () {
          var heat = 'The warmest day ahead is ' + dayName(keyOf(hottest.start)) + ', at ' + hottest.day.temperature + '.';
          var wet = best > 0 ? 'The best chance of rain is ' + percent(best) + ', on ' + dayName(keyOf(wettest.start)) + '.' : 'No day shows any chance of rain.';
          /* Asked about rain, the rain goes first. */
          return rainQuestion ? [rainLead(best) + wet, heat] : [heat, wet];
        })(),
        table: {
          head: ['Day', 'High', 'Low', 'Rain'],
          rows: picked.map(function (entry) {
            return [dayName(keyOf(entry.start)).slice(0, 3), deg(entry.day.temperature), entry.night ? deg(entry.night.temperature) : DASH, popOf(entry) + '%'];
          })
        },
        note: note, door: door
      });
    });
  }

  /* -------------------------------------------------------------------------
     THE SKY

     Every moon and sun date comes off fivemile-sky.js, which is the one place
     the site decides what the moon is doing. See DECISIONS.md 67.
     ------------------------------------------------------------------------- */
  function answerSky(ctx) {
    var q = ctx.q;
    var S = window.FivemileSky;
    if (!S) return null;
    if (/\b(harvest|hunters?|blue|strawberry|wolf|snow|worm|pink|flower|buck|sturgeon|beaver|cold|super|blood) moon\b/.test(q)) return null;
    var door = { href: 'fivemile-nightsky.html', label: 'Night sky' };
    if (/\b(equinox|solstice|longest day|shortest day|first day of (spring|summer|fall|autumn|winter))\b/.test(q)) return skyTurning(ctx, S);
    if (/\bmoon\w*\b/.test(q)) return skyMoon(ctx, S, door);
    if (/\b(sunrise|sunset|sun ?(come|comes|go|goes|rise|rises|set|sets) ?(up|down)?|daylight|get dark|gets dark|sundown|sunup|dawn|dusk|how long is the day|length of (the )?day)\b/.test(q)) return skySun(ctx, S);
    return null;
  }

  function skyMoon(ctx, S, door) {
    var q = ctx.q;
    var now = new Date();
    var upcoming = ['New Moon', 'First Quarter', 'Full Moon', 'Last Quarter'].map(function (name) {
      return { name: name, when: S.nextMoonPhase(now, name) };
    }).filter(function (row) { return row.when; }).sort(function (a, b) { return a.when - b.when; });
    var marks = { 'New Moon': '🌑', 'First Quarter': '🌓', 'Full Moon': '🌕', 'Last Quarter': '🌗' };
    var cells = upcoming.map(function (row) { return cell(marks[row.name], cap(row.name.toLowerCase()), labelDate(keyOf(row.when))); });
    var day = ctx.win && ctx.win.ahead ? ctx.win.ahead.from : ctx.win && ctx.win.kind === 'day' ? ctx.win.from : today();

    if (/\bmoon ?(rise|rises|set|sets)\b|\bmoon (come|comes|go|goes) (up|down)\b/.test(q)) {
      var moonAt = S.moonTimes(dateOf(day));
      var when = day === today() ? 'today' : day === addDays(today(), 1) ? 'tomorrow' : 'on ' + onDate(day);
      var parts = [];
      if (moonAt.rise) parts.push('rises at ' + clock(moonAt.rise));
      if (moonAt.set) parts.push('sets at ' + clock(moonAt.set));
      if (!parts.length) return null;
      return card({ kicker: 'The moon', tag: labelDate(day), say: ['The moon ' + parts.join(' and ') + ' ' + when + '.'], door: door });
    }

    var named = q.match(/\b(full|new|first quarter|last quarter|third quarter|half) moon\b/) || q.match(/\b(first quarter|last quarter|third quarter)\b/);
    if (named) {
      var phase = { full: 'Full Moon', 'new': 'New Moon', 'first quarter': 'First Quarter', half: 'First Quarter', 'last quarter': 'Last Quarter', 'third quarter': 'Last Quarter' }[named[1]];
      var at = S.nextMoonPhase(now, phase);
      if (!at) return null;
      var key = keyOf(at);
      var label = phase.toLowerCase() + (/quarter/i.test(phase) ? ' moon' : '');
      return card({
        kicker: 'The moon', tag: labelDate(key),
        say: [key === today() ? 'The ' + label + ' is today, at ' + clock(at) + '.' : 'The next ' + label + ' is ' + fullDay(key) + '.'],
        cells: cells, door: door
      });
    }

    var evening = dateOf(day);
    evening.setHours(21, 0, 0, 0);
    var tonight = S.moonPhase(evening);
    var name = tonight.name.toLowerCase() + (/quarter/.test(tonight.name.toLowerCase()) ? ' moon' : '');
    var full = upcoming.filter(function (row) { return row.name === 'Full Moon'; })[0];
    var whenWord = day === today() ? 'tonight' : day === addDays(today(), 1) ? 'tomorrow night' : 'on the night of ' + onDate(day);
    return card({
      kicker: 'The moon', tag: labelDate(day),
      say: ['The moon ' + whenWord + ' is a ' + name + ', ' + percent(tonight.fraction * 100) + ' lit.',
        full ? 'The next full moon is ' + fullDay(keyOf(full.when)) + '.' : ''],
      cells: cells, door: door
    });
  }

  function skySun(ctx, S) {
    var key = ctx.win ? (ctx.win.ahead && ctx.win.kind !== 'day' ? ctx.win.ahead.from : ctx.win.from) : today();
    var date = dateOf(key);
    var times = S.riseSetTransit(date, S.sunAt, { h0: -0.833 });
    if (!times.rise || !times.set) return null;
    var minutes = Math.round((times.set - times.rise) / 60000);
    var tomorrow = S.riseSetTransit(dateOf(addDays(key, 1)), S.sunAt, { h0: -0.833 });
    var when = key === today() ? 'today' : key === addDays(today(), 1) ? 'tomorrow' : 'on ' + onDate(key);
    var gone = key < today();
    var say = ['Sunrise ' + when + (gone ? ' was' : ' is') + ' at ' + clock(times.rise) + ' and sunset at ' + clock(times.set) +
      ', which ' + (gone ? 'made ' : 'makes ') + counted(Math.floor(minutes / 60), 'hour', 'hours') + ' and ' + counted(minutes % 60, 'minute', 'minutes') + ' of daylight.'];
    if (/\bdark\b/.test(ctx.q)) say.push('It is dark from about ' + clock(new Date(times.set.getTime() + 45 * 60000)) + '.');
    if (tomorrow.rise && tomorrow.set) {
      var change = Math.round((tomorrow.set - tomorrow.rise) / 60000) - minutes;
      if (change !== 0) say.push('The days are getting ' + (change > 0 ? 'longer' : 'shorter') + ' by about ' + counted(Math.abs(change), 'minute', 'minutes') + ' a day.');
    }
    return card({
      kicker: 'The sun', tag: labelDate(key), say: say,
      cells: [cell('☀️', 'Sunrise', clock(times.rise)), cell('☀️', 'Sunset', clock(times.set)), cell('☀️', 'Daylight', Math.floor(minutes / 60) + ' hr ' + (minutes % 60) + ' min')],
      door: ALMANAC_DOOR
    });
  }

  function skyTurning(ctx, S) {
    var q = ctx.q;
    var names = /\bspring\b/.test(q) ? ['spring-equinox']
      : /\b(fall|autumn)\b/.test(q) ? ['fall-equinox']
      : /\b(summer|longest day)\b/.test(q) ? ['summer-solstice']
      : /\b(winter|shortest day)\b/.test(q) ? ['winter-solstice']
      : /\bequinox\b/.test(q) ? ['spring-equinox', 'fall-equinox'] : ['summer-solstice', 'winter-solstice'];
    var words = { 'spring-equinox': 'the spring equinox', 'fall-equinox': 'the fall equinox', 'summer-solstice': 'the summer solstice', 'winter-solstice': 'the winter solstice' };
    var now = new Date();
    var startOfToday = dateOf(today());
    startOfToday.setHours(0, 0, 0, 0);
    var found = null;
    names.forEach(function (name) {
      [now.getFullYear(), now.getFullYear() + 1].forEach(function (year) {
        var at = S.sunTurning(year, name);
        if (at && at >= startOfToday && (!found || at < found.at)) found = { name: name, at: at };
      });
    });
    if (!found) return null;
    var key = keyOf(found.at);
    return card({
      kicker: 'The sun', tag: labelDate(key),
      say: [cap(words[found.name]) + (key === today() ? ' is today, at ' : ' is ' + fullDay(key) + ', at ') + clock(found.at) + '.'],
      door: { href: 'fivemile-calendar.html', label: 'Calendar' }
    });
  }

  /* -------------------------------------------------------------------------
     TEXT MATCHING

     Shared by the dates, the stories, the sightings and the matches. A word is
     folded to plain letters, trimmed of a plural or an -ing, and matched at
     the start of a word, so council finds councils and meet finds meeting.
     City, town and meeting are soft words: "the Brookside city council" has
     to find the Brookside Town Council meeting, and a reader should not need
     to know which of the two a place calls itself.
     ------------------------------------------------------------------------- */
  var STOP = {};
  ('a about after again all also am an and any anyone anybody anything are around as at be been before being but by can could ' +
    'did do does doing done for from get gets got had has have how i if in into is it its just know like lately me my near of on or ' +
    'our out over please recently see show so some tell than that the their them then there these they this those to up us want ' +
    'was we were what whats when where which while who why will with would you your yall much many more most very ever still really')
    .split(' ').forEach(function (w) { STOP[w] = true; });
  var SOFT = {};
  ('city town meet meets meeting meetings next upcoming event events date dates day days time times schedule scheduled held ' +
    'happen happens happening going coming soon seen saw spotted find found look looking info information learn')
    .split(' ').forEach(function (w) { SOFT[w] = true; });

  var COMBINING = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g');
  function fold(text) {
    return String(text || '').normalize('NFD').replace(COMBINING, '').toLowerCase()
      .replace(/[‘’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function stem(word) {
    if (word.length > 5 && /ies$/.test(word)) return word.slice(0, -3) + 'y';
    if (word.length > 5 && /(sses|shes|ches|xes)$/.test(word)) return word.slice(0, -2);
    if (word.length > 4 && /s$/.test(word) && !/(ss|us|is)$/.test(word)) return word.slice(0, -1);
    if (word.length > 6 && /ing$/.test(word)) return word.slice(0, -3);
    if (word.length > 5 && /ed$/.test(word)) return word.slice(0, -2);
    return word;
  }
  function term(word) {
    var s = stem(word);
    return { word: word, stem: s, re: new RegExp('\\b' + s) };
  }
  function terms(text) {
    var seen = {};
    var words = fold(text).split(' ').filter(function (w) {
      if (!w || w.length < 2 || STOP[w] || seen[w]) return false;
      seen[w] = true;
      return true;
    });
    var strict = words.filter(function (w) { return !SOFT[w]; });
    var soft = words.filter(function (w) { return SOFT[w]; });
    if (!strict.length) { strict = soft; soft = []; }
    return { strict: strict.map(term), soft: soft.map(term), phrase: strict.join(' ') };
  }
  function strip(text, pattern) { return String(text || '').replace(pattern, ' ').replace(/\s+/g, ' ').trim(); }

  /* A record carries three folded strings: its title, its heading, and all of
     it. Every strict word has to land somewhere, and where it lands decides
     the score. */
  function record(fields) {
    fields.titleHay = fold(fields.title);
    fields.headHay = fold(fields.head || '');
    fields.hay = fold([fields.title, fields.head, fields.text, fields.extra].join(' '));
    return fields;
  }
  function score(rec, q) {
    if (!q.strict.length) return 0;
    var points = 0;
    for (var i = 0; i < q.strict.length; i++) {
      var t = q.strict[i];
      var inTitle = t.re.test(rec.titleHay);
      var inHead = !!rec.headHay && t.re.test(rec.headHay);
      if (!inTitle && !inHead && !t.re.test(rec.hay)) return 0;
      points += (inTitle ? 8 : 0) + (inHead ? 4 : 0) + 1;
    }
    q.soft.forEach(function (t) { if (t.re.test(rec.hay)) points += 1; });
    if (q.strict.length > 1 && rec.hay.indexOf(q.phrase) > -1) points += 6;
    return points;
  }

  /* The words the reader typed, as they typed them, for a sentence that says
     what was looked for. */
  function asTyped(raw, q) {
    var wanted = {};
    q.strict.forEach(function (t) { wanted[t.word] = true; });
    return String(raw || '').split(/\s+/).filter(function (w) { return wanted[fold(w)]; }).join(' ').replace(/[?.!,]+$/, '');
  }

  /* A town typed in lower case is still a town. The casing comes from the
     first record that matched, which spelled it the way it is spelled. */
  function properCase(phrase, texts) {
    return String(phrase || '').split(' ').map(function (word) {
      if (/[A-Z]/.test(word)) return word;
      for (var i = 0; i < texts.length; i++) {
        var found = String(texts[i] || '').match(new RegExp('\\b' + word.replace(/[^a-z0-9]/gi, '') + '\\b', 'i'));
        if (found && /^[A-Z]/.test(found[0])) return found[0];
      }
      return word;
    }).join(' ');
  }

  function snippet(text, q) {
    var plain = String(text || '').replace(/\s+/g, ' ').trim();
    if (!plain) return '';
    var lower = plain.toLowerCase();
    var at = -1;
    q.strict.some(function (t) {
      var found = lower.search(t.re);
      if (found > -1) { at = found; return true; }
      return false;
    });
    var start = Math.max(0, at - 60);
    if (start > 0) {
      var space = plain.indexOf(' ', start);
      if (space > -1 && space < at) start = space + 1;
    }
    var end = Math.min(plain.length, start + 190);
    if (end < plain.length) {
      var back = plain.lastIndexOf(' ', end);
      if (back > start + 100) end = back;
    }
    var html = esc((start > 0 ? '…' : '') + plain.slice(start, end) + (end < plain.length ? '…' : ''));
    q.strict.forEach(function (t) {
      html = html.replace(new RegExp('\\b(' + t.stem + '[a-z]*)', 'gi'), '<b>$1</b>');
    });
    return html;
  }

  /* -------------------------------------------------------------------------
     THE DATES

     The calendar has no file. Its dates come from the engine the calendar page
     and the dates room ask, a month at a time. See DECISIONS.md 50.
     ------------------------------------------------------------------------- */
  var DATE_WORDS = /\b(meet|meets|meeting|meetings|council|commission|hearing|election|elections|vote|voting|holiday|holidays|festival|market|parade|cleanup|race|walk|event|events|happening|going on|calendar|to do|siren|anniversary|tax holiday|harvest moon|hunters moon|easter|thanksgiving|labor day|memorial day)\b/;
  var DATE_SOFT = /\b(when|what|whats|is|are|does|do|the|next|meet|meets|meeting|meetings|on|calendar|happening|going|event|events|date|day|held|there|any|schedule|scheduled)\b/g;

  function calendarRows() {
    var C = window.FivemileCalendar;
    if (!C) return Promise.resolve([]);
    return once('calendar', function () {
      return C.loadTurnings().then(function (turnings) {
        var rows = [];
        var now = new Date();
        for (var year = C.FIRST_YEAR; year <= C.lastYear(); year++) {
          for (var month = 1; month <= 12; month++) {
            C.monthItems(year, month, turnings, now).forEach(function (item) {
              var key = keyOf(item.date);
              rows.push(record({
                kind: 'date', item: item, year: year, month: month, key: key, standing: !!item.word,
                last: item.word ? monthEnd(year, month) : key,
                title: item.title, text: item.blurb, extra: [item.town, item.subject, item.shiftNote].join(' ')
              }));
            });
          }
        }
        return rows;
      });
    });
  }
  function upcoming(row) { return row.last >= today(); }
  function townRank(row) {
    var at = TOWN_ORDER.indexOf(row.item.town);
    return at === -1 ? TOWN_ORDER.length : at;
  }

  function answerDates(ctx, loose) {
    var C = window.FivemileCalendar;
    if (!C) return null;
    if (!loose && !DATE_WORDS.test(ctx.q)) return null;
    if (loose && !/\b(when|what day|what date|whens)\b/.test(ctx.q)) return null;
    return calendarRows().then(function (rows) {
      if (!rows.length) return null;
      var q = terms(strip(ctx.win && ctx.win.holiday ? ctx.q : ctx.rest, DATE_SOFT));
      var range = ctx.win ? (ctx.win.ahead || ctx.win) : null;
      var door = function (row) { return { href: 'fivemile-calendar.html#' + C.monthId(row.year, row.month), label: 'Calendar' }; };
      var stub = function (row) { return C.stubHtml(row.item, MONTHS[row.month - 1] + ' ' + row.year); };
      var inRange = function (row) { return range && row.last >= range.from && row.key <= (range.end || range.to); };

      if (!q.strict.length) {
        if (loose) return null;
        var from = range ? range.from : today();
        var to = range ? (range.end || range.to) : addDays(today(), 7);
        var say = range ? range.say : 'in the week ahead';
        var listed = rows.filter(function (row) { return row.last >= from && row.key <= to; }).sort(function (a, b) { return a.key < b.key ? -1 : 1; });
        return card({
          kicker: 'Dates', tag: 'Calendar',
          say: [listed.length
            ? 'There ' + (listed.length === 1 ? 'is one date' : 'are ' + counted(listed.length, 'date', 'dates')) + ' on the calendar ' + say + '.'
            : 'Nothing is on the calendar ' + say + '.'],
          extra: listed.map(stub).join(''),
          door: { href: 'fivemile-calendar.html', label: 'Calendar' }
        });
      }

      var hits = rows.filter(function (row) { return score(row, q) > 0; });
      if (!hits.length) return null;
      var groups = {};
      var order = [];
      hits.forEach(function (row) {
        var id = row.titleHay;
        if (!groups[id]) { groups[id] = { rows: [], score: score(row, q) }; order.push(id); }
        groups[id].rows.push(row);
      });
      var list = order.map(function (id) {
        var g = groups[id];
        g.rows.sort(function (a, b) { return a.key < b.key ? -1 : a.key > b.key ? 1 : 0; });
        g.next = g.rows.filter(upcoming)[0] || null;
        g.previous = g.rows.filter(function (row) { return !upcoming(row); }).pop() || null;
        return g;
      });
      var topScore = Math.max.apply(null, list.map(function (g) { return g.score; }));
      list = list.filter(function (g) { return g.score === topScore; });
      /* The one-off April meeting in Cardiff has been and gone. It should not
         stop "when does the Cardiff council meet" reading as one question
         about the council that still meets. */
      var live = list.filter(function (g) { return g.next; });
      if (live.length === 1 && !range) list = live;

      if (range && ctx.win.kind !== 'all') {
        var within = [];
        list.forEach(function (g) { g.rows.filter(inRange).forEach(function (row) { within.push(row); }); });
        within.sort(function (a, b) { return a.key < b.key ? -1 : 1; });
        var after = list.map(function (g) { return g.rows.filter(function (row) { return row.key > (range.end || range.to); })[0]; })
          .filter(Boolean).sort(function (a, b) { return a.key < b.key ? -1 : 1; })[0];
        return card({
          kicker: 'Dates', tag: 'Calendar',
          say: within.length
            ? within.slice(0, 3).map(function (row, i) { return (i === 0 ? yesNo(ctx, true) : '') + row.item.title + (row.key === today() ? ' is today.' : ' is on ' + fullDay(row.key) + '.'); })
            : [yesNo(ctx, false) + 'Nothing like that is on the calendar ' + range.say + '.',
               after ? 'The next is ' + after.item.title + ', on ' + fullDay(after.key) + '.' : ''],
          extra: within.map(stub).join(''),
          door: door(within[0] || after || list[0].rows[0])
        });
      }

      if (list.length > 1) {
        list.sort(function (a, b) {
          var ta = townRank(a.rows[0]);
          var tb = townRank(b.rows[0]);
          if (ta !== tb) return ta - tb;
          return (a.next ? a.next.key : '9') < (b.next ? b.next.key : '9') ? -1 : 1;
        });
        var withNext = list.filter(function (g) { return g.next; });
        return card({
          kicker: 'Dates', tag: 'Calendar',
          say: withNext.length
            ? withNext.slice(0, 4).map(function (g) {
              return g.next.key === today() ? g.next.item.title + ' is today.' : g.next.item.title + ' is next on ' + fullDay(g.next.key) + '.';
            })
            : list.slice(0, 4).map(function (g) { return g.previous.item.title + ' was last on ' + fullDay(g.previous.key) + '.'; }),
          extra: (withNext.length ? withNext.map(function (g) { return g.next; }) : list.map(function (g) { return g.previous; })).map(stub).join(''),
          door: door((withNext[0] || list[0]).next || list[0].previous)
        });
      }

      var g = list[0];
      var recurring = g.rows.length > 1;
      var lead = g.next || g.previous;
      var item = lead.item;
      var say = [];
      if (recurring) {
        if (item.blurb) say.push(item.blurb);
        if (g.next) {
          var when = g.next.standing ? g.next.item.word.toLowerCase() + ' in ' + MONTHS[g.next.month - 1]
            : g.next.key === today() ? 'today' : fullDay(g.next.key);
          say.push(item.blurb ? 'The next one is ' + when + '.' : item.title + ' is next ' + (g.next.standing ? '' : 'on ') + when + '.');
          if (g.next.item.shiftNote) say.push(g.next.item.shiftNote);
        } else {
          say.push('The last one on the calendar was ' + fullDay(g.previous.key) + '.');
        }
      } else {
        say.push(item.title + (upcoming(lead) ? (lead.key === today() ? ' is today.' : ' is on ' + fullDay(lead.key) + '.') : ' was on ' + fullDay(lead.key) + '.'));
        if (item.blurb) say.push(item.blurb);
      }
      /* The card has already said everything a stub would, down to the
         sentence the calendar prints on it, so a single answer carries no
         stubs. The door opens the month it named. */
      return card({
        kicker: 'Dates', tag: item.town || 'Calendar', say: say,
        door: door(lead)
      });
    });
  }

  /* -------------------------------------------------------------------------
     THE STORIES
     ------------------------------------------------------------------------- */
  var STORY_WORDS = /\b(news|stories|story|articles?|headlines?|reported|reporting|coverage|written about|obituar\w*|obits?)\b/;
  var STORY_SOFT = /\b(news|stories|story|articles?|headlines?|reported|reporting|coverage|written|about|mention\w*|ran|run|obituar\w*|obits?|any|there|been|on file|how|many)\b/g;

  function storiesAll() {
    return once('stories', function () {
      return fetchJson(NEWS_INDEX).then(function (index) {
        var months = index && Array.isArray(index.months) ? index.months : [];
        return Promise.all(months.map(function (m) {
          return fetchJson('news-archive/' + m.month + '.json').then(function (data) {
            return data && Array.isArray(data.stories) ? data.stories : [];
          }).catch(function () { return []; });
        }));
      }).then(function (parts) {
        var seen = {};
        var all = [];
        parts.forEach(function (stories) {
          stories.forEach(function (story) {
            var id = story.id || story.url;
            if (!story || !story.title || seen[id]) return;
            seen[id] = true;
            all.push(record({
              kind: 'story', story: story, key: localKey(story.published_at),
              title: story.title, text: story.summary,
              extra: [story.outlet, story.town].concat(Array.isArray(story.tags) ? story.tags : []).join(' ')
            }));
          });
        });
        return all.sort(function (a, b) { return a.key < b.key ? 1 : a.key > b.key ? -1 : 0; });
      });
    });
  }
  function storyHtml(rec) {
    var rows = window.FivemileArchiveRows;
    return rows && rows.story ? rows.story(rec.story) : '';
  }
  function moreRows(rowsHtml, shown) {
    var first = rowsHtml.slice(0, shown).join('');
    var rest = rowsHtml.slice(shown);
    if (!rest.length) return first;
    return first + '<details class="arc-all find-more"><summary>' + rest.length + ' more</summary><div class="rows">' + rest.join('') + '</div></details>';
  }

  function answerStories(ctx) {
    if (!STORY_WORDS.test(ctx.q)) return null;
    var obits = /\bobituar\w*|\bobits?\b/.test(ctx.q);
    var q = terms(strip(ctx.rest, STORY_SOFT));
    var win = ctx.win && ctx.win.kind !== 'now' && ctx.win.from <= today() ? ctx.win : null;
    return storiesAll().then(function (all) {
      var pool = all.filter(function (rec) { return !win || (rec.key >= win.from && rec.key <= win.to); });
      if (obits) {
        pool = pool.filter(function (rec) {
          return rec.story.section === 'obituaries' || (rec.story.tags || []).some(function (t) { return /obituary/i.test(t); });
        });
      }
      var hits = q.strict.length ? pool.filter(function (rec) { return score(rec, q) > 0; }) : pool;
      var topic = '';
      if (q.strict.length) {
        topic = properCase(asTyped(ctx.raw, q) || q.phrase, [TOWN_ORDER.join(' ')].concat((hits.length ? hits : all).slice(0, 40).map(function (rec) { return rec.story.title + ' ' + rec.story.summary + ' ' + rec.story.town; })));
      }
      var noun = obits ? ['obituary', 'obituaries'] : ['story', 'stories'];
      var when = win ? ' ' + win.say : '';
      var over = win ? isOver(win) : false;
      var say = [];
      if (topic) {
        say.push(hits.length
          ? yesNo(ctx, true) + cap(counted(hits.length, noun[0], noun[1])) + ' on file ' + (hits.length === 1 ? 'mentions ' : 'mention ') + topic + when + '.'
          : yesNo(ctx, false) + 'No ' + noun[0] + ' on file mentions ' + topic + when + '.');
      } else {
        say.push(cap(counted(hits.length, noun[0], noun[1])) + (hits.length === 1 ? (over ? ' ran' : ' has run') : (over ? ' ran' : ' have run')) + ' on the news page' + (when || ' since the archive starts') + '.');
      }
      if (hits.length) say.push('The newest is from ' + (hits[0].story.outlet || 'an outlet') + ', on ' + onDate(hits[0].key) + '.');
      return card({
        kicker: obits ? 'Obituaries' : 'Stories', tag: 'News page', say: say,
        extra: moreRows(hits.map(storyHtml), 6),
        door: { href: 'fivemile-news-archive.html', label: 'Story index' }
      });
    });
  }

  /* -------------------------------------------------------------------------
     THE SIGHTINGS
     ------------------------------------------------------------------------- */
  var SEEN_WORDS = /\b(seen|spotted|sightings?|observed|observations?|anyone see|turned up|recorded)\b/;
  var SEEN_SOFT = /\b(seen|spotted|sightings?|observed|observations?|recorded|see|saw|turned|anyone|anybody|someone|people|been|any|there|lately|recently|around|here|creek|along|lower|what|kind|kinds|how|many|times)\b/g;

  function answerSightings(ctx) {
    if (!SEEN_WORDS.test(ctx.q)) return null;
    var q = terms(strip(ctx.rest, SEEN_SOFT));
    return fetchJson(SIGHTINGS_FILE).then(function (data) {
      var roll = data && Array.isArray(data.roll) ? data.roll : [];
      var door = { href: 'fivemile-nature.html', label: 'Nature Watch' };
      var note = data && data.note ? data.note : '';
      if (!q.strict.length) {
        var counts = data && data.counts;
        var recent = data && Array.isArray(data.observations) ? data.observations : [];
        if (!counts || !recent.length) return null;
        return card({
          kicker: 'Sightings', tag: 'Lower creek',
          say: ['People have recorded ' + counts.species_in_window + ' species along the lower creek in the past ' + counts.window_days + ' days, in ' + counts.in_window + ' sightings.',
            'The most recent was the ' + recent[0].name + ', on ' + onDate(recent[0].observedOn) + '.'],
          table: { head: ['Species', 'Seen'], rows: recent.slice(0, 8).map(function (o) { return [o.name, labelDate(o.observedOn)]; }) },
          note: note, door: door
        });
      }
      var hits = roll.map(function (row) {
        return record({ row: row, title: row.name, text: row.latin, extra: row.group });
      }).filter(function (rec) { return score(rec, q) > 0; }).map(function (rec) { return rec.row; });
      /* Nothing on the roll is an answer too, and it says exactly that much:
         not that nobody has seen one, only that no record of one is on file.
         When the field guide knows the animal, the guide entry comes with it. */
      if (!hits.length) {
        var nothing = 'No sighting on record along the lower creek matches ' + properCase(asTyped(ctx.raw, q) || q.phrase, [TOWN_ORDER.join(' ')]) + '.';
        return answerGuide(ctx).then(function (entry) {
          if (entry) { entry.say.unshift(nothing); return entry; }
          return card({ kicker: 'Sightings', tag: 'Lower creek', say: [nothing], note: note, door: door, withMatches: true });
        });
      }
      hits.sort(function (a, b) { return a.last < b.last ? 1 : -1; });
      var recorded = total(hits, function (row) { return num(row.count); });
      var say = [];
      var lead = /\b(has|have) (anyone|anybody|someone|people)\b/.test(ctx.q) ? 'Yes. ' : yesNo(ctx, true);
      if (hits.length === 1) {
        say.push(lead + hits[0].name + ' has been recorded ' + times(num(hits[0].count)) + ' along the lower creek, ' +
          (num(hits[0].count) === 1 ? 'on ' : 'most recently on ') + onDate(hits[0].last) + '.');
      } else {
        say.push(lead + cap(counted(hits.length, 'kind matches', 'kinds match')) + ', recorded ' + times(recorded) + ' in all along the lower creek.');
        say.push('The most recent was the ' + hits[0].name + ', on ' + onDate(hits[0].last) + '.');
      }
      return card({
        kicker: 'Sightings', tag: 'Lower creek', say: say,
        table: { head: ['Species', 'Times', 'Last seen'], rows: hits.slice(0, 20).map(function (row) { return [row.name, String(row.count), labelDate(row.last)]; }) },
        note: note, door: door
      });
    });
  }

  /* -------------------------------------------------------------------------
     THE FIELD GUIDE
     ------------------------------------------------------------------------- */
  var GUIDE_ASKING = /\b(what|whats|tell|about|look|looks|like|identify|poisonous|venomous|dangerous|eat|edible|catch|find|where|bait|season|safe|bite|bites|kind|info|information|guide)\b/g;

  function answerGuide(ctx) {
    return fetchJson(GUIDE_FILE).then(function (guide) {
      var species = guide && Array.isArray(guide.species) ? guide.species : [];
      var hay = ' ' + fold(ctx.q) + ' ';
      var best = null;
      var bestPhrase = '';
      species.forEach(function (sp) {
        [sp.name, String(sp.id || '').replace(/-/g, ' ')].concat(sp.alias || []).forEach(function (name) {
          var phrase = fold(name);
          if (phrase.length < 3 || phrase.length <= bestPhrase.length) return;
          if (new RegExp('\\b' + phrase + '(s|es)?\\b').test(hay)) { best = sp; bestPhrase = phrase; }
        });
      });
      if (!best) return null;
      /* A name inside a longer question about something else is not a
         question about the animal. */
      var leftover = terms(strip(strip(fold(ctx.q), new RegExp('\\b' + bestPhrase + '(s|es)?\\b', 'g')), GUIDE_ASKING));
      if (leftover.strict.length > 1) return null;
      var rarity = guide.rarity && guide.rarity[best.rarity] ? guide.rarity[best.rarity].label : '';
      var cells = [];
      if (best.ctx) cells.push(cell('🍃', 'Where', best.ctx));
      if (Array.isArray(best.seasons) && best.seasons.length) cells.push(cell('📅', 'When', cap(best.seasons.length > 1 ? best.seasons.slice(0, -1).join(', ') + ' and ' + best.seasons[best.seasons.length - 1] : best.seasons[0])));
      if (rarity) cells.push(cell('🍃', 'How common', rarity));
      var result = card({
        kicker: best.name, tag: best.sci || 'Field guide', say: [best.body], cells: cells, tip: best.otw || '',
        door: { href: 'fivemile-guide.html#' + best.id, label: 'Field guide' }, withMatches: true, guideId: best.id
      });
      if (!best.inat) return result;
      return fetchJson(SIGHTINGS_FILE).then(function (data) {
        var row = (data && Array.isArray(data.roll) ? data.roll : []).filter(function (r) { return r.taxon === best.inat; })[0];
        if (row) result.say.push('It has been recorded ' + times(num(row.count)) + ' along the lower creek, ' + (num(row.count) === 1 ? 'on ' : 'most recently on ') + onDate(row.last) + '.');
        return result;
      }).catch(function () { return result; });
    });
  }

  /* -------------------------------------------------------------------------
     THE MATCHES
     ------------------------------------------------------------------------- */
  function pageRecords(html, path) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var title = String(doc.title || '').replace(/\s*·\s*FIVEMILE\s*$/, '').trim();
    if (!title || /^FIVEMILE\b/.test(title)) title = 'Front page';
    var main = doc.querySelector('main') || doc.body;
    if (!main) return [];
    Array.prototype.forEach.call(main.querySelectorAll('script,style,noscript,template,svg,button,nav,[hidden],[aria-hidden="true"]'), function (node) {
      node.remove();
    });
    var records = [];
    var current = { head: '', id: '', parts: [], paras: [] };
    function flush() {
      var text = current.parts.join(' ').replace(/\s+/g, ' ').trim();
      if (!text && !current.head) return;
      var href = path + (current.id ? '#' + current.id : '');
      records.push(record({ kind: 'page', page: title, href: href, title: title, head: current.head, text: text, paras: current.paras }));
    }
    var blocks = 'h1,h2,h3,p,li,figcaption,blockquote,td,dd';
    Array.prototype.forEach.call(main.querySelectorAll(blocks), function (el) {
      if (el.parentElement && el.parentElement.closest('p,li,figcaption,blockquote,td,dd')) return;
      var text = el.textContent.replace(/\s+/g, ' ').trim();
      if (/^h[123]$/i.test(el.tagName)) {
        flush();
        var holder = el.id ? el : el.closest('[id]');
        var id = holder && holder !== main && holder.id !== 'main' ? holder.id : '';
        current = { head: text, id: id, parts: [], paras: [] };
        return;
      }
      if (text.length > 1 && text !== DASH) {
        current.parts.push(text);
        /* Whole paragraphs are kept apart as well, so a paragraph can be
           quoted without cutting a sentence. */
        if (el.tagName === 'P') current.paras.push(text);
      }
    });
    flush();
    /* The kitchen draws its recipes from a list in its own script, so its
       markup holds none of them. The list is read off the page all the same,
       and each recipe links to itself the way the field guide links to it. */
    var recipe = /\{id:'([^']+)',title:'((?:[^'\\]|\\.)*)',subtitle:'((?:[^'\\]|\\.)*)',label:'((?:[^'\\]|\\.)*)'[\s\S]*?intro:'((?:[^'\\]|\\.)*)'/g;
    var unquote = function (s) { return String(s).replace(/\\'/g, "'"); };
    var found;
    while ((found = recipe.exec(html))) {
      records.push(record({
        kind: 'page', page: title, href: path + '#' + found[1], title: title,
        head: unquote(found[2]), text: unquote(found[5]), extra: unquote(found[3]) + ' ' + unquote(found[4])
      }));
    }
    return records;
  }

  function pagesIndex() {
    return once('pages', function () {
      return fetchText(SITEMAP).then(function (xml) {
        var paths = (xml.match(/<loc>[^<]+<\/loc>/g) || []).map(function (loc) {
          var path = loc.replace(/<\/?loc>/g, '').trim().replace(/^https?:\/\/[^/]+\/?/, '');
          return path || 'index.html';
        }).filter(function (path) { return path !== 'fivemile-archive.html'; });
        return Promise.all(paths.map(function (path) {
          return fetchText(path).then(function (html) { return pageRecords(html, path); }).catch(function () { return []; });
        }));
      }).then(function (parts) { return [].concat.apply([], parts); });
    });
  }

  function guideIndex() {
    return fetchJson(GUIDE_FILE).then(function (guide) {
      return (guide && Array.isArray(guide.species) ? guide.species : []).map(function (sp) {
        return record({
          kind: 'guide', sp: sp, title: sp.name, head: (sp.alias || []).join(' '),
          text: [sp.body, sp.otw].join(' '),
          extra: [sp.sci, sp.ctx].concat((sp.facts || []).map(function (f) { return f.v; })).join(' ')
        });
      });
    });
  }
  function rollIndex() {
    return fetchJson(SIGHTINGS_FILE).then(function (data) {
      return (data && Array.isArray(data.roll) ? data.roll : []).map(function (row) {
        return record({ kind: 'sighting', row: row, title: row.name, text: row.latin, extra: row.group });
      });
    });
  }
  function photoIndex() {
    return fetchJson(PHOTO_FILE).then(function (data) {
      return (data && Array.isArray(data.items) ? data.items : []).map(function (item) {
        return record({ kind: 'photo', item: item, title: item.title, text: item.copy, extra: [item.alt, item.credit].join(' ') });
      });
    });
  }

  function hitHtml(label, href, heading, body) {
    return '<a class="card-stub story find-hit" href="' + esc(href) + '"><div class="k-bd">' +
      '<div class="k-top"><span class="k-src">' + esc(label) + '</span></div>' +
      '<h3>' + esc(heading) + '</h3>' +
      (body ? '<div class="w">' + body + '</div>' : '') +
      '</div></a>';
  }

  function matches(text, found) {
    var q = terms(text);
    if (!q.strict.length) return Promise.resolve([]);
    var C = window.FivemileCalendar;
    return Promise.all([
      pagesIndex().catch(function () { return []; }),
      calendarRows().catch(function () { return []; }),
      storiesAll().catch(function () { return []; }),
      guideIndex().catch(function () { return []; }),
      rollIndex().catch(function () { return []; }),
      photoIndex().catch(function () { return []; })
    ]).then(function (sets) {
      function scored(list) {
        return list.map(function (rec) { return { rec: rec, points: score(rec, q) }; })
          .filter(function (x) { return x.points > 0; });
      }
      var groups = [];

      var pages = scored(sets[0]).sort(function (a, b) { return b.points - a.points; });
      if (pages.length) {
        groups.push({ name: 'Pages', rows: pages.map(function (x) {
          return hitHtml(x.rec.page, x.rec.href, x.rec.head || x.rec.page, snippet(x.rec.text || x.rec.head, q));
        }) });
      }

      /* A council that meets every month is one match, shown at its next
         date, not twenty four. */
      var dates = {};
      scored(sets[1]).forEach(function (x) {
        var id = x.rec.titleHay;
        var have = dates[id];
        var better = !have || (upcoming(x.rec) && (!upcoming(have.rec) || x.rec.key < have.rec.key)) ||
          (!upcoming(x.rec) && !upcoming(have.rec) && x.rec.key > have.rec.key);
        if (better) dates[id] = x;
      });
      var dateList = Object.keys(dates).map(function (id) { return dates[id]; }).sort(function (a, b) {
        if (b.points !== a.points) return b.points - a.points;
        var ua = upcoming(a.rec);
        var ub = upcoming(b.rec);
        if (ua !== ub) return ua ? -1 : 1;
        return ua ? (a.rec.key < b.rec.key ? -1 : 1) : (a.rec.key > b.rec.key ? -1 : 1);
      });
      if (dateList.length && C) {
        groups.push({ name: 'Dates', rows: dateList.map(function (x) {
          return C.stubHtml(x.rec.item, MONTHS[x.rec.month - 1] + ' ' + x.rec.year);
        }) });
      }

      var stories = scored(sets[2]).sort(function (a, b) {
        return b.points - a.points || (a.rec.key < b.rec.key ? 1 : -1);
      });
      if (stories.length) groups.push({ name: 'Stories', rows: stories.map(function (x) { return storyHtml(x.rec); }) });

      var guide = scored(sets[3]).filter(function (x) { return !found || x.rec.sp.id !== found.guideId; })
        .sort(function (a, b) { return b.points - a.points; });
      if (guide.length) {
        groups.push({ name: 'Field guide', rows: guide.map(function (x) {
          return hitHtml(x.rec.sp.sci || 'Field guide', 'fivemile-guide.html#' + x.rec.sp.id, x.rec.sp.name, snippet(x.rec.sp.body, q));
        }) });
      }

      var seen = scored(sets[4]).sort(function (a, b) { return a.rec.row.last < b.rec.row.last ? 1 : -1; });
      if (seen.length) {
        groups.push({ name: 'Sightings', rows: seen.map(function (x) {
          var row = x.rec.row;
          return hitHtml(row.group || 'Nature Watch', 'fivemile-nature.html', row.name,
            esc('Recorded ' + times(num(row.count)) + ' along the lower creek, ' + (num(row.count) === 1 ? 'on ' : 'most recently on ') + onDate(row.last) + '.'));
        }) });
      }

      var photos = scored(sets[5]).sort(function (a, b) { return b.points - a.points; });
      if (photos.length) {
        groups.push({ name: 'Photographs', rows: photos.map(function (x) {
          return hitHtml(x.rec.item.credit ? 'By ' + x.rec.item.credit : 'Gallery', 'fivemile-gallery.html', x.rec.item.title, snippet(x.rec.item.copy, q));
        }) });
      }
      return groups;
    });
  }

  function groupHtml(group) {
    return '<section class="find-group">' +
      '<div class="hd"><h2>' + esc(group.name) + '</h2><span class="hd-note">' + group.rows.length + '</span></div>' +
      '<div class="rows">' + moreRows(group.rows, 5) + '</div>' +
      '</section>';
  }

  /* -------------------------------------------------------------------------
     RUNNING IT

     The rules are tried in a fixed order and the first one that answers wins.
     The order matters where two could claim a question:

     - the sky goes before the calendar, so "when is the full moon" is the sky
       engine's, and the named moons go to the calendar, which carries names;
     - stories, sightings and the field guide go before the creek, because
       "news about the flood" and "has anyone seen a turtle in the creek" are
       about the story and the turtle, and all three step aside when nothing
       they hold matches;
     - the forecast goes before the record, so "will it rain tomorrow" looks
       ahead;
     - the creek goes before the rain, so "has the creek flooded" is the
       gauge's.

     Anything none of them claims gets the matches alone.
     ------------------------------------------------------------------------- */
  var RULES = [
    answerSky,
    function (ctx) { return answerDates(ctx, false); },
    answerStories,
    answerSightings,
    answerGuide,
    answerAir,
    function (ctx) { return answerForecast(ctx, false); },
    answerCreek,
    answerSnow,
    answerWind,
    answerRain,
    answerTemp,
    function (ctx) { return answerDates(ctx, true); }
  ];

  function answer(ctx) {
    var i = 0;
    function next() {
      if (i >= RULES.length) return Promise.resolve(null);
      var rule = RULES[i++];
      var result;
      try {
        result = rule(ctx);
      } catch (err) {
        if (window.console) console.warn('FIVEMILE search rule failed', err);
        result = null;
      }
      return Promise.resolve(result).catch(function (err) {
        if (window.console) console.warn('FIVEMILE search rule failed', err);
        return null;
      }).then(function (found) { return found || next(); });
    }
    return next();
  }

  function paint(found, groups) {
    var html = found ? answerHtml(found) : '';
    groups.forEach(function (group) { html += groupHtml(group); });
    out.innerHTML = html || '<div class="empty">&mdash;</div>';
  }

  var running = 0;
  function run(raw) {
    var text = String(raw || '').trim().slice(0, 200);
    var id = ++running;
    remember(text);
    if (!text) {
      out.innerHTML = '';
      return Promise.resolve();
    }
    out.setAttribute('aria-busy', 'true');
    out.innerHTML = '<div class="empty">&mdash;</div>';
    var ctx = understand(text);
    return answer(ctx).then(function (found) {
      if (id !== running) return null;
      if (found && !found.withMatches) return paint(found, []);
      return matches(text, found).then(function (groups) {
        if (id === running) paint(found, groups);
      });
    }).catch(function (err) {
      if (window.console) console.warn('FIVEMILE search failed', err);
      if (id === running) paint(null, []);
    }).then(function () {
      if (id === running) out.removeAttribute('aria-busy');
    });
  }

  /* The question goes in the address, so the back button brings it back and a
     reader can send somebody the answer. */
  function remember(text) {
    if (!window.history || !history.replaceState) return;
    var url = location.pathname + (text ? '?q=' + encodeURIComponent(text) : '');
    history.replaceState(null, '', url);
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    input.blur();
    run(input.value);
  });
  input.addEventListener('search', function () {
    if (!input.value) run('');
  });
  /* -------------------------------------------------------------------------
     SOMETHING YOU DID NOT KNOW

     One button, and every press turns up one thing off the record. Nothing is
     made up for it. Each fact below is either a question put to the same rules
     a reader's question goes to, or a figure worked out from the same files,
     or a paragraph of the heritage pages quoted whole. The facts are dealt from
     a shuffled deck, so the same one does not come round again until every
     other one has, and the ones tied to today's date are different tomorrow.

     No obituaries, ever, and nothing from the civic page, which argues a case
     rather than reporting one. See DECISIONS.md 22, 35 and 73.
     ------------------------------------------------------------------------- */
  function ask(question) { return answer(understand(question)); }
  function anyOf(list) { return list.length ? list[Math.floor(Math.random() * list.length)] : null; }
  function shuffled(list) {
    var copy = list.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var hold = copy[i];
      copy[i] = copy[j];
      copy[j] = hold;
    }
    return copy;
  }
  function hoursAndMinutes(total) {
    var h = Math.floor(total / 60);
    var m = total % 60;
    if (!h) return counted(m, 'minute', 'minutes');
    return counted(h, 'hour', 'hours') + (m ? ' and ' + counted(m, 'minute', 'minutes') : '');
  }

  /* The weather on today's date in a year picked at random off the airport
     record, with the creek beside it once the gauge was running. */
  function thisDateLongAgo() {
    return shelf(AIRPORT_DIR).then(function (held) {
      if (!held.first) return null;
      var now = today();
      var year = yearOf(held.first) + Math.floor(Math.random() * (yearOf(now) - yearOf(held.first)));
      var key = year + now.slice(4);
      if (!realDate(key)) return null;
      return ask('what was the weather on ' + MONTHS[monthOf(key) - 1] + ' ' + dayOf(key) + ' ' + year);
    });
  }

  function creekOnThisDate() {
    var now = today();
    var md = now.slice(5);
    return shelf(CREEK_DIR).then(function (held) {
      if (!held.first) return null;
      var jobs = [];
      for (var year = yearOf(held.first); year < yearOf(now); year++) jobs.push(yearRows(CREEK_DIR, year));
      return Promise.all(jobs).then(function (years) {
        var rows = [];
        years.forEach(function (list) { list.forEach(function (d) { if (d.date.slice(5) === md && highOf(d) != null) rows.push(d); }); });
        if (rows.length < 5) return null;
        var best = most(rows, highOf);
        var label = MONTHS[monthOf(now) - 1] + ' ' + dayOf(now);
        return card({
          kicker: 'The creek', tag: 'On this date',
          say: ['On this date in ' + yearOf(best.date) + ', Five Mile Creek came up to ' + feet(highOf(best)) + ' at Republic.',
            'That is the highest it has been on a ' + label + ' in the ' + rows.length + ' years on file.'],
          note: ['Each year goes by the day\'s highest reading at the Republic gauge.'].concat(creekCaveats([best], null, null)).join(' '),
          door: CREEK_DOOR
        });
      });
    });
  }

  /* Only years with readings through the day can be counted for high water,
     and the fifteen minute record starts in October 2007. */
  function creekBusiestYear() {
    var now = today();
    return shelf(CREEK_DIR).then(function (held) {
      if (!held.first) return null;
      var jobs = [];
      for (var year = 2008; year <= yearOf(now); year++) jobs.push(yearRows(CREEK_DIR, year));
      return Promise.all(jobs).then(function (years) {
        var test = lineTest({ dir: 'above', value: lines().high, named: 'high' });
        var tally = years.map(function (rows, i) {
          return { year: 2008 + i, days: rows.filter(function (d) { return num(d.high) != null && test(d); }).length, size: rows.length };
        });
        var whole = tally.filter(function (t) { return t.year < yearOf(now) && t.size >= 300; });
        if (!whole.length) return null;
        var busiest = most(whole, function (t) { return t.days; });
        var quietest = least(whole, function (t) { return t.days; });
        var current = tally[tally.length - 1];
        var over = current.year === yearOf(now) && current.days
          ? 'So far this year it has happened on ' + counted(current.days, 'day', 'days') + '.'
          : 'It has not happened yet this year.';
        return card({
          kicker: 'The creek', tag: 'Since 2008',
          say: ['No year since 2008 has put Five Mile Creek over the high water line on more days than ' + busiest.year +
            ', which reached it on ' + counted(busiest.days, 'day', 'days') + '.',
            'The quietest was ' + quietest.year + ', with ' + counted(quietest.days, 'day', 'days') + '.', over],
          note: 'High water is ' + looseFeet(lines().high) + ' at the Republic gauge, the same line the masthead and the almanac draw. ' +
            'It is not a flood stage, because this gauge does not have one. A day counts if any reading in it reached the line.',
          door: CREEK_DOOR
        });
      });
    });
  }

  function guideEntry() {
    return fetchJson(GUIDE_FILE).then(function (guide) {
      var sp = anyOf(guide && Array.isArray(guide.species) ? guide.species : []);
      return sp ? answerGuide(understand('what is a ' + sp.name)) : null;
    });
  }

  function sightingFromTheRoll() {
    return Promise.all([fetchJson(SIGHTINGS_FILE), fetchJson(GUIDE_FILE).catch(function () { return null; })]).then(function (parts) {
      var roll = parts[0] && Array.isArray(parts[0].roll) ? parts[0].roll : [];
      var row = anyOf(roll);
      if (!row || !row.first) return null;
      var n = num(row.count) || 1;
      var inGuide = (parts[1] && Array.isArray(parts[1].species) ? parts[1].species : []).filter(function (sp) { return sp.inat === row.taxon; })[0];
      var say = [row.name + ' has been recorded ' + times(n) + ' along the lower creek, ' +
        (n === 1 || row.first === row.last ? 'on ' + onDate(row.first) : 'first on ' + onDate(row.first) + ' and most recently on ' + onDate(row.last)) + '.'];
      if (inGuide) say.push('It is in the field guide too.');
      return card({
        kicker: 'Sightings', tag: row.group || 'Lower creek', say: say,
        note: parts[0].note || '',
        door: inGuide ? { href: 'fivemile-guide.html#' + inGuide.id, label: 'Field guide' } : { href: 'fivemile-nature.html', label: 'Nature Watch' }
      });
    });
  }

  /* A paragraph of the heritage pages, whole, with the door back to where it
     sits. Only paragraphs that are complete sentences of a readable length,
     and never one holding a placeholder. */
  function heritageParagraph() {
    return pagesIndex().then(function (records) {
      var choices = [];
      /* A chapter also talks about itself: where its sources are, and how to
         write in with a correction. Those paragraphs are the page's own
         housekeeping and not history, so anything that points at the page
         rather than at the past stays out. */
      var housekeeping = /\b(above|below|this chapter|this page|these are|sources?|fill in|write in|email|let us know|get in touch)\b/i;
      records.forEach(function (rec) {
        if (rec.href.indexOf('fivemile-heritage') !== 0 || /fill in a gap/i.test(rec.head)) return;
        (rec.paras || []).forEach(function (para) {
          if (para.length >= 160 && para.length <= 620 && /^[A-Z"]/.test(para) && /[.!?"]$/.test(para) &&
              para.indexOf(DASH) === -1 && !housekeeping.test(para)) {
            choices.push({ rec: rec, para: para });
          }
        });
      });
      var pick = anyOf(choices);
      if (!pick) return null;
      var chapter = pick.rec.page.split(' · ')[0];
      return card({
        kicker: 'Heritage', tag: pick.rec.head || chapter, say: [pick.para],
        door: { href: pick.rec.href, label: chapter }
      });
    });
  }

  function daylightSinceSolstice() {
    var S = window.FivemileSky;
    if (!S) return null;
    var now = new Date();
    var candidates = [];
    [now.getFullYear() - 1, now.getFullYear()].forEach(function (year) {
      ['summer-solstice', 'winter-solstice'].forEach(function (name) {
        var at = S.sunTurning(year, name);
        if (at && at <= now) candidates.push({ name: name, at: at });
      });
    });
    var last = candidates.sort(function (a, b) { return b.at - a.at; })[0];
    if (!last) return null;
    function daylight(key) {
      var t = S.riseSetTransit(dateOf(key), S.sunAt, { h0: -0.833 });
      return t.rise && t.set ? Math.round((t.set - t.rise) / 60000) : null;
    }
    var then = daylight(keyOf(last.at));
    var nowMinutes = daylight(today());
    if (then == null || nowMinutes == null || then === nowMinutes) return null;
    var change = nowMinutes - then;
    var summer = last.name === 'summer-solstice';
    return card({
      kicker: 'The sun', tag: 'Since the solstice',
      say: ['Since the ' + (summer ? 'summer' : 'winter') + ' solstice on ' + onDate(keyOf(last.at)) + ', the days here have ' +
        (change < 0 ? 'lost ' : 'gained ') + hoursAndMinutes(Math.abs(change)) + ' of daylight.',
        'Today has ' + hoursAndMinutes(nowMinutes) + ' of it.'],
      door: ALMANAC_DOOR
    });
  }

  /* Which of the three towns the stories name most. Every town is said, in
     town order, so none of the three reads as left out. */
  function townsInTheStories() {
    return storiesAll().then(function (all) {
      var counts = TOWN_ORDER.map(function (town) {
        return { town: town, n: all.filter(function (rec) { return rec.story.town === town; }).length };
      });
      if (!counts.some(function (c) { return c.n; })) return null;
      /* "Nine are about Graysville, one about Cardiff, and none yet about
         Brookside." Only the first carries the verb. */
      var parts = counts.map(function (c, i) {
        var n = c.n === 0 ? 'none yet' : c.n <= 10 ? SMALL[c.n] : String(c.n);
        return n + (i === 0 ? (c.n === 1 ? ' is' : ' are') : '') + ' about ' + c.town;
      });
      return card({
        kicker: 'Stories', tag: 'News page',
        say: ['Of the ' + all.length + ' stories on file, ' + parts[0] + ', ' + parts[1] + ', and ' + parts[2] + '.',
          'The rest are about the county and the places around the three towns.'],
        door: { href: 'fivemile-news-archive.html', label: 'Story index' }
      });
    });
  }

  var FACTS = [
    function () { return ask('record high for today'); },
    function () { return ask('highest the creek has ever been'); },
    function () { return ask('lowest the creek has ever been'); },
    function () { return ask('what was the hottest day ever'); },
    function () { return ask('what was the coldest it has ever been'); },
    function () { return ask('what was the wettest day ever'); },
    function () { return ask('what was the driest year'); },
    function () { return ask('what was the wettest year'); },
    function () { return ask('biggest snow ever'); },
    function () { return ask('when did it last snow'); },
    thisDateLongAgo,
    thisDateLongAgo,
    creekOnThisDate,
    creekBusiestYear,
    guideEntry,
    guideEntry,
    sightingFromTheRoll,
    heritageParagraph,
    heritageParagraph,
    daylightSinceSolstice,
    townsInTheStories
  ];
  var deck = [];

  function tellMe() {
    var id = ++running;
    input.value = '';
    remember('');
    if (luck) luck.setAttribute('aria-busy', 'true');
    out.setAttribute('aria-busy', 'true');
    out.innerHTML = '<div class="empty">&mdash;</div>';
    var tries = 0;
    function attempt() {
      if (tries++ >= FACTS.length) return Promise.resolve(null);
      if (!deck.length) deck = shuffled(FACTS);
      var fact = deck.pop();
      return Promise.resolve().then(fact).catch(function (err) {
        if (window.console) console.warn('FIVEMILE fact failed', err);
        return null;
      }).then(function (found) {
        /* A fact with nothing behind it is not a fact. */
        var empty = !found || !found.say.length || /^Nothing is on file/.test(found.say[0]);
        return empty ? attempt() : found;
      });
    }
    return attempt().then(function (found) {
      if (id !== running) return;
      paint(found, []);
      out.removeAttribute('aria-busy');
      if (luck) luck.removeAttribute('aria-busy');
    });
  }

  var luck = document.getElementById('findLuck');
  if (luck) luck.addEventListener('click', tellMe);

  var asked = new URLSearchParams(location.search).get('q');
  if (asked) {
    input.value = asked;
    run(asked);
  }

  /* For checking a rule from the console without touching the page. */
  window.FivemileSearch = { run: run, understand: understand, answer: answer, tell: tellMe };
})();
