import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const WEATHER_FILE = path.join(ROOT, 'cardiff-weather.json');
const NEWS_FILE = path.join(ROOT, 'cardiff-news-live.json');

const WEATHER_STATION_ID = process.env.WEATHER_STATION_ID || 'KALGRAYS4';
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || process.env.WUNDERGROUND_API_KEY || '';
const FORECAST_POINTS_URL = 'https://api.weather.gov/points/33.640,-86.870';

const NEWS_QUERIES = [
  { mode: 'nearby', query: '(Cardiff OR Brookside OR Graysville OR Adamsville OR Minor OR Bayview) Alabama local news' },
  { mode: 'nearby', query: '(Gardendale OR Fultondale OR Warrior OR Kimberly OR Morris) Alabama local news' },
  { mode: 'weather', query: '(Jefferson County OR Birmingham) Alabama weather storm tornado flood outage emergency' },
  { mode: 'weather', query: '(road closure OR traffic OR detour OR train OR paving) (Jefferson County OR Brookside OR Graysville OR Adamsville OR Gardendale) Alabama' },
  { mode: 'civic', query: '(Jefferson County OR Birmingham) Alabama city council county commission school board zoning sewer water' },
  { mode: 'regional', query: '(north Jefferson County OR western Jefferson County) Alabama development public safety schools' }
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
  'Bham Now': 5
};

const PLACE_WEIGHTS = [
  ['cardiff', 20], ['brookside', 16], ['graysville', 15], ['adamsville', 15], ['minor', 14], ['bayview', 13],
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
  nearby: ['cardiff', 'brookside', 'graysville', 'adamsville', 'minor', 'bayview', 'gardendale', 'fultondale', 'warrior', 'kimberly', 'morris', 'five mile creek'],
  civic: ['council', 'commission', 'mayor', 'clerk', 'school', 'education', 'budget', 'zoning', 'hearing', 'ordinance', 'board', 'police', 'fire', 'utility', 'water', 'sewer'],
  weather: ['weather', 'storm', 'tornado', 'wind', 'rain', 'flood', 'outage', 'road', 'traffic', 'closure', 'detour', 'train', 'paving'],
  regional: ['jefferson county', 'birmingham', 'north jefferson', 'western jefferson', 'development', 'public safety', 'roads', 'schools']
};

const TAG_RULES = [
  ['Nearby', ['cardiff', 'brookside', 'graysville', 'adamsville', 'minor', 'bayview', 'gardendale', 'fultondale', 'warrior', 'kimberly', 'morris']],
  ['Roads', ['road', 'traffic', 'closure', 'detour', 'paving', 'train']],
  ['Weather', ['weather', 'storm', 'tornado', 'rain', 'flood', 'outage', 'wind']],
  ['Civic', ['council', 'commission', 'mayor', 'clerk', 'zoning', 'budget', 'ordinance', 'hearing']],
  ['Schools', ['school', 'education', 'student', 'board']],
  ['Utilities', ['water', 'sewer', 'utility', 'outage', 'power']],
  ['Safety', ['police', 'fire', 'public safety', 'rescue', 'emergency']]
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

async function fetchForecast() {
  const pointsData = await fetchJson(FORECAST_POINTS_URL, { headers: { Accept: 'application/geo+json' } });
  const forecastUrl = pointsData.properties?.forecast;
  if (!forecastUrl) throw new Error('Missing forecast URL from weather.gov points response');
  const forecastData = await fetchJson(forecastUrl, { headers: { Accept: 'application/geo+json' } });
  return Array.isArray(forecastData.properties?.periods) ? forecastData.properties.periods.slice(0, 8) : [];
}

async function updateWeatherFile() {
  if (!WEATHER_API_KEY) {
    console.log('Skipping weather update because WEATHER_API_KEY is not set.');
    return;
  }

  const url = `https://api.weather.com/v2/pws/observations/current?stationId=${encodeURIComponent(WEATHER_STATION_ID)}&format=json&units=e&apiKey=${encodeURIComponent(WEATHER_API_KEY)}`;
  const data = await fetchJson(url, { cache: 'no-store' });
  const obs = data.observations?.[0];
  if (!obs) throw new Error('Weather feed returned no observations');

  const imp = obs.imperial || {};
  const current = {
    temp: Math.round(Number(imp.temp)),
    feels: Math.round(Number(imp.heatIndex || imp.windChill || imp.temp)),
    humidity: Math.round(Number(obs.humidity || 0)),
    windSpeed: Number(imp.windSpeed || 0),
    windDir: directionFromDegrees(Number(obs.winddir)),
    windDirDegrees: Number(obs.winddir || 0),
    precipRate: Number(imp.precipRate || 0),
    precipTotal: Number(imp.precipTotal || 0),
    pressureIn: Number((obs.imperial && obs.imperial.pressure) || imp.pressure || 0),
    uv: Number(obs.uv),
    condition: weatherCondition(obs),
    obsTime: obs.obsTimeLocal || obs.obsTimeUtc,
    solarRadiation: Number(obs.solarRadiation || 0)
  };
  current.summary = summarizeWeather(current);

  const forecast = await fetchForecast();
  const payload = {
    updatedAt: new Date().toISOString(),
    stationId: WEATHER_STATION_ID,
    sourceUpdatedAt: current.obsTime || '',
    observations: [obs],
    current,
    forecast
  };

  await writeJson(WEATHER_FILE, payload);
  console.log(`Updated ${path.basename(WEATHER_FILE)}`);
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
    .filter((story) => story.date && freshnessScore(story.date) > -20)
    .sort((a, b) => scoreItem(b) - scoreItem(a) || ((b.date || 0) - (a.date || 0)))
    .slice(0, 24)
    .map((story) => ({
      title: story.title,
      source: story.source,
      link: story.link,
      description: story.description,
      date: story.date ? story.date.toISOString() : '',
      modes: story.modes,
      tags: story.tags,
      priority: story.priority
    }));
}

async function updateNewsFile() {
  const stories = await fetchNewsStories();
  if (!stories.length) {
    console.log('Skipping news write because no fresh stories were gathered.');
    return;
  }

  await writeJson(NEWS_FILE, {
    updatedAt: new Date().toISOString(),
    stories
  });
  console.log(`Updated ${path.basename(NEWS_FILE)}`);
}

async function main() {
  await updateWeatherFile();
  await updateNewsFile();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
