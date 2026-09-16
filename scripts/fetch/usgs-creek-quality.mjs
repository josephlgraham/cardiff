/* What the water itself has been doing since 1988, year by year.

   The creek archive keeps how much water went past Republic every day. This
   keeps what was in it. USGS has read two things at that gauge every day since
   September 1988 and neither has ever been on this site:

     Specific conductance  how well the water carries a current, which rises
                           with dissolved mineral. 12,593 days.
     Water temperature     13,442 days.

   THE DILUTION TRAP, AND WHY EVERY YEAR CARRIES A SECOND FIGURE. Conductance
   falls when a creek runs high, because the same mineral is spread through
   more water. A run of wet years would look exactly like a creek getting
   cleaner. So each year also records the median on its own low flow days, the
   bottom quarter of that year's own flow, where dilution is least. If the two
   fall together the fall is in the water and not in the weather.

   A YEAR IS FROZEN ONCE IT IS FULL. Only the last two years are worked out
   again on a run, because USGS marks recent figures provisional and revises
   them for months afterward. Older years are approved and are left alone.

   This writes a summary rather than 13,000 daily rows, because the question it
   answers is what a year looked like. The daily record stays where it is, at
   USGS, and every figure here can be checked against it.

   It does NOT say the creek is clean or dirty. It says what the meter read.
   See DECISIONS.md 85 and the same rule on the discharge page, decision 63. */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_FILE = path.join(ROOT, 'fivemile-creek-quality.json');

const GAUGE_ID = '02457595';
const GAUGE_NAME = 'Fivemile Creek near Republic, Ala';
const USER_AGENT = 'FIVEMILE creek quality (https://fivemile.now, fivemilec@gmail.com)';

const PARAMS = { sc: '00095', temp: '00010', flow: '00060' };
const FIRST_YEAR = 1988;
/* A year needs all twelve months before it is worth a dot on a chart, and a
   month needs half its days. A year to date is not comparable with a whole
   one: the creek is coldest in the months a partial year is missing, so a
   September reading of 2026 would put it well above every finished year for
   no reason but the calendar. */
const ENOUGH_MONTHS = 12;
const ENOUGH_MONTH_DAYS = 5;
/* USGS revises provisional figures for months, so the tail is never frozen. */
const REWORK_YEARS = 2;

const cToF = (c) => (c * 9) / 5 + 32;
const round = (value, digits) => (value == null ? null : Math.round(value * 10 ** digits) / 10 ** digits);

function quantile(sorted, p) {
  if (!sorted.length) return null;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}
const median = (values) => quantile(values.slice().sort((a, b) => a - b), 0.5);

async function daily(parameterCode, from, to) {
  const url = 'https://waterservices.usgs.gov/nwis/dv/?format=json&sites=' + GAUGE_ID
    + '&statCd=00003&parameterCd=' + parameterCode + '&startDT=' + from + '&endDT=' + to;
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(parameterCode + ' came back ' + response.status);
  const body = await response.json();
  const out = new Map();
  for (const series of body.value?.timeSeries || []) {
    for (const row of series.values?.[0]?.value || []) {
      const value = Number(row.value);
      /* USGS sends -999999 for a day it has no reading for. */
      if (!Number.isFinite(value) || value <= -999) continue;
      out.set(String(row.dateTime).slice(0, 10), value);
    }
  }
  return out;
}

/* One year, from the three daily series. */
function summarize(year, sc, temp, flow) {
  const prefix = String(year) + '-';
  const days = [...new Set([...sc.keys(), ...temp.keys()].filter((key) => key.startsWith(prefix)))];
  const flows = days.filter((key) => flow.has(key)).map((key) => flow.get(key));
  const lowFlowCut = flows.length ? quantile(flows.slice().sort((a, b) => a - b), 0.25) : null;

  const monthsIn = (keys) => {
    const tally = {};
    keys.forEach((key) => { tally[key.slice(5, 7)] = (tally[key.slice(5, 7)] || 0) + 1; });
    return Object.values(tally).filter((count) => count >= ENOUGH_MONTH_DAYS).length;
  };

  /* The year's figure is the middle of its twelve monthly middles, not the
     middle of every day in it. A month that lost a fortnight to a dead sensor
     then counts the same as any other month, where a straight median of the
     days would quietly weight the year towards whichever months reported
     most. */
  const shape = (values, lowFlowValues, convert, months, monthly) => {
    if (!values.length) return null;
    const sorted = values.slice().sort((a, b) => a - b);
    const middles = Object.values(monthly).map((list) => median(list)).sort((a, b) => a - b);
    const low = lowFlowValues.slice().sort((a, b) => a - b);
    const digits = convert ? 1 : 0;
    return {
      days: values.length,
      months,
      whole_year: months >= ENOUGH_MONTHS,
      median: round(convert ? convert(median(middles)) : median(middles), digits),
      low_quarter: round(convert ? convert(quantile(sorted, 0.25)) : quantile(sorted, 0.25), digits),
      high_quarter: round(convert ? convert(quantile(sorted, 0.75)) : quantile(sorted, 0.75), digits),
      /* The dilution control. Null when the year has no flow to sort by. */
      at_low_flow: low.length ? round(convert ? convert(median(low)) : median(low), digits) : null
    };
  };

  const pick = (source, convert) => {
    const values = [];
    const atLowFlow = [];
    const keys = [];
    const monthly = {};
    for (const key of days) {
      if (!source.has(key)) continue;
      keys.push(key);
      values.push(source.get(key));
      (monthly[key.slice(5, 7)] ||= []).push(source.get(key));
      if (lowFlowCut != null && flow.has(key) && flow.get(key) <= lowFlowCut) atLowFlow.push(source.get(key));
    }
    /* A month with only a day or two in it is not a month. */
    const kept = {};
    for (const [month, list] of Object.entries(monthly)) if (list.length >= ENOUGH_MONTH_DAYS) kept[month] = list;
    return shape(values, atLowFlow, convert, Object.keys(kept).length, kept);
  };

  return {
    year,
    conductance: pick(sc, null),
    temperature: pick(temp, cToF),
    flow: flows.length ? { days: flows.length, median: round(median(flows), 1) } : null
  };
}

export async function updateCreekQuality() {
  const previous = await fs.readFile(OUT_FILE, 'utf8').then(JSON.parse).catch(() => null);
  const thisYear = new Date().getFullYear();
  /* A first run reads the whole record. After that only the tail moves. */
  const from = previous?.years?.length ? thisYear - REWORK_YEARS + 1 : FIRST_YEAR;

  const range = [from + '-01-01', thisYear + '-12-31'];
  const [sc, temp, flow] = await Promise.all([
    daily(PARAMS.sc, ...range),
    daily(PARAMS.temp, ...range),
    daily(PARAMS.flow, ...range)
  ]);

  const kept = new Map((previous?.years || []).map((entry) => [entry.year, entry]));
  for (let year = from; year <= thisYear; year += 1) {
    const row = summarize(year, sc, temp, flow);
    if (!row.conductance && !row.temperature) continue;
    kept.set(year, row);
  }
  const years = [...kept.values()].sort((a, b) => a.year - b.year);
  if (!years.length) throw new Error('USGS returned nothing for any year');

  const full = years.filter((row) => row.conductance?.whole_year);
  const payload = {
    updatedAt: new Date().toISOString(),
    source: 'USGS',
    source_url: 'https://waterdata.usgs.gov/monitoring-location/' + GAUGE_ID + '/',
    gaugeId: GAUGE_ID,
    gaugeName: GAUGE_NAME,
    note: 'Daily figures from the Republic gauge, gathered into years. Specific conductance is how well the water carries a current, which rises with dissolved mineral. Each year also carries its median on its own low flow days, the bottom quarter of that year’s flow, because conductance falls when a creek runs high and a wet year would otherwise read as a cleaner one. A year is only comparable when all twelve months are in it, which is what whole_year says.',
    enough_months: ENOUGH_MONTHS,
    counts: {
      years: years.length,
      years_with_enough: full.length,
      first_full_year: full.length ? full[0].year : null,
      last_full_year: full.length ? full[full.length - 1].year : null
    },
    years
  };

  const text = JSON.stringify(payload, null, 2) + '\n';
  const currentText = previous ? JSON.stringify(previous, null, 2) + '\n' : null;
  const strip = (value) => (value ? value.replace(/"updatedAt": "[^"]*",?\n/, '') : value);
  if (strip(currentText) === strip(text)) {
    console.log('   Creek quality: ' + years.length + ' years on file, unchanged.');
    return payload;
  }
  await fs.writeFile(OUT_FILE, text, 'utf8');
  console.log('   Creek quality: ' + years.length + ' years on file, ' + full.length + ' of them full, written.');
  return payload;
}

if (process.argv[1] && process.argv[1].endsWith('usgs-creek-quality.mjs')) {
  updateCreekQuality().catch((error) => {
    console.error('Creek quality failed:', error.message);
    process.exit(1);
  });
}
