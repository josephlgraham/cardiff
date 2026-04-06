import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const WEATHER_FILE = path.join(ROOT, 'cardiff-weather.json');
const NEWS_FILE = path.join(ROOT, 'cardiff-news-live.json');
const RAIN_LOG_FILE = path.join(ROOT, 'cardiff-rain-log.json');
const WATERSHED_FILE = path.join(ROOT, 'cardiff-watershed.json');
const AIR_QUALITY_FILE = path.join(ROOT, 'cardiff-air-quality.json');
const COMMUNITY_SNAPSHOT_FILE = path.join(ROOT, 'cardiff-community-snapshot.json');

const WEATHER_STATION_ID = process.env.WEATHER_STATION_ID || 'KALGRAYS4';
const NEIGHBOR_STATION_IDS = (process.env.NEIGHBOR_STATION_IDS || 'KALDORA12,KALGARDE30').split(',').map(s => s.trim()).filter(Boolean);
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || process.env.WUNDERGROUND_API_KEY || '';
const FORECAST_POINTS_URL = 'https://api.weather.gov/points/33.640,-86.870';
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=33.640&longitude=-86.870&current=us_aqi,pm2_5,ozone&timezone=America%2FChicago';
const CARDIFF_CENSUS_URL = 'https://api.census.gov/data/2023/acs/acs5?get=NAME,B01003_001E,B01002_001E,B19013_001E,B19301_001E,B25003_001E,B25003_002E,B25003_003E&for=place:12040&in=state:01';
const CARDIFF_CENSUS_MEDIAN_INCOME_FALLBACK_URL = 'https://api.census.gov/data/2019/acs/acs5?get=NAME,B19013_001E&for=place:12040&in=state:01';
const LOCAL_TIME_ZONE = 'America/Chicago';
const MAX_RAIN_SAMPLES = 2500;
const USGS_IV_BASE_URL = 'https://waterservices.usgs.gov/nwis/iv/';
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

const NEWS_QUERIES = [
  { mode: 'nearby', query: '(Cardiff OR Graysville OR Adamsville OR Minor OR Bayview) Alabama' },
  { mode: 'nearby', query: '(Gardendale OR Fultondale OR Warrior OR Kimberly OR Morris) Alabama' },
  { mode: 'nearby', query: '("Five Mile Creek" OR Graysville OR Cardiff) Alabama' },
  { mode: 'nearby', query: '(Graysville OR Adamsville OR Cardiff) Alabama police fire rescue school road' },
  { mode: 'weather', query: '(Jefferson County OR Birmingham) Alabama weather storm tornado flood outage emergency' },
  { mode: 'weather', query: '(road closure OR traffic OR detour OR train OR paving) (Jefferson County OR Graysville OR Adamsville OR Gardendale) Alabama' },
  { mode: 'weather', query: '(Jefferson County EMA OR Alabama Power OR ALDOT) Jefferson County Alabama outage shelter severe weather' },
  { mode: 'civic', query: '(Jefferson County OR Birmingham) Alabama city council county commission school board zoning sewer water' },
  { mode: 'civic', query: '(Graysville OR Adamsville OR Gardendale OR Fultondale OR Warrior) Alabama council commission mayor public works' },
  { mode: 'civic', query: '(Graysville OR Cardiff) Alabama water sewer utility public works' },
  { mode: 'civic', query: '(Jefferson County OR western Jefferson County) Alabama brush pickup debris public works utility board' },
  { mode: 'regional', query: '(north Jefferson County OR western Jefferson County) Alabama development public safety schools' },
  { mode: 'regional', query: '(Graysville OR Gardendale OR Fultondale) Alabama police fire rescue school' }
];

const SOURCE_WEIGHTS = {
  'Cardiff Desk': 14,
  'Jefferson County EMA': 10,
  'Jefferson County': 10,
  'BirminghamWatch': 8,
  'AL.com': 7,
  'WBRC': 7,
  'WBRC FOX6 News': 7,
  'WVTM 13': 6,
  'ABC 33/40': 6,
  'ABC3340': 6,
  'CBS 42': 6,
  'WBHM': 6,
  'Bham Now': 5,
  'North Jefferson Herald': 6,
  'North Jefferson Post': 5,
  'The Birmingham Times': 5,
  'Birmingham Business Journal': 5,
  'Patch': 4
};

const PLACE_WEIGHTS = [
  ['cardiff', 20], ['graysville', 15], ['adamsville', 15], ['minor', 14], ['bayview', 13],
  ['gardendale', 11], ['fultondale', 11], ['warrior', 9], ['kimberly', 8], ['morris', 7], ['five mile creek', 10],
  ['western jefferson', 10], ['north jefferson', 8], ['jefferson county', 8], ['birmingham', 3]
];

const TOPIC_WEIGHTS = [
  ['train', 10], ['closure', 9], ['detour', 8], ['road', 8], ['traffic', 7], ['paving', 8], ['weather', 8],
  ['storm', 10], ['tornado', 12], ['flood', 10], ['outage', 9], ['emergency', 8], ['school', 8], ['education', 7],
  ['council', 9], ['commission', 8], ['mayor', 7], ['clerk', 7], ['zoning', 8], ['budget', 7], ['hearing', 7],
  ['grant', 6], ['utility', 8], ['water', 9], ['sewer', 9], ['fire', 7], ['police', 7], ['public safety', 8]
];

const LOW_SIGNAL_TERMS = ['football', 'basketball', 'softball', 'baseball', 'lottery', 'horoscope', 'crossword', 'celebrity'];

const MODE_KEYWORDS = {
  nearby: ['cardiff', 'graysville', 'adamsville', 'minor', 'bayview', 'gardendale', 'fultondale', 'warrior', 'kimberly', 'morris', 'five mile creek'],
  civic: ['council', 'commission', 'mayor', 'clerk', 'school', 'education', 'budget', 'zoning', 'hearing', 'ordinance', 'board', 'police', 'fire', 'utility', 'water', 'sewer'],
  weather: ['weather', 'storm', 'tornado', 'wind', 'rain', 'flood', 'outage', 'road', 'traffic', 'closure', 'detour', 'train', 'paving'],
  regional: ['jefferson county', 'birmingham', 'north jefferson', 'western jefferson', 'development', 'public safety', 'roads', 'schools']
};

const TAG_RULES = [
  ['Nearby', ['cardiff', 'graysville', 'adamsville', 'minor', 'bayview', 'gardendale', 'fultondale', 'warrior', 'kimberly', 'morris']],
  ['Roads', ['road', 'traffic', 'closure', 'detour', 'paving', 'train']],
  ['Weather', ['weather', 'storm', 'tornado', 'rain', 'flood', 'outage', 'wind']],
  ['Civic', ['council', 'commission', 'mayor', 'clerk', 'zoning', 'budget', 'ordinance', 'hearing']],
  ['Schools', ['school', 'education', 'student', 'board']],
  ['Utilities', ['water', 'sewer', 'utility', 'outage', 'power']],
  ['Safety', ['police', 'fire', 'public safety', 'rescue', 'emergency']]
];

const NORMALIZED_TOPIC_RULES = [
  ['weather', ['weather', 'storm', 'tornado', 'wind', 'rain']],
  ['flood', ['flood', 'flash flood', 'high water', 'hydrologic']],
  ['fire', ['fire', 'wildfire', 'burn', 'smoke']],
  ['roads', ['road', 'traffic', 'closure', 'detour', 'paving', 'train']],
  ['government', ['council', 'commission', 'mayor', 'clerk', 'budget', 'ordinance', 'hearing', 'legislature']],
  ['community', ['school', 'education', 'community', 'workday', 'meeting']],
  ['creek', ['five mile creek', 'creek', 'watershed']],
  ['environment', ['dumping', 'cleanup', 'pollution', 'water quality', 'epa']]
];

const NORMALIZED_LOCATION_RULES = [
  'cardiff',
  'five_mile_creek',
  'graysville',
  'jefferson_county',
  'birmingham_metro'
];

const WATERSHED_GAUGES = [
  {
    id: '02457595',
    label: 'Republic gauge',
    name: 'Fivemile Creek near Republic, Ala',
    place: 'Republic',
    role: 'lead',
    locationTags: ['five_mile_creek', 'jefferson_county']
  }
];

function directionFromDegrees(deg) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  if (!Number.isFinite(deg)) return 'Calm';
  return dirs[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}

function weatherCondition(obs) {
  const imp = obs.imperial || {};
  const temp = Number(imp.temp);
  const humidity = Number(obs.humidity);
  const precipRate = Number(imp.precipRate || 0);
  const solar = Number(obs.solarRadiation || 0);
  const wind = Number(imp.windSpeed || 0);
  const hour = new Date().getHours();

  if (precipRate > 0.05) return 'Rain';
  if (solar > 700) return 'Sunny';
  if (solar > 350) return 'Partly cloudy';
  if (solar < 30 && hour > 7 && hour < 19) return 'Overcast';
  if (temp > 90) return 'Hot';
  if (temp > 76) return humidity > 72 ? 'Warm & humid' : 'Warm';
  if (temp > 58) return wind > 12 ? 'Breezy' : 'Mild';
  return 'Cold';
}

function summarizeWeather(current) {
  const parts = [];
  parts.push(`${current.temp}°F`);
  parts.push(current.condition.toLowerCase());
  if (current.windSpeed >= 4) parts.push(`wind around ${Math.round(current.windSpeed)} mph`);
  if (current.humidity >= 75) parts.push('humid air in the bottoms');
  if (current.precipRate > 0.05) parts.push('active precipitation');
  return `Right now around Cardiff it feels ${parts.join(', ')}.`;
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.json();
}

async function fetchText(url, init = {}) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.text();
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
  if (!samples.length || samples[samples.length - 1].obsTime !== sample.obsTime) {
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
  return Array.isArray(forecastData.properties?.periods) ? forecastData.properties.periods.slice(0, 8) : [];
}

async function fetchStationObs(stationId) {
  const url = `https://api.weather.com/v2/pws/observations/current?stationId=${encodeURIComponent(stationId)}&format=json&units=e&apiKey=${encodeURIComponent(WEATHER_API_KEY)}`;
  const data = await fetchJson(url, { cache: 'no-store' });
  return data.observations?.[0] || null;
}

async function updateWeatherFile() {
  if (!WEATHER_API_KEY) {
    console.log('Skipping weather update because WEATHER_API_KEY is not set.');
    return null;
  }

  // Try primary station first
  let obs = null;
  let precipSource = 'local-station';
  let precipSourceNote = null;

  try {
    obs = await fetchStationObs(WEATHER_STATION_ID);
    if (!obs) throw new Error('Weather feed returned no observations');
  } catch (primaryError) {
    console.log(`Primary station ${WEATHER_STATION_ID} unavailable: ${primaryError.message}. Trying neighbor stations.`);
  }

  // Fallback: use neighbor stations when primary is offline or has no precipitation data
  const primaryImp = obs ? (obs.imperial || {}) : null;
  const primaryHasPrecip = primaryImp && (primaryImp.precipTotal != null || primaryImp.precipRate != null);

  if (!obs || !primaryHasPrecip) {
    const neighborResults = await Promise.allSettled(
      NEIGHBOR_STATION_IDS.map(id => fetchStationObs(id))
    );
    const neighborObs = neighborResults
      .map((r, i) => (r.status === 'fulfilled' && r.value ? { id: NEIGHBOR_STATION_IDS[i], obs: r.value } : null))
      .filter(Boolean);

    if (neighborObs.length > 0) {
      // Use first available neighbor obs for all non-precip fields if primary is down
      if (!obs) obs = neighborObs[0].obs;

      // Average precipitation across available neighbor stations
      const precipValues = neighborObs.map(n => Number((n.obs.imperial || {}).precipTotal ?? null)).filter(v => v != null && Number.isFinite(v));
      if (precipValues.length > 0) {
        const avgPrecip = precipValues.reduce((sum, v) => sum + v, 0) / precipValues.length;
        obs = { ...obs, imperial: { ...(obs.imperial || {}), precipTotal: avgPrecip, precipRate: 0 } };
        precipSource = 'neighbor-station';
        const usedNames = neighborObs.map(n => n.id).join(' and ');
        precipSourceNote = precipValues.length === 1
          ? `Estimated from nearby station ${usedNames} — local station offline.`
          : `Estimated from nearby stations ${usedNames} — local station offline.`;
      }
    } else if (!obs) {
      throw new Error('All weather stations offline');
    }
  }

  const imp = obs.imperial || {};
  const obsDate = new Date(obs.obsTimeLocal || obs.obsTimeUtc || Date.now());
  const current = {
    temp: Math.round(Number(imp.temp)),
    feels: Math.round(Number(imp.heatIndex || imp.windChill || imp.temp)),
    humidity: Math.round(Number(obs.humidity || 0)),
    windSpeed: Number(imp.windSpeed || 0),
    windGust: Number(imp.windGust || 0),
    windDir: directionFromDegrees(Number(obs.winddir)),
    windDirDegrees: Number(obs.winddir || 0),
    precipRate: Number(imp.precipRate || 0),
    precipTotal: Number(imp.precipTotal || 0),
    pressureIn: Number((obs.imperial && obs.imperial.pressure) || imp.pressure || 0),
    uv: Number(obs.uv),
    condition: weatherCondition(obs),
    obsTime: obs.obsTimeLocal || obs.obsTimeUtc,
    solarRadiation: Number(obs.solarRadiation || 0),
    source: precipSource,
    sourceNote: precipSourceNote
  };
  current.summary = summarizeWeather(current);
  const rain = await updateRainLog(current, obsDate);

  const forecast = await fetchForecast();
  const payload = {
    updatedAt: new Date().toISOString(),
    stationId: WEATHER_STATION_ID,
    sourceUpdatedAt: current.obsTime || '',
    observations: [obs],
    current,
    rain,
    forecast
  };

  await writeJson(WEATHER_FILE, payload);
  console.log(`Updated ${path.basename(WEATHER_FILE)}`);
  return payload;
}

function decodeHtml(text = '') {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '-')
    .replace(/&#8230;/g, '...');
}

function plainText(text = '') {
  return decodeHtml(text).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanTitle(title = '') {
  return title.replace(/\s+-\s+[^-]+$/, '').replace(/\s+\|\s+[^|]+$/, '').trim();
}

function slugify(value = '') {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'item';
}

function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeSource(source = '') {
  return source.replace(/^By\s+/i, '').trim() || 'Regional source';
}

function itemKey(item) {
  const normTitle = cleanTitle(item.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const normLink = (item.link || '').replace(/^https?:\/\/(www\.)?/i, '').replace(/[#?].*$/, '').replace(/\/$/, '').trim();
  return `${normTitle}|${normLink}`;
}

function textBlob(item) {
  return [item.title, item.description, item.source, (item.tags || []).join(' '), (item.modes || []).join(' ')].join(' ').toLowerCase();
}

function containsAny(blob, terms) {
  return terms.some((term) => blob.includes(term));
}

function listScore(blob, pairs) {
  return pairs.reduce((sum, [term, val]) => sum + (blob.includes(term) ? val : 0), 0);
}

function sourceScore(source = '') {
  let score = 0;
  Object.entries(SOURCE_WEIGHTS).forEach(([name, val]) => {
    if (source.includes(name)) score = Math.max(score, val);
  });
  return score;
}

function freshnessScore(date) {
  if (!date) return 0;
  const hours = (Date.now() - date.getTime()) / 36e5;
  if (hours < 6) return 14;
  if (hours < 24) return 11;
  if (hours < 48) return 8;
  if (hours < 96) return 5;
  if (hours < 9 * 24) return 2;
  return -30;
}

function isRecentStory(date, maxDays = 5) {
  return !!date && (Date.now() - date.getTime()) <= maxDays * 864e5;
}

function penaltyScore(blob) {
  return LOW_SIGNAL_TERMS.reduce((penalty, term) => penalty + (blob.includes(term) ? -4 : 0), 0);
}

function classifyModes(item) {
  const blob = textBlob(item);
  const modes = ['all'];
  Object.keys(MODE_KEYWORDS).forEach((mode) => {
    if (containsAny(blob, MODE_KEYWORDS[mode])) modes.push(mode);
  });
  return [...new Set(modes)];
}

function buildTags(item) {
  const blob = textBlob(item);
  const tags = [];
  TAG_RULES.forEach(([label, terms]) => {
    if (tags.length < 3 && terms.some((term) => blob.includes(term))) tags.push(label);
  });
  if (!tags.length) tags.push('Local');
  return tags;
}

function buildNormalizedTopicTags(item) {
  const blob = textBlob(item);
  const tags = [];
  NORMALIZED_TOPIC_RULES.forEach(([label, terms]) => {
    if (tags.length < 4 && terms.some((term) => blob.includes(term))) tags.push(label);
  });
  if (!tags.length) tags.push('community');
  return tags;
}

function buildNormalizedLocationTags(item) {
  const blob = textBlob(item)
    .replace(/five mile creek/g, 'five_mile_creek')
    .replace(/jefferson county/g, 'jefferson_county')
    .replace(/birmingham metro/g, 'birmingham_metro');
  const tags = NORMALIZED_LOCATION_RULES.filter((label) => blob.includes(label));
  if (!tags.length) tags.push('cardiff');
  return tags;
}

function scoreItem(item) {
  const blob = textBlob(item);
  return freshnessScore(item.date) + sourceScore(item.source) + listScore(blob, PLACE_WEIGHTS) + listScore(blob, TOPIC_WEIGHTS) + penaltyScore(blob);
}

function extractTag(itemXml, tag) {
  const match = itemXml.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeHtml(match[1].trim()) : '';
}

function extractSourceFromTitle(title = '') {
  const match = title.match(/\s+-\s+([^-]+)$/);
  return match ? match[1].trim() : 'Regional source';
}

function parseRssItems(xml) {
  const itemMatches = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  return itemMatches.map((itemXml) => {
    const title = extractTag(itemXml, 'title');
    return {
      title: cleanTitle(title || 'Untitled'),
      source: normalizeSource(extractTag(itemXml, 'source') || extractSourceFromTitle(title)),
      link: extractTag(itemXml, 'link') || '#',
      description: plainText(extractTag(itemXml, 'description')),
      date: parseDate(extractTag(itemXml, 'pubDate')),
      modes: [],
      tags: [],
      priority: 0
    };
  });
}

async function fetchNewsStories() {
  const stories = [];
  const syncedAt = new Date().toISOString();

  for (const entry of NEWS_QUERIES) {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(entry.query)}&hl=en-US&gl=US&ceid=US:en`;
    try {
      const xml = await fetchText(url, { headers: { 'User-Agent': 'CardiffSiteBot/1.0' } });
      parseRssItems(xml).forEach((story) => {
        story.modes = [...new Set([entry.mode, ...classifyModes(story)])];
        story.tags = buildTags(story);
        story.priority = Math.max(0, Math.round(scoreItem(story) / 8));
        stories.push(story);
      });
    } catch (error) {
      console.warn(`News query failed for mode ${entry.mode}: ${error.message}`);
    }
  }

  const deduped = [];
  const seen = new Set();
  for (const story of stories) {
    const key = itemKey(story);
    if (!story.title || !story.link || seen.has(key)) continue;
    seen.add(key);
    deduped.push(story);
  }

  return deduped
    .filter((story) => isRecentStory(story.date, 5))
    .sort((a, b) => scoreItem(b) - scoreItem(a) || ((b.date || 0) - (a.date || 0)))
    .slice(0, 48)
    .map((story, index) => {
      const isoDate = story.date ? story.date.toISOString() : '';
      return {
        id: `news-${index + 1}-${slugify(story.source)}-${slugify(story.title)}`,
        source_type: 'media_feed',
        source_name: story.source,
        title: story.title,
        summary: story.description,
        url: story.link,
        published_at: isoDate,
        location_tags: buildNormalizedLocationTags(story),
        topic_tags: buildNormalizedTopicTags(story),
        priority_level: story.priority,
        section_target: 'news',
        module_target: 'regional_news_tracker',
        is_alert: containsAny(textBlob(story), ['alert', 'warning', 'watch', 'closure', 'outage', 'flood', 'storm']),
        is_featured: scoreItem(story) >= 26,
        image_url: '',
        raw_payload: {
          modes: story.modes,
          tags: story.tags
        },
        last_synced_at: syncedAt,
        source: story.source,
        link: story.link,
        description: story.description,
        date: isoDate,
        modes: story.modes,
        tags: story.tags,
        priority: story.priority
      };
    });
}

async function buildMonthlyRainStory(rain, now) {
  // Gate 1 — is today the last day of the month?
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const isLastDay = tomorrow.getMonth() !== now.getMonth();
  if (!isLastDay) return null;

  // Gate 2 — does the story log already contain a fingerprint for this month?
  const monthKey = localMonthKey(now); // "YYYY-MM"
  const fingerprint = `monthly-rain-${monthKey}`;
  const existing = await readJson(NEWS_FILE, { stories: [] });
  const alreadyFiled = Array.isArray(existing.stories) &&
    existing.stories.some((s) => s.id === fingerprint);
  if (alreadyFiled) return null;

  const monthToDate = rain && Number.isFinite(rain.monthToDate) ? Number(rain.monthToDate) : null;
  const monthLabel = rain && rain.monthLabel ? rain.monthLabel : localMonthLabel(now);
  const totalText = monthToDate !== null ? `${monthToDate.toFixed(2)} in` : 'totals still compiling';
  const isoDate = now.toISOString();

  return {
    id: fingerprint,
    source_type: 'local_station',
    source_name: 'Cardiff Desk',
    title: `${monthLabel} rain: ${totalText} recorded at Cardiff`,
    summary: `The Cardiff station wrapped ${monthLabel} with ${totalText} of measured precipitation.`,
    url: '',
    published_at: isoDate,
    location_tags: ['cardiff'],
    topic_tags: ['weather'],
    priority_level: 3,
    section_target: 'news',
    module_target: 'regional_news_tracker',
    is_alert: false,
    is_featured: false,
    image_url: '',
    raw_payload: { modes: ['weather'], tags: ['Weather'] },
    last_synced_at: isoDate,
    source: 'Cardiff Desk',
    link: '',
    description: `The Cardiff station wrapped ${monthLabel} with ${totalText} of measured precipitation.`,
    date: isoDate,
    modes: ['weather'],
    tags: ['Weather'],
    priority: 3
  };
}

async function updateNewsFile(weatherPayload = null) {
  const now = new Date();
  const weather = weatherPayload || await readJson(WEATHER_FILE, { rain: null });
  const [stories, monthlyRainStory] = await Promise.all([
    fetchNewsStories(),
    buildMonthlyRainStory(weather?.rain || null, now)
  ]);
  const allStories = monthlyRainStory ? [monthlyRainStory, ...stories] : stories;
  await writeJson(NEWS_FILE, {
    updatedAt: now.toISOString(),
    stories: allStories
  });
  console.log(`Updated ${path.basename(NEWS_FILE)} with ${allStories.length} stor${allStories.length === 1 ? 'y' : 'ies'}${monthlyRainStory ? ' (+ monthly rain summary)' : ''}`);
}

function findSeries(data, parameterCode) {
  return (data.value?.timeSeries || []).find((series) => {
    const code = series.variable?.variableCode?.[0]?.value || '';
    return code === parameterCode;
  });
}

function latestPoint(series) {
  const values = series?.values?.[0]?.value || [];
  const filtered = values
    .map((entry) => ({
      value: Number(entry.value),
      dateTime: entry.dateTime || ''
    }))
    .filter((entry) => Number.isFinite(entry.value) && entry.dateTime);
  return filtered.length ? filtered[filtered.length - 1] : null;
}

function historyPoints(series, maxPoints = 120) {
  const values = series?.values?.[0]?.value || [];
  const filtered = values
    .map((entry) => ({
      value: Number(entry.value),
      dateTime: entry.dateTime || ''
    }))
    .filter((entry) => Number.isFinite(entry.value) && entry.dateTime)
    .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
  if (!filtered.length) return [];
  if (filtered.length <= maxPoints) {
    return filtered.map((entry) => ({
      at: entry.dateTime,
      stage_ft: Number(entry.value.toFixed(2))
    }));
  }
  const stride = (filtered.length - 1) / (maxPoints - 1);
  const trimmed = [];
  for (let index = 0; index < maxPoints; index += 1) {
    const sourceIndex = Math.round(index * stride);
    const entry = filtered[sourceIndex];
    if (!entry) continue;
    trimmed.push({
      at: entry.dateTime,
      stage_ft: Number(entry.value.toFixed(2))
    });
  }
  return trimmed;
}

function gaugeTrend(series) {
  const values = series?.values?.[0]?.value || [];
  const filtered = values
    .map((entry) => ({
      value: Number(entry.value),
      dateTime: entry.dateTime || ''
    }))
    .filter((entry) => Number.isFinite(entry.value) && entry.dateTime);
  if (filtered.length < 2) return 'steady';
  const latest = filtered[filtered.length - 1];
  const earlier = filtered[Math.max(0, filtered.length - 7)];
  const diff = latest.value - earlier.value;
  if (diff >= 0.12) return 'rising';
  if (diff <= -0.12) return 'falling';
  return 'steady';
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

async function fetchGaugeSnapshot(gauge) {
  const params = new URLSearchParams({
    format: 'json',
    sites: gauge.id,
    parameterCd: '00060,00065',
    siteStatus: 'all',
    period: 'P30D'
  });
  const url = `${USGS_IV_BASE_URL}?${params.toString()}`;
  const data = await fetchJson(url, { headers: { Accept: 'application/json' } });
  const stageSeries = findSeries(data, '00065');
  const dischargeSeries = findSeries(data, '00060');
  const trend = gaugeTrend(stageSeries);
  const stagePoint = latestPoint(stageSeries);
  const dischargePoint = latestPoint(dischargeSeries);
  return {
    id: gauge.id,
    label: gauge.label,
    name: gauge.name,
    place: gauge.place,
    role: gauge.role,
    location_tags: gauge.locationTags,
    source_name: 'USGS',
    source_type: 'watershed_gauge',
    stage_ft: stagePoint ? Number(stagePoint.value.toFixed(2)) : null,
    discharge_cfs: dischargePoint ? Number(dischargePoint.value.toFixed(1)) : null,
    trend,
    updated_at: stagePoint?.dateTime || dischargePoint?.dateTime || '',
    stage_history: gauge.role === 'lead' ? historyPoints(stageSeries) : [],
    note: gaugeNote({
      stage_ft: stagePoint ? Number(stagePoint.value) : null,
      discharge_cfs: dischargePoint ? Number(dischargePoint.value) : null,
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
  const rainLine = rainToday >= 0.01
    ? `Cardiff has picked up ${rainToday.toFixed(2)} inches today`
    : 'Cardiff is dry today';
  const trendLine = lead.trend === 'rising'
    ? `and ${lead.label} is climbing`
    : (lead.trend === 'falling' ? `and ${lead.label} is easing down` : `and ${lead.label} is holding fairly steady`);
  return `${rainLine}, ${trendLine}. Lead stage is ${lead.stage_ft.toFixed(2)} ft with about ${lead.discharge_cfs?.toFixed(1) || '0.0'} cfs moving through the channel. Month-to-date rain is ${rainMonth.toFixed(2)} inches.`;
}

async function updateWatershedFile(weatherPayload = null) {
  const weather = weatherPayload || await readJson(WEATHER_FILE, { rain: null });
  const results = await Promise.allSettled(WATERSHED_GAUGES.map((gauge) => fetchGaugeSnapshot(gauge)));
  const gauges = results.map((result, index) => {
    if (result.status === 'fulfilled') return result.value;
    const gauge = WATERSHED_GAUGES[index];
    return {
      id: gauge.id,
      label: gauge.label,
      name: gauge.name,
      place: gauge.place,
      role: gauge.role,
      location_tags: gauge.locationTags,
      source_name: 'USGS',
      source_type: 'watershed_gauge',
      stage_ft: null,
      discharge_cfs: null,
      trend: 'steady',
      updated_at: '',
      stage_history: [],
      note: 'Gauge sync missed this cycle.'
    };
  });
  const payload = {
    updatedAt: new Date().toISOString(),
    leadGaugeId: '02457595',
    summary: summarizeWatershed(gauges, weather?.rain || null),
    rainContext: weather?.rain || null,
    gauges
  };
  await writeJson(WATERSHED_FILE, payload);
  console.log(`Updated ${path.basename(WATERSHED_FILE)}`);
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

async function main() {
  const weather = await updateWeatherFile();
  await updateWatershedFile(weather);
  await updateAirQualityFile();
  await updateCommunitySnapshotFile();
  await updateNewsFile(weather);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
