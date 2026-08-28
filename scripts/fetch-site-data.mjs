import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GAUGES,
  PARAM,
  fetchSeries,
  fetchAnnualPeaks,
  fetchDailyStat,
  STAT,
  readingsFor,
  latestOf,
  riseRatePerHour,
  trendFrom
} from './fetch/usgs-gauge.mjs';
import { readYearArchive, writeYearArchive } from './lib/year-archive.mjs';
import { refreshCms } from './fetch/sheets-cms.mjs';
import { updateEchoFile } from './fetch/echo-watershed.mjs';
import { updateObservationsFile } from './fetch/inat-observations.mjs';
import { parseCsvRows } from './lib/csv.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const WEATHER_FILE = path.join(ROOT, 'fivemile-weather.json');
const RAIN_LOG_FILE = path.join(ROOT, 'fivemile-rain-log.json');
const WATERSHED_FILE = path.join(ROOT, 'fivemile-watershed.json');
const AIR_QUALITY_FILE = path.join(ROOT, 'fivemile-air-quality.json');
const COMMUNITY_SNAPSHOT_FILE = path.join(ROOT, 'fivemile-community-snapshot.json');
const WEATHER_ARCHIVE_DIR = path.join(ROOT, 'fivemile-weather-archive');
const WATERSHED_FORECAST_FILE = path.join(ROOT, 'fivemile-watershed-weather.json');
const CREEK_ARCHIVE_DIR = path.join(ROOT, 'fivemile-creek-archive');
const CREEK_PEAKS_FILE = path.join(ROOT, 'fivemile-creek-peaks.json');

/* West to east, which is the order every list of the three towns is written
   in. See DECISIONS.md 1. The pages that read this file look their town up by
   name, so the order here is not what puts them on the screen in the right
   order, but a list in the wrong order is what teaches the next person the
   wrong order. */
const WATERSHED_FORECAST_POINTS = [
  { place: 'Graysville', lat: 33.6228, lon: -86.9573 },
  { place: 'Cardiff', lat: 33.640, lon: -86.870 },
  { place: 'Brookside', lat: 33.6379, lon: -86.9167 }
];

const AW_API_KEY = process.env.AW_API_KEY || '';
const AW_APP_KEY = process.env.AW_APP_KEY || '';
let stationMac = null;
let stationObs = null;
const FORECAST_POINTS_URL = 'https://api.weather.gov/points/33.640,-86.870';
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=33.640&longitude=-86.870&current=us_aqi,pm2_5,ozone&timezone=America%2FChicago';
const CARDIFF_CENSUS_URL = 'https://api.census.gov/data/2023/acs/acs5?get=NAME,B01003_001E,B01002_001E,B19013_001E,B19301_001E,B25003_001E,B25003_002E,B25003_003E&for=place:12040&in=state:01';
const CARDIFF_CENSUS_MEDIAN_INCOME_FALLBACK_URL = 'https://api.census.gov/data/2019/acs/acs5?get=NAME,B19013_001E&for=place:12040&in=state:01';
const LOCAL_TIME_ZONE = 'America/Chicago';
const MAX_RAIN_SAMPLES = 2500;
const RAIN_SAMPLE_GAP_MS = 55 * 60 * 1000;
const AW_HISTORY_BASE = 'https://rt.ambientweather.net/v1/devices';
/* How far back the twice daily run will walk to rebuild a missing day from the
   station's own five minute record. The loop skips any day already owned by
   awn-csv or awn-history, so in steady state this costs one fetch, not ten. It
   is ten rather than three so that a power cut at the house heals itself over
   the following week instead of needing import-awn-csv.mjs by hand. Gaps older
   than this window are still a CSV import. See DECISIONS.md 30. */
const ARCHIVE_HISTORY_DAYS = 10;
const DATE_PARTS_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: LOCAL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});
const MONTH_PARTS_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: LOCAL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit'
});
const HOUR_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: LOCAL_TIME_ZONE,
  hour: 'numeric',
  hour12: false
});
const TZ_PARTS_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: LOCAL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
});



async function fetchJson(url, init = {}) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.json();
}

async function writeJson(filePath, payload) {
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

async function readJson(filePath, fallback) {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    return JSON.parse(text);
  } catch (error) {
    return fallback;
  }
}

function zonedParts(value, formatter) {
  const parts = formatter.formatToParts(new Date(value));
  const out = {};
  parts.forEach((part) => {
    if (part.type !== 'literal') out[part.type] = part.value;
  });
  return out;
}

function localDateKey(value) {
  const parts = zonedParts(value, DATE_PARTS_FORMATTER);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function localMonthKey(value) {
  const parts = zonedParts(value, MONTH_PARTS_FORMATTER);
  return `${parts.year}-${parts.month}`;
}

function localHour(value) {
  return Number(HOUR_FORMATTER.format(new Date(value)));
}

function localMonthLabel(value) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: LOCAL_TIME_ZONE,
    month: 'long',
    year: 'numeric'
  }).format(new Date(value));
}

function localShortDate(value) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: LOCAL_TIME_ZONE,
    month: 'short',
    day: 'numeric'
  }).format(new Date(value));
}

function windDegToCompass(deg) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(Number(deg) / 22.5) % 16] || 'N';
}

function deriveCondition(hourlyRain, solarRadiation) {
  if (hourlyRain > 0) return 'Rain';
  if (solarRadiation > 600) return 'Sunny';
  if (solarRadiation > 200) return 'Partly cloudy';
  if (solarRadiation > 20) return 'Mostly cloudy';
  return 'Clear';
}

async function updateRainLog(current, obsDate) {
  const log = await readJson(RAIN_LOG_FILE, { updatedAt: '', samples: [], monthSeeds: [] });
  const sample = {
    obsTime: obsDate.toISOString(),
    localDate: localDateKey(obsDate),
    localMonth: localMonthKey(obsDate),
    hour: localHour(obsDate),
    dailyTotal: Number(current.precipTotal || 0),
    temp: Number(current.temp || 0),
    windGust: Number(current.windGust || 0),
    precipRate: Number(current.precipRate || 0),
    humidity: Number(current.humidity || 0),
    ...(current.source ? { source: current.source } : {}),
    ...(current.sourceNote ? { sourceNote: current.sourceNote } : {})
  };

  const samples = Array.isArray(log.samples) ? log.samples.slice() : [];
  const monthSeeds = Array.isArray(log.monthSeeds) ? log.monthSeeds.slice() : [];

  /* The live run fires every ten minutes, but this log only needs enough
     resolution to hold a daily maximum and an overnight low. Keeping all 144
     readings a day would push month to date rain out of MAX_RAIN_SAMPLES inside
     three weeks and rewrite a much larger file on every run. One an hour keeps
     the retention window worth about three months. Today's figures below are
     still computed against the live reading, so nothing a reader sees waits for
     the top of the hour. The first reading of a new day is always kept, so a
     daily boundary is never straddled. See DECISIONS.md 30. */
  const last = samples.length ? samples[samples.length - 1] : null;
  const sameObs = last && last.obsTime === sample.obsTime;
  const withinHour = last
    && last.localDate === sample.localDate
    && (new Date(sample.obsTime) - new Date(last.obsTime)) < RAIN_SAMPLE_GAP_MS;
  if (!sameObs && !withinHour) {
    samples.push(sample);
  }

  samples.sort((a, b) => new Date(a.obsTime) - new Date(b.obsTime));
  const trimmedSamples = samples.slice(-MAX_RAIN_SAMPLES);
  const currentDateKey = sample.localDate;
  const currentMonthKey = sample.localMonth;
  const currentHour = sample.hour;

  const dailyMax = new Map();
  trimmedSamples.forEach((entry) => {
    const total = Number(entry.dailyTotal || 0);
    dailyMax.set(entry.localDate, Math.max(Number(dailyMax.get(entry.localDate) || 0), total));
  });

  const monthDays = [...dailyMax.entries()]
    .filter(([dateKey]) => dateKey.startsWith(currentMonthKey))
    .sort((a, b) => a[0].localeCompare(b[0]));
  const monthSeed = monthSeeds.find((seed) => seed && seed.month === currentMonthKey) || null;
  const seedDate = monthSeed && monthSeed.asOfDate ? String(monthSeed.asOfDate) : '';
  const seedTotal = monthSeed ? Number(monthSeed.total || 0) : 0;
  const seedDailyTotal = monthSeed ? Number(monthSeed.asOfDailyTotal || 0) : 0;
  const trackedMonthTotal = monthDays.reduce((sum, [dateKey, total]) => {
    const numericTotal = Number(total || 0);
    if (!monthSeed) return sum + numericTotal;
    if (dateKey < seedDate) return sum;
    if (dateKey === seedDate) return sum + Math.max(0, numericTotal - seedDailyTotal);
    return sum + numericTotal;
  }, 0);
  const monthToDate = seedTotal + trackedMonthTotal;
  const monthCoverageStart = monthSeed ? `${currentMonthKey}-01` : (monthDays.length ? monthDays[0][0] : currentDateKey);
  const monthComplete = monthSeed ? true : monthCoverageStart.endsWith('-01');
  const todaySamples = trimmedSamples.filter((entry) => entry.localDate === currentDateKey);
  const rainToday = todaySamples.reduce((max, entry) => Math.max(max, Number(entry.dailyTotal || 0)), Number(current.precipTotal || 0));
  const overnightLow = todaySamples.length ? todaySamples.reduce((min, entry) => Math.min(min, Number(entry.temp || current.temp || 0)), Number(current.temp || 0)) : Number(current.temp || 0);
  const overnightWindGust = todaySamples.reduce((max, entry) => Math.max(max, Number(entry.windGust || 0)), Number(current.windGust || 0));

  const updatedLog = {
    updatedAt: new Date().toISOString(),
    samples: trimmedSamples,
    monthSeeds
  };
  await writeJson(RAIN_LOG_FILE, updatedLog);

  const latestTodaySample = todaySamples.length ? todaySamples[todaySamples.length - 1] : sample;
  return {
    today: rainToday,
    monthToDate,
    monthLabel: localMonthLabel(obsDate),
    monthComplete,
    monthCoverageStart,
    source: latestTodaySample.source || 'local-station',
    sourceNote: latestTodaySample.sourceNote || null,
    morningReport: {
      amount: rainToday,
      lowTemp: overnightLow,
      windGust: overnightWindGust,
      label: currentHour < 11 ? 'Since midnight' : 'So far today',
      isMorning: currentHour < 11,
      coverageStart: currentDateKey
    }
  };
}

async function fetchForecast() {
  const pointsData = await fetchJson(FORECAST_POINTS_URL, { headers: { Accept: 'application/geo+json' } });
  const forecastUrl = pointsData.properties?.forecast;
  if (!forecastUrl) throw new Error('Missing forecast URL from weather.gov points response');
  const forecastData = await fetchJson(forecastUrl, { headers: { Accept: 'application/geo+json' } });
  return Array.isArray(forecastData.properties?.periods) ? forecastData.properties.periods : [];
}

// Collapse NWS day/night periods into a 7-day daily outlook (date, hi, lo, condition).
function buildWeekly(periods) {
  const byDate = new Map();
  for (const p of Array.isArray(periods) ? periods : []) {
    if (!p || !p.startTime) continue;
    const date = p.startTime.slice(0, 10);
    let entry = byDate.get(date);
    if (!entry) {
      entry = { date, hi: null, lo: null, shortForecast: null };
      byDate.set(date, entry);
    }
    if (p.isDaytime) {
      if (Number.isFinite(p.temperature)) entry.hi = p.temperature;
      if (p.shortForecast) entry.shortForecast = p.shortForecast;
    } else {
      if (Number.isFinite(p.temperature)) entry.lo = p.temperature;
      if (!entry.shortForecast && p.shortForecast) entry.shortForecast = p.shortForecast;
    }
  }
  return [...byDate.values()].filter((d) => d.hi != null || d.lo != null).slice(0, 7);
}

async function fetchYesterdaySummary(obsDate) {
  // Use the forecast endpoint with past_days, which is more reliable than the archive subdomain.
  // Query 7 past days and walk back to the most recent complete day (archive lag can be 2-5 days).
  const url = `https://api.open-meteo.com/v1/forecast?latitude=33.640&longitude=-86.870&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=America%2FChicago&past_days=7&forecast_days=1`;
  const data = await fetchJson(url);
  const daily = data && data.daily;
  if (!daily || !Array.isArray(daily.time) || !daily.time.length) return null;
  const todayKey = localDateKey(obsDate);
  for (let i = daily.time.length - 1; i >= 0; i--) {
    if (daily.time[i] >= todayKey) continue; // skip today and future
    const high = daily.temperature_2m_max?.[i];
    const low = daily.temperature_2m_min?.[i];
    const rain = daily.precipitation_sum?.[i];
    if (high != null && low != null) {
      return {
        yesterdayHigh: Math.round(high),
        yesterdayLow: Math.round(low),
        yesterdayRain: rain != null ? Number(Number(rain).toFixed(2)) : null,
        todayHigh: null,
        todayLow: null,
        todayRain: null
      };
    }
  }
  return null;
}

async function fetchPlaceForecast(point) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${point.lat}&longitude=${point.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=America%2FChicago&forecast_days=2`;
  const data = await fetchJson(url);
  const daily = data && data.daily;
  if (!daily || !Array.isArray(daily.time) || !daily.time.length) return null;
  return {
    place: point.place,
    lat: point.lat,
    lon: point.lon,
    today: {
      date: daily.time[0],
      hi: Math.round(daily.temperature_2m_max[0]),
      lo: Math.round(daily.temperature_2m_min[0]),
      precipChance: daily.precipitation_probability_max?.[0] ?? null,
      weatherCode: daily.weathercode?.[0] ?? null
    },
    tomorrow: daily.time[1] ? {
      date: daily.time[1],
      hi: Math.round(daily.temperature_2m_max[1]),
      lo: Math.round(daily.temperature_2m_min[1]),
      precipChance: daily.precipitation_probability_max?.[1] ?? null,
      weatherCode: daily.weathercode?.[1] ?? null
    } : null
  };
}

/* Every town, every run, in the order CLAUDE.md sets.

   This used to fire all three at once and keep whatever came back, which meant
   one timeout deleted a town from the file and the card came up with two rows
   in it. That is exactly what happened to Graysville. A forecast that is a run
   old is worth having; a town that has silently vanished is not, and nobody
   watching the page can tell the difference between a town that failed and a
   town somebody removed on purpose.

   So: one at a time with a breath between, because three parallel calls off one
   runner is what draws a rate limit in the first place, one retry, and a fall
   back to whatever that town said last time. A town that has never answered at
   all still gets a row, with no reading in it, and the page draws the em dash
   the empty state calls for. */
async function updateWatershedForecastFile() {
  const previous = await readJson(WATERSHED_FORECAST_FILE, { places: [] });
  const lastGood = new Map((previous.places || []).map((place) => [place.place, place]));

  const places = [];
  const carried = [];
  for (const point of WATERSHED_FORECAST_POINTS) {
    let forecast = null;
    for (let attempt = 1; attempt <= 2 && !forecast; attempt += 1) {
      try {
        forecast = await fetchPlaceForecast(point);
      } catch (error) {
        console.warn(`   ${point.place} forecast failed (attempt ${attempt}): ${error.message}`);
      }
      if (!forecast && attempt === 1) await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    if (forecast) {
      places.push(forecast);
      continue;
    }
    /* Last good reading, or a named row with nothing in it. Either way the
       town keeps its place in the list. */
    carried.push(point.place);
    places.push(lastGood.get(point.place) || {
      place: point.place,
      lat: point.lat,
      lon: point.lon,
      today: null,
      tomorrow: null
    });
  }

  await writeJson(WATERSHED_FORECAST_FILE, {
    updatedAt: new Date().toISOString(),
    places
  });
  console.log(`Updated ${path.basename(WATERSHED_FORECAST_FILE)} with ${places.length} places`
    + (carried.length ? `, carrying ${carried.join(' and ')} forward from the last run` : ''));
}

async function updateWeatherFile() {
  if (!AW_API_KEY || !AW_APP_KEY) {
    console.log('Skipping weather update because AW_API_KEY or AW_APP_KEY is not set.');
    return null;
  }

  const url = `https://rt.ambientweather.net/v1/devices?apiKey=${encodeURIComponent(AW_API_KEY)}&applicationKey=${encodeURIComponent(AW_APP_KEY)}`;
  const devices = await fetchJson(url, { cache: 'no-store' });
  if (!Array.isArray(devices) || !devices[0]?.lastData) {
    throw new Error('Ambient Weather returned no device data');
  }
  const d = devices[0].lastData;
  const obsDate = new Date(d.date || Date.now());
  stationMac = devices[0].macAddress || null;
  stationObs = obsDate;

  const prev = await readJson(WEATHER_FILE, {});
  const prevPressure = typeof prev.pressure === 'number' ? prev.pressure : null;
  let pressureTrend = null;
  if (prevPressure !== null) {
    const diff = d.baromrelin - prevPressure;
    if (diff > 0.02) pressureTrend = 'rising';
    else if (diff < -0.02) pressureTrend = 'falling';
    else pressureTrend = 'steady';
  }

  const current = {
    temp: Math.round(d.tempf),
    humidity: d.humidity,
    windSpeed: Math.round(d.windspeedmph),
    windDir: d.winddir,
    windGust: Math.round(d.windgustmph || 0),
    pressure: d.baromrelin,
    pressureTrend,
    uv: d.uv || 0,
    solarRadiation: d.solarradiation || 0,
    dailyRain: d.dailyrainin || 0,
    hourlyRain: d.hourlyrainin || 0,
    weeklyRain: d.weeklyrainin || 0,
    monthlyRain: d.monthlyrainin || 0,
    yearlyRain: d.yearlyrainin || 0,
    feelsLike: Math.round(d.feelsLike || d.tempf),
    dewPoint: Math.round(d.dewPoint || 0),
    lastUpdated: d.date || new Date().toISOString(),
    source: 'Ambient Weather'
  };

  const rainLogCurrent = {
    temp: current.temp,
    windGust: current.windGust,
    humidity: current.humidity,
    precipRate: current.hourlyRain,
    precipTotal: current.dailyRain,
    source: 'ambient-station'
  };
  const rain = await updateRainLog(rainLogCurrent, obsDate);
  let dailySummary = null;
  try {
    dailySummary = await fetchYesterdaySummary(obsDate);
  } catch (e) {
    console.warn('Open-Meteo archive fetch failed, dailySummary will be null:', e.message);
  }

  // Patch yesterday's rain with local station data. The regional model (Open-Meteo)
  // often underreports convective rainfall. The AWN archive is the authoritative source.
  try {
    const archive = await readYearArchive(WEATHER_ARCHIVE_DIR, { days: [] });
    const yesterdayKey = shiftDayKey(localDateKey(obsDate), -1);
    const archiveDay = (archive.days || []).find((d) => d.date === yesterdayKey);
    if (archiveDay && Number.isFinite(archiveDay.rain)) {
      const prevRain = dailySummary ? dailySummary.yesterdayRain : null;
      if (!dailySummary) {
        dailySummary = {
          yesterdayHigh: Number.isFinite(archiveDay.high) ? archiveDay.high : null,
          yesterdayLow: Number.isFinite(archiveDay.low) ? archiveDay.low : null,
          yesterdayRain: archiveDay.rain,
          todayHigh: null,
          todayLow: null,
          todayRain: null,
        };
      } else {
        dailySummary.yesterdayRain = archiveDay.rain;
      }
      console.log(`Patched yesterdayRain from archive: ${archiveDay.rain}" (was ${prevRain})`);
    }
  } catch (e) {
    console.warn('Archive rain patch failed (non-fatal):', e.message);
  }

  const forecastPeriods = await fetchForecast();
  // Sixteen periods is eight days of day/night pairs, which is what the
  // almanac's week card needs to fill its seven columns. It was eight, which
  // is four days, and the card had no way to show a week it was never sent.
  // detailedForecast is dropped on the way in: it is the biggest field in the
  // file by some way, nothing on the site reads it, and this file is rewritten
  // and committed every ten minutes.
  const forecast = forecastPeriods.slice(0, 16).map(({ detailedForecast, ...period }) => period);
  const weekly = buildWeekly(forecastPeriods);

  const payload = {
    updatedAt: new Date().toISOString(),
    ...current,
    current: {
      temp: current.temp,
      feelsLike: current.feelsLike,
      feels: current.feelsLike,
      humidity: current.humidity,
      windSpeed: current.windSpeed,
      windDir: windDegToCompass(d.winddir),
      windGust: current.windGust,
      hourlyRain: current.hourlyRain,
      precipRate: current.hourlyRain,
      dailyRain: current.dailyRain,
      precipTotal: current.dailyRain,
      pressure: current.pressure,
      pressureIn: current.pressure,
      uv: current.uv,
      solarRadiation: current.solarRadiation,
      dewPoint: current.dewPoint,
      obsTime: current.lastUpdated,
      lastUpdated: current.lastUpdated,
      condition: deriveCondition(current.hourlyRain, current.solarRadiation),
      source: current.source,
      sourceNote: null
    },
    rain,
    forecast,
    weekly,
    dailySummary
  };

  await writeJson(WEATHER_FILE, payload);
  console.log(`Updated ${path.basename(WEATHER_FILE)}`);
  return payload;
}

/* News used to be gathered here. It moved to scripts/fetch-news.mjs, which is
   now the only writer of fivemile-news-live.json, reads the outlets' own feeds
   rather than Google News, and keeps a permanent archive under news-archive/.
   The end of month rain story went with it. Do not add a second writer for
   that file here. See DECISIONS.md 17. */

/* Thin the stage series down to what the sparkline on the page needs. The
   archive below keeps every completed day; this is only the picture. */
function historyPoints(readings, maxPoints = 120) {
  if (!readings.length) return [];
  const point = (row) => ({ at: row.time, stage_ft: Number(row.value.toFixed(2)) });
  if (readings.length <= maxPoints) return readings.map(point);
  const stride = (readings.length - 1) / (maxPoints - 1);
  const trimmed = [];
  for (let index = 0; index < maxPoints; index += 1) {
    const row = readings[Math.round(index * stride)];
    if (row) trimmed.push(point(row));
  }
  return trimmed;
}

/* Keep the thirty day sparkline current without refetching thirty days.

   The ten minute job only pulls a six hour window, so on its own it would cut
   the chart on the homepage down to six hours. Instead it folds its fresh
   readings into the history already on disk and re-thins. The twice daily job
   rebuilds the whole line from the full pull, so any drift this introduces is
   corrected twice a day rather than accumulating.

   The thinning walks even steps in TIME, not every nth reading. Both charts
   that draw this line place a point by its position in the array rather than
   by its timestamp, so a day holding more points than its neighbours is drawn
   wider than them. Striding by index kept every fresh fifteen minute reading
   for today against six hour gaps for every day before it, and today swelled
   to a fifth of the chart. Even steps in time put every day back on the same
   footing. The last step lands exactly on the newest reading, so the right
   edge of the chart stays current.

   Timestamps are compared as instants, not strings: the file on disk carries a
   local offset from the legacy API and the modernized one answers in UTC, so
   the same reading can be written two ways. */
function mergeHistory(previous, freshRows, maxPoints = 120, windowDays = 30) {
  const byInstant = new Map();
  const add = (at, stage) => {
    const stamp = new Date(at).getTime();
    if (!Number.isFinite(stamp) || !Number.isFinite(stage)) return;
    byInstant.set(stamp, { at, stage_ft: Number(stage.toFixed(2)) });
  };
  (previous || []).forEach((entry) => add(entry.at, Number(entry.stage_ft)));
  (freshRows || []).forEach((row) => add(row.time, row.value));

  const cutoff = Date.now() - windowDays * 24 * 3600 * 1000;
  const ordered = [...byInstant.entries()]
    .filter(([stamp]) => stamp >= cutoff)
    .sort((a, b) => a[0] - b[0]);
  if (ordered.length <= maxPoints) return ordered.map(([, entry]) => entry);

  const first = ordered[0][0];
  const last = ordered[ordered.length - 1][0];
  const span = last - first;
  if (span <= 0) return ordered.slice(-maxPoints).map(([, entry]) => entry);

  const step = span / (maxPoints - 1);
  const picked = [];
  let cursor = 0;
  for (let index = 0; index < maxPoints; index += 1) {
    const target = first + index * step;
    while (
      cursor + 1 < ordered.length &&
      Math.abs(ordered[cursor + 1][0] - target) <= Math.abs(ordered[cursor][0] - target)
    ) {
      cursor += 1;
    }
    const entry = ordered[cursor][1];
    /* A stretch with no readings in it lands on the same one twice. Keep it
       once: a repeated point would draw a flat run the gauge never reported. */
    if (!picked.length || picked[picked.length - 1] !== entry) picked.push(entry);
  }
  return picked;
}

/* The permanent creek record.

   `stage_history` in fivemile-watershed.json is a rolling window that
   overwrites itself, so before this the creek was the one thing on the site
   that did scroll away. A thirty day pull fills a month on its first run and
   quietly repairs whatever a missed run or an outage left behind, the same way
   the weather archive heals itself off the station history. See DECISIONS.md 36.

   Completed days only. Today is still moving and is already on the almanac
   from the live file, and writing a day that changes every ten minutes would
   put a fresh blob in git history 144 times over for one row. */
function dailyGaugeRecords(stageRows, flowRows, todayKey) {
  const buckets = new Map();
  const collect = (rows, key) => {
    rows.forEach((row) => {
      const dateKey = localDateKey(row.time);
      if (dateKey >= todayKey) return;
      if (!buckets.has(dateKey)) buckets.set(dateKey, { stage: [], cfs: [] });
      buckets.get(dateKey)[key].push(row.value);
    });
  };
  collect(stageRows, 'stage');
  collect(flowRows, 'cfs');

  const days = new Map();
  const mean = (list) => list.reduce((sum, n) => sum + n, 0) / list.length;
  for (const [dateKey, bucket] of buckets) {
    /* A full day is 96 readings at fifteen minutes apart. The oldest day in
       any thirty day window is cut off partway through and will never be
       fetched again, so its low and high would be wrong forever. Half a day is
       the floor: below it the day is left out, which reads as a gap rather
       than as a quiet lie about how low the creek got. */
    if (bucket.stage.length < 48) continue;
    days.set(dateKey, {
      date: dateKey,
      low: Number(Math.min(...bucket.stage).toFixed(2)),
      high: Number(Math.max(...bucket.stage).toFixed(2)),
      mean: Number(mean(bucket.stage).toFixed(2)),
      cfs: bucket.cfs.length ? Number(mean(bucket.cfs).toFixed(1)) : null,
      readings: bucket.stage.length,
      source: 'usgs-ogc'
    });
  }
  /* A dead gauge is now caught upstream by its timestamp rather than by its
     value, which is the honest test and the one the modernized API supports.
     This stays as cheap insurance on a permanent file: a month of 0.00 ft is
     worse than a gap, whatever produced it. */
  const allFlat = [...days.values()].every((day) => day.low === 0 && day.high === 0);
  return allFlat ? new Map() : days;
}

function gaugeNote(gauge) {
  if (!Number.isFinite(gauge.stage_ft) && !Number.isFinite(gauge.discharge_cfs)) {
    return 'Gauge synced without a readable current value.';
  }
  if (gauge.trend === 'rising') {
    return 'Water is moving up at this watch point.';
  }
  if (gauge.trend === 'falling') {
    return 'Water is easing back down at this watch point.';
  }
  return 'This reach looks fairly steady right now.';
}

function buildGaugeSnapshot(gauge, readings, stageHistory = []) {
  const stageRows = readingsFor(readings, gauge.id, PARAM.STAGE);
  const flowRows = readingsFor(readings, gauge.id, PARAM.DISCHARGE);
  const tempRows = readingsFor(readings, gauge.id, PARAM.WATER_TEMP);
  const oxygenRows = readingsFor(readings, gauge.id, PARAM.DISSOLVED_OXYGEN);
  const conductanceRows = readingsFor(readings, gauge.id, PARAM.CONDUCTANCE);
  const stage = latestOf(stageRows);
  const flow = latestOf(flowRows);
  const temp = latestOf(tempRows);
  const oxygen = latestOf(oxygenRows);
  const conductance = latestOf(conductanceRows);
  const trend = trendFrom(stageRows);
  const rate = riseRatePerHour(stageRows);
  return {
    id: gauge.id,
    label: gauge.label,
    name: gauge.name,
    place: gauge.place,
    role: gauge.role,
    reach: gauge.reach,
    location_tags: gauge.locationTags,
    source_name: 'USGS',
    source_type: 'watershed_gauge',
    stage_ft: stage ? Number(stage.value.toFixed(2)) : null,
    discharge_cfs: flow ? Number(flow.value.toFixed(1)) : null,
    /* The station reports Celsius. Everything else on the site is Fahrenheit. */
    water_temp_f: temp ? Number((temp.value * 9 / 5 + 32).toFixed(1)) : null,
    /* Only the lead gauge carries these sensors. */
    dissolved_oxygen_mgl: oxygen ? Number(oxygen.value.toFixed(1)) : null,
    specific_conductance_uscm: conductance ? Number(conductance.value.toFixed(0)) : null,
    trend,
    rise_rate_ft_per_hr: rate === null ? null : Number(rate.toFixed(3)),
    updated_at: stage?.time || flow?.time || '',
    stage_history: stageHistory,
    note: gaugeNote({
      stage_ft: stage ? stage.value : null,
      discharge_cfs: flow ? flow.value : null,
      trend
    })
  };
}

function summarizeWatershed(gauges, rain) {
  const lead = gauges.find((gauge) => gauge.role === 'lead') || gauges[0];
  if (!lead || !Number.isFinite(lead.stage_ft)) {
    return 'The live creek gauge file is ready, but the latest numbers have not synced yet.';
  }
  const rainToday = Number(rain?.today || 0);
  const rainMonth = Number(rain?.monthToDate || 0);
  /* No town name in here. The rain gauge sits in one of the three and the
     daily read is for all three, so the sentence says where the reading
     applies rather than where the instrument is bolted down. */
  const rainLine = rainToday >= 0.01
    ? `The area has picked up ${rainToday.toFixed(2)} inches today`
    : 'It is dry across the area today';
  const trendLine = lead.trend === 'rising'
    ? `and ${lead.label} is climbing`
    : (lead.trend === 'falling' ? `and ${lead.label} is easing down` : `and ${lead.label} is holding fairly steady`);
  return `${rainLine}, ${trendLine}. Lead stage is ${lead.stage_ft.toFixed(2)} ft with about ${lead.discharge_cfs?.toFixed(1) || '0.0'} cfs moving through the channel. Month-to-date rain is ${rainMonth.toFixed(2)} inches.`;
}

/* Merge a run's completed days into the permanent creek file. Fresh USGS data
   wins for any day it covers, which is what makes a missed run heal instead of
   leaving a hole. Everything older than the thirty day window is left alone. */
async function updateCreekArchive(daily, gauge) {
  if (!daily || !daily.size) {
    console.log('No completed creek days to archive this run.');
    return null;
  }
  const archive = await readYearArchive(CREEK_ARCHIVE_DIR, { updatedAt: '', gaugeId: '', gaugeName: '', days: [] });
  const days = new Map((archive.days || []).map((day) => [day.date, day]));
  let written = 0;
  for (const [dateKey, record] of daily) {
    const existing = days.get(dateKey);
    if (existing && JSON.stringify(existing) === JSON.stringify(record)) continue;
    days.set(dateKey, record);
    written += 1;
  }
  const merged = [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
  const payload = {
    updatedAt: new Date().toISOString(),
    gaugeId: gauge?.id || '',
    gaugeName: gauge?.name || '',
    days: merged
  };
  const result = await writeYearArchive(CREEK_ARCHIVE_DIR, payload);
  console.log(`Updated ${path.basename(CREEK_ARCHIVE_DIR)}/: ${written} day(s) written, ${merged.length} total, year file(s) touched: ${result.written.join(', ') || 'none'}`);
  return payload;
}

/* The gauge's own high water record, one row per water year.

   There is no sourced flood stage for this gauge. It has no Real-Time Flood
   Impact reference points and NWS does not carry it as a forecast point, so
   the honest way to tell a reader that the creek is high is to say how the
   reading compares to the years behind it. That is what this file is for.

   Peaks move once a year at most, so this runs on the twice daily job and the
   file sits still the rest of the time. */
async function updateCreekPeaksFile() {
  const lead = GAUGES.find((gauge) => gauge.role === 'lead');
  const peaks = await fetchAnnualPeaks(lead.id);
  if (!peaks.length) {
    console.log('No annual peaks returned, leaving the peaks file alone.');
    return null;
  }
  const highest = peaks.reduce((top, peak) => (peak.stage_ft > top.stage_ft ? peak : top), peaks[0]);
  const payload = {
    updatedAt: new Date().toISOString(),
    gaugeId: lead.id,
    gaugeName: lead.name,
    source: 'USGS annual peak streamflow',
    years: peaks.length,
    first: peaks[0].date,
    last: peaks[peaks.length - 1].date,
    highest,
    peaks
  };
  await writeJson(CREEK_PEAKS_FILE, payload);
  console.log(`Updated ${path.basename(CREEK_PEAKS_FILE)}: ${peaks.length} years, highest ${highest.stage_ft} ft on ${highest.date}`);
  return payload;
}

async function updateWatershedFile(weatherPayload = null, options = {}) {
  /* The thirty day pull is the expensive call and it exists to feed the
     permanent archive and the sparkline, neither of which changes between one
     ten minute run and the next. Running it on the ten minute job fetched
     about four megabytes 144 times a day to learn nothing the short window
     does not already say. It runs on the twice daily job now, where
     fivemile-creek-archive/ is already committed. A missed run still
     heals, at the slower cadence. See DECISIONS.md 36. */
  const withArchive = options.archive !== false;
  const weather = weatherPayload || await readJson(WEATHER_FILE, { rain: null });
  const previous = await readJson(WATERSHED_FILE, { gauges: [] });
  const previousHistory = new Map(
    (previous.gauges || []).map((gauge) => [gauge.id, gauge.stage_history || []])
  );
  const ids = GAUGES.map((gauge) => gauge.id);
  const lead = GAUGES.find((gauge) => gauge.role === 'lead');
  const now = new Date();

  /* One request for every gauge and every parameter. The modernized API takes
     comma lists, so a second gauge costs nothing extra in round trips. Six
     hours is enough to place the current reading, the trend, and the rate of
     rise the upstream warning reads. */
  let readings = new Map();
  try {
    readings = await fetchSeries(
      ids,
      [PARAM.STAGE, PARAM.DISCHARGE, PARAM.WATER_TEMP, PARAM.DISSOLVED_OXYGEN, PARAM.CONDUCTANCE],
      new Date(now.getTime() - 6 * 3600 * 1000),
      now
    );
  } catch (error) {
    console.error('USGS gauge fetch failed (continuing):', error.message);
  }

  let history = null;
  if (withArchive) {
    try {
      history = await fetchSeries(
        [lead.id],
        [PARAM.STAGE, PARAM.DISCHARGE],
        new Date(now.getTime() - 30 * 24 * 3600 * 1000),
        now
      );
    } catch (error) {
      console.error('Creek history fetch failed (continuing):', error.message);
    }
  }

  const leadFullRows = history ? readingsFor(history, lead.id, PARAM.STAGE) : null;
  const gauges = GAUGES.map((gauge) => {
    if (gauge.role !== 'lead') return buildGaugeSnapshot(gauge, readings, []);
    /* A clean rebuild when the full pull is in hand, a merge otherwise. */
    const stageHistory = leadFullRows && leadFullRows.length
      ? historyPoints(leadFullRows)
      : mergeHistory(
          previousHistory.get(gauge.id),
          readingsFor(readings, gauge.id, PARAM.STAGE)
        );
    return buildGaugeSnapshot(gauge, readings, stageHistory);
  });

  /* The oxygen record. EPA lists the creek impaired partly for oxygen
     depletion, so how it is actually doing is worth stating with numbers. The
     daily minimum is the honest measure: a creek can average comfortably and
     still run low before dawn. Archive runs only, since it is a second call
     and it moves once a day. */
  let oxygen = null;
  if (withArchive) {
    try {
      const rows = await fetchDailyStat(
        lead.id, PARAM.DISSOLVED_OXYGEN, STAT.MIN,
        new Date(now.getTime() - 90 * 24 * 3600 * 1000), now
      );
      if (rows.length) {
        const values = rows.map((row) => row.value);
        const lowest = Math.min(...values);
        oxygen = {
          parameter: 'Dissolved oxygen, daily minimum',
          unit: 'mg/l',
          days: rows.length,
          lowest,
          lowest_on: rows.find((row) => row.value === lowest).date,
          highest: Math.max(...values),
          days_under_5: values.filter((value) => value < 5).length,
          days_under_4: values.filter((value) => value < 4).length,
          first: rows[0].date,
          last: rows[rows.length - 1].date
        };
      }
    } catch (error) {
      console.error('Oxygen record fetch failed (continuing):', error.message);
    }
  } else {
    oxygen = (previous && previous.oxygenRecord) || null;
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    leadGaugeId: lead?.id || '',
    oxygenRecord: oxygen,
    summary: summarizeWatershed(gauges, weather?.rain || null),
    rainContext: weather?.rain || null,
    gauges
  };
  await writeJson(WATERSHED_FILE, payload);
  console.log(`Updated ${path.basename(WATERSHED_FILE)}`);

  if (!history) return payload;

  try {
    const daily = dailyGaugeRecords(
      readingsFor(history, lead.id, PARAM.STAGE),
      readingsFor(history, lead.id, PARAM.DISCHARGE),
      localDateKey(now)
    );
    await updateCreekArchive(daily, lead);
  } catch (error) {
    console.error('Creek archive update failed (continuing):', error.message);
  }
  return payload;
}

function roundValue(value, digits = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}

function formatPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function describeAirQuality(aqi) {
  if (!Number.isFinite(aqi)) {
    return {
      category: 'Pending',
      label: 'Air quality waiting on a readable index.',
      note: 'The feed answered, but a clean AQI value was not available in this refresh.'
    };
  }
  if (aqi <= 50) {
    return {
      category: 'Good',
      label: 'A fairly clean-air day for most people.',
      note: 'Outdoor work, porch time, and sky watching should not be fighting much haze from the air-quality side.'
    };
  }
  if (aqi <= 100) {
    return {
      category: 'Moderate',
      label: 'Air is generally manageable, but sensitive lungs may notice it.',
      note: 'Most folks can stay outside normally, though haze or breathing irritation can start to matter for sensitive groups.'
    };
  }
  if (aqi <= 150) {
    return {
      category: 'Unhealthy for sensitive groups',
      label: 'Sensitive groups should take the air seriously today.',
      note: 'Children, older adults, and anyone with asthma or heart and lung concerns may want lighter outdoor effort.'
    };
  }
  if (aqi <= 200) {
    return {
      category: 'Unhealthy',
      label: 'This is a rough air day, not just a dusty one.',
      note: 'Long outdoor stretches are harder to justify when the AQI is this elevated.'
    };
  }
  if (aqi <= 300) {
    return {
      category: 'Very unhealthy',
      label: 'The air is pushing into serious caution territory.',
      note: 'Outdoor plans deserve real caution while the AQI is this high.'
    };
  }
  return {
    category: 'Hazardous',
    label: 'This is a stay-alert air quality day.',
    note: 'Air this poor deserves the same kind of respect as a major public-health warning.'
  };
}

async function updateAirQualityFile() {
  const data = await fetchJson(AIR_QUALITY_URL, { cache: 'no-store' });
  const current = data && data.current ? data.current : {};
  const units = data && data.current_units ? data.current_units : {};
  const aqi = roundValue(current.us_aqi, 0);
  const pm25 = roundValue(current.pm2_5, 1);
  const ozone = roundValue(current.ozone, 1);
  const descriptor = describeAirQuality(aqi);

  const payload = {
    updatedAt: new Date().toISOString(),
    source_name: 'Open-Meteo Air Quality',
    source_type: 'air_quality',
    latitude: roundValue(data.latitude, 3) || 33.64,
    longitude: roundValue(data.longitude, 3) || -86.87,
    timezone: data.timezone || LOCAL_TIME_ZONE,
    current: {
      observedLocalTime: current.time || '',
      usAqi: aqi,
      category: descriptor.category,
      label: descriptor.label,
      note: descriptor.note,
      pm25,
      pm25Unit: units.pm2_5 || 'μg/m³',
      ozone,
      ozoneUnit: units.ozone || 'μg/m³'
    }
  };

  await writeJson(AIR_QUALITY_FILE, payload);
  console.log(`Updated ${path.basename(AIR_QUALITY_FILE)}`);
  return payload;
}

function censusNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function communitySummary(snapshot) {
  if (!snapshot || !Number.isFinite(snapshot.population)) {
    return 'The community snapshot file is ready, but the latest census estimate did not parse cleanly.';
  }

  const ownerShare = Number.isFinite(snapshot.ownerOccupiedSharePct) ? `${snapshot.ownerOccupiedSharePct}% owner-occupied` : 'owner occupancy still parsing';
  const renterShare = Number.isFinite(snapshot.renterOccupiedSharePct) ? `${snapshot.renterOccupiedSharePct}% renter-occupied` : 'renter share still parsing';
  const age = Number.isFinite(snapshot.medianAge) ? `median age about ${snapshot.medianAge}` : 'median age still parsing';
  const income = Number.isFinite(snapshot.medianHouseholdIncome)
    ? `median household income about $${Math.round(snapshot.medianHouseholdIncome).toLocaleString('en-US')}`
    : (Number.isFinite(snapshot.medianHouseholdIncomeLatestAvailable)
        ? `last non-suppressed median household income estimate was about $${Math.round(snapshot.medianHouseholdIncomeLatestAvailable).toLocaleString('en-US')} from the ACS ${snapshot.medianHouseholdIncomeLatestAvailableYear} 5-year release`
        : (Number.isFinite(snapshot.perCapitaIncome)
            ? `median household income is suppressed in the current ACS place file, but per-capita income is about $${Math.round(snapshot.perCapitaIncome).toLocaleString('en-US')}`
            : 'income still parsing'));
  return `ACS estimates suggest Cardiff is a very small town by scale, with about ${Math.round(snapshot.population).toLocaleString('en-US')} residents, ${age}, ${income}, and housing that looks roughly ${ownerShare} and ${renterShare}.`;
}

async function updateCommunitySnapshotFile() {
  const rows = await fetchJson(CARDIFF_CENSUS_URL, { cache: 'no-store' });
  if (!Array.isArray(rows) || rows.length < 2 || !Array.isArray(rows[0]) || !Array.isArray(rows[1])) {
    throw new Error('Census snapshot returned an unexpected shape');
  }

  const headers = rows[0];
  const values = rows[1];
  const record = Object.fromEntries(headers.map((key, index) => [key, values[index]]));
  const fallbackRows = await fetchJson(CARDIFF_CENSUS_MEDIAN_INCOME_FALLBACK_URL, { cache: 'no-store' });
  const fallbackHeaders = Array.isArray(fallbackRows) && Array.isArray(fallbackRows[0]) ? fallbackRows[0] : [];
  const fallbackValues = Array.isArray(fallbackRows) && Array.isArray(fallbackRows[1]) ? fallbackRows[1] : [];
  const fallbackRecord = Object.fromEntries(fallbackHeaders.map((key, index) => [key, fallbackValues[index]]));

  const population = censusNumber(record.B01003_001E);
  const medianAge = roundValue(record.B01002_001E, 1);
  const medianHouseholdIncome = censusNumber(record.B19013_001E);
  const medianHouseholdIncomeLatestAvailable = censusNumber(fallbackRecord.B19013_001E);
  const perCapitaIncome = censusNumber(record.B19301_001E);
  const occupiedHousingUnits = censusNumber(record.B25003_001E);
  const ownerOccupied = censusNumber(record.B25003_002E);
  const renterOccupied = censusNumber(record.B25003_003E);
  const ownerShare = occupiedHousingUnits ? formatPercent((ownerOccupied / occupiedHousingUnits) * 100) : null;
  const renterShare = occupiedHousingUnits ? formatPercent((renterOccupied / occupiedHousingUnits) * 100) : null;

  const snapshot = {
    population,
    medianAge,
    medianHouseholdIncome,
    medianHouseholdIncomeLatestAvailable,
    medianHouseholdIncomeLatestAvailableYear: medianHouseholdIncomeLatestAvailable ? 2019 : null,
    perCapitaIncome,
    occupiedHousingUnits,
    ownerOccupied,
    renterOccupied,
    ownerOccupiedSharePct: ownerShare,
    renterOccupiedSharePct: renterShare
  };

  const payload = {
    updatedAt: new Date().toISOString(),
    source_name: 'U.S. Census Bureau ACS 2023 5-year',
    source_type: 'community_snapshot',
    geography: {
      name: record.NAME || 'Cardiff town, Alabama',
      state: record.state || '01',
      place: record.place || '12040'
    },
    snapshot,
    summary: communitySummary(snapshot)
  };

  await writeJson(COMMUNITY_SNAPSHOT_FILE, payload);
  console.log(`Updated ${path.basename(COMMUNITY_SNAPSHOT_FILE)}`);
  return payload;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function shiftDayKey(dateKey, delta) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day));
  dt.setUTCDate(dt.getUTCDate() + delta);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function tzOffsetMs(date) {
  const parts = zonedParts(date, TZ_PARTS_FORMATTER);
  const asLocalUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second)
  );
  return asLocalUtc - date.getTime();
}

// UTC instant of local midnight for a Central-time date key. Used as the AW
// history endDate so a 288-record (24h) pull lines up with one local day.
function localMidnightUtcMs(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const noonGuess = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const offset = tzOffsetMs(noonGuess);
  return Date.UTC(year, month - 1, day, 0, 0, 0) - offset;
}

function aggregateStationRecords(records) {
  const byDate = new Map();
  for (const rec of records) {
    const when = rec.date || (rec.dateutc ? new Date(rec.dateutc).toISOString() : null);
    if (!when) continue;
    const key = localDateKey(when);
    let day = byDate.get(key);
    if (!day) {
      day = { high: -Infinity, low: Infinity, rain: 0, gust: 0, humSum: 0, humCount: 0 };
      byDate.set(key, day);
    }
    const temp = Number(rec.tempf);
    const gust = Number(rec.windgustmph);
    const rain = Number(rec.dailyrainin);
    const humidity = Number(rec.humidity);
    // A reading of exactly 0 for temp/humidity is a sensor dropout, not real.
    if (Number.isFinite(temp) && temp !== 0) {
      day.high = Math.max(day.high, temp);
      day.low = Math.min(day.low, temp);
    }
    if (Number.isFinite(rain)) day.rain = Math.max(day.rain, rain);
    if (Number.isFinite(gust)) day.gust = Math.max(day.gust, gust);
    if (Number.isFinite(humidity) && humidity !== 0) { day.humSum += humidity; day.humCount += 1; }
  }
  return byDate;
}

function dayEntryFromAgg(date, agg) {
  const hasTemp = Number.isFinite(agg.high) && agg.high > -Infinity;
  return {
    date,
    high: hasTemp ? Math.round(agg.high) : null,
    low: hasTemp ? Math.round(agg.low) : null,
    rain: Number(agg.rain.toFixed(2)),
    maxGust: Math.round(agg.gust),
    avgHumidity: agg.humCount ? Math.round(agg.humSum / agg.humCount) : null,
    source: 'awn-history'
  };
}

async function fetchStationDayRecords(mac, endUtcMs) {
  const url = `${AW_HISTORY_BASE}/${encodeURIComponent(mac)}` +
    `?apiKey=${encodeURIComponent(AW_API_KEY)}` +
    `&applicationKey=${encodeURIComponent(AW_APP_KEY)}` +
    `&endDate=${encodeURIComponent(new Date(endUtcMs).toISOString())}` +
    `&limit=288`;
  const data = await fetchJson(url, { cache: 'no-store' });
  return Array.isArray(data) ? data : [];
}

// Pull each recently completed day's full 5-minute record from the station and
// write an accurate daily aggregate. Skips days already owned by an authoritative
// source (CSV backfill or a prior history pull) so it self-heals missed runs.
async function updateWeatherArchiveFromHistory(obsDate) {
  if (!stationMac || !AW_API_KEY || !AW_APP_KEY) {
    console.log('Skipping archive history pull because station mac or API keys are unavailable.');
    return;
  }

  const archive = await readYearArchive(WEATHER_ARCHIVE_DIR, { updatedAt: '', days: [] });
  const days = new Map((archive.days || []).map((d) => [d.date, d]));
  const todayKey = localDateKey(obsDate);

  let written = 0;
  for (let i = 1; i <= ARCHIVE_HISTORY_DAYS; i += 1) {
    const dateKey = shiftDayKey(todayKey, -i);
    const existing = days.get(dateKey);
    if (existing && (existing.source === 'awn-csv' || existing.source === 'awn-history')) continue;
    try {
      const endMs = localMidnightUtcMs(shiftDayKey(dateKey, 1));
      const records = await fetchStationDayRecords(stationMac, endMs);
      const agg = aggregateStationRecords(records).get(dateKey);
      if (!agg) {
        console.warn(`No station records returned for ${dateKey}.`);
        continue;
      }
      days.set(dateKey, dayEntryFromAgg(dateKey, agg));
      written += 1;
      await sleep(1200);
    } catch (error) {
      console.warn(`Archive history pull failed for ${dateKey}: ${error.message}`);
    }
  }

  const merged = [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
  const payload = { updatedAt: new Date().toISOString(), days: merged };
  const archiveResult = await writeYearArchive(WEATHER_ARCHIVE_DIR, payload);
  console.log(`Updated ${path.basename(WEATHER_ARCHIVE_DIR)}/: ${written} day(s) refreshed, ${merged.length} total, year file(s) touched: ${archiveResult.written.join(', ') || 'none'}`);
  return payload;
}

/* The station archive is the authoritative source for yesterday's high, low, and
   rain, but dailySummary is built before the archive is refreshed. On the first
   run after the day rolls over the archive does not yet hold yesterday's
   finalized totals, so the summary falls back to the regional model, which
   underreports convective rain and can disagree on temps. Re-patch it from the
   station's own record.

   This is a function rather than a block inside main() because the live run
   passes the archive straight off disk instead of refetching the history.
   Without that, every ten minute run would quietly walk yesterday's numbers back
   to the model's version. See DECISIONS.md 30. */
async function patchYesterdayFromArchive(weather, archivePayload) {
  if (!weather?.dailySummary || !archivePayload) return;
  try {
    const yesterdayKey = shiftDayKey(localDateKey(stationObs || new Date()), -1);
    const archiveDay = (archivePayload.days || []).find((d) => d.date === yesterdayKey);
    if (!archiveDay) return;
    const summary = weather.dailySummary;
    const fields = [
      ['yesterdayHigh', archiveDay.high],
      ['yesterdayLow', archiveDay.low],
      ['yesterdayRain', archiveDay.rain],
    ];
    const changes = [];
    for (const [key, value] of fields) {
      if (Number.isFinite(value) && value !== summary[key]) {
        changes.push(`${key} ${summary[key]} -> ${value}`);
        summary[key] = value;
      }
    }
    if (changes.length) {
      await writeJson(WEATHER_FILE, weather);
      console.log(`Re-patched dailySummary from archive: ${changes.join(', ')}`);
    }
  } catch (error) {
    console.error('Yesterday summary re-patch failed (continuing):', error.message);
  }
}

async function main() {
  /* The ten minute run. Alerts, the gauge, and current conditions are the three
     things that can change while somebody is standing outside looking at the sky,
     so they run on their own cadence. Everything heavier, the history backfill,
     the forecast, air quality, and the civic snapshot, stays on the twice daily
     run. See DECISIONS.md 30. */
  if (process.argv.includes('--live')) {
    let live = null;
    try {
      live = await updateWeatherFile();
    } catch (error) {
      console.error('Weather update failed (continuing):', error.message);
    }
    await patchYesterdayFromArchive(live, await readYearArchive(WEATHER_ARCHIVE_DIR, { days: [] }));
    try {
      await updateWatershedFile(live, { archive: false });
    } catch (error) {
      console.error('Watershed update failed (continuing):', error.message);
    }
    return;
  }

  if (process.argv.includes('--watershed-only')) {
    await updateWatershedFile();
    return;
  }

  let weather = null;
  try {
    weather = await updateWeatherFile();
  } catch (error) {
    console.error('Weather update failed (continuing):', error.message);
  }
  let archivePayload = null;
  try {
    archivePayload = await updateWeatherArchiveFromHistory(stationObs || new Date());
  } catch (error) {
    console.error('Weather archive update failed (continuing):', error.message);
  }
  await patchYesterdayFromArchive(weather, archivePayload);
  try {
    await updateWatershedFile(weather);
  } catch (error) {
    console.error('Watershed update failed (continuing):', error.message);
  }
  /* The sheet is the editorial surface. It runs on the twice daily job
     because a notice typed at the kitchen table does not need to be live in
     ten minutes, and because the published CSV endpoint is flaky enough that
     asking it 144 times a day would be rude as well as pointless. */
  try {
    console.log('Reading the Google Sheet:');
    await refreshCms();
  } catch (error) {
    console.error('Sheet refresh failed (continuing):', error.message);
  }
  /* Who is permitted to discharge into the creek, and what EPA says about
     their record. Weekly would do, but the twice daily job is already the slow
     lane and one more quarter megabyte fetch on it costs nothing. */
  try {
    console.log('Reading EPA ECHO:');
    await updateEchoFile({ parseCsvRows });
  } catch (error) {
    console.error('ECHO update failed (continuing):', error.message);
  }
  /* What people have recorded along the creek. iNaturalist is already in this
     repo as the field guide's photograph source; this is the live half of it.
     Twice a day is plenty for a feed whose fastest unit is a day. */
  try {
    console.log('Reading iNaturalist:');
    await updateObservationsFile();
  } catch (error) {
    console.error('Observation feed failed (continuing):', error.message);
  }
  try {
    await updateCreekPeaksFile();
  } catch (error) {
    console.error('Creek peaks update failed (continuing):', error.message);
  }
  try {
    await updateWatershedForecastFile();
  } catch (error) {
    console.error('Watershed forecast update failed (continuing):', error.message);
  }
  try {
    await updateAirQualityFile();
  } catch (error) {
    console.error('Air quality update failed (continuing):', error.message);
  }
  /* updateCommunitySnapshotFile() is deliberately not called. Its Census
     endpoint has been returning HTML instead of JSON, the file it wrote was
     read only by fivemile-civic-data.js, and no page loaded that script. The
     function is kept so the civic figures can be rewired without rebuilding
     them from scratch, but nothing should call it until the endpoint is
     fixed. See DECISIONS.md 33. */
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
