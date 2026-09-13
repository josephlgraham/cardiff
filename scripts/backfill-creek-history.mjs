/* The creek before this site was watching it.

     node scripts/backfill-creek-history.mjs

   fivemile-creek-archive/ started on the day it was built, because the live
   job only ever asks USGS for thirty days. The gauge at Republic has been
   read every day since May 21, 1988, and all of it is still on the Water Data
   API. This fills the archive back to that first day. See DECISIONS.md 71.

   Two collections, because they reach back different distances.

   The daily collection is what USGS publishes as the day's figures: a mean
   stage and a mean flow for every day since 1988, most of it approved. Those
   are the mean and cfs on every row written here, taken as published rather
   than worked out again.

   The continuous collection is the fifteen minute record, and it only starts
   on October 1, 2007. That is where a day's low and high come from, rolled up
   the way the live job rolls them up: by the calendar day here, and only when
   the day has 48 of its 96 readings. Before that date a row has a mean and a
   flow and no low or high, and the page draws it that way rather than
   pretending to a band it does not have.

   It only ever adds. A day already in the archive is left exactly as it is,
   because those rows came from the live job and the live job will keep
   repairing its own thirty day window. Running this twice writes nothing the
   second time, which is also how to recover if a scheduled run commits a new
   day in the middle: pull, run it again, commit. */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readYearArchive, writeYearArchive } from './lib/year-archive.mjs';
import { GAUGES, PARAM, STAT, fetchDailyStat, fetchSeries, readingsFor } from './fetch/usgs-gauge.mjs';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const CREEK_ARCHIVE_DIR = path.join(ROOT, 'fivemile-creek-archive');

/* The first daily value USGS holds for the gauge is 1988-05-21. Asking from
   the start of the year costs nothing and does not depend on that date. */
const DAILY_FROM = '1988-01-01';
const CONTINUOUS_FROM = '2007-10-01';

const LOCAL_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit'
});

function localDateKey(value) {
  return LOCAL_DAY.format(new Date(value));
}

function round(value, digits) {
  return Number(value.toFixed(digits));
}

/* Ten years a request keeps every response to a few pages. */
async function dailyMeans(gaugeId, parameterCode, untilKey) {
  const out = new Map();
  for (let year = Number(DAILY_FROM.slice(0, 4)); year <= Number(untilKey.slice(0, 4)); year += 10) {
    const from = `${year}-01-01T00:00:00Z`;
    const to = `${Math.min(year + 9, Number(untilKey.slice(0, 4)))}-12-31T23:59:59Z`;
    const rows = await fetchDailyStat(gaugeId, parameterCode, STAT.MEAN, from, to,
      { limit: 10000, maxPages: 10, timeoutMs: 120000, lean: true });
    rows.forEach((row) => out.set(row.date, row.value));
    console.log(`  ${parameterCode} daily ${year}-${year + 9}: ${rows.length} days`);
  }
  return out;
}

/* A year of fifteen minute readings is about 35,000 rows, so it is asked for a
   year at a time, and each finished year is rolled up and let go before the
   next one comes down. */
async function dailyRanges(gaugeId, untilKey) {
  const out = new Map();
  for (let year = Number(CONTINUOUS_FROM.slice(0, 4)); year <= Number(untilKey.slice(0, 4)); year += 1) {
    const from = year === 2007 ? `${CONTINUOUS_FROM}T00:00:00-06:00` : `${year}-01-01T00:00:00-06:00`;
    const to = `${year + 1}-01-01T00:00:00-06:00`;
    let grouped;
    try {
      grouped = await fetchSeries([gaugeId], [PARAM.STAGE], from, to,
        { limit: 10000, maxPages: 12, timeoutMs: 180000, lean: true });
    } catch (error) {
      console.error(`  continuous ${year} failed, those days keep a mean only: ${error.message}`);
      continue;
    }
    const buckets = new Map();
    readingsFor(grouped, gaugeId, PARAM.STAGE).forEach((row) => {
      const key = localDateKey(row.time);
      if (key >= untilKey) return;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(row.value);
    });
    let kept = 0;
    for (const [key, values] of buckets) {
      /* The same floor the live job keeps. A day with half its readings
         missing would carry a low and a high that are wrong forever. */
      if (values.length < 48) continue;
      out.set(key, {
        low: round(Math.min(...values), 2),
        high: round(Math.max(...values), 2),
        mean: round(values.reduce((sum, n) => sum + n, 0) / values.length, 2),
        readings: values.length
      });
      kept += 1;
    }
    console.log(`  continuous ${year}: ${kept} days with a low and a high`);
  }
  return out;
}

async function main() {
  const gauge = GAUGES.find((entry) => entry.role === 'lead');
  const todayKey = localDateKey(Date.now());
  const archive = await readYearArchive(CREEK_ARCHIVE_DIR, { gaugeId: '', gaugeName: '', days: [] });
  const days = new Map((archive.days || []).map((day) => [day.date, day]));
  console.log(`Archive holds ${days.size} days before the backfill.`);

  console.log('Reading the daily record:');
  const stage = await dailyMeans(gauge.id, PARAM.STAGE, todayKey);
  const flow = await dailyMeans(gauge.id, PARAM.DISCHARGE, todayKey);
  console.log('Reading the fifteen minute record:');
  const ranges = await dailyRanges(gauge.id, todayKey);

  const dates = new Set([...stage.keys(), ...flow.keys(), ...ranges.keys()]);
  let added = 0;
  for (const date of [...dates].sort()) {
    if (date >= todayKey || days.has(date)) continue;
    const range = ranges.get(date) || null;
    const publishedMean = stage.has(date) ? round(stage.get(date), 2) : null;
    const mean = publishedMean != null ? publishedMean : (range ? range.mean : null);
    const cfs = flow.has(date) ? round(flow.get(date), 1) : null;
    if (mean == null && cfs == null) continue;
    const row = {
      date,
      low: range ? range.low : null,
      high: range ? range.high : null,
      mean,
      cfs
    };
    if (range) row.readings = range.readings;
    row.source = 'usgs-daily';
    days.set(date, row);
    added += 1;
  }

  if (!added) {
    console.log('Nothing to add. The archive already holds every day USGS has.');
    return;
  }
  const result = await writeYearArchive(CREEK_ARCHIVE_DIR, {
    gaugeId: archive.gaugeId || gauge.id,
    gaugeName: archive.gaugeName || gauge.name,
    days: [...days.values()]
  });
  console.log(`Added ${added} days. ${result.total} on file across ${result.years} years; wrote ${result.written.join(', ') || 'nothing'}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
