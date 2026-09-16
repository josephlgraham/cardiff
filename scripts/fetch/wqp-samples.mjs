/* Everybody who has ever taken a sample out of this water, and what they
   looked for.

   The Republic gauge is one meter in one spot, and the creek room is mostly
   its record. This is the other record: the Water Quality Portal, which is
   where the USGS, the EPA and the states put every water sample any of them
   has taken. Inside the two hydrologic units that are Five Mile Creek there
   are sixty places somebody has stood with a bottle, going back to 1952.

   THE AREA IS THE SAME TWO UNITS THE DISCHARGE PAGE USES. 031601110406 Upper
   Fivemile Creek and 031601110407 Lower Fivemile Creek, imported from
   echo-watershed.mjs rather than written out again, so who discharges into
   this creek and who samples it are answers about the same creek. A bounding
   box was the obvious alternative and it is wrong: a box around these towns
   catches Village Creek, the Locust Fork and five air quality monitors in
   Tarrant, and a reader counting stations would be counting somebody else's
   water.

   IT WRITES A SUMMARY. The full pull is 33,616 results and 17MB. What is kept
   is one row per station, one row per thing measured, and the readings from
   the three stations on Black Creek, which is a few dozen kilobytes. Anybody
   who wants a number checked can get the same file from the portal, and the
   file says how.

   A SAMPLE IS NOT A TICK OFF A METER. A fifth of what the portal returns here
   is not somebody taking a sample. It is a datasonde left in the water logging
   itself every few minutes, which ADEM has done at eight stations, and 385
   ticks off one instrument over one day is one visit rather than 385 of them.
   Counted together they make the record look twenty times denser than it is:
   dissolved oxygen reads as 2,459 readings and is 728 samples and 1,731 ticks.
   So every row here counts samples, and carries the ticks in a field of their
   own. Quality control replicates are split out for the same reason, since a
   lab running the same bottle twice has not sampled the creek twice.

   ONCE A WEEK, NOT TWICE A DAY. 17MB is not a polite thing to ask a public
   service for every twelve hours, and this record does not move that fast:
   the newest sample in it is from October 2024. A run inside the window reads
   the file it already has and returns. FRESH_DAYS is the window.

   WHY IT IS NOT IN check-freshness.mjs. Same reason ECHO is not. Nobody has
   sampled here since 2024 and nobody may sample here next year either, so a
   quiet feed and a dead feed look identical from this end and the check would
   only ever cry wolf.

   THE BLACK CREEK TRANSECT. On June 5, 2006 the USGS sampled three points
   within a mile of each other and gave one of them the name "Black Creek at
   bridge above acid mine drainage". The three are kept together because the
   three together are the only thing in this record that reads like an
   experiment, and because a reader who wants to know what the mines left
   behind should get the numbers rather than somebody's summary of them. The
   station ids are written down here; every figure under them is read out of
   the portal.

   It reports and does not characterise. It says what was measured, by whom,
   when, and what the meter said. It does not call this water clean or dirty,
   and it does not say the acid mine drainage did anything. See DECISIONS.md 86
   and the same rule on the discharge page, decision 63. */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CREEK_HUC12 } from './echo-watershed.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_FILE = path.join(ROOT, 'fivemile-creek-samples.json');
const USER_AGENT = 'FIVEMILE watershed samples (https://fivemile.now, fivemilec@gmail.com)';

const BASE = 'https://www.waterqualitydata.us/data';
const FRESH_DAYS = 7;
const TIMEOUT_MS = 300000;

/* A sample taken out of the creek. The portal also holds sediment, soil, fish
   tissue and air from the same stations, and those are different questions. */
const MEDIUM = 'Water';

/* The three stations the USGS sampled on one morning in June 2006, in the
   order the water passes them: down Black Creek, then the Five Mile Creek
   point just above where Black Creek comes in. */
const TRANSECT = [
  {
    id: 'USGS-0245758910', usgs: '0245758910',
    creek: 'Black Creek',
    reads: 'Black Creek, above the acid mine drainage',
    short: 'Black Creek, above the drainage'
  },
  {
    id: 'USGS-0245758915', usgs: '0245758915',
    creek: 'Black Creek',
    reads: 'Black Creek, at Walker Chapel Road',
    short: 'Black Creek, at Walker Chapel'
  },
  {
    /* The third is a different creek, which is what makes the other two worth
       printing. A column head that drops the name of it is worse than no
       table, and which creek a station sits on is carried as a field rather
       than read back out of the sentence: this one's description contains the
       words "Black Creek" and matching on them put all three columns on the
       same side of the comparison. */
    id: 'USGS-02457589', usgs: '02457589',
    creek: 'Five Mile Creek',
    reads: 'Five Mile Creek, above where Black Creek joins it',
    short: 'Five Mile Creek, above both'
  }
];

/* The one the other two are measured against. */
const CONTROL_CREEK = 'Five Mile Creek';

/* What to carry off the transect, in the order it is worth reading. Anything
   the portal has for these stations that is not on this list stays in the
   portal. */
const TRANSECT_READS = [
  'pH',
  'Specific conductance',
  'Manganese',
  'Iron',
  'Aluminum',
  'Arsenic',
  'Alkalinity',
  'Oxygen',
  'Temperature, water',
  'Turbidity'
];

/* The portal's own name for dissolved oxygen. It also holds "Oxygen", which is
   the USGS spelling of the same reading and mostly recorded as a percentage of
   saturation, so the two are not added together. */
const OXYGEN = 'Dissolved oxygen (DO)';

/* A monitoring location that is not in the water. The portal counts air
   monitors and soil borings as stations in the same box. */
const DRY = /^(Atmosphere|Land|Facility)/;

/* What kind of result a row is. The portal says so in ActivityTypeCode:
   "Sample-Routine" and "Field Msr/Obs" are somebody standing in the creek,
   "Field Msr/Obs-Portable Data Logger" is an instrument left there, and
   "Quality Control Sample-Field Replicate" is the same water measured twice on
   purpose. Only the first kind is a sample of the creek. */
const kindOf = (code) => {
  if (/Data Logger/i.test(code)) return 'logged';
  if (/^Quality Control/i.test(code)) return 'qc';
  return 'sample';
};

/* The portal marks characteristics it has replaced by burying the successor in
   the name: "Inorganic nitrogen (nitrate and nitrite) ***retired***use Nitrate
   + Nitrite". That is a note to a database, not a label on a table. */
const cleanName = (name) => String(name || '').split('***')[0].trim();

/* How many of the 374 things measured here are worth a row. The tail is a lab
   running a pesticide panel once in 2004 and finding nothing, three hundred
   times over. The count of all of them is kept in counts.characteristics,
   which is the part of the tail that means anything, and the portal holds the
   rest. */
const KEEP_CHARACTERISTICS = 60;

const round = (value, digits) => (value == null ? null : Math.round(value * 10 ** digits) / 10 ** digits);

/* Nobody here reads a creek in Celsius. usgs-creek-quality.mjs converts the
   gauge's daily temperatures for the same reason, so a reading printed in one
   place matches a reading printed in the other. Only a value that is actually
   a temperature is touched, and the unit is rewritten with it. */
function toFahrenheit(reading) {
  if (!reading || !/^deg\s*C$/i.test(reading.unit || '')) return reading;
  const celsius = Number(reading.value);
  if (!Number.isFinite(celsius)) return reading;
  return { ...reading, value: String(round((celsius * 9) / 5 + 32, 1)), unit: 'deg F' };
}

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = (sorted.length - 1) / 2;
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 0.5] + sorted[middle + 0.5]) / 2;
}

/* RFC 4180, the same rules scripts/lib/csv.mjs keeps. It is not imported
   because these files run to seventeen megabytes and this reads them a row at
   a time into an object rather than building an array of arrays first. */
function* csvRows(text) {
  const head = [];
  let row = [];
  let field = '';
  let quoted = false;
  let index = text.charCodeAt(0) === 0xfeff ? 1 : 0;

  const endRow = () => {
    row.push(field);
    field = '';
    const done = row;
    row = [];
    if (done.length < 2 && done[0] === '') return null;
    if (!head.length) { head.push(...done); return null; }
    const out = {};
    for (let i = 0; i < head.length; i += 1) out[head[i]] = done[i] === undefined ? '' : done[i];
    return out;
  };

  while (index < text.length) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') { field += '"'; index += 2; continue; }
        quoted = false; index += 1; continue;
      }
      field += char; index += 1; continue;
    }
    if (char === '"') { quoted = true; index += 1; continue; }
    if (char === ',') { row.push(field); field = ''; index += 1; continue; }
    if (char === '\r' || char === '\n') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      const made = endRow();
      if (made) yield made;
      index += 1; continue;
    }
    field += char; index += 1;
  }
  if (field !== '' || row.length) {
    const made = endRow();
    if (made) yield made;
  }
}

async function portal(service, extra) {
  const query = Object.keys(CREEK_HUC12).map((huc) => 'huc=' + huc).join('&');
  const url = BASE + '/' + service + '/search?' + query + '&sampleMedia=' + MEDIUM +
    '&mimeType=csv&zip=no' + (extra || '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: controller.signal });
    if (!response.ok) throw new Error(service + ' came back ' + response.status);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

/* Every place in the two units somebody has sampled water, from the station
   service, which is the only one that carries a name and a position for a USGS
   station. The result rows leave both blank. */
function readStations(text) {
  const out = new Map();
  for (const row of csvRows(text)) {
    const id = row.MonitoringLocationIdentifier;
    if (!id) continue;
    const type = row.MonitoringLocationTypeName || '';
    if (DRY.test(type)) continue;
    out.set(id, {
      id,
      name: row.MonitoringLocationName || '',
      /* ADEM calls its stations FM-2 and FMCJ-1B and puts the place in the
         description: "Fivemile Ck on Republic Rd (CR 67)". That is the line a
         reader needs, so it is carried and the code is kept beside it. */
      where: row.MonitoringLocationDescriptionText || '',
      type,
      org: row.OrganizationFormalName || '',
      provider: row.ProviderName || '',
      lat: round(Number(row.LatitudeMeasure), 5) || null,
      lon: round(Number(row.LongitudeMeasure), 5) || null
    });
  }
  return out;
}

export async function updateWaterSamples({ force = false } = {}) {
  const previous = await fs.readFile(OUT_FILE, 'utf8').then(JSON.parse).catch(() => null);
  if (!force && previous && previous.updatedAt) {
    const age = Date.now() - Date.parse(previous.updatedAt);
    if (Number.isFinite(age) && age < FRESH_DAYS * 864e5) {
      console.log('   Watershed samples: read ' + Math.round(age / 864e5) + ' days ago, left alone.');
      return previous;
    }
  }

  const stations = readStations(await portal('Station'));
  const resultsText = await portal('Result', '&dataProfile=resultPhysChem');

  const perStation = new Map();
  const perThing = new Map();
  const oxygen = [];
  const transect = new Map(TRANSECT.map((row) => [row.id, new Map()]));
  const transectFlow = new Map();
  let results = 0;
  let loggedTotal = 0;
  let qcTotal = 0;
  let first = '9999-99-99';
  let last = '0000-00-00';

  for (const row of csvRows(resultsText)) {
    const id = row.MonitoringLocationIdentifier;
    const date = row.ActivityStartDate || '';
    if (!id || !stations.has(id)) continue;
    if (/Data Logger/i.test(row.ActivityTypeCode)) loggedTotal += 1;
    else if (/^Quality Control/i.test(row.ActivityTypeCode)) qcTotal += 1;
    else {
      results += 1;
      if (date) { if (date < first) first = date; if (date > last) last = date; }
    }

    const kind = kindOf(row.ActivityTypeCode);

    let station = perStation.get(id);
    if (!station) { station = { results: 0, logged: 0, qc: 0, first: '9999-99-99', last: '0000-00-00', things: new Set() }; perStation.set(id, station); }
    if (kind === 'sample') station.results += 1; else station[kind] += 1;
    /* A station's span is when somebody sampled it, not when an instrument was
       sitting in it. */
    if (date && kind === 'sample') { if (date < station.first) station.first = date; if (date > station.last) station.last = date; }

    const thingName = cleanName(row.CharacteristicName);
    if (!thingName) continue;
    station.things.add(thingName);

    let thing = perThing.get(thingName);
    if (!thing) { thing = { results: 0, logged: 0, qc: 0, values: 0, stations: new Set(), units: {}, first: '9999-99-99', last: '0000-00-00' }; perThing.set(thingName, thing); }
    if (kind === 'sample') { thing.results += 1; thing.stations.add(id); } else thing[kind] += 1;
    if (date && kind === 'sample') { if (date < thing.first) thing.first = date; if (date > thing.last) thing.last = date; }
    const raw = row.ResultMeasureValue;
    const value = raw === '' ? null : Number(raw);
    /* A row with no number in it is a real result: it usually means the lab
       looked and found nothing above its detection limit. It is counted as a
       sample and not as a reading. */
    if (value != null && Number.isFinite(value)) {
      thing.values += 1;
      const unit = row['ResultMeasure/MeasureUnitCode'] || '';
      if (unit) thing.units[unit] = (thing.units[unit] || 0) + 1;
    }

    if (thingName === OXYGEN && value != null && Number.isFinite(value)) {
      oxygen.push({ value, id, date, kind, org: row.OrganizationFormalName || '' });
    }

    /* Kept by date, because one of the three was sampled twice that week and
       a column off June 8 set beside two columns off June 5 is three readings
       of three different creeks. The shared day is picked once every row has
       been read. */
    /* How much water each transect station was carrying, from whichever day
       it was measured. Concentrations without a flow beside them are the
       dilution trap: fourteen times the manganese in a trickle is not fourteen
       times the manganese in the creek. */
    if (transect.has(id) && kind === 'sample' && thingName === 'Stream flow, instantaneous' &&
        /^ft3\/s/i.test(row['ResultMeasure/MeasureUnitCode'] || '') && value != null && Number.isFinite(value)) {
      if (!transectFlow.has(id)) transectFlow.set(id, { cfs: value, date });
    }

    const held = transect.get(id);
    if (held && date && kind === 'sample' && TRANSECT_READS.includes(thingName)) {
      const day = held.get(date) || new Map();
      if (!day.has(thingName)) {
        day.set(thingName, {
          value: raw === '' ? (row.ResultDetectionConditionText || null) : raw,
          unit: row['ResultMeasure/MeasureUnitCode'] || '',
          fraction: row.ResultSampleFractionText || '',
          /* The status the portal gives the reading. 7,110 of the USGS's
             10,028 samples in these two units, including every reading in this
             table, carry Preliminary rather than Final or Accepted. Do not read
             more into it than that: the portal's own definition of Preliminary
             is "Internal use only, not released to public", which cannot be
             true of a reading on a public portal, and the value that means
             "subject to revision" is a different one, Provisional. */
          status: row.ResultStatusIdentifier || ''
        });
      }
      held.set(date, day);
    }
  }

  if (!results) throw new Error('the portal returned no water results for either unit');

  const stationRows = [...perStation.entries()]
    .map(([id, held]) => ({
      ...stations.get(id),
      results: held.results,
      logged: held.logged,
      qc: held.qc,
      first: held.first === '9999-99-99' ? null : held.first,
      last: held.last === '0000-00-00' ? null : held.last,
      characteristics: held.things.size
    }))
    /* A station that has only ever held an instrument is still a station
       somebody put there, and it keeps its row. */
    .filter((row) => row.results || row.logged)
    .sort((a, b) => b.results - a.results || b.logged - a.logged);

  const thingRows = [...perThing.entries()]
    .map(([name, held]) => ({
      name,
      results: held.results,
      logged: held.logged,
      qc: held.qc,
      values: held.values,
      stations: held.stations.size,
      first: held.first === '9999-99-99' ? null : held.first,
      last: held.last === '0000-00-00' ? null : held.last,
      /* The portal writes "None" in the unit column for a reading that has no
         unit, pH being the one that matters here. An empty cell says that
         better than the word does. */
      unit: (Object.entries(held.units).sort((a, b) => b[1] - a[1])[0]?.[0] || '').replace(/^None$/, '')
    }))
    .filter((row) => row.results)
    .sort((a, b) => b.results - a.results);

  /* DISSOLVED OXYGEN, AND WHY IT IS STILL A PARAGRAPH.

     The count that made this look chartable was 2,459, and 1,731 of those are
     an instrument logging itself. The real figure is 728 samples across 32
     years, which is a dozen or two most years, from two organisations whose
     coverage takes turns: some years are all ADEM, some are all volunteers,
     two years have nothing at all. Plotted by year that draws a line through
     who was out sampling rather than through the creek, so what is kept here
     is what a paragraph can honestly say.

     per_year is what makes the case. It is the count in each year that has
     any, so the page can say how thin the record is rather than asserting it.

     The zeros are counted rather than quietly dropped. All twelve are one
     volunteer station in one summer, which is the difference between a creek
     with no oxygen in it and a meter that was not working, and a reader shown
     the low end without that is being misled by arithmetic. */
  const sampled = oxygen.filter((row) => row.kind === 'sample');
  const oxygenValues = sampled.map((row) => row.value);
  const zeros = sampled.filter((row) => row.value === 0);
  const zeroStations = {};
  zeros.forEach((row) => { zeroStations[row.id] = (zeroStations[row.id] || 0) + 1; });
  const worstZero = Object.entries(zeroStations).sort((a, b) => b[1] - a[1])[0] || null;
  const worstZeroYears = worstZero
    ? [...new Set(zeros.filter((row) => row.id === worstZero[0]).map((row) => row.date.slice(0, 4)))].sort()
    : [];
  const perYear = {};
  sampled.forEach((row) => { if (row.date) perYear[row.date.slice(0, 4)] = (perYear[row.date.slice(0, 4)] || 0) + 1; });
  const yearCounts = Object.values(perYear).sort((a, b) => a - b);
  const dates = sampled.map((row) => row.date).filter(Boolean).sort();
  const oxygenRow = oxygenValues.length ? {
    characteristic: OXYGEN,
    samples: oxygenValues.length,
    /* Kept so nobody rediscovers the 2,459 and thinks a chart was missed. */
    logged: oxygen.length - oxygenValues.length,
    stations: new Set(sampled.map((row) => row.id)).size,
    first: dates[0] || null,
    last: dates[dates.length - 1] || null,
    unit: 'mg/L',
    median: round(median(oxygenValues), 1),
    under_five: oxygenValues.filter((value) => value < 5).length,
    zeros: zeros.length,
    zero_stations: Object.keys(zeroStations).length,
    zeros_at_one_station: worstZero ? worstZero[1] : 0,
    zeros_at_one_station_years: worstZeroYears,
    years_with_any: yearCounts.length,
    years_in_span: dates.length ? Number(dates[dates.length - 1].slice(0, 4)) - Number(dates[0].slice(0, 4)) + 1 : 0,
    median_per_year: yearCounts.length ? round(median(yearCounts), 0) : null,
    thinnest_year: yearCounts.length ? yearCounts[0] : null
  } : null;

  /* What the three columns come to when you set them against each other.

     A table of nine readings across three columns asks the reader to do the
     arithmetic, and most will not, so the page reads it for them: the last
     Black Creek point before the confluence against the Five Mile Creek point
     above it, for every reading both of them have. It reports how many times
     larger or smaller, and nothing else. No adjective, no cause, no claim that
     the drainage in the station's name did any of it. That is decision 63, and
     the numbers are strong enough that they do not need help. */
  function compareColumns(rows) {
    const black = rows.filter((row) => row.creek !== CONTROL_CREEK).pop();
    const fivemile = rows.filter((row) => row.creek === CONTROL_CREEK)[0];
    if (!black || !fivemile) return [];
    const valueOf = (row, name) => {
      const found = row.readings.find((reading) => reading.name === name);
      const number = found ? Number(found.value) : NaN;
      return Number.isFinite(number) ? { number, unit: found.unit } : null;
    };
    return TRANSECT_READS.map((name) => {
      const a = valueOf(black, name);
      const b = valueOf(fivemile, name);
      /* Two turbidity readings taken on different instruments, FNU against
         NTRU, are not a ratio. Neither is a pH, which is a logarithm: twice
         the pH is not twice anything. */
      if (!a || !b || !b.number || a.unit !== b.unit || name === 'pH') return null;
      return {
        name,
        black: round(a.number, 2),
        fivemile: round(b.number, 2),
        unit: a.unit,
        times: round(a.number / b.number, 1)
      };
    }).filter(Boolean).sort((x, y) => y.times - x.times);
  }

  /* The day all three were sampled. Where more than one day qualifies the
     earliest wins, and where no day catches all three the transect is dropped
     rather than published as a comparison it is not. */
  const dayTally = {};
  transect.forEach((held) => { [...held.keys()].forEach((date) => { dayTally[date] = (dayTally[date] || 0) + 1; }); });
  const sharedDay = Object.entries(dayTally)
    .filter(([, count]) => count === TRANSECT.length)
    .map(([date]) => date)
    .sort()[0] || null;

  const transectRows = !sharedDay ? [] : TRANSECT.map((row) => {
    const day = transect.get(row.id).get(sharedDay) || new Map();
    const station = stations.get(row.id);
    return {
      id: row.id,
      usgs_url: 'https://waterdata.usgs.gov/monitoring-location/' + row.usgs + '/',
      /* The name is the USGS's, printed as the USGS wrote it. reads is the
         same place in a sentence a person would say. */
      name: station ? station.name : '',
      creek: row.creek,
      reads: row.reads,
      short: row.short,
      lat: station ? station.lat : null,
      lon: station ? station.lon : null,
      /* Any other day the USGS stood at this station. One of the three was
         sampled again three days later, and its metals were taken then, so
         the metal cells in its column are empty on the shared day. A page
         that shows the gap has to be able to say what is in it. */
      also_sampled: [...transect.get(row.id).keys()].filter((date) => date !== sharedDay).sort(),
      flow: transectFlow.get(row.id) || null,
      /* The status USGS gives most of this station's readings that day. */
      status: (() => {
        const tally = {};
        [...day.values()].forEach((entry) => { if (entry.status) tally[entry.status] = (tally[entry.status] || 0) + 1; });
        return Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
      })(),
      readings: TRANSECT_READS
        .filter((name) => day.has(name))
        .map((name) => toFahrenheit({ name, ...day.get(name) }))
    };
  }).filter((row) => row.readings.length);

  const payload = {
    updatedAt: new Date().toISOString(),
    source: 'Water Quality Portal',
    source_url: 'https://www.waterqualitydata.us/',
    hucs: CREEK_HUC12,
    note: 'Every water sample the Water Quality Portal holds inside the two hydrologic units that are Five Mile Creek, gathered into one row per station and one row per thing measured. The portal is where the USGS, the EPA and the states put their samples. A result with no number in it is usually a lab finding nothing above its detection limit, so results and values are counted separately. results counts samples somebody took. It excludes an instrument left in the water logging itself every few minutes, which is a fifth of what the portal holds here and is counted as logged, and quality control replicates, counted as qc. Air monitors and soil borings inside the same units are left out. Every station is listed; the things measured are the best covered ' + KEEP_CHARACTERISTICS + ' of ' + thingRows.length + ', because the rest of that list is a lab panel run once. The full record can be pulled from the portal by hydrologic unit.',
    counts: {
      stations: stationRows.length,
      results,
      /* Not samples. An instrument left in the creek logging itself every few
         minutes is a fifth of what the portal returns here, and counting its
         ticks as samples makes the record look twenty times denser than it
         is. Kept, because it is real data and somebody will want it, but kept
         separately. */
      logged: loggedTotal,
      qc: qcTotal,
      characteristics: thingRows.length,
      characteristics_listed: Math.min(KEEP_CHARACTERISTICS, thingRows.length),
      first,
      last,
      organizations: new Set(stationRows.map((row) => row.org).filter(Boolean)).size
    },
    oxygen: oxygenRow,
    black_creek: transectRows.length ? {
      note: 'Three points the USGS sampled on one day in June 2006, in the order the water passes them. The station names are the USGS’s own. Water temperature is converted to Fahrenheit; everything else is as the portal holds it. compare sets the last Black Creek point against the Five Mile Creek point above it, for the readings both carry in the same unit, and reports the ratio and nothing else.',
      compare: compareColumns(transectRows),
      /* The rows of the table, in the order they are worth reading. Built here
         rather than on the page, because a station that was not tested for a
         metal has no row for it and the page would otherwise order the table
         by whichever station happens to be first. */
      readings: TRANSECT_READS.filter((name) => transectRows.some((station) => station.readings.some((reading) => reading.name === name))),
      date: sharedDay,
      stations: transectRows
    } : null,
    characteristics: thingRows.slice(0, KEEP_CHARACTERISTICS),
    stations: stationRows
  };

  const text = JSON.stringify(payload, null, 2) + '\n';
  const strip = (value) => (value ? value.replace(/"updatedAt": "[^"]*",?\n/, '') : value);
  if (previous && strip(JSON.stringify(previous, null, 2) + '\n') === strip(text)) {
    /* The record has not moved, but the clock has: the file's own timestamp is
       what the weekly gate reads, so it is written even when nothing else in
       it changed. */
    await fs.writeFile(OUT_FILE, text, 'utf8');
    console.log('   Watershed samples: ' + stationRows.length + ' stations, unchanged.');
    return payload;
  }
  await fs.writeFile(OUT_FILE, text, 'utf8');
  console.log('   Watershed samples: ' + stationRows.length + ' stations, ' + results + ' results, ' +
    thingRows.length + ' things measured, written.');
  return payload;
}

if (process.argv[1] && process.argv[1].endsWith('wqp-samples.mjs')) {
  updateWaterSamples({ force: process.argv.includes('--force') }).catch((error) => {
    console.error('Watershed samples failed:', error.message);
    process.exit(1);
  });
}
