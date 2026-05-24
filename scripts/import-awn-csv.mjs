// Backfill cardiff-weather-archive.json from an Ambient Weather Network CSV export.
//
//   node scripts/import-awn-csv.mjs <path-to-AWN-export.csv>
//
// The CSV is treated as the source of truth: every complete local day it covers
// overwrites the matching archive entry and is stamped source:"awn-csv". The
// final calendar day in the file is skipped, because a mid-day export only holds
// a partial day — the live daily pull fills today/yesterday going forward.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const ARCHIVE_FILE = path.join(ROOT, 'cardiff-weather-archive.json');

function findColumn(headers, predicate) {
  const index = headers.findIndex(predicate);
  if (index === -1) throw new Error('Could not locate an expected column in the CSV header.');
  return index;
}

function aggregateRows(rows, cols) {
  const byDate = new Map();
  for (const row of rows) {
    const localDate = (row[cols.simpleDate] || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) continue;
    const temp = Number(row[cols.temp]);
    const gust = Number(row[cols.gust]);
    const rain = Number(row[cols.dailyRain]);
    const humidity = Number(row[cols.humidity]);

    let day = byDate.get(localDate);
    if (!day) {
      day = { high: -Infinity, low: Infinity, rain: 0, gust: 0, humSum: 0, humCount: 0 };
      byDate.set(localDate, day);
    }
    // The station occasionally drops a reading to exactly 0; treat 0 temp/humidity
    // as a sensor dropout rather than a real value (rain and gust of 0 are valid).
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

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: node scripts/import-awn-csv.mjs <path-to-AWN-export.csv>');
    process.exitCode = 1;
    return;
  }

  const raw = await fs.readFile(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length);
  if (lines.length < 2) throw new Error('CSV has no data rows.');

  const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim());
  const cols = {
    simpleDate: findColumn(headers, (h) => h === 'Simple Date'),
    temp: findColumn(headers, (h) => h.includes('Outdoor Temperature')),
    gust: findColumn(headers, (h) => h.includes('Wind Gust')),
    dailyRain: findColumn(headers, (h) => h.includes('Daily Rain')),
    humidity: findColumn(headers, (h) => h.startsWith('Humidity'))
  };

  const rows = lines.slice(1).map((line) => line.split(','));
  const byDate = aggregateRows(rows, cols);

  const sortedDates = [...byDate.keys()].sort();
  const partialDay = sortedDates[sortedDates.length - 1];

  const archive = JSON.parse(await fs.readFile(ARCHIVE_FILE, 'utf8').catch(() => '{"days":[]}'));
  const days = new Map((archive.days || []).map((d) => [d.date, d]));

  // Drop a stale partial-day entry unless something authoritative already owns it.
  const existingPartial = days.get(partialDay);
  if (existingPartial && existingPartial.source !== 'awn-csv' && existingPartial.source !== 'awn-history') {
    days.delete(partialDay);
  }

  let written = 0;
  for (const date of sortedDates) {
    if (date === partialDay) continue;
    const day = byDate.get(date);
    const hasTemp = Number.isFinite(day.high) && Number.isFinite(day.low) && day.high > -Infinity;
    days.set(date, {
      date,
      high: hasTemp ? Math.round(day.high) : null,
      low: hasTemp ? Math.round(day.low) : null,
      rain: Number(day.rain.toFixed(2)),
      maxGust: Math.round(day.gust),
      avgHumidity: day.humCount ? Math.round(day.humSum / day.humCount) : null,
      source: 'awn-csv'
    });
    written += 1;
  }

  const merged = [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
  const payload = { updatedAt: new Date().toISOString(), days: merged };
  await fs.writeFile(ARCHIVE_FILE, JSON.stringify(payload, null, 2) + '\n', 'utf8');

  console.log(`Imported ${written} complete day(s) from ${path.basename(csvPath)}.`);
  console.log(`Skipped partial export day: ${partialDay}.`);
  console.log(`Archive now holds ${merged.length} day(s): ${merged[0].date} -> ${merged[merged.length - 1].date}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
