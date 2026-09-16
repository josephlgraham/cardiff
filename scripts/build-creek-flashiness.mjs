/* How hard the creek rises and falls, year by year.

   This fetches nothing. Every figure in it comes out of fivemile-creek-archive/,
   which already holds the mean flow at the Republic gauge for every day since
   May 1988. The creek room shows how much water went past and what was in it.
   This is the third question about the same record: how steadily it came.

   THE MEASURE. The Richards-Baker flashiness index. Add up how much the flow
   changed from each day to the next, across the whole year, and divide by all
   the water that went past in that year. A creek fed by springs and wetlands
   changes little from day to day and scores low. A creek that takes a storm
   straight off pavement and roofs spikes and drops and scores high. The index
   has no units, which is the point of it: it compares a small creek with a big
   river, and a wet year with a dry one, on the same scale.

     Baker, Richards, Loftus and Kramer, "A New Flashiness Index:
     Characteristics and Applications to Midwestern Rivers and Streams",
     Journal of the American Water Resources Association, 2004.

   ONLY CONSECUTIVE DAYS COUNT. A day whose neighbour is missing contributes
   its own flow to the denominator and no step to the numerator, because the
   step across a gap is not a day's change. With this record that is a handful
   of days in 1988 and nothing after it.

   ONLY WHOLE YEARS ARE KEPT, the same rule the water quality file keeps and
   for the same reason: a year to date is missing whichever seasons have not
   happened yet, and around here the wet ones are in the winter and the spring.
   2026 to date reads 0.63 today and will move as the year finishes.

   THE WET YEAR TRAP. Flashiness tracks how wet the year was. Of the ten
   wettest years on file nine are in the flashier half, and of the ten driest
   one is. So a run of wet years reads as a creek getting flashier, the same
   way a run of wet years reads as a creek getting cleaner on the conductance
   chart. The file carries that count in wet_test so the page can say it, and
   it carries each year's own median flow so anybody can check it.

   It reports and does not characterise. A rising index is usually read as more
   hard surface upstream, but this record does not rise, and nothing here calls
   the creek flashy, healthy, or anything else. See DECISIONS.md 86 and the
   same rule on the discharge page, decision 63. */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARCHIVE_DIR = path.join(ROOT, 'fivemile-creek-archive');
const OUT_FILE = path.join(ROOT, 'fivemile-creek-flashiness.json');

const GAUGE_ID = '02457595';
const GAUGE_NAME = 'Fivemile Creek near Republic, Ala';

/* The same two thresholds the water quality file uses, so a year that is whole
   on one chart is whole on the other. */
const ENOUGH_MONTHS = 12;
const ENOUGH_MONTH_DAYS = 5;
/* And one more, because this index is built out of pairs of days rather than
   out of days. A year with twelve thin months could clear the test above and
   still have too few neighbours to mean anything. */
const ENOUGH_PAIRS = 300;

const round = (value, digits) => (value == null ? null : Math.round(value * 10 ** digits) / 10 ** digits);

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = (sorted.length - 1) / 2;
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 0.5] + sorted[middle + 0.5]) / 2;
}

const dayBefore = (key) => {
  const date = new Date(key + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
};

/* One year out of one archive file. */
function summarize(year, days) {
  const flow = new Map();
  for (const day of days) {
    if (day && typeof day.date === 'string' && Number.isFinite(day.cfs)) flow.set(day.date, day.cfs);
  }
  if (!flow.size) return null;

  const keys = [...flow.keys()].sort();
  const monthly = {};
  let steps = 0;
  let total = 0;
  let pairs = 0;

  for (const key of keys) {
    const value = flow.get(key);
    total += value;
    (monthly[key.slice(5, 7)] ||= []).push(value);
    const previous = flow.get(dayBefore(key));
    if (previous != null) { steps += Math.abs(value - previous); pairs += 1; }
  }

  /* A month with a day or two in it is not a month, same as everywhere else. */
  const months = Object.values(monthly).filter((list) => list.length >= ENOUGH_MONTH_DAYS).length;
  const values = [...flow.values()];

  return {
    year,
    days: flow.size,
    months,
    pairs,
    whole_year: months >= ENOUGH_MONTHS && pairs >= ENOUGH_PAIRS,
    /* The index itself, to three places. It runs between about 0.3 and 0.9
       here, so two places would round away the difference between one year and
       the next. */
    flashiness: total > 0 ? round(steps / total, 3) : null,
    /* The year's own flow, so the wet year trap can be checked rather than
       taken on trust. */
    median_flow: round(median(values), 1),
    mean_flow: round(total / flow.size, 1)
  };
}

/* The sharpest overnight rise on the whole record, as a multiple rather than
   as a difference, shown once as a day a reader can picture. An index is an
   abstraction and this is the thing itself.

   WHY A MULTIPLE AND NOT A DIFFERENCE. Flashiness is about a creek multiplying,
   not adding, and a reader feels 24 to 2,920 in a way they do not feel 1,040 to
   6,600. The biggest difference on this record is May 7 2003, which was also
   the highest crest the gauge has ever recorded, 25.41 feet in
   fivemile-creek-peaks.json. It is not used here because the archive has no
   daily mean depth for that day, so the sentence would have no height in it.
   Both days are real and both are in the record; this picks the one that can
   be told.

   The top of this list is storm dates and nothing else, which is the check
   that it is measuring weather and not a faulty meter. It is drawn from every
   year including the part ones, because a storm does not care whether its year
   is finished. A ratio needs a floor or a nearly dry creek would win it on
   arithmetic; the lowest flow ever recorded here is 9.3 cubic feet a second,
   so there is no near zero to divide by and the floor is the record's own. */
function biggestRise(days) {
  let best = null;
  const keys = [...days.keys()].sort();
  for (let i = 1; i < keys.length; i += 1) {
    const yesterday = days.get(dayBefore(keys[i]));
    const today = days.get(keys[i]);
    if (!yesterday || !today || !(yesterday.cfs > 0)) continue;
    const times = today.cfs / yesterday.cfs;
    if (times > 1 && (!best || times > best.times)) {
      best = {
        date: keys[i],
        from: round(yesterday.cfs, 1),
        to: round(today.cfs, 1),
        times: round(times, 1),
        /* Depth is what a reader pictures, and the crest is only on the record
           from October 2007, when the gauge started reporting every fifteen
           minutes. Null before that, and the page leaves the clause out. */
        depth_from: round(yesterday.mean, 2),
        depth_to: round(today.mean, 2),
        crest: round(today.high, 2)
      };
    }
  }
  return best;
}

/* Of the ten wettest years, how many are in the flashier half of the record,
   and of the ten driest. Two counts a reader can hold, in place of a
   correlation coefficient nobody outside a stats class can picture. */
function wetTest(rows, take = 10) {
  if (rows.length < take * 2) return null;
  const flashier = new Set(
    rows.slice().sort((a, b) => b.flashiness - a.flashiness).slice(0, Math.floor(rows.length / 2))
      .map((row) => row.year)
  );
  const byFlow = rows.slice().sort((a, b) => b.mean_flow - a.mean_flow);
  const count = (list) => list.filter((row) => flashier.has(row.year)).length;
  return {
    take,
    half: Math.floor(rows.length / 2),
    wettest_years: byFlow.slice(0, take).map((row) => row.year),
    wettest_in_flashier_half: count(byFlow.slice(0, take)),
    driest_years: byFlow.slice(-take).map((row) => row.year),
    driest_in_flashier_half: count(byFlow.slice(-take))
  };
}

/* Decade by decade, which is how the record answers the question people
   actually ask: is it getting worse. A decade with fewer than five whole years
   in it is left out rather than drawn as a decade. */
function decades(rows) {
  const buckets = {};
  rows.forEach((row) => { (buckets[Math.floor(row.year / 10) * 10] ||= []).push(row.flashiness); });
  return Object.entries(buckets)
    .map(([decade, list]) => ({ decade: Number(decade), years: list.length, median: round(median(list), 3) }))
    .filter((row) => row.years >= 5)
    .sort((a, b) => a.decade - b.decade);
}

export async function updateCreekFlashiness() {
  let files = [];
  try {
    files = (await fs.readdir(ARCHIVE_DIR)).filter((name) => /^\d{4}\.json$/.test(name)).sort();
  } catch (error) {
    throw new Error('the creek archive could not be read (' + error.message + ')');
  }
  if (!files.length) throw new Error('the creek archive holds no years');

  const years = [];
  const everyDay = new Map();
  for (const name of files) {
    const data = await fs.readFile(path.join(ARCHIVE_DIR, name), 'utf8')
      .then(JSON.parse)
      .catch(() => null);
    if (!data) continue;
    (data.days || []).forEach((day) => {
      if (day && typeof day.date === 'string' && Number.isFinite(day.cfs)) everyDay.set(day.date, day);
    });
    const row = summarize(Number(name.slice(0, 4)), data.days || []);
    if (row && row.flashiness != null) years.push(row);
  }
  if (!years.length) throw new Error('no year in the creek archive had flow in it');

  const whole = years.filter((row) => row.whole_year);
  const payload = {
    updatedAt: new Date().toISOString(),
    source: 'USGS',
    source_url: 'https://waterdata.usgs.gov/monitoring-location/' + GAUGE_ID + '/',
    gaugeId: GAUGE_ID,
    gaugeName: GAUGE_NAME,
    index: 'Richards-Baker flashiness index',
    index_source: 'Baker, Richards, Loftus and Kramer, Journal of the American Water Resources Association, 2004',
    note: 'Worked out from the daily flow already in fivemile-creek-archive/, which is the Republic gauge’s own record. The index is every day’s change in flow added up across the year and divided by all the water that went past in it, so it has no units and a wet year and a dry one can be set beside each other. Only pairs of days that are actually neighbours count. A year is only comparable when all twelve months are in it, which is what whole_year says. Flashiness tracks how wet a year was, which is what wet_test counts, so each year also carries its own flow.',
    enough_months: ENOUGH_MONTHS,
    counts: {
      years: years.length,
      whole_years: whole.length,
      first_whole_year: whole.length ? whole[0].year : null,
      last_whole_year: whole.length ? whole[whole.length - 1].year : null,
      median: whole.length ? round(median(whole.map((row) => row.flashiness)), 3) : null,
      steadiest: whole.length ? whole.slice().sort((a, b) => a.flashiness - b.flashiness)[0] || null : null,
      flashiest: whole.length ? whole.slice().sort((a, b) => b.flashiness - a.flashiness)[0] || null : null
    },
    decades: decades(whole),
    biggest_rise: biggestRise(everyDay),
    wet_test: wetTest(whole),
    years
  };

  const text = JSON.stringify(payload, null, 2) + '\n';
  const previous = await fs.readFile(OUT_FILE, 'utf8').catch(() => null);
  const strip = (value) => (value ? value.replace(/"updatedAt": "[^"]*",?\n/, '') : value);
  if (strip(previous) === strip(text)) {
    console.log('   Creek flashiness: ' + whole.length + ' whole years, unchanged.');
    return payload;
  }
  await fs.writeFile(OUT_FILE, text, 'utf8');
  console.log('   Creek flashiness: ' + whole.length + ' whole years of ' + years.length + ', written.');
  return payload;
}

if (process.argv[1] && process.argv[1].endsWith('build-creek-flashiness.mjs')) {
  updateCreekFlashiness().catch((error) => {
    console.error('Creek flashiness failed:', error.message);
    process.exit(1);
  });
}
