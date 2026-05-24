#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────
//  Cardiff Weather Alerts
//  Pulls active NWS alerts for Jefferson County, writes ticker.json
//  with short, clean alert lines + emoji. Expired alerts auto-clear.
//
//  Usage:
//    node cardiff-alerts.js                # normal run
//    node cardiff-alerts.js --dry-run      # preview, don't write
//    node cardiff-alerts.js --verbose      # show full alert detail
//
//  Schedule with cron (every 10 minutes):
//    */10 * * * * cd /path/to/site && node cardiff-alerts.js >> logs/alerts.log 2>&1
//
//  Output: ticker.json — read by every page's ticker strip
// ─────────────────────────────────────────────────────────────────────

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// ───── Configuration ─────
const CONFIG = {
  // NWS API endpoint — active alerts for Jefferson County, AL
  // ALC073 = Jefferson County FIPS zone
  // You can add more zones separated by comma: "ALC073,ALC009"
  alertUrl: 'https://api.weather.gov/alerts/active?zone=ALC073',

  // Where to write the ticker data
  outputFile: path.join(__dirname, 'ticker.json'),

  // Default ticker message when no alerts are active
  defaultMessage: 'Cardiff news desk · nearby towns · weather and roads · schools · public decisions · daily life around western Jefferson County',

  // Request timeout (ms)
  timeoutMs: 12000,

  // User-Agent (NWS requires a contact string)
  userAgent: 'CardiffAlerts/1.0 (cardiff-alabama-community-site)'
};


// ─────────────────────────────────────────────────────────────────────
//  SPC Categorical Outlook — advance severe weather signal
//  Checks Day 1 and Day 2 outlooks for Enhanced+ risk over Cardiff.
//  SPC GeoJSON source: https://www.spc.noaa.gov/products/outlook/
//
//  Only ENH / MDT / HIGH trigger a ticker line.
//  TSTM / MRGL / SLGT are too routine for Jefferson County to surface.
// ─────────────────────────────────────────────────────────────────────

const CARDIFF_LON = -86.870;
const CARDIFF_LAT =  33.640;

const SPC_RISK_LEVELS = {
  'ENH':  { label: 'Enhanced severe storm risk', emoji: '⛈️', priority: 3 },
  'MDT':  { label: 'Moderate severe storm risk', emoji: '🌪️', priority: 4 },
  'HIGH': { label: 'High severe storm risk',     emoji: '🌪️', priority: 5 }
};

const SPC_OUTLOOKS = [
  { day: 1, when: 'today',    url: 'https://www.spc.noaa.gov/products/outlook/day1otlk_cat.lyr.geojson' },
  { day: 2, when: 'tomorrow', url: 'https://www.spc.noaa.gov/products/outlook/day2otlk_cat.lyr.geojson' }
];

// Lightweight HTTPS JSON fetch (shared by SPC + any future sources)
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.get(
      { hostname: parsed.hostname, path: parsed.pathname + parsed.search,
        headers: { 'User-Agent': CONFIG.userAgent, 'Accept': 'application/json' } },
      res => {
        if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', c => body += c);
        res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
      }
    );
    req.on('error', reject);
    req.setTimeout(CONFIG.timeoutMs, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// Ray-casting point-in-polygon for GeoJSON [lon, lat] rings
function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInGeometry(lon, lat, geometry) {
  if (!geometry) return false;
  const { type, coordinates } = geometry;
  if (type === 'Polygon')      return pointInRing(lon, lat, coordinates[0]);
  if (type === 'MultiPolygon') return coordinates.some(poly => pointInRing(lon, lat, poly[0]));
  return false;
}

async function fetchSpcOutlookLines() {
  const lines = [];

  for (const outlook of SPC_OUTLOOKS) {
    try {
      const data = await fetchJson(outlook.url);
      // Find the highest-priority risk category that covers Cardiff
      let bestRisk = null;
      let bestPriority = 0;
      for (const feature of (data.features || [])) {
        const code = (feature.properties?.LABEL || '').toUpperCase();
        const risk = SPC_RISK_LEVELS[code];
        if (!risk || risk.priority <= bestPriority) continue;
        if (pointInGeometry(CARDIFF_LON, CARDIFF_LAT, feature.geometry)) {
          bestRisk     = risk;
          bestPriority = risk.priority;
        }
      }
      if (bestRisk) {
        lines.push(`${bestRisk.emoji} ${bestRisk.label} ${outlook.when} · SPC Day ${outlook.day}`);
        console.log(`   SPC Day ${outlook.day}: ${bestRisk.label} over Cardiff`);
      } else {
        console.log(`   SPC Day ${outlook.day}: no enhanced+ risk over Cardiff`);
      }
    } catch (err) {
      console.log(`   ✗ SPC Day ${outlook.day} outlook unavailable: ${err.message}`);
    }
  }

  return lines;
}


// ─────────────────────────────────────────────────────────────────────
//  USGS gauge flood stage thresholds — Five Mile Creek near Republic
//
//  Verify / update thresholds at:
//    USGS: https://waterdata.usgs.gov/nwis/uv?site_no=02457595
//    NWS:  https://water.noaa.gov/gauges/RPBAL
//
//  Reads from cardiff-watershed.json (updated every 6 hours by the
//  watershed workflow) — no extra API call needed here.
// ─────────────────────────────────────────────────────────────────────

const GAUGE = {
  id:          '02457595',
  label:       'Five Mile Creek at Republic',
  actionStage: 10.0,  // ft — low-lying areas begin to flood
  floodStage:  14.0   // ft — NWS flood stage (verify at links above)
};

async function fetchGaugeAlertLines() {
  const lines = [];
  try {
    // Query USGS Instantaneous Values directly — gives a fresh reading every run
    // rather than relying on the 6-hour watershed file, which matters during fast-rising events
    const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${GAUGE.id}&parameterCd=00065&siteStatus=all&period=PT3H`;
    const data = await fetchJson(url);

    const timeSeries = data?.value?.timeSeries || [];
    const stageSeries = timeSeries.find(s => s?.variable?.variableCode?.[0]?.value === '00065');
    const values = (stageSeries?.values?.[0]?.value || [])
      .map(v => Number(v.value))
      .filter(v => Number.isFinite(v));

    if (!values.length) return lines;

    const latest  = values[values.length - 1];
    const earlier = values[0];
    const rising  = (values.length >= 2) && (latest - earlier) >= 0.05; // ≥ 0.05 ft rise over 3 hrs

    console.log(`   Gauge: ${GAUGE.label} — ${latest.toFixed(2)} ft, ${rising ? 'rising' : 'steady/falling'}`);

    if (latest >= GAUGE.floodStage) {
      lines.push(`🌊 ${GAUGE.label} at ${latest.toFixed(1)} ft — at or above flood stage`);
    } else if (latest >= GAUGE.actionStage && rising) {
      lines.push(`🌊 ${GAUGE.label} rising toward flood stage · ${latest.toFixed(1)} ft and climbing`);
    }

    if (lines.length) console.log(`   Gauge alert: ${lines[0]}`);
  } catch (err) {
    console.log(`   ✗ USGS gauge unavailable: ${err.message}`);
    // Fall back to the watershed file if the live query fails
    try {
      const watershedPath = path.join(__dirname, 'cardiff-watershed.json');
      const watershed = JSON.parse(fs.readFileSync(watershedPath, 'utf8'));
      const lead = (watershed.gauges || []).find(g => g.id === GAUGE.id);
      if (lead?.stage_ft != null) {
        const stage  = lead.stage_ft;
        const rising = (lead.trend || '').toLowerCase() === 'rising';
        if (stage >= GAUGE.floodStage)
          lines.push(`🌊 ${GAUGE.label} at ${stage.toFixed(1)} ft — at or above flood stage`);
        else if (stage >= GAUGE.actionStage && rising)
          lines.push(`🌊 ${GAUGE.label} rising toward flood stage · ${stage.toFixed(1)} ft and climbing`);
      }
    } catch (_) { /* watershed file missing too — skip */ }
  }
  return lines;
}


// ─────────────────────────────────────────────────────────────────────
//  Civic calendar — day-before reminders
//  Kept in sync with cardiff-season-data.js (civic lane entries).
//  Add new events here whenever cardiff-season-data.js is updated.
// ─────────────────────────────────────────────────────────────────────

const CIVIC_EVENTS = [
  {
    id:      'tornado-siren-test',
    title:   'Jefferson County tornado siren test',
    kind:    'recurring-weekday',
    nth:     1, weekday: 3, hour: 10,   // 1st Wednesday, 10 AM
    exceptMonths: [],
    emoji:   '🚨',
    short:   'Sirens test at 10:00 AM — no action needed'
  },
  {
    id:      'cardiff-city-council',
    title:   'Cardiff City Council meeting',
    kind:    'recurring-weekday',
    nth:     2, weekday: 2, hour: 18,   // 2nd Tuesday, 6 PM
    exceptMonths: [{ year: 2026, month: 4 }],
    emoji:   '🏛️',
    short:   '6:00 PM'
  },
  {
    id:      'cardiff-town-council-april-2026',
    title:   'Cardiff Town Council Meeting',
    kind:    'day',
    year: 2026, month: 4, day: 13, hour: 18,
    emoji:   '🏛️',
    short:   'Town Hall · 6:00 PM · All welcome'
  },
  {
    id:      'hhw-collection-spring-2026',
    title:   'Household Hazardous Waste Drop-Off',
    kind:    'day',
    year: 2026, month: 4, day: 25, hour: 8,
    emoji:   '♻️',
    short:   'First Baptist Gardendale · 8 AM – 11:30 AM'
  },
  {
    id:      'electronics-dropoff-may-2026',
    title:   'Electronics & Paper Shredding Drop-Off',
    kind:    'day',
    year: 2026, month: 5, day: 9, hour: 9,
    emoji:   '♻️',
    short:   'Center Point Satellite Courthouse · 9 AM – 11:30 AM'
  },
  {
    id:      'electronics-dropoff-june-2026',
    title:   'Electronics & Paper Shredding Drop-Off',
    kind:    'day',
    year: 2026, month: 6, day: 13, hour: 9,
    emoji:   '♻️',
    short:   'Valley Reclamation Facility, Bessemer · 9 AM – 11:30 AM'
  },
  {
    id:      'electronics-dropoff-sep-2026',
    title:   'Electronics & Paper Shredding Drop-Off',
    kind:    'day',
    year: 2026, month: 9, day: 12, hour: 9,
    emoji:   '♻️',
    short:   'Birmingham City Hall/Lynn Henley Park · 9 AM – 11:30 AM'
  },
  {
    id:      'hhw-collection-fall-2026',
    title:   'Household Hazardous Waste Drop-Off',
    kind:    'day',
    year: 2026, month: 10, day: 17, hour: 8,
    emoji:   '♻️',
    short:   'Camp Ketona · 8 AM – 11:30 AM'
  }
];

// nth weekday of a month (weekday: 0=Sun … 6=Sat)
function nthWeekdayOfMonth(year, month, weekday, nth) {
  const firstDay = new Date(year, month - 1, 1);
  const day = 1 + ((weekday - firstDay.getDay() + 7) % 7) + (nth - 1) * 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  return day <= daysInMonth ? day : null;
}

// Returns { year, month, day } for "tomorrow" in America/Chicago
function getTomorrowLocal(now) {
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const parts = {};
  fmt.formatToParts(tomorrow).forEach(p => {
    if (p.type !== 'literal') parts[p.type] = parseInt(p.value, 10);
  });
  return { year: parts.year, month: parts.month, day: parts.day };
}

// Build ticker lines for civic events happening tomorrow
function getTomorrowCivicLines(now) {
  const t = getTomorrowLocal(now);
  const lines = [];

  for (const ev of CIVIC_EVENTS) {
    let match = false;

    if (ev.kind === 'day') {
      if (ev.year && ev.year !== t.year) continue;
      match = ev.month === t.month && ev.day === t.day;
    } else if (ev.kind === 'recurring-weekday') {
      const excepted = (ev.exceptMonths || []).some(
        ex => ex.year === t.year && ex.month === t.month
      );
      if (!excepted) {
        const day = nthWeekdayOfMonth(t.year, t.month, ev.weekday, ev.nth);
        match = (day === t.day);
      }
    }

    if (match) {
      let line = `${ev.emoji} Tomorrow: ${ev.title}`;
      if (ev.short) line += ` · ${ev.short}`;
      lines.push(line);
    }
  }

  return lines;
}


// ─────────────────────────────────────────────────────────────────────
//  Emoji mapping — matched to NWS event names
// ─────────────────────────────────────────────────────────────────────

const ALERT_EMOJI = {
  // Tornado
  'tornado warning':           '🌪️',
  'tornado watch':             '🌪️',
  'tornado emergency':         '🌪️',

  // Severe thunderstorm
  'severe thunderstorm warning': '⛈️',
  'severe thunderstorm watch':   '⛈️',
  'severe weather statement':    '⛈️',

  // General storm / thunder
  'special weather statement':   '⚠️',
  'storm warning':               '🌧️',
  'storm watch':                 '🌧️',

  // Flood
  'flash flood warning':       '🌊',
  'flash flood watch':         '🌊',
  'flash flood statement':     '🌊',
  'flood warning':             '🌊',
  'flood watch':               '🌊',
  'flood advisory':            '🌊',
  'flood statement':           '🌊',
  'areal flood warning':       '🌊',
  'areal flood advisory':      '🌊',
  'river flood warning':       '🌊',
  'river flood watch':         '🌊',
  'river flood advisory':      '🌊',
  'river flood statement':     '🌊',
  'hydrologic outlook':        '🌊',

  // Winter
  'winter storm warning':      '❄️',
  'winter storm watch':        '❄️',
  'winter weather advisory':   '❄️',
  'ice storm warning':         '🧊',
  'blizzard warning':          '❄️',
  'freeze warning':            '🥶',
  'freeze watch':              '🥶',
  'frost advisory':            '🥶',
  'hard freeze warning':       '🥶',
  'hard freeze watch':         '🥶',
  'wind chill warning':        '🥶',
  'wind chill watch':          '🥶',
  'wind chill advisory':       '🥶',

  // Wind
  'high wind warning':         '💨',
  'high wind watch':           '💨',
  'wind advisory':             '💨',
  'lake wind advisory':        '💨',

  // Heat
  'excessive heat warning':    '🔥',
  'excessive heat watch':      '🔥',
  'heat advisory':             '🌡️',

  // Fire
  'fire weather watch':        '🔥',
  'red flag warning':          '🔥',
  'fire warning':              '🔥',

  // Fog / air
  'dense fog advisory':        '🌫️',
  'air quality alert':         '😷',
  'air stagnation advisory':   '😷',

  // Misc hazards
  'hazardous weather outlook':  '⚠️',
  'civil emergency message':    '🚨',
  'shelter in place warning':   '🚨',
  'evacuation immediate':       '🚨',
  'local area emergency':       '🚨',
  'law enforcement warning':    '🚨',
  'nuclear power plant warning':'☢️',
  'radiological hazard warning':'☢️',
  'hazardous materials warning':'☣️',
  '911 telephone outage':       '📵',
};

// Fallback emoji by keyword if exact match fails
const EMOJI_FALLBACK = [
  ['tornado',   '🌪️'],
  ['thunder',   '⛈️'],
  ['flood',     '🌊'],
  ['wind',      '💨'],
  ['fire',      '🔥'],
  ['heat',      '🌡️'],
  ['freeze',    '🥶'],
  ['frost',     '🥶'],
  ['winter',    '❄️'],
  ['ice',       '🧊'],
  ['snow',      '❄️'],
  ['fog',       '🌫️'],
  ['storm',     '🌧️'],
  ['rain',      '🌧️'],
  ['hail',      '⛈️'],
];

function getEmoji(eventName) {
  const lower = (eventName || '').toLowerCase().trim();
  if (ALERT_EMOJI[lower]) return ALERT_EMOJI[lower];
  for (const [kw, emoji] of EMOJI_FALLBACK) {
    if (lower.includes(kw)) return emoji;
  }
  return '⚠️'; // generic fallback
}


// ─────────────────────────────────────────────────────────────────────
//  Severity ranking — higher = more urgent = listed first
// ─────────────────────────────────────────────────────────────────────

const SEVERITY_RANK = {
  'extreme':  5,
  'severe':   4,
  'moderate': 3,
  'minor':    2,
  'unknown':  1
};

const URGENCY_RANK = {
  'immediate': 5,
  'expected':  4,
  'future':    3,
  'past':      1,
  'unknown':   1
};

function alertSortScore(alert) {
  const sev = SEVERITY_RANK[(alert.severity || '').toLowerCase()] || 1;
  const urg = URGENCY_RANK[(alert.urgency || '').toLowerCase()] || 1;
  return sev * 10 + urg;
}


// ─────────────────────────────────────────────────────────────────────
//  Time formatting — "Through Friday 7 PM" style
// ─────────────────────────────────────────────────────────────────────

function shortExpires(expiresStr) {
  if (!expiresStr) return '';
  const d = new Date(expiresStr);
  if (isNaN(+d)) return '';

  const now = new Date();
  const diffHours = (d - now) / 3.6e6;

  // If it expires in less than 2 hours, say "next X hours"
  if (diffHours > 0 && diffHours <= 2) {
    const mins = Math.round(diffHours * 60);
    return mins <= 60 ? `next ${mins} min` : `next ${Math.round(diffHours)} hr`;
  }

  // Otherwise format as "Friday 7 PM"
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[d.getDay()];

  // If it's today, just say the time
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  let hour = d.getHours();
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;

  if (isToday)    return `today ${hour} ${ampm}`;
  if (isTomorrow) return `tomorrow ${hour} ${ampm}`;
  return `${dayName} ${hour} ${ampm}`;
}


// ─────────────────────────────────────────────────────────────────────
//  Build the short ticker line from an NWS alert
//  Goal: "🔥 Fire Weather Watch · Through Friday 7 PM"
//  No county lists. No description blobs. Just the facts.
// ─────────────────────────────────────────────────────────────────────

function buildTickerLine(alert) {
  const emoji = getEmoji(alert.event);
  const event = (alert.event || 'Weather Alert').trim();

  // Figure out the best expiration time
  // NWS provides "expires" (the alert message expiry) and "ends" (when the hazard ends)
  // "ends" is what we want for display — it's when the actual watch/warning period is over
  const endTime = alert.ends || alert.expires || '';
  const through = shortExpires(endTime);

  let line = `${emoji} ${event}`;
  if (through) line += ` · Through ${through}`;

  return line;
}


// ─────────────────────────────────────────────────────────────────────
//  Headline extraction — some alerts have a short "headline" field
//  that's better than the event name alone. We'll use it if it's
//  short enough and not just the event name repeated.
// ─────────────────────────────────────────────────────────────────────

function extractHeadline(alert) {
  const headline = (alert.headline || '').trim();
  if (!headline) return null;

  // NWS headlines often look like:
  //   "Fire Weather Watch issued March 26 at 10:00AM CDT until March 28 at 7:00PM CDT by NWS Birmingham AL"
  // We don't want all that. Just grab the event type portion.
  // If the headline starts with the event name, we already have that.
  // If it's something different and short, use it.

  // Strip the "issued ... by NWS ..." boilerplate
  let clean = headline
    .replace(/\s+issued\s+.*/i, '')
    .replace(/\s+until\s+.*/i, '')
    .replace(/\s+by\s+NWS\s+.*/i, '')
    .replace(/\s+for\s+(portions?\s+of\s+)?[\w\s,]+County.*/i, '')
    .replace(/\s+in\s+effect\s+.*/i, '')
    .trim();

  // If it's basically just the event name, skip it
  if (clean.toLowerCase() === (alert.event || '').toLowerCase()) return null;
  if (clean.length > 60) return null; // too long for ticker

  return clean;
}


// ─────────────────────────────────────────────────────────────────────
//  Fetch from NWS API
// ─────────────────────────────────────────────────────────────────────

function fetchAlerts() {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.alertUrl);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'User-Agent': CONFIG.userAgent,
        'Accept': 'application/geo+json'
      }
    };

    const req = https.get(options, res => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`NWS API returned ${res.statusCode}`));
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve(data);
        } catch (e) {
          reject(new Error('Failed to parse NWS response'));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(CONFIG.timeoutMs, () => { req.destroy(); reject(new Error('timeout')); });
  });
}


// ─────────────────────────────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────────────────────────────

async function main() {
  const now = new Date();
  console.log(`\n⚡ Cardiff Alerts — ${now.toLocaleString()}`);

  // Preserve any manually pinned message from the existing ticker file
  let pinnedMessage = '';
  let pinnedMessageExpires = '';
  try {
    const existing = JSON.parse(fs.readFileSync(CONFIG.outputFile, 'utf8'));
    pinnedMessage = existing.pinnedMessage || '';
    pinnedMessageExpires = existing.pinnedMessageExpires || '';
    // Auto-clear if the expiry has passed
    if (pinnedMessage && pinnedMessageExpires && new Date(pinnedMessageExpires) <= now) {
      console.log('   Pinned message expired — clearing.');
      pinnedMessage = '';
      pinnedMessageExpires = '';
    }
  } catch (e) { /* file missing or unreadable — start fresh */ }

  let alerts = [];

  try {
    const data = await fetchAlerts();
    const features = (data.features || []);

    // Extract the properties from each GeoJSON feature
    alerts = features.map(f => f.properties).filter(Boolean);

    // Filter out expired alerts
    alerts = alerts.filter(a => {
      const expires = new Date(a.ends || a.expires || 0);
      return expires > now;
    });

    // Sort by severity (most urgent first)
    alerts.sort((a, b) => alertSortScore(b) - alertSortScore(a));

    // Deduplicate by event name (same watch doesn't need to appear twice)
    const seen = new Set();
    alerts = alerts.filter(a => {
      const key = (a.event || '').toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`   Active alerts: ${alerts.length}`);

  } catch (err) {
    console.error(`   ✗ Could not reach NWS: ${err.message}`);
    console.log('   Keeping existing ticker.json unchanged.');
    return;
  }

  if (VERBOSE && alerts.length) {
    console.log('\n   Alert detail:');
    alerts.forEach((a, i) => {
      console.log(`   ${i + 1}. ${a.event}`);
      console.log(`      Severity: ${a.severity} | Urgency: ${a.urgency}`);
      console.log(`      Ends: ${a.ends || a.expires || 'unknown'}`);
      console.log(`      Headline: ${(a.headline || '').slice(0, 120)}`);
    });
  }

  // Build ticker lines
  const tickerLines = alerts.map(a => {
    const headline = extractHeadline(a);
    const emoji = getEmoji(a.event);
    const endTime = a.ends || a.expires || '';
    const through = shortExpires(endTime);

    // Use headline if it's short and different, otherwise just the event name
    let text = headline || (a.event || 'Weather Alert');
    let line = `${emoji} ${text}`;
    if (through) line += ` · Through ${through}`;

    return line;
  });

  // SPC categorical outlook — advance severe weather signal
  const spcLines = await fetchSpcOutlookLines();

  // USGS gauge threshold check — live query with watershed-file fallback
  const gaugeLines = await fetchGaugeAlertLines();

  // Calendar reminders for tomorrow's civic events
  const calendarLines = getTomorrowCivicLines(now);
  if (calendarLines.length) {
    console.log(`   Calendar reminders: ${calendarLines.length}`);
    calendarLines.forEach(l => console.log(`     ${l}`));
  }

  // Combine into a single ticker string
  // Priority order: NWS active alerts → SPC outlook → gauge alerts → calendar reminders
  const allTickerLines = [...tickerLines, ...spcLines, ...gaugeLines, ...calendarLines];
  let tickerMessage;
  let hasAlerts = false;

  if (allTickerLines.length === 0) {
    tickerMessage = CONFIG.defaultMessage;
  } else {
    tickerMessage = allTickerLines.join('    ·    ');
    hasAlerts = tickerLines.length > 0 || spcLines.length > 0 || gaugeLines.length > 0;
  }

  console.log(`\n   Ticker: ${tickerMessage.slice(0, 120)}${tickerMessage.length > 120 ? '…' : ''}`);

  // Build the output object
  const output = {
    updatedAt: now.toISOString(),
    hasAlerts: hasAlerts,
    alertCount: alerts.length,
    hasSpcRisk: spcLines.length > 0,
    hasGaugeAlert: gaugeLines.length > 0,
    hasCalendarReminders: calendarLines.length > 0,
    calendarReminderCount: calendarLines.length,
    ticker: tickerMessage,
    pinnedMessage: pinnedMessage,
    pinnedMessageExpires: pinnedMessageExpires,
    // Individual alerts for pages that want more detail (like the news page bulletin)
    alerts: alerts.map(a => ({
      event: a.event || '',
      severity: a.severity || '',
      urgency: a.urgency || '',
      emoji: getEmoji(a.event),
      ends: a.ends || a.expires || '',
      endsShort: shortExpires(a.ends || a.expires || ''),
      headline: extractHeadline(a) || a.event || '',
      description: (a.description || '').split('\n')[0].slice(0, 200).trim(),
      link: a['@id'] || ''
    })),
    spcOutlook: spcLines,
    gaugeAlerts: gaugeLines,
    calendarReminders: calendarLines
  };

  if (DRY_RUN) {
    console.log('\n   DRY RUN — preview:');
    console.log(JSON.stringify(output, null, 2));
  } else {
    fs.writeFileSync(CONFIG.outputFile, JSON.stringify(output, null, 2), 'utf8');
    console.log(`   ✓ Wrote ${CONFIG.outputFile}`);
  }

  console.log('   Done.\n');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
