/* The Google Sheet as the writing surface.

   Joe types a row on his phone, sets status to approved, and the next
   scheduled run picks it up. No admin login, no database, no deploy.

   Two things about this source shape the file.

   The published CSV endpoint is flaky. Watched on 2026-08-27 it answered 200,
   then 401, then 200 again inside three minutes on a tab that was definitely
   published. So a bad response is never allowed to reach the site: the target
   file is left exactly as it was and the run says so. An empty board because
   Google had a bad second is worse than yesterday's board.

   And the published CSV carries every row, drafts included. The status filter
   decides what reaches the site, not what reaches the internet. Nothing typed
   into that sheet is private, which is written down in the sheet's own readme
   and in fivemile-cms-sources.json.

   Only status exactly approved is published, compared case insensitively after
   trimming so a capital A typed on a phone does not silently drop a notice.
   Anything else, including blank, stays off. That is the whole editorial
   workflow: a column. */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsvRows } from '../lib/csv.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONFIG_FILE = path.join(ROOT, 'fivemile-cms-sources.json');
const USER_AGENT = 'fivemile.now data refresh (fivemilec@gmail.com)';

/* Fields that are yes or no in the spreadsheet and boolean in the JSON. A
   person types true, TRUE, yes, or x, and any of them should mean the same. */
const BOOLEAN_FIELDS = new Set(['paid']);
const TRUTHY = new Set(['true', 'yes', 'y', 'x', '1']);

function csvUrl(token, gid) {
  return `https://docs.google.com/spreadsheets/d/e/${token}/pub?gid=${gid}&single=true&output=csv`;
}

async function fetchCsv(url, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'text/csv', 'User-Agent': USER_AGENT }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    /* A sign-in page is HTML with a 200 on it, which would otherwise parse as
       one very strange row. */
    if (text.trimStart().startsWith('<')) throw new Error('got HTML, not CSV, so the tab is probably not published');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

function cleanRecord(record) {
  const out = {};
  for (const [key, value] of Object.entries(record)) {
    if (key === '__row' || key === 'status') continue;
    if (value === '') continue;
    out[key] = BOOLEAN_FIELDS.has(key) ? TRUTHY.has(value.toLowerCase()) : value;
  }
  return out;
}

function approvedRows(records, label) {
  const kept = [];
  for (const record of records) {
    const status = String(record.status || '').trim().toLowerCase();
    if (status !== 'approved') continue;
    if (!String(record.id || '').trim()) {
      console.warn(`   ${label}: row ${record.__row} is approved but has no id, skipping.`);
      continue;
    }
    kept.push(cleanRecord(record));
  }
  return kept;
}

/* The target files carry their own schema notes, written by hand, which the
   sheet has no column for. Only the rows are replaced. */
async function mergeIntoTarget(targetPath, key, rows) {
  let existing = {};
  try {
    existing = JSON.parse(await fs.readFile(targetPath, 'utf8'));
  } catch (error) {
    console.warn(`   ${path.basename(targetPath)} did not exist or would not parse, writing a fresh one.`);
  }
  const next = { ...existing, updated: new Date().toISOString().slice(0, 10), [key]: rows };
  const text = JSON.stringify(next, null, 2) + '\n';
  const current = await fs.readFile(targetPath, 'utf8').catch(() => null);
  if (current === text) return false;
  await fs.writeFile(targetPath, text, 'utf8');
  return true;
}

export async function refreshCms() {
  let config;
  try {
    config = JSON.parse(await fs.readFile(CONFIG_FILE, 'utf8'));
  } catch (error) {
    console.error('CMS sources file missing or unreadable, skipping the sheet entirely.');
    return;
  }

  for (const [label, tab] of Object.entries(config.tabs || {})) {
    const targetPath = path.join(ROOT, tab.target);
    try {
      const text = await fetchCsv(csvUrl(config.token, tab.gid));
      const { records } = parseCsvRows(text);
      const rows = approvedRows(records, label);
      const wrote = await mergeIntoTarget(targetPath, tab.key, rows);
      console.log(`   ${label}: ${records.length} row(s) read, ${rows.length} approved, ${wrote ? 'written' : 'unchanged'}.`);
    } catch (error) {
      /* The last good file stays exactly where it is. */
      console.error(`   ${label}: sheet unavailable (${error.message}). Keeping the file already on disk.`);
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  refreshCms().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
