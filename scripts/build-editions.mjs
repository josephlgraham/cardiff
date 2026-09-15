/* The monthly edition.

     node scripts/build-editions.mjs                    build the edition that is due, if one is
     node scripts/build-editions.mjs --check            say what is due and why, write nothing
     node scripts/build-editions.mjs --from 2026-01     build every missing edition from that month on
     node scripts/build-editions.mjs --rebuild 2026-08  work one edition out again, by hand only
     node scripts/build-editions.mjs --report           the backtests behind the calls and the sayings
     node scripts/build-editions.mjs --no-pdf           draw the pages and print no PDF

   WHAT AN EDITION IS. On the 2nd of each month, once the last day of the month
   before is on file, this works out how that month went along the creek, how
   the forecasts for it did, and what the month ahead holds, and writes it as a
   page: fivemile-edition-2026-08.html. Every sentence in it is written below,
   in advance, and filled in from the records by rule. Nothing is generated and
   nothing is guessed. See DECISIONS.md 13 and 74.

   TWO STAGES, AND ONLY THE SECOND ONE RUNS TWICE.

   Working out. The figures, the calls and the sentences are worked out once and
   frozen into fivemile-editions/YYYY-MM.json. An edition is never worked out
   again on a later run, because the call it printed for the month ahead is the
   call the next edition scores, and a call that could quietly change after the
   month was over would be scored against nothing. --rebuild exists for Joe and
   for nobody's schedule.

   Rendering. The page is drawn from the frozen JSON on every run, so a change to
   the masthead or the card styles reaches every edition while no number in any
   of them moves. The shell is taken from fivemile-edition-archive.html, which is
   a real page and the room that lists them, so there is no template file to
   fall out of step with the site.

   IT ASKS THE SITE'S OWN ENGINES. The dates in the month ahead come from
   fivemile-calendar-core.js and fivemile-season-data.js, and the daylight and
   the turnings from fivemile-sky.js, run here in a vm context the way
   scripts/build-gauge-tiles.mjs runs them. The date rows are drawn with the
   calendar's own stubHtml. A council meeting is written down once and this
   file does not know when one falls.

   WHOSE NUMBERS. Our station for the month's weather, the Birmingham airport
   for anything reaching back past January 2026, and never both in one figure
   (DECISIONS.md 72). NOAA's outlook is always said as NOAA's. The station has no
   place in any sentence (DECISIONS.md 58).

   THE TIME ZONE. Actions runs in UTC and the engines build dates with the local
   constructor, so the zone is set before anything asks for a date. A month here
   is a month in Alabama. */

process.env.TZ = 'America/Chicago';

import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const at = (...p) => path.join(ROOT, ...p);

const EDITION_DIR = 'fivemile-editions';
const ROOM_PAGE = 'fivemile-edition-archive.html';
const SITE = 'https://fivemile.now/';
/* The first edition. The station log starts here, and so does the site. */
const FIRST_EDITION = '2026-01';
/* The sightings roll started at the end of April 2026, so a month before May
   would count everything ever recorded as new that month. */
const SIGHTINGS_FROM = '2026-05';
/* The fifteen minute creek record, which is the only one with a true daily
   high. Earlier years are daily means and read lower. See DECISIONS.md 71. */
const CREEK_HIGHS_FROM = 2008;
const TOWNS = ['Graysville', 'Cardiff', 'Brookside'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SMALL = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const ORDINAL = ['', '', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => { const i = args.indexOf(name); return i === -1 ? null : args[i + 1]; };

/* -------------------------------------------------------------------------
   Small things
   ------------------------------------------------------------------------- */
function pad2(n) { return String(n).padStart(2, '0'); }
function addMonth(key, n) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1, 12);
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1);
}
function yearOf(key) { return Number(key.slice(0, 4)); }
function monthOf(key) { return Number(key.slice(5, 7)); }
function daysIn(key) { return new Date(yearOf(key), monthOf(key), 0).getDate(); }
function dayKeys(key) {
  const out = [];
  for (let d = 1; d <= daysIn(key); d++) out.push(key + '-' + pad2(d));
  return out;
}
function monthName(key) { return MONTHS[monthOf(key) - 1]; }
function monthYear(key) { return monthName(key) + ' ' + yearOf(key); }
function localDate(date) { return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()); }
function todayKey() { return localDate(new Date()); }
function onDay(dateKey) { return MONTHS[Number(dateKey.slice(5, 7)) - 1] + ' ' + Number(dateKey.slice(8)); }
function onDayYear(dateKey) { return onDay(dateKey) + ', ' + dateKey.slice(0, 4); }
function shortDay(dateKey) { return MONTH_SHORT[Number(dateKey.slice(5, 7)) - 1] + ' ' + Number(dateKey.slice(8)); }
function num(v) { return v == null || v === '' || !isFinite(Number(v)) ? null : Number(v); }
function words(n) { return n >= 0 && n <= 10 ? SMALL[n] : n.toLocaleString('en-US'); }
function counted(n, one, many) { return words(n) + ' ' + (n === 1 ? one : many); }
function times(n) { return n === 1 ? 'once' : n === 2 ? 'twice' : words(n) + ' times'; }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function inches(v) { return v.toFixed(2); }
function feet(v) { return v.toFixed(2); }
function mean(list) { return list.length ? list.reduce((s, x) => s + x, 0) / list.length : null; }
function median(list) {
  const s = list.slice().sort((a, b) => a - b);
  if (!s.length) return null;
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}
function listWords(items) {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return items[0] + ' and ' + items[1];
  return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
}
function esc(v) {
  return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(at(file), 'utf8')); } catch { return fallback; }
}
async function exists(file) {
  try { await fs.access(at(file)); return true; } catch { return false; }
}
/* The working tree is CRLF on Joe's machine and LF in the index, so a file
   keeps whichever it already had. A new file gets LF, like the robots write. */
async function writeKeepingNewlines(file, text) {
  let current = null;
  try { current = await fs.readFile(at(file), 'utf8'); } catch {}
  const crlf = current != null && current.includes('\r\n');
  const out = crlf ? text.replace(/\r?\n/g, '\r\n') : text.replace(/\r\n/g, '\n');
  if (current === out) return false;
  await fs.mkdir(path.dirname(at(file)), { recursive: true });
  await fs.writeFile(at(file), out, 'utf8');
  return true;
}

/* -------------------------------------------------------------------------
   The records
   ------------------------------------------------------------------------- */
async function yearDir(dir) {
  const byDate = new Map();
  let names = [];
  try { names = await fs.readdir(at(dir)); } catch { return byDate; }
  for (const name of names.filter((n) => /^\d{4}\.json$/.test(n)).sort()) {
    const file = await readJson(path.join(dir, name), { days: [] });
    for (const d of file.days || []) byDate.set(d.date, d);
  }
  return byDate;
}

async function loadRecords() {
  const [airport, station, creek, normalsFile, outlooks, sayings, sightings, newsIndex, turnings] = await Promise.all([
    yearDir('fivemile-airport-archive'),
    yearDir('fivemile-weather-archive'),
    yearDir('fivemile-creek-archive'),
    readJson('fivemile-airport-normals.json', { days: [] }),
    readJson('fivemile-outlooks.json', { months: [] }),
    readJson('fivemile-sayings.json', { traditional: [], readers: [] }),
    readJson('fivemile-observations.json', { roll: [] }),
    readJson('news-archive/index.json', { months: [] }),
    readJson('turnings.json', { turnings: [] })
  ]);
  const normals = new Map((normalsFile.days || []).map((d) => [d.md, d]));
  const outlookBy = new Map((outlooks.months || []).map((m) => [m.month, m]));
  /* The high water line is read out of fivemile-common.js, where the masthead,
     the almanac, the fishing desk and the search all read it. A fifth copy
     here would disagree with them one day in front of a reader. */
  const common = await fs.readFile(at('fivemile-common.js'), 'utf8');
  const lineMatch = common.match(/FivemileCreekLines\s*=\s*Object\.freeze\(\{[\s\S]*?high:\s*([\d.]+)/);
  if (!lineMatch) throw new Error('could not find the high water line in fivemile-common.js');
  return {
    airport, station, creek, normals, outlookBy, sayings, sightings, newsIndex,
    turnings: turnings.turnings || [],
    highLine: Number(lineMatch[1])
  };
}

/* The engines, in the order a page loads them. */
async function loadEngines() {
  const noop = () => {};
  const windowShim = {
    console: { log: noop, warn: noop, error: noop, info: noop },
    document: {
      addEventListener: noop, getElementById: () => null, querySelector: () => null,
      querySelectorAll: () => [], readyState: 'complete'
    },
    addEventListener: noop,
    location: { pathname: '/' + ROOM_PAGE, search: '' },
    navigator: {},
    fetch: () => Promise.reject(new Error('the engines are handed their files, not fetched')),
    setTimeout, clearTimeout
  };
  windowShim.window = windowShim;
  windowShim.self = windowShim;
  const context = vm.createContext(windowShim);
  for (const file of ['fivemile-season-data.js', 'fivemile-sky.js', 'fivemile-calendar-core.js']) {
    vm.runInContext(await fs.readFile(at(file), 'utf8'), context, { filename: file });
  }
  if (!windowShim.FivemileCalendar || !windowShim.FivemileSky) throw new Error('the calendar or sky engine did not load');
  return { calendar: windowShim.FivemileCalendar, sky: windowShim.FivemileSky };
}

/* -------------------------------------------------------------------------
   A month at the airport, and its third

   NOAA's outlook is a chance that a month finishes in the warm, middle or cool
   third of its 1991 to 2020 months. So a month is scored the same way: its
   average temperature, the mean of each day's high and low, is set among the
   same month in those thirty years, and so is its rain.
   ------------------------------------------------------------------------- */
function airportMonth(R, key) {
  const days = dayKeys(key).map((k) => R.airport.get(k)).filter(Boolean);
  const temps = days.filter((d) => num(d.high) != null && num(d.low) != null).map((d) => (d.high + d.low) / 2);
  const rains = days.filter((d) => num(d.rain) != null);
  return {
    days: days.length,
    temp: temps.length >= 25 ? mean(temps) : null,
    rain: rains.length >= 25 ? rains.reduce((s, d) => s + d.rain, 0) : null
  };
}

const thirdCache = new Map();
function thirdOf(R, kind, key) {
  const cacheKey = kind + key;
  if (thirdCache.has(cacheKey)) return thirdCache.get(cacheKey);
  const mm = key.slice(5);
  const base = [];
  for (let y = 1991; y <= 2020; y++) {
    const v = airportMonth(R, y + '-' + mm)[kind];
    if (v != null) base.push(v);
  }
  base.sort((a, b) => a - b);
  const v = airportMonth(R, key)[kind];
  let third = null;
  if (v != null && base.length >= 25) {
    const lo = base[Math.floor(base.length / 3) - 1];
    const hi = base[Math.ceil(2 * base.length / 3) - 1];
    third = v <= lo ? 'below' : v > hi ? 'above' : 'normal';
  }
  thirdCache.set(cacheKey, third);
  return third;
}

/* FIVEMILE's call. Which third did the month just gone finish in, and what
   followed it in every earlier year that started the same way? A call is made
   only when at least fifteen years started that way and one outcome, warm or
   cool, came in at least 45 times in a hundred. Otherwise the record has no
   lean and the edition says so. Only years before the month being called are
   counted, so the call could have been made on the day it is dated.

   Temperature only. Run over the airport record, the same rule for rain was
   right less often than a guess. See --report and DECISIONS.md 74. */
function fivemileCall(R, target, kind = 'temp') {
  const prev = addMonth(target, -1);
  const prevThird = thirdOf(R, kind, prev);
  if (!prevThird) return { cat: 'none', reason: 'no-prior' };
  const counts = { above: 0, normal: 0, below: 0 };
  let n = 0;
  for (let y = 1931; y < yearOf(target); y++) {
    const month = y + '-' + target.slice(5);
    if (thirdOf(R, kind, addMonth(month, -1)) !== prevThird) continue;
    const outcome = thirdOf(R, kind, month);
    if (!outcome) continue;
    counts[outcome]++;
    n++;
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const call = n >= 15 && best[1] / n >= 0.45 && best[0] !== 'normal' ? best[0] : 'none';
  return { cat: call, prevThird, hits: best[1], n, counts };
}

function verdictOf(cat, outcome) {
  if (!cat || cat === 'none' || cat === 'equal' || !outcome) return 'none';
  return cat === outcome ? 'right' : 'wrong';
}

/* -------------------------------------------------------------------------
   The sayings. Each test was written down in fivemile-sayings.json before it
   was run. held is true, false, or null for a year the record cannot answer.
   ------------------------------------------------------------------------- */
function normalFor(R, dateKey) { return R.normals.get(dateKey.slice(5)) || null; }
function airportDay(R, dateKey) { return R.airport.get(dateKey) || null; }

const SAYING_RULES = {
  candlemas(R, year) {
    const day = airportDay(R, year + '-02-02');
    if (!day || num(day.rain) == null) return null;
    const fair = day.rain < 0.01;
    const diffs = [];
    for (let d = new Date(year, 1, 3, 12); d <= new Date(year, 2, 16, 12); d.setDate(d.getDate() + 1)) {
      const k = localDate(d);
      const row = airportDay(R, k);
      const norm = normalFor(R, k);
      if (row && norm && num(row.high) != null && num(row.low) != null) diffs.push((row.high + row.low) / 2 - (norm.high + norm.low) / 2);
    }
    if (diffs.length < 36) return null;
    const cold = mean(diffs) < 0;
    return { held: fair === cold, fair, cold };
  },
  lionLamb(R, year) {
    const rough = (k) => { const d = airportDay(R, k); return d && ((num(d.rain) || 0) >= 0.25 || (num(d.low) != null && d.low <= 32)); };
    const gentle = (k) => { const d = airportDay(R, k); return d && num(d.rain) != null && d.rain < 0.01 && num(d.low) != null && d.low > 32; };
    const start = [1, 2, 3].map((n) => year + '-03-0' + n);
    const end = [29, 30, 31].map((n) => year + '-03-' + n);
    if (![...start, ...end].every((k) => airportDay(R, k))) return null;
    const roughStart = start.some(rough);
    const gentleEnd = end.every(gentle);
    return { held: roughStart === gentleEnd, roughStart, gentleEnd };
  },
  dogwoodWinter(R, year) { return coldSnap(R, year, 80, year + '-04-01', year + '-04-30'); },
  blackberryWinter(R, year) { return coldSnap(R, year, 85, year + '-05-01', year + '-05-20'); },
  dogDays(R, year) {
    let best = null;
    const hot = [];
    for (let d = new Date(year, 5, 1, 12); d <= new Date(year, 8, 30, 12); d.setDate(d.getDate() + 1)) {
      const k = localDate(d);
      const row = airportDay(R, k);
      if (!row || num(row.high) == null) continue;
      if (best == null || row.high > best) { best = row.high; hot.length = 0; }
      if (row.high === best) hot.push(k);
    }
    if (best == null || hot.length === 0) return null;
    const md = (k) => k.slice(5);
    const inside = hot.filter((k) => md(k) >= '07-03' && md(k) <= '08-11');
    return { held: inside.length > 0, high: best, day: inside[0] || hot[0] };
  }
};

function coldSnap(R, year, warm, from, to) {
  let warmed = null;
  for (let d = new Date(year, 0, 1, 12); localDate(d) <= to; d.setDate(d.getDate() + 1)) {
    const k = localDate(d);
    const row = airportDay(R, k);
    if (!row) continue;
    if (!warmed && num(row.high) != null && row.high >= warm) warmed = k;
    if (warmed && k >= from && k > warmed && num(row.low) != null) {
      const norm = normalFor(R, k);
      if (norm && row.low <= norm.low - 10) return { held: true, day: k, low: row.low, normal: norm.low };
    }
  }
  if (!R.airport.get(to)) return null;
  return { held: false };
}

function sayingRecord(R, saying, beforeYear) {
  const rule = SAYING_RULES[saying.rule];
  let held = 0;
  let years = 0;
  for (let y = 1930; y < beforeYear; y++) {
    const r = rule(R, y);
    if (!r) continue;
    years++;
    if (r.held) held++;
  }
  return { held, years };
}

/* -------------------------------------------------------------------------
   WORKING OUT AN EDITION
   ------------------------------------------------------------------------- */
function lede(station, creek, key) {
  const parts = [];
  if (station) {
    const d = station.tempDiff;
    const temp = d == null ? null
      : d >= 3 ? 'ran well warmer than usual'
      : d >= 1 ? 'ran a little warmer than usual'
      : d <= -3 ? 'ran well cooler than usual'
      : d <= -1 ? 'ran a little cooler than usual'
      : 'ran about as warm as usual';
    const r = station.rainNormal ? station.rain / station.rainNormal : null;
    const rain = r == null ? null
      : r >= 1.5 ? 'came in wet'
      : r >= 1.15 ? 'came in wetter than usual'
      : r <= 0.5 ? 'came in dry'
      : r <= 0.85 ? 'came in short of rain'
      : 'came in close to normal on rain';
    if (temp && rain) parts.push(monthName(key) + ' ' + temp + ' and ' + rain);
    else if (temp) parts.push(monthName(key) + ' ' + temp);
  }
  if (creek) {
    const c = creek.daysHigh === 0 ? 'Five Mile Creek never reached the high water line'
      : 'Five Mile Creek rose over the high water line ' + times(creek.rises);
    if (!parts.length) return c + ' in ' + monthName(key) + '.';
    return parts[0] + ', and ' + c + '.';
  }
  return parts.length ? parts[0] + '.' : '';
}

function stationMonth(R, key) {
  const days = dayKeys(key).map((k) => R.station.get(k)).filter((d) => d && num(d.high) != null && num(d.low) != null);
  if (days.length < 20) return null;
  const hot = days.reduce((a, b) => (b.high > a.high ? b : a));
  const cold = days.reduce((a, b) => (b.low < a.low ? b : a));
  const temps = days.map((d) => (d.high + d.low) / 2);
  const normTemps = days.map((d) => normalFor(R, d.date)).filter(Boolean).map((n) => (n.high + n.low) / 2);
  const rainDays = days.filter((d) => num(d.rain) != null);
  const rain = rainDays.reduce((s, d) => s + d.rain, 0);
  const rainNormal = dayKeys(key).map((k) => normalFor(R, k)).filter(Boolean).reduce((s, n) => s + n.rain, 0);
  const wettest = rainDays.length ? rainDays.reduce((a, b) => (b.rain > a.rain ? b : a)) : null;
  const avg = mean(temps);
  return {
    days: days.length,
    daysInMonth: daysIn(key),
    hot: { value: hot.high, date: hot.date },
    cold: { value: cold.low, date: cold.date },
    avg: Math.round(avg * 10) / 10,
    tempDiff: normTemps.length === temps.length ? Math.round((avg - mean(normTemps)) * 10) / 10 : null,
    rain: Math.round(rain * 100) / 100,
    rainNormal: Math.round(rainNormal * 100) / 100,
    wettest: wettest && wettest.rain > 0 ? { value: wettest.rain, date: wettest.date } : null,
    ninety: days.filter((d) => d.high >= 90).length,
    freezing: days.filter((d) => d.low <= 32).length
  };
}

/* Where the month stands in the airport's record, said only when it is in the
   top ten either way. A month in the middle of the pack is not news. */
function airportRanks(R, key) {
  const mine = airportMonth(R, key);
  const mm = key.slice(5);
  const all = [];
  for (let y = 1930; y <= yearOf(key); y++) {
    const m = airportMonth(R, y + '-' + mm);
    all.push({ year: y, temp: m.temp, rain: m.rain });
  }
  const out = {};
  for (const kind of ['temp', 'rain']) {
    if (mine[kind] == null) continue;
    const list = all.filter((x) => x[kind] != null);
    const above = list.filter((x) => x[kind] > mine[kind]).length + 1;
    const below = list.filter((x) => x[kind] < mine[kind]).length + 1;
    if (above <= 10) out[kind] = { rank: above, high: true, of: list.length };
    else if (below <= 10) out[kind] = { rank: below, high: false, of: list.length };
  }
  return out;
}

function creekMonth(R, key) {
  const days = dayKeys(key).map((k) => R.creek.get(k)).filter(Boolean);
  const highOf = (d) => (num(d.high) != null ? d.high : num(d.mean));
  const lowOf = (d) => (num(d.low) != null ? d.low : num(d.mean));
  const withHigh = days.filter((d) => highOf(d) != null);
  if (withHigh.length < 20) return null;
  const peak = withHigh.reduce((a, b) => (highOf(b) > highOf(a) ? b : a));
  const trough = withHigh.filter((d) => lowOf(d) != null).reduce((a, b) => (lowOf(b) < lowOf(a) ? b : a));
  let daysHigh = 0;
  let rises = 0;
  let inRise = false;
  for (const k of dayKeys(key)) {
    const d = R.creek.get(k);
    const high = d ? highOf(d) : null;
    const over = high != null && high >= R.highLine;
    if (over) { daysHigh++; if (!inRise) rises++; }
    inRise = over;
  }
  const peaks = [];
  for (let y = CREEK_HIGHS_FROM; y < yearOf(key); y++) {
    const vals = dayKeys(y + '-' + key.slice(5)).map((k) => R.creek.get(k)).filter((d) => d && num(d.high) != null).map((d) => d.high);
    if (vals.length >= 20) peaks.push(Math.max(...vals));
  }
  return {
    days: withHigh.length,
    peak: { value: highOf(peak), date: peak.date },
    low: { value: lowOf(trough), date: trough.date },
    daysHigh, rises,
    typicalPeak: peaks.length >= 5 ? Math.round(median(peaks) * 100) / 100 : null,
    typicalYears: peaks.length,
    line: R.highLine
  };
}

async function storiesMonth(key) {
  const file = await readJson('news-archive/' + key + '.json', null);
  if (!file || !Array.isArray(file.stories)) return null;
  const stories = file.stories.filter((s) => s.section !== 'obituaries' && !(s.tags || []).some((t) => /obituar/i.test(t)));
  if (!stories.length) return null;
  const first = stories.map((s) => String(s.published_at || '')).filter(Boolean).sort()[0] || '';
  return {
    count: stories.length,
    towns: TOWNS.map((town) => ({ town, n: stories.filter((s) => s.town === town).length })),
    startsLate: first && Number(localDate(new Date(first)).slice(8)) > 7 ? localDate(new Date(first)) : null
  };
}

function sightingsMonth(R, key) {
  if (key < SIGHTINGS_FROM) return null;
  const rows = (R.sightings.roll || []).filter((r) => String(r.first || '').startsWith(key));
  if (!rows.length) return null;
  const names = rows.slice().sort((a, b) => (num(b.count) || 0) - (num(a.count) || 0) || a.name.localeCompare(b.name))
    .slice(0, 3).map((r) => r.name);
  return { count: rows.length, names };
}

function outlookFor(R, key) {
  const o = R.outlookBy.get(key);
  return o ? { issued: o.issued, temp: o.temp, rain: o.rain } : null;
}

function noaaTally(R, through) {
  const tally = { temp: { right: 0, wrong: 0, none: 0 }, rain: { right: 0, wrong: 0, none: 0 }, since: null };
  for (const [month, o] of [...R.outlookBy.entries()].sort()) {
    if (month > through) continue;
    const t = thirdOf(R, 'temp', month);
    const r = thirdOf(R, 'rain', month);
    if (!t || !r) continue;
    if (!tally.since) tally.since = month;
    tally.temp[verdictOf(o.temp.cat, t)]++;
    tally.rain[verdictOf(o.rain.cat, r)]++;
  }
  return tally;
}

async function fivemileTally(key, thisVerdict) {
  const tally = { right: 0, wrong: 0, none: 0 };
  for (let m = FIRST_EDITION; m < key; m = addMonth(m, 1)) {
    const past = await readJson(path.join(EDITION_DIR, m + '.json'), null);
    const v = past && past.calls && past.calls.fivemile ? past.calls.fivemile.verdict : null;
    if (v) tally[v]++;
  }
  tally[thisVerdict]++;
  return tally;
}

function daylight(E, date) {
  const t = E.sky.riseSetTransit(date, E.sky.sunAt, { h0: -0.833 });
  return t && t.rise && t.set ? Math.round((t.set - t.rise) / 60000) : null;
}

/* In the calendar's words, because the calendar row for the same day sits
   further down the same page. */
const TURNING_NAMES = {
  'spring-equinox': 'spring equinox', 'summer-solstice': 'summer solstice',
  'fall-equinox': 'autumn equinox', 'winter-solstice': 'winter solstice'
};

function skyAhead(E, key) {
  const first = new Date(yearOf(key), monthOf(key) - 1, 1, 12);
  const last = new Date(yearOf(key), monthOf(key) - 1, daysIn(key), 12);
  const a = daylight(E, first);
  const b = daylight(E, last);
  let turning = null;
  for (const name of Object.keys(TURNING_NAMES)) {
    const when = E.sky.sunTurning(yearOf(key), name);
    if (when && when.getMonth() + 1 === monthOf(key)) turning = { name, date: localDate(when) };
  }
  return a != null && b != null ? { first: a, last: b, turning } : null;
}

function normalsAhead(R, key) {
  const days = dayKeys(key).map((k) => normalFor(R, k)).filter(Boolean);
  if (!days.length) return null;
  let recordHigh = null;
  let recordLow = null;
  let froze = 0;
  let years = 0;
  let edgeFreeze = null;
  const spring = monthOf(key) <= 6;
  for (let y = 1930; y < yearOf(key); y++) {
    const rows = dayKeys(y + '-' + key.slice(5)).map((k) => R.airport.get(k)).filter(Boolean);
    if (rows.length < 25) continue;
    years++;
    let yearFroze = false;
    for (const d of rows) {
      if (num(d.high) != null && (!recordHigh || d.high > recordHigh.value)) recordHigh = { value: d.high, date: d.date };
      if (num(d.low) != null && (!recordLow || d.low < recordLow.value)) recordLow = { value: d.low, date: d.date };
      if (num(d.low) != null && d.low <= 32) {
        yearFroze = true;
        /* The latest freeze on record in a spring month, the earliest in a
           fall one, set by day of the month and not by year. */
        const md = d.date.slice(5);
        if (!edgeFreeze || (spring ? md > edgeFreeze.date.slice(5) : md < edgeFreeze.date.slice(5))) edgeFreeze = { date: d.date, low: d.low };
      }
    }
    if (yearFroze) froze++;
  }
  const share = years ? froze / years : 0;
  return {
    highFrom: days[0].high, highTo: days[days.length - 1].high,
    lowFrom: days[0].low, lowTo: days[days.length - 1].low,
    rain: Math.round(days.reduce((s, d) => s + d.rain, 0) * 100) / 100,
    recordHigh, recordLow,
    frost: share >= 0.05 && share <= 0.95 ? { froze, years, edge: edgeFreeze, spring } : null
  };
}

function datesAhead(E, R, key) {
  const keep = new Set(['civic', 'community', 'market', 'sky']);
  return E.calendar.monthItems(yearOf(key), monthOf(key), R.turnings, null)
    .filter((item) => keep.has(item.subject))
    .map((item) => ({
      date: localDate(item.date), word: item.word || null, title: item.title, blurb: item.blurb || '',
      url: item.url || '', subject: item.subject, town: item.town || '', shiftNote: item.shiftNote || ''
    }));
}

function sayingAhead(R, key) {
  const month = monthOf(key);
  const trad = (R.sayings.traditional || []).find((s) => s.month === month);
  const reader = (R.sayings.readers || []).find((s) => Number(s.month) === month && s.saying);
  const out = {};
  if (trad && SAYING_RULES[trad.rule]) {
    out.traditional = { id: trad.id, record: sayingRecord(R, trad, yearOf(key)) };
  }
  if (reader) out.reader = { saying: reader.saying, credited: reader.credited || 'a reader' };
  return out.traditional || out.reader ? out : null;
}

function sayingChecks(R, key) {
  return (R.sayings.traditional || [])
    .filter((s) => s.check === monthOf(key) && SAYING_RULES[s.rule])
    .map((s) => ({ id: s.id, result: SAYING_RULES[s.rule](R, yearOf(key)) }))
    .filter((c) => c.result);
}

async function workOut(R, E, key, built) {
  const next = addMonth(key, 1);
  const prevEdition = await readJson(path.join(EDITION_DIR, addMonth(key, -1) + '.json'), null);
  const station = stationMonth(R, key);
  const creek = creekMonth(R, key);
  const outcome = { temp: thirdOf(R, 'temp', key), rain: thirdOf(R, 'rain', key) };
  const noaa = outlookFor(R, key);
  /* The call the edition before printed, when there was one, so the call scored
     is the call a reader saw. */
  const fmCall = prevEdition && prevEdition.ahead && prevEdition.ahead.fivemile
    ? prevEdition.ahead.fivemile
    : fivemileCall(R, key);
  const fmVerdict = verdictOf(fmCall.cat, outcome.temp);
  const monthEndsOn = new Date(yearOf(next), monthOf(next) - 1, 1, 12);
  const builtDate = new Date(built + 'T12:00:00');
  const backfilled = (builtDate - monthEndsOn) / 86400000 > 5;
  return {
    month: key,
    title: 'The ' + monthYear(key) + ' Edition',
    built,
    backfilled,
    lede: lede(station, creek, key),
    was: {
      station,
      ranks: airportRanks(R, key),
      creek,
      stories: await storiesMonth(key),
      sightings: sightingsMonth(R, key)
    },
    calls: {
      outcome,
      noaa: noaa ? {
        ...noaa,
        tempVerdict: verdictOf(noaa.temp.cat, outcome.temp),
        rainVerdict: verdictOf(noaa.rain.cat, outcome.rain)
      } : null,
      fivemile: { ...fmCall, verdict: fmVerdict },
      noaaTally: noaaTally(R, key),
      fivemileTally: await fivemileTally(key, fmVerdict),
      sayings: sayingChecks(R, key)
    },
    ahead: {
      month: next,
      noaa: outlookFor(R, next),
      fivemile: fivemileCall(R, next),
      normals: normalsAhead(R, next),
      sky: skyAhead(E, next),
      saying: sayingAhead(R, next),
      dates: datesAhead(E, R, next)
    }
  };
}

/* -------------------------------------------------------------------------
   RENDERING. Everything below reads the frozen edition and nothing else, apart
   from the calendar's stubHtml and the sayings file for a saying's words.
   ------------------------------------------------------------------------- */
const THIRD_WORD = { above: 'warm', normal: 'middle', below: 'cool' };
const RAIN_THIRD_WORD = { above: 'wet', normal: 'middle', below: 'dry' };

function leanWords(call, kind) {
  const warm = kind === 'temp';
  const word = call.cat === 'above' ? (warm ? 'warmer' : 'wetter') : call.cat === 'below' ? (warm ? 'cooler' : 'drier') : 'near normal';
  return { word, slight: call.prob != null && call.prob <= 33 };
}

function noaaSentence(o, monthKey, future) {
  const month = monthName(monthKey);
  const piece = (call, kind) => {
    const noun = kind === 'temp' ? 'temperature' : 'rain';
    if (call.cat === 'equal') return 'no lean either way on ' + noun;
    const l = leanWords(call, kind);
    return l.slight ? 'a slight lean toward a ' + l.word + ' than normal ' + month
      : 'a ' + call.prob + ' percent chance of a ' + l.word + ' than normal ' + month;
  };
  const temp = piece(o.temp, 'temp');
  let rain = piece(o.rain, 'rain');
  if (o.temp.cat !== 'equal' && o.rain.cat !== 'equal') rain = rain.replace(' ' + month, ' one');
  const verb = future ? 'gives these three towns' : 'gave these three towns';
  if (o.temp.cat === 'equal' && o.rain.cat === 'equal') {
    return 'NOAA\'s Climate Prediction Center ' + (future ? 'has' : 'had') + ' no lean either way for ' + month + ', on temperature or on rain.';
  }
  return 'NOAA\'s Climate Prediction Center ' + verb + ' ' + temp + ', and ' + rain + '.';
}

function chip(verdict) {
  const label = verdict === 'right' ? 'Right' : verdict === 'wrong' ? 'Missed' : 'No call';
  return '<span class="ed-verdict ed-' + verdict + '">' + label + '</span>';
}

function card(bar, right, body, extraClass) {
  return '<div class="card-dept' + (extraClass ? ' ' + extraClass : '') + '">' +
    '<div class="d-bar"><h3>' + esc(bar) + '</h3>' + (right ? '<span class="r">' + right + '</span>' : '') + '</div>' +
    '<div class="d-body">' + body + '</div></div>';
}
function rows(list) {
  return '<div class="d-rows list">' + list.map(([mark, label, value]) =>
    '<div class="d-cell"><em><i class="d-mark" aria-hidden="true">' + mark + '</i>' + esc(label) + '</em><b>' + value + '</b></div>').join('') + '</div>';
}
function paras(list) { return list.filter(Boolean).map((p) => '<p>' + esc(p) + '</p>').join(''); }
function tip(text) { return text ? '<p class="d-tip">' + esc(text) + '</p>' : ''; }
function door(href, label, external) {
  return '<a class="d-go" href="' + esc(href) + '"' + (external ? ' target="_blank" rel="noopener"' : '') + '>' + esc(label) +
    ' <span aria-hidden="true">' + (external ? '&#8599;' : '&rarr;') + '</span></a>';
}
/* A grid never ends in a hole: an odd card out takes the whole row.
   See DECISIONS.md 66. */
function grid(cards) {
  if (cards.length % 2 === 1) cards[cards.length - 1] = cards[cards.length - 1].replace('class="card-dept', 'class="card-dept span2');
  return '<div class="two-eq">' + cards.join('') + '</div>';
}
function hm(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h + ' h ' + pad2(m) + ' m';
}
/* Figures, not words, because "ten hours and 35 minutes" reads as two
   different styles in one breath. */
function hoursMinutesWords(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const unit = (n, one, many) => n + ' ' + (n === 1 ? one : many);
  if (!h) return unit(m, 'minute', 'minutes');
  return unit(h, 'hour', 'hours') + (m ? ' and ' + unit(m, 'minute', 'minutes') : '');
}

function wasSection(ed) {
  const key = ed.month;
  const name = monthName(key);
  const cards = [];
  const s = ed.was.station;
  if (s) {
    const say = [];
    if (s.tempDiff != null) {
      say.push(Math.abs(s.tempDiff) < 0.5
        ? 'The average of the highs and lows came to ' + s.avg + ' degrees, right at normal for ' + name + '.'
        : 'The average of the highs and lows came to ' + s.avg + ' degrees, ' + Math.abs(s.tempDiff).toFixed(1) + ' degrees ' +
          (s.tempDiff > 0 ? 'warmer' : 'cooler') + ' than normal for ' + name + '.');
    }
    say.push('Our station measured ' + inches(s.rain) + ' inches of rain, against a normal of ' + inches(s.rainNormal) +
      ' at the Birmingham airport.' + (s.wettest ? ' The wettest day was ' + onDay(s.wettest.date) + ', with ' + inches(s.wettest.value) + ' inches.' : ''));
    const r = ed.was.ranks;
    const rankLine = (kind) => {
      const x = r[kind];
      if (!x) return null;
      const word = kind === 'temp' ? (x.high ? 'warmest' : 'coolest') : (x.high ? 'wettest' : 'driest');
      return 'the ' + (x.rank === 1 ? '' : ORDINAL[x.rank] + ' ') + word + ' ' + name;
    };
    const ranked = [rankLine('temp'), rankLine('rain')].filter(Boolean);
    if (ranked.length) {
      say.push('At the Birmingham airport, whose record goes back to 1930, it was ' + listWords(ranked) + ' on the books.');
    }
    const list = [
      ['🌡️', 'Hottest', s.hot.value + '° on ' + shortDay(s.hot.date)],
      ['🌙', 'Coldest', s.cold.value + '° on ' + shortDay(s.cold.date)],
      ['🌧️', 'Rain', inches(s.rain) + ' in']
    ];
    if (s.ninety) list.push(['☀️', 'Days of 90° or more', String(s.ninety)]);
    else if (s.freezing) list.push(['❄️', 'Nights at freezing', String(s.freezing)]);
    cards.push(card('Weather', 'Our station', rows(list) + paras(say) +
      tip(s.days < s.daysInMonth ? 'Our station has ' + s.days + ' of the month\'s ' + s.daysInMonth + ' days on file.' : '') +
      door('fivemile-weather-archive.html', 'Weather log')));
  }
  const c = ed.was.creek;
  if (c) {
    const say = [];
    say.push(c.daysHigh
      ? 'It reached the high water line, ' + c.line + ' feet at Republic, on ' + counted(c.daysHigh, 'day', 'days') + ', in ' +
        counted(c.rises, 'separate rise', 'separate rises') + '.'
      : 'It never reached the high water line, ' + c.line + ' feet at Republic.');
    if (c.typicalPeak != null) {
      const ratio = c.peak.value / c.typicalPeak;
      const how = ratio >= 1.05 ? 'higher than' : ratio <= 0.95 ? 'lower than' : 'about the same as';
      say.push('Its highest reading, ' + feet(c.peak.value) + ' feet on ' + onDay(c.peak.date) + ', was ' + how +
        ' the ' + feet(c.typicalPeak) + ' feet the creek reaches in a typical ' + name + ' since ' + CREEK_HIGHS_FROM + '.');
    }
    cards.push(card('The creek', 'Five Mile Creek at Republic',
      rows([
        ['🌊', 'Highest', feet(c.peak.value) + ' ft on ' + shortDay(c.peak.date)],
        ['🪨', 'Lowest', feet(c.low.value) + ' ft on ' + shortDay(c.low.date)],
        ['📈', 'Days at high water', String(c.daysHigh)]
      ]) + paras(say) +
      tip('The high water line is the one the masthead uses. It is not a flood stage, because this gauge does not have one.') +
      door('fivemile-creek-archive.html', 'Creek log')));
  }
  const st = ed.was.stories;
  if (st) {
    const t = st.towns.map((x, i) => {
      const n = x.n === 0 ? 'none' : words(x.n);
      return n + (i === 0 ? (x.n === 1 ? ' was' : ' were') : '') + ' about ' + x.town;
    });
    const say = [cap(counted(st.count, 'story', 'stories')) + ' ran in ' + name + ', not counting obituaries.',
      cap(t[0]) + ', ' + t[1] + ', and ' + t[2] + '. The rest were about the county and the places around the three towns.'];
    if (st.startsLate) say.push('The story index starts on ' + onDay(st.startsLate) + '.');
    cards.push(card('Stories', 'News page',
      rows(st.towns.map((x) => ['📰', x.town, String(x.n)])) + paras(say) + door('fivemile-news-archive.html', 'Story index')));
  }
  const si = ed.was.sightings;
  if (si) {
    const say = cap(counted(si.count, 'species was', 'species were')) + ' recorded along the lower creek for the first time on file' +
      (si.names.length ? ', among them ' + listWords(si.names) : '') + '.';
    cards.push(card('Sightings', 'Lower creek', rows([['🦉', 'New to the roll', String(si.count)]]) + paras([say]) +
      door('fivemile-nature.html', 'Nature Watch')));
  }
  if (!cards.length) return '';
  return '<section class="blk" id="the-month">' +
    '<div class="hd"><h2>' + esc(name) + ' along the creek</h2></div>' + grid(cards) + '</section>';
}

function sayingById(sayings, id) { return (sayings.traditional || []).find((s) => s.id === id) || null; }
function sayingName(s) {
  return { candlemas: 'Candlemas', 'lion-lamb': 'In like a lion', 'dogwood-winter': 'Dogwood winter',
    'blackberry-winter': 'Blackberry winter', 'dog-days': 'The dog days' }[s.id] || s.id;
}
function sayingResultSentence(s, r, year) {
  switch (s.id) {
    case 'candlemas':
      return 'Candlemas this year was ' + (r.fair ? 'dry' : 'wet') + ' at the airport, and the six weeks after it ran ' +
        (r.cold ? 'colder' : 'milder') + ' than normal, so the saying ' + (r.held ? 'held' : 'did not hold') + ' in ' + year + '.';
    case 'lion-lamb':
      return 'March came in ' + (r.roughStart ? 'rough' : 'gentle') + ' and went out ' + (r.gentleEnd ? 'gentle' : 'rough') +
        ' at the airport, so the saying ' + (r.held ? 'held' : 'did not hold') + ' in ' + year + '.';
    case 'dogwood-winter':
    case 'blackberry-winter':
      return r.held
        ? 'It came this year: the airport got down to ' + r.low + ' degrees on ' + onDay(r.day) + ', ' + (r.normal - r.low) + ' degrees under the normal low.'
        : 'It did not come this year, by the test written for it.';
    case 'dog-days':
      return r.held
        ? 'The hottest day of the summer at the airport, ' + r.high + ' degrees, came on ' + onDay(r.day) + ', inside the dog days.'
        : 'The hottest day of the summer at the airport, ' + r.high + ' degrees, came on ' + onDay(r.day) + ', outside the dog days.';
    default:
      return '';
  }
}

function callsSection(ed, sayings) {
  const key = ed.month;
  const name = monthName(key);
  const c = ed.calls;
  const parts = [];
  const out = c.outcome;
  const say = [];
  if (out.temp) {
    say.push('Set against the same month in 1991 to 2020 at the Birmingham airport, ' + name + ' finished in the ' +
      THIRD_WORD[out.temp] + ' third for temperature' + (out.rain ? ' and the ' + RAIN_THIRD_WORD[out.rain] + ' third for rain' : '') + '.');
  }
  if (c.noaa) {
    const issued = onDay(c.noaa.issued) + (c.noaa.issued.slice(0, 4) !== key.slice(0, 4) ? ', ' + c.noaa.issued.slice(0, 4) : '');
    if (c.noaa.temp.cat === 'equal') {
      say.push('NOAA\'s outlook, issued ' + issued + ', had no lean either way on temperature, so there was nothing to score.');
    } else {
      const l = leanWords(c.noaa.temp, 'temp');
      say.push('NOAA\'s outlook, issued ' + issued + ', ' + (l.slight ? 'leaned slightly' : 'gave a ' + c.noaa.temp.prob + ' percent chance of') + ' ' +
        (l.slight ? 'toward ' : '') + 'a ' + l.word + ' than normal month. ' + (c.noaa.tempVerdict === 'right' ? 'That was right.' : 'That missed.'));
    }
    if (c.noaa.rain.cat !== 'equal') {
      const l = leanWords(c.noaa.rain, 'rain');
      say.push('On rain it ' + (l.slight ? 'leaned slightly' : 'gave a ' + c.noaa.rain.prob + ' percent chance of') + ' ' + (l.slight ? 'toward ' : '') +
        'a ' + l.word + ' than normal month, and ' + (c.noaa.rainVerdict === 'right' ? 'that was right too.' : 'that missed.'));
    }
  }
  const fm = c.fivemile;
  if (fm.cat === 'none') {
    say.push('FIVEMILE made no call for ' + name + ', because the record had no clear lean after ' +
      (fm.prevThird ? 'a ' + THIRD_WORD[fm.prevThird] + ' ' + monthName(addMonth(key, -1)) : 'the month before') + '.');
  } else {
    say.push('FIVEMILE called it ' + THIRD_WORD[fm.cat] + ', because after a ' + THIRD_WORD[fm.prevThird] + ' ' + monthName(addMonth(key, -1)) +
      ', ' + name + ' had come in ' + THIRD_WORD[fm.cat] + ' in ' + fm.hits + ' of ' + fm.n + ' years. ' +
      (fm.verdict === 'right' ? 'That was right.' : 'That missed.'));
  }
  const nt = c.noaaTally.temp;
  const ft = c.fivemileTally;
  const tally = [];
  if (c.noaaTally.since) {
    tally.push('Since ' + monthYear(c.noaaTally.since) + ', NOAA\'s temperature outlook for these three towns has been right ' +
      times(nt.right) + ' and missed ' + times(nt.wrong) + ', with no lean ' + times(nt.none) + '.');
  }
  const fmCalls = ft.right + ft.wrong;
  const since = ' it has made a call since January 2026.';
  tally.push(!fmCalls ? 'FIVEMILE has not made a call yet since January 2026.'
    : ft.right === fmCalls && fmCalls === 1 ? 'FIVEMILE has been right the one time' + since
    : ft.right === fmCalls && fmCalls === 2 ? 'FIVEMILE has been right both times' + since
    : ft.right === fmCalls ? 'FIVEMILE has been right all ' + words(fmCalls) + ' times' + since
    : 'FIVEMILE has been right ' + words(ft.right) + ' of the ' + counted(fmCalls, 'time', 'times') + since);
  tally.push('A call made by guessing would be right about one time in three.');
  const list = [['🛰️', 'NOAA', c.noaa ? chip(c.noaa.tempVerdict) : chip('none')], ['📜', 'FIVEMILE', chip(fm.verdict)]];
  parts.push(card('The calls for ' + name, 'Temperature', rows(list) + paras(say) + tip(tally.join(' '))));

  for (const check of c.sayings || []) {
    const s = sayingById(sayings, check.id);
    if (!s) continue;
    parts.push(card(sayingName(s), 'The old ' + (s.saying ? 'saying' : 'belief'),
      rows([['🪶', 'This year', chip(check.result.held ? 'right' : 'wrong').replace('>Right<', '>Held<').replace('>Missed<', '>Did not hold<')]]) +
      paras([s.define, sayingResultSentence(s, check.result, yearOf(key))]) +
      door(s.url, s.source, true)));
  }
  return '<section class="blk" id="the-calls">' +
    '<div class="hd"><h2>How the calls did</h2></div>' + grid(parts) + '</section>';
}

function aheadSection(ed, sayings, E) {
  const a = ed.ahead;
  const key = a.month;
  const name = monthName(key);
  const cards = [];

  const say = [];
  const list = [];
  if (a.noaa) {
    say.push(noaaSentence(a.noaa, key, true));
    const t = a.noaa.temp;
    list.push(['🛰️', 'NOAA', t.cat === 'equal' ? 'No lean' : (leanWords(t, 'temp').slight ? 'Slightly ' : t.prob + '% ') + leanWords(t, 'temp').word]);
  }
  const fm = a.fivemile;
  if (fm.cat === 'none') {
    say.push('FIVEMILE has no call for ' + name + '. After ' + (fm.prevThird ? 'a ' + THIRD_WORD[fm.prevThird] + ' ' + monthName(ed.month) : 'a month like this one') +
      ', the record has no clear lean.');
    list.push(['📜', 'FIVEMILE', 'No call']);
  } else {
    say.push('FIVEMILE\'s call is a ' + (fm.cat === 'above' ? 'warmer' : 'cooler') + ' than normal ' + name + '. After a ' + THIRD_WORD[fm.prevThird] + ' ' +
      monthName(ed.month) + ', ' + name + ' has come in ' + THIRD_WORD[fm.cat] + ' in ' + fm.hits + ' of ' + fm.n + ' years at the airport.');
    list.push(['📜', 'FIVEMILE', fm.cat === 'above' ? 'Warmer' : 'Cooler']);
  }
  cards.push(card('The outlook', esc(name), rows(list) + paras(say) +
    tip('FIVEMILE does not call rain. In the airport record a wet month is followed by a wet one no more often than chance would have it.')));

  const n = a.normals;
  if (n) {
    const move = (from, to) => (to > from ? 'rise from ' : to < from ? 'fall from ' : 'hold at ') + from + (to !== from ? ' to ' + to : '');
    const sayN = ['Normal highs at the Birmingham airport ' + move(n.highFrom, n.highTo) + ' degrees over ' + name +
      ', and normal rain for the month is ' + inches(n.rain) + ' inches.'];
    if (n.frost) {
      sayN.push('It froze at least once in ' + name + ' in ' + n.frost.froze + ' of the ' + n.frost.years + ' years on the airport record, and the ' +
        (n.frost.spring ? 'latest' : 'earliest') + ' freeze on record in the month came on ' + onDayYear(n.frost.edge.date) + '.');
    }
    cards.push(card('Normal ' + name, 'Birmingham airport', rows([
      ['🌡️', 'Normal high', n.highFrom + '° to ' + n.highTo + '°'],
      ['🌙', 'Normal low', n.lowFrom + '° to ' + n.lowTo + '°'],
      ['🌧️', 'Normal rain', inches(n.rain) + ' in'],
      ['🔥', 'Record high', n.recordHigh ? n.recordHigh.value + '° in ' + n.recordHigh.date.slice(0, 4) : '&mdash;'],
      ['🧊', 'Record low', n.recordLow ? n.recordLow.value + '° in ' + n.recordLow.date.slice(0, 4) : '&mdash;']
    ]) + paras(sayN)));
  }

  const sky = a.sky;
  if (sky) {
    const change = sky.last - sky.first;
    const saySky = ['The days ' + (change < 0 ? 'lose ' : 'gain ') + hoursMinutesWords(Math.abs(change)) + ' of daylight over ' + name +
      ', from ' + hoursMinutesWords(sky.first) + ' on the 1st to ' + hoursMinutesWords(sky.last) + ' on the ' + daysIn(key) + (daysIn(key) === 31 ? 'st' : 'th') + '.'];
    if (sky.turning) saySky.push('The ' + TURNING_NAMES[sky.turning.name] + ' comes on ' + onDay(sky.turning.date) + '.');
    const skyRows = [['🌅', 'Daylight on the 1st', hm(sky.first)], ['🌇', 'On the ' + daysIn(key) + (daysIn(key) === 31 ? 'st' : 'th'), hm(sky.last)]];
    if (sky.turning) skyRows.push(['🧭', cap(TURNING_NAMES[sky.turning.name]), shortDay(sky.turning.date)]);
    cards.push(card('The sun', esc(name), rows(skyRows) + paras(saySky) + door('fivemile-almanac.html', 'Almanac')));
  }

  let feature = '';
  const sa = a.saying;
  if (sa && sa.traditional) {
    const s = sayingById(sayings, sa.traditional.id);
    if (s) {
      const rec = sa.traditional.record;
      const words1 = s.saying
        ? '<blockquote class="ed-quote">&ldquo;' + esc(s.saying) + '&rdquo;</blockquote>'
        : '<p class="ed-belief">' + esc(s.belief) + '</p>';
      feature += '<div class="card-feature ed-saying">' +
        '<p class="cf-kick">The old ' + (s.saying ? 'saying' : 'belief') + '</p>' +
        '<h3>' + esc(sayingName(s)) + '</h3>' + words1 +
        '<p class="cf-lede">' + esc(s.define) + '</p>' +
        '<p class="cf-lede">' + esc('The airport record can test it. ' + s.test + ' In the ' + rec.years + ' years on the record, it held in ' + rec.held + '.') + '</p>' +
        '<p class="cf-src"><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.source) + ' &#8599;</a></p>' +
        '</div>';
    }
  }
  if (sa && sa.reader) {
    feature += '<div class="card-feature ed-saying">' +
      '<p class="cf-kick">Said by ' + esc(sa.reader.credited) + '</p>' +
      '<blockquote class="ed-quote">&ldquo;' + esc(sa.reader.saying) + '&rdquo;</blockquote>' +
      '</div>';
  }

  let dates = '';
  if (a.dates && a.dates.length) {
    dates = '<div class="hd ed-subhd"><h2>Dates in ' + esc(name) + '</h2><a href="fivemile-calendar.html">Calendar &rarr;</a></div>' +
      '<div class="stack">' + a.dates.map((item) => {
        const [y, m, d] = item.date.split('-').map(Number);
        return E.calendar.stubHtml({ ...item, date: new Date(y, m - 1, d, 12), today: false });
      }).join('') + '</div>';
  }

  return '<section class="blk" id="the-month-ahead">' +
    '<div class="hd"><h2>' + esc(name) + ' ahead</h2></div>' + grid(cards) +
    (feature ? '<div class="ed-feature">' + feature + '</div>' : '') + dates + '</section>';
}

function pdfName(month) { return 'fivemile-edition-' + month + '.pdf'; }

function editionMain(ed, sayings, E, hasPdf) {
  const built = new Date(ed.built + 'T12:00:00');
  const builtWords = MONTHS[built.getMonth()] + ' ' + built.getDate() + ', ' + built.getFullYear();
  const made = ed.backfilled
    ? 'This edition was put together on ' + builtWords + ', after the month was over, from the records as they stood. Its calls were worked out by the same rule as every other month, from what was on file before each month began.'
    : 'This edition was put together on ' + builtWords + ' from our station, the creek gauge at Republic, the Birmingham airport record, and the stories that ran.';
  return '<main tabindex="-1" class="wrap" id="main">\n' +
    '  <section class="top">\n' +
    '    <div class="hd"><h1>' + esc(ed.title) + '</h1><a href="' + ROOM_PAGE + '">Every edition &rarr;</a></div>\n' +
    '    <div class="panel intro" data-share-in' + (hasPdf ? ' data-share-download="' + pdfName(ed.month) + '"' : '') + '>\n' +
    '      <p class="ed-kick">Monthly</p>\n' +
    '      <p class="lede">' + esc(ed.lede) + '</p>\n' +
    '      <p>' + esc(made) + '</p>\n' +
    '    </div>\n' +
    '  </section>\n' +
    '  ' + wasSection(ed) + '\n' +
    '  ' + callsSection(ed, sayings) + '\n' +
    '  ' + aheadSection(ed, sayings, E) + '\n' +
    '  <p class="src-note">\n' +
    '    <strong>Where this comes from</strong>\n' +
    '    The month\'s weather is the <b class="fm-name">FIVEMILE</b> weather station. Normals, ranks, records and the thirds a month is scored in\n' +
    '    are the official National Weather Service record kept at the Birmingham airport since 1930, set against 1991 to 2020.\n' +
    '    The creek is the <a href="https://waterdata.usgs.gov/monitoring-location/02457595/" target="_blank" rel="noopener">USGS gauge on\n' +
    '    Fivemile Creek near Republic</a>. The outlook is the monthly outlook from\n' +
    '    <a href="https://www.cpc.ncep.noaa.gov/products/predictions/30day/" target="_blank" rel="noopener">NOAA\'s Climate Prediction Center</a>,\n' +
    '    read at the middle of the three towns. The stories are the ones the news page ran, the sightings are iNaturalist\'s\n' +
    '    research grade records, and the dates are the calendar\'s. FIVEMILE\'s call is a rule written down in advance: it looks at how the month just gone\n' +
    '    finished and at what followed every earlier year that started the same way. Every sentence here was written ahead of time and\n' +
    '    filled in from those records, and no edition is changed after it runs.\n' +
    '  </p>\n' +
    '</main><!-- /wrap -->';
}

/* -------------------------------------------------------------------------
   The shell, and the pages
   ------------------------------------------------------------------------- */
const ROOM_TITLE = 'Editions &middot; FIVEMILE';
const ROOM_DESC = 'Every monthly edition FIVEMILE has put out: how each month went along Five Mile Creek, how the forecasts for it did, and what the month after held.';
const ROOM_URL = SITE + ROOM_PAGE;

function replaceOnce(text, from, to, what) {
  const count = text.split(from).length - 1;
  if (count < 1) throw new Error('the room page shell has no ' + what + ' to replace');
  return text.split(from).join(to);
}

function editionPage(shell, ed, sayings, E, hasPdf) {
  const file = 'fivemile-edition-' + ed.month + '.html';
  const desc = ed.lede + ' How the forecasts did, and what ' + monthName(ed.ahead.month) + ' holds.';
  let html = shell;
  html = replaceOnce(html, ROOM_TITLE, esc(ed.title) + ' &middot; FIVEMILE', 'title');
  html = replaceOnce(html, ROOM_DESC, esc(desc), 'description');
  html = replaceOnce(html, ROOM_URL, SITE + file, 'canonical address');
  html = replaceOnce(html, '"name": "Editions"', '"name": ' + JSON.stringify(ed.title), 'page name');
  const open = html.indexOf('<main');
  const close = html.indexOf('</main><!-- /wrap -->');
  if (open === -1 || close === -1) throw new Error('the room page shell has no main to replace');
  html = html.slice(0, open) + editionMain(ed, sayings, E, hasPdf) + html.slice(close + '</main><!-- /wrap -->'.length);
  return { file, html };
}

/* Each edition is a stub. The title's link is stretched over the whole card,
   so the card is one tap target the way every other stub is, and the PDF link
   sits above that stretch so it can be a second target without a link inside
   a link, which HTML does not allow. */
function roomList(editions) {
  if (!editions.length) return '<div class="empty">&mdash;</div>';
  return '<div class="stack">' + editions.map((ed) => {
    const m = monthOf(ed.month);
    const chips = [];
    if (ed.noaa) chips.push('<span class="ed-call"><span class="ed-who">NOAA</span>' + chip(ed.noaa) + '</span>');
    chips.push('<span class="ed-call"><span class="ed-who">FIVEMILE</span>' + chip(ed.fivemile) + '</span>');
    if (ed.pdf) {
      chips.push('<a class="ed-pdf" href="' + esc(ed.pdf) + '" download="' + esc(ed.pdf) + '" aria-label="Download ' + esc(ed.title) + ' as a PDF">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 17v3h16v-3"/></svg>Download PDF</a>');
    }
    return '<div class="card-stub window ed-stub">' +
      '<div class="k-date"><span class="mo">' + MONTH_SHORT[m - 1] + '</span><span class="wd">' + ed.month.slice(0, 4) + '</span></div>' +
      '<div class="k-bd"><h3><a class="ed-open" href="' + esc(ed.file) + '">' + esc(ed.title) + '</a></h3><div class="w">' + esc(ed.lede) + '</div>' +
      '<div class="ed-chips">' + chips.join('') + '</div></div></div>';
  }).join('') + '</div>';
}

/* -------------------------------------------------------------------------
   THE PDF

   A copy a reader can keep, printed once from the finished page by headless
   Chrome, which GitHub's Ubuntu runners already carry. The page is served
   from this repo by a server that lives for the length of the print, so the
   stylesheets and fonts load the way they do for a reader, and the print
   rules in fivemile-edition.css turn it into a report.

   Printed once, like the edition. Chrome writes a creation time into every
   PDF, so printing on every run would change every file on every run. A PDF
   is printed when its edition has none, and on --rebuild. With no Chrome to
   be found the page builds without its Download button and the run says so.

   Analytics is kept out of it. The page carries the Google tag, and a robot
   printing a page is not a reader, so the tag's hosts are made to resolve to
   nothing for the length of the print.
   ------------------------------------------------------------------------- */
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].filter(Boolean);

const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon'
};

function run(bin, argv, timeoutMs) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(bin, argv, { stdio: 'ignore', windowsHide: true });
    } catch {
      return resolve({ code: null });
    }
    const timer = setTimeout(() => { child.kill('SIGKILL'); }, timeoutMs);
    child.on('error', () => { clearTimeout(timer); resolve({ code: null }); });
    child.on('exit', (code) => { clearTimeout(timer); resolve({ code }); });
  });
}

/* CHROME_PATH, when it is set, is the only place looked. A path somebody set
   on purpose should not be quietly swapped for another Chrome found elsewhere,
   and it is also how a build with no Chrome at all is tested. */
async function findChrome() {
  const candidates = process.env.CHROME_PATH ? [process.env.CHROME_PATH] : CHROME_CANDIDATES;
  for (const bin of candidates) {
    if (path.isAbsolute(bin)) {
      if (await fs.access(bin).then(() => true, () => false)) return bin;
      continue;
    }
    const probe = await run(bin, ['--version'], 15000);
    if (probe.code === 0) return bin;
  }
  return null;
}

function serveRepo() {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      const pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname);
      const file = path.join(ROOT, pathname === '/' ? 'index.html' : pathname);
      if (!file.startsWith(ROOT)) { res.writeHead(404); return res.end(); }
      try {
        const body = await fs.readFile(file);
        res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end();
      }
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function printPdfs(months) {
  const chrome = await findChrome();
  if (!chrome) {
    console.log('   no Chrome found, so no PDF was printed. The edition pages build without a Download button.');
    return [];
  }
  const server = await serveRepo();
  const port = server.address().port;
  const printed = [];
  try {
    for (const month of months) {
      const out = at(pdfName(month));
      const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'fivemile-print-'));
      const result = await run(chrome, [
        '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
        '--no-first-run', '--no-default-browser-check', '--disable-extensions',
        '--user-data-dir=' + profile,
        '--host-resolver-rules=MAP www.googletagmanager.com ~NOTFOUND, MAP www.google-analytics.com ~NOTFOUND, MAP region1.google-analytics.com ~NOTFOUND',
        '--no-pdf-header-footer',
        '--virtual-time-budget=10000',
        '--print-to-pdf=' + out,
        'http://127.0.0.1:' + port + '/fivemile-edition-' + month + '.html'
      ], 120000);
      await fs.rm(profile, { recursive: true, force: true }).catch(() => {});
      const size = await fs.stat(out).then((s) => s.size, () => 0);
      if (result.code === 0 && size > 10000) {
        printed.push(month);
        console.log(`   edition ${month}: printed ${pdfName(month)}, ${Math.round(size / 1024)} KB.`);
      } else {
        await fs.rm(out, { force: true }).catch(() => {});
        console.error(`   edition ${month}: the PDF did not print (exit ${result.code}, ${size} bytes). The page builds without a Download button.`);
      }
    }
  } finally {
    server.close();
  }
  return printed;
}

async function writeSitemap(files) {
  const text = await fs.readFile(at('sitemap.xml'), 'utf8');
  const nl = text.includes('\r\n') ? '\r\n' : '\n';
  let add = '';
  for (const file of files) {
    if (text.includes('<loc>' + SITE + file + '</loc>')) continue;
    add += '  <url>' + nl + '    <loc>' + SITE + file + '</loc>' + nl + '  </url>' + nl;
  }
  if (!add) return false;
  return writeKeepingNewlines('sitemap.xml', text.replace('</urlset>', add + '</urlset>'));
}

/* -------------------------------------------------------------------------
   What is due
   ------------------------------------------------------------------------- */
async function due(R, key, today) {
  const reasons = [];
  const next = addMonth(key, 1);
  if (today < next + '-02') reasons.push('it is not yet the 2nd of ' + monthYear(next));
  const lastDay = key + '-' + pad2(daysIn(key));
  if (!R.airport.has(lastDay)) reasons.push('the airport record does not have ' + onDayYear(lastDay) + ' yet');
  if (!R.outlookBy.has(next) && today < next + '-05') reasons.push('NOAA\'s outlook for ' + monthYear(next) + ' is not in yet, and it is before the 5th');
  return reasons;
}

async function report(R) {
  for (const kind of ['temp', 'rain']) {
    let calls = 0, hits = 0, months = 0;
    for (let y = 1960; y <= 2025; y++) {
      for (let m = 1; m <= 12; m++) {
        const key = y + '-' + pad2(m);
        const outcome = thirdOf(R, kind, key);
        if (!outcome) continue;
        months++;
        const call = fivemileCall(R, key, kind);
        if (call.cat === 'none') continue;
        calls++;
        if (call.cat === outcome) hits++;
      }
    }
    console.log(`FIVEMILE ${kind} rule, 1960-2025, years before only: ${months} months, ${calls} calls, right ${hits} (${(hits / calls * 100).toFixed(1)}%). A guess is right 33.3%.`);
  }
  const t = noaaTally(R, '2026-08');
  console.log('NOAA since', t.since, 'temp', t.temp, 'rain', t.rain);
  for (const s of R.sayings.traditional) {
    const rec = sayingRecord(R, s, 2026);
    console.log(`Saying ${s.id}: held in ${rec.held} of ${rec.years} years (${(rec.held / rec.years * 100).toFixed(0)}%).`);
  }
}

/* -------------------------------------------------------------------------
   The run
   ------------------------------------------------------------------------- */
async function main() {
  const R = await loadRecords();
  if (flag('--report')) return report(R);
  const E = await loadEngines();
  const today = todayKey();
  const lastFinished = addMonth(today.slice(0, 7), -1);

  let toWorkOut = [];
  const rebuild = option('--rebuild');
  const from = option('--from');
  if (rebuild) {
    toWorkOut = [rebuild];
  } else {
    const start = from || lastFinished;
    for (let m = start; m <= lastFinished; m = addMonth(m, 1)) {
      if (m < FIRST_EDITION) continue;
      if (await exists(path.join(EDITION_DIR, m + '.json'))) continue;
      const reasons = await due(R, m, today);
      if (reasons.length) {
        console.log(`   edition ${m}: not due, because ${listWords(reasons)}.`);
        continue;
      }
      toWorkOut.push(m);
    }
  }

  if (flag('--check')) {
    console.log(toWorkOut.length ? '   due: ' + toWorkOut.join(', ') : '   nothing is due.');
    return;
  }

  for (const key of toWorkOut) {
    const ed = await workOut(R, E, key, today);
    await writeKeepingNewlines(path.join(EDITION_DIR, key + '.json'), JSON.stringify(ed, null, 2) + '\n');
    console.log(`   edition ${key}: worked out. ${ed.lede}`);
  }

  /* Render every edition on file, every run. */
  let names = [];
  try { names = (await fs.readdir(at(EDITION_DIR))).filter((n) => /^\d{4}-\d{2}\.json$/.test(n)).sort().reverse(); } catch {}
  const editions = [];
  for (const name of names) editions.push(await readJson(path.join(EDITION_DIR, name), null));
  const onFile = editions.filter(Boolean);
  const shellPage = await fs.readFile(at(ROOM_PAGE), 'utf8');
  const written = new Set();

  /* Drawn twice when a PDF is printed: once so Chrome has a page to print, and
     again so the page that now has a PDF carries its Download button. */
  async function draw() {
    const withPdf = new Set();
    for (const ed of onFile) if (await exists(pdfName(ed.month))) withPdf.add(ed.month);
    for (const ed of onFile) {
      const { file, html } = editionPage(shellPage, ed, R.sayings, E, withPdf.has(ed.month));
      if (await writeKeepingNewlines(file, html)) written.add(file);
    }
    const index = {
      _readme: 'Every monthly edition on file, newest first. Written by scripts/build-editions.mjs from fivemile-editions/YYYY-MM.json. The news page and the Editions room read this. See DECISIONS.md 74.',
      editions: onFile.map((ed) => ({
        month: ed.month, title: ed.title, file: 'fivemile-edition-' + ed.month + '.html',
        pdf: withPdf.has(ed.month) ? pdfName(ed.month) : null, lede: ed.lede, built: ed.built,
        noaa: ed.calls.noaa ? ed.calls.noaa.tempVerdict : null, fivemile: ed.calls.fivemile.verdict
      }))
    };
    await writeKeepingNewlines(path.join(EDITION_DIR, 'index.json'), JSON.stringify(index, null, 2) + '\n');
    const marker = /<!--PRERENDER:editionList-->[\s\S]*?<!--\/PRERENDER-->/;
    if (!marker.test(shellPage)) throw new Error(ROOM_PAGE + ' has no editionList marker');
    const room = shellPage.replace(marker, '<!--PRERENDER:editionList-->' + roomList(index.editions) + '<!--/PRERENDER-->');
    if (await writeKeepingNewlines(ROOM_PAGE, room)) written.add(ROOM_PAGE);
    if (await writeSitemap([ROOM_PAGE, ...index.editions.map((e) => e.file)])) written.add('sitemap.xml');
  }

  await draw();
  if (!flag('--no-pdf')) {
    const toPrint = [];
    for (const ed of onFile) {
      if (ed.month === rebuild || !(await exists(pdfName(ed.month)))) toPrint.push(ed.month);
    }
    if (toPrint.length) {
      const printed = await printPdfs(toPrint);
      printed.forEach((month) => written.add(pdfName(month)));
      if (printed.length) await draw();
    }
  }
  console.log(written.size ? '   wrote ' + [...written].join(', ') : '   every edition page was already up to date.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
