/* Says so when something the site shows has stopped updating.

   Every fetcher keeps the last good file when its source is down, so a bad day
   at USGS is not a bad day for the site. The cost of that is silence: the run
   still succeeds, nobody is told, and the page goes on showing a reading that
   gets older by the hour. This reads the time each file says its data is from,
   not when it was committed, and when one is past its limit it opens an issue
   on the repository, which GitHub emails to whoever watches it.

   One issue at a time, kept current. Its body is rewritten on every run, which
   sends nothing. A comment goes on it only when something new goes quiet, and
   when everything is current again it says so and closes itself.

   The limits come from what normal has looked like, not from what the
   schedules ask for. GitHub runs the ten minute job every three to seven hours,
   so a reading gets twelve before it counts. The longest gap between two news
   stories since August was 37 hours, so the newest story gets four days.
   ECHO is left out on purpose: it rewrites its file only when EPA's data moves,
   so a quiet month and a dead feed look the same from here.

   A new feed gets a line in CHECKS. See DECISIONS.md 79.

   node scripts/check-freshness.mjs          prints what it found, touches nothing
   node scripts/check-freshness.mjs --test   with a token, opens a test issue */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY;
const TITLE = 'Something on the site has stopped updating';
const ZONE = 'America/Chicago';
const HOUR = 36e5;
const DAY = 24 * HOUR;

const LIVE = 'Refresh Live Data';
const NEWS = 'Refresh News';
const DAILY = 'Refresh Site Data';

const newest = (list, key) => (list || []).map((item) => item && item[key]).filter(Boolean).sort().pop();
const lastDay = (index) => newest(index.years, 'last');

/* kind 'time' is an instant with a limit in hours. kind 'day' is a date with
   a limit in whole days, counted on the calendar here rather than in UTC. */
const CHECKS = [
  {
    key: 'station', label: 'Our station', job: LIVE, file: 'fivemile-weather.json',
    kind: 'time', limit: 12 * HOUR,
    read: (j) => (j.current && j.current.obsTime) || j.lastUpdated
  },
  {
    key: 'gauge', label: 'The creek gauge', job: LIVE, file: 'fivemile-watershed.json',
    kind: 'time', limit: 12 * HOUR,
    read: (j) => {
      const lead = (j.gauges || []).find((g) => g.id === j.leadGaugeId);
      return lead && lead.updated_at;
    }
  },
  {
    key: 'news-run', label: 'The news', job: NEWS, file: 'fivemile-news-live.json',
    kind: 'time', limit: 36 * HOUR,
    read: (j) => j.updatedAt
  },
  {
    key: 'news-stories', label: 'The newest story', job: NEWS, file: 'fivemile-news-live.json',
    kind: 'time', limit: 4 * DAY,
    read: (j) => newest(j.stories, 'published_at')
  },
  {
    key: 'forecast', label: 'The forecast', job: DAILY, file: 'fivemile-watershed-weather.json',
    kind: 'time', limit: 36 * HOUR,
    read: (j) => j.updatedAt
  },
  {
    key: 'weather-log', label: 'The weather log', job: DAILY, file: 'fivemile-weather-archive/index.json',
    kind: 'day', limit: 3, read: lastDay
  },
  {
    key: 'creek-log', label: 'The creek log', job: DAILY, file: 'fivemile-creek-archive/index.json',
    kind: 'day', limit: 4, read: lastDay
  },
  {
    key: 'airport', label: 'The airport record', job: DAILY, file: 'fivemile-airport-archive/index.json',
    kind: 'day', limit: 7, read: lastDay
  },
  {
    key: 'sheet-announcements', label: 'Announcements from the Google Sheet', job: DAILY, file: 'announcements.json',
    kind: 'day', limit: 3, read: (j) => j.updated
  },
  {
    key: 'sheet-notices', label: 'Notices from the Google Sheet', job: DAILY, file: 'fivemile-hollers.json',
    kind: 'day', limit: 3, read: (j) => j.updated
  }
];

function localDay(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function when(value) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  }).format(new Date(value));
}

function ago(ms) {
  return ms < 2 * DAY ? `${Math.round(ms / HOUR)} hours` : `${Math.round(ms / DAY)} days`;
}

async function runCheck(check, now) {
  let json;
  try {
    json = JSON.parse(await fs.readFile(path.join(ROOT, check.file), 'utf8'));
  } catch (error) {
    return `${check.file} could not be read (${error.message}).`;
  }
  const value = check.read(json);
  if (check.kind === 'time') {
    const at = Date.parse(value);
    if (!Number.isFinite(at)) return `${check.file} carries no time to go by.`;
    const age = now - at;
    return age > check.limit ? `last one ${when(at)}, ${ago(age)} ago. Allowed ${ago(check.limit)}.` : null;
  }
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(value || ''))) return `${check.file} carries no date to go by.`;
  const days = Math.round((Date.parse(localDay(now)) - Date.parse(String(value).slice(0, 10))) / DAY);
  return days > check.limit ? `last day on file is ${String(value).slice(0, 10)}, ${days} days ago. Allowed ${check.limit}.` : null;
}

/* The monthly edition falls due on the 2nd and is put out by the 5th at the
   latest, so from the 6th last month's edition should be on file. */
async function editionCheck(now) {
  const today = localDay(now);
  if (Number(today.slice(8, 10)) < 6) return null;
  const [year, month] = today.split('-').map(Number);
  const due = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
  try {
    const index = JSON.parse(await fs.readFile(path.join(ROOT, 'fivemile-editions/index.json'), 'utf8'));
    if ((index.editions || []).some((e) => e.month === due)) return null;
    return `the edition for ${due} is not out, and it was due by the 5th.`;
  } catch (error) {
    return `fivemile-editions/index.json could not be read (${error.message}).`;
  }
}

async function findings(now) {
  const found = [];
  for (const check of CHECKS) {
    const detail = await runCheck(check, now);
    if (detail) found.push({ key: check.key, label: check.label, job: check.job, detail });
  }
  const edition = await editionCheck(now);
  if (edition) found.push({ key: 'edition', label: 'The monthly edition', job: DAILY, detail: edition });
  return found;
}

function bodyFor(stale, now) {
  return [
    'The site is still up and still showing the last good copy of each of these. They are just getting older.',
    '',
    ...stale.map((s) => `- **${s.label}**: ${s.detail} Written by the ${s.job} workflow.`),
    '',
    `Checked ${when(now)} Central. The Actions tab has each workflow's runs, and the log of the most recent one says what the source answered when it failed.`,
    '',
    'This issue keeps itself current and closes when everything is updating again.',
    '',
    `<!-- stale: ${stale.map((s) => s.key).join(',')} -->`
  ].join('\n');
}

async function github(method, route, body) {
  const response = await fetch(`https://api.github.com/repos/${REPO}${route}`, {
    method,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${TOKEN}`,
      'x-github-api-version': '2022-11-28',
      ...(body ? { 'content-type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) throw new Error(`${method} ${route}: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

async function main() {
  const now = Date.now();
  const test = process.argv.includes('--test');
  const stale = await findings(now);

  console.log(stale.length ? `${stale.length} stale:` : 'Everything is current.');
  stale.forEach((s) => console.log(`  ${s.label}: ${s.detail}`));

  if (!TOKEN || !REPO) {
    console.log('No GITHUB_TOKEN or GITHUB_REPOSITORY, so no issue was touched.');
    return;
  }

  if (test) {
    const issue = await github('POST', '/issues', {
      title: 'Test: the data alert reaches you',
      body: `If this arrived by email, the alert works. Nothing is wrong. Close this issue.\n\nSent ${when(now)} Central.`
    });
    console.log(`Opened test issue #${issue.number}.`);
    return;
  }

  const open = (await github('GET', '/issues?state=open&per_page=100'))
    .find((issue) => !issue.pull_request && issue.title === TITLE && issue.user && issue.user.login === 'github-actions[bot]');

  if (!stale.length) {
    if (open) {
      await github('POST', `/issues/${open.number}/comments`, { body: `Everything is updating again as of ${when(now)} Central.` });
      await github('PATCH', `/issues/${open.number}`, { state: 'closed', state_reason: 'completed' });
      console.log(`Closed #${open.number}.`);
    }
    return;
  }

  const body = bodyFor(stale, now);
  if (!open) {
    const issue = await github('POST', '/issues', { title: TITLE, body });
    console.log(`Opened #${issue.number}.`);
    return;
  }

  const before = new Set(((open.body || '').match(/<!-- stale: ([^>]*) -->/) || [, ''])[1].split(',').filter(Boolean));
  const fresh = stale.filter((s) => !before.has(s.key));
  await github('PATCH', `/issues/${open.number}`, { body });
  if (fresh.length) {
    await github('POST', `/issues/${open.number}/comments`, {
      body: ['Also stopped updating:', '', ...fresh.map((s) => `- **${s.label}**: ${s.detail}`)].join('\n')
    });
  }
  console.log(`Updated #${open.number}${fresh.length ? ` and noted ${fresh.length} more` : ''}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
