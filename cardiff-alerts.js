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
  try {
    const existing = JSON.parse(fs.readFileSync(CONFIG.outputFile, 'utf8'));
    pinnedMessage = existing.pinnedMessage || '';
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

  // Combine into a single ticker string
  // Multiple alerts get joined with a separator
  let tickerMessage;
  let hasAlerts = false;

  if (tickerLines.length === 0) {
    tickerMessage = CONFIG.defaultMessage;
    hasAlerts = false;
  } else {
    tickerMessage = tickerLines.join('    ·    ');
    hasAlerts = true;
  }

  console.log(`\n   Ticker: ${tickerMessage.slice(0, 120)}${tickerMessage.length > 120 ? '…' : ''}`);

  // Build the output object
  const output = {
    updatedAt: now.toISOString(),
    hasAlerts: hasAlerts,
    alertCount: alerts.length,
    ticker: tickerMessage,
    pinnedMessage: pinnedMessage,
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
    }))
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
