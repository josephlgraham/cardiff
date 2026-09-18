/* The official weather record for this part of Jefferson County, from the
   Birmingham airport.

     node scripts/fetch/acis-airport.mjs --since 1930-01-01

   The FIVEMILE weather station has reported since January 1, 2026, which is
   long enough to keep a log and nowhere near long enough to say what a normal
   September is. The National Weather Service has kept the Birmingham record at
   the airport since 1930, and NOAA's normals are worked out from it. Every day
   of it, and the 1991 to 2020 normals, come from the Applied Climate
   Information System run by NOAA's Regional Climate Centers. It is free and
   takes no key. See DECISIONS.md 72.

   The airport is not here. It sits southeast of the three towns, a storm can
   soak one and miss the other, and the page says so in as many words. This file
   is kept apart from fivemile-weather-archive/ for the same reason: the two
   records are never mixed into one list.

   Two files come out of it.

   fivemile-airport-archive/ is one file a year back to 1930, through the same
   year archive writer the station and the creek use. A row is the day's high,
   low, rain, and snow when there was any. ACIS writes a trace as T, and a trace
   is kept as 0 here, which is how an official total counts it. A reading ACIS
   marks missing is null rather than a guess.

   fivemile-airport-normals.json is the 1991 to 2020 normal high, low, and rain
   for every date. It changes once a decade.

   The twice daily job asks for the last 45 days. The newest days at the airport
   are preliminary and get corrected, so fresh readings win for any day the
   window covers, and everything older sits still. A day ACIS has nothing for
   yet is not written at all. */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readYearArchive, writeYearArchive } from '../lib/year-archive.mjs';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..', '..');
export const AIRPORT_ARCHIVE_DIR = path.join(ROOT, 'fivemile-airport-archive');
export const AIRPORT_NORMALS_FILE = path.join(ROOT, 'fivemile-airport-normals.json');

const ACIS_URL = 'https://data.rcc-acis.org/StnData';
const USER_AGENT = 'fivemile.now data refresh (fivemilec@gmail.com)';

export const AIRPORT = {
  sid: 'BHM',
  ghcn: 'USW00013876',
  name: 'Birmingham Airport',
  acisName: 'BIRMINGHAM AP'
};

const LOCAL_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit'
});

async function acis(body, timeoutMs = 120000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(ACIS_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': USER_AGENT },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error('HTTP ' + response.status + ' from ACIS');
    const payload = await response.json();
    if (payload.error) throw new Error('ACIS: ' + payload.error);
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

/* M is missing and becomes null. T is a trace and becomes 0. A value ACIS
   flags with a trailing letter keeps its number. */
function value(raw, digits) {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text || text === 'M' || text === 'S') return null;
  if (text === 'T') return 0;
  const number = Number(text.replace(/[A-Za-z]+$/, ''));
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}

export async function fetchAirportDays(sdate, edate) {
  const payload = await acis({
    sid: AIRPORT.sid,
    sdate,
    edate,
    elems: [{ name: 'maxt' }, { name: 'mint' }, { name: 'pcpn' }, { name: 'snow' }]
  });
  const rows = [];
  for (const entry of payload.data || []) {
    const high = value(entry[1], 0);
    const low = value(entry[2], 0);
    const rain = value(entry[3], 2);
    const snow = value(entry[4], 1);
    if (high == null && low == null && rain == null) continue;
    const row = { date: entry[0], high, low, rain };
    if (snow) row.snow = snow;
    rows.push(row);
  }
  return rows;
}

/* The normals are asked for across a leap year so February 29 has one. ACIS
   answers with the 1991 to 2020 normals by default, which is the current
   official set. */
export async function fetchAirportNormals() {
  const payload = await acis({
    sid: AIRPORT.sid,
    sdate: '2024-01-01',
    edate: '2024-12-31',
    elems: [
      { name: 'maxt', normal: '1' },
      { name: 'mint', normal: '1' },
      { name: 'pcpn', normal: '1' }
    ]
  });
  const days = (payload.data || []).map((entry) => ({
    md: String(entry[0]).slice(5),
    high: value(entry[1], 0),
    low: value(entry[2], 0),
    rain: value(entry[3], 2)
  }));
  /* NOAA publishes no normal rain for February 29. A normal year is 365 days
     and the annual normal is the sum of those, so the leap day's rain stays
     null here and the page counts it as nothing. */
  if (days.length !== 366 || days.some((day) => day.high == null || day.low == null || (day.rain == null && day.md !== '02-29'))) {
    throw new Error('ACIS normals came back incomplete (' + days.length + ' days)');
  }
  return days;
}

async function writeIfChanged(filePath, payload) {
  const next = JSON.stringify(payload, null, 2) + '\n';
  const current = await fs.readFile(filePath, 'utf8').catch(() => null);
  if (current === next) return false;
  await fs.writeFile(filePath, next, 'utf8');
  return true;
}

export async function updateAirportNormalsFile() {
  const days = await fetchAirportNormals();
  const changed = await writeIfChanged(AIRPORT_NORMALS_FILE, {
    station: AIRPORT.name,
    sid: AIRPORT.sid,
    ghcn: AIRPORT.ghcn,
    period: '1991-2020',
    source: 'NOAA normals via ACIS',
    days
  });
  console.log(`${path.basename(AIRPORT_NORMALS_FILE)}: ${changed ? 'written' : 'unchanged'}`);
}

/* since: a YYYY-MM-DD to fetch from. Without it, the last 45 days. */
/* The four records the Archive hub calls out, worked out here and kept in the
   archive's own index.json, because a browser cannot read ninety seven year
   files to find the hottest day and the hub has never asked it to. Every field
   in that index is derived from the content, so these only change on the day a
   record is broken, which is the last time anything here churns.

   Snow is the airport's alone: our station does not measure it. A trace is not
   a record, so a day is only in the running when its figure is above nought.
   See DECISIONS.md 72 and 88. */
function recordsFrom(days) {
  const best = (field, better) => {
    let found = null;
    for (const day of days) {
      const value = Number(day[field]);
      if (!Number.isFinite(value)) continue;
      if (field !== 'low' && value <= 0) continue;
      if (!found || better(value, found.value)) found = { value, date: day.date };
    }
    return found;
  };
  return {
    hottest: best('high', (a, b) => a > b),
    coldest: best('low', (a, b) => a < b),
    wettestDay: best('rain', (a, b) => a > b),
    deepestSnow: best('snow', (a, b) => a > b)
  };
}

export async function updateAirportArchive(options = {}) {
  const todayKey = LOCAL_DAY.format(new Date());
  const yesterday = new Date(Date.now() - 86400000);
  const until = LOCAL_DAY.format(yesterday);
  const since = options.since || LOCAL_DAY.format(new Date(Date.now() - 45 * 86400000));
  const fresh = await fetchAirportDays(since, until);
  if (!fresh.length) {
    console.log('ACIS returned no airport days, leaving the archive alone.');
    return null;
  }
  const archive = await readYearArchive(AIRPORT_ARCHIVE_DIR, { days: [] });
  const days = new Map((archive.days || []).map((day) => [day.date, day]));
  let written = 0;
  for (const row of fresh) {
    if (row.date >= todayKey) continue;
    const existing = days.get(row.date);
    if (existing && JSON.stringify(existing) === JSON.stringify(row)) continue;
    days.set(row.date, row);
    written += 1;
  }
  const everyDay = [...days.values()];
  const result = await writeYearArchive(AIRPORT_ARCHIVE_DIR, {
    station: AIRPORT.name,
    sid: AIRPORT.sid,
    ghcn: AIRPORT.ghcn,
    records: recordsFrom(everyDay),
    days: everyDay
  });
  console.log(`Updated ${path.basename(AIRPORT_ARCHIVE_DIR)}/: ${written} day(s) written, ${result.total} on file, year file(s) touched: ${result.written.join(', ') || 'none'}`);
  return result;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (invokedDirectly) {
  const at = process.argv.indexOf('--since');
  const since = at > -1 ? process.argv[at + 1] : undefined;
  (async () => {
    await updateAirportArchive({ since });
    await updateAirportNormalsFile();
  })().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
