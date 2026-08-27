/* Append only archives, stored one file per year.

   These files only ever grow. A day that closed in March is never going to
   change again, but while the whole archive lived in one file, git stored a
   fresh copy of every closed day every time a new one was added. The weather
   archive is 41 KB and gains 176 bytes a day, so almost all of that write was
   history repeating itself.

   Split by year, only the current year is rewritten. Every year before it is
   written once and then sits still forever.

   Two rules make that actually true.

   Nothing in here carries a timestamp, not the year files and not the index.
   A stamp would mean every file looked changed on every run and the split
   would buy nothing at all. Every field written here is derived from the
   readings themselves. Freshness comes from the live files, which do carry a
   stamp and are the ones a reader is actually looking at.

   And a file is only written when its content differs from what is already on
   disk, compared after serialising, so a quiet run touches nothing.

   index.json exists for the same reason it does in news-archive: GitHub Pages
   cannot list a directory, so without it the page would have to guess at
   filenames. See DECISIONS.md 36. */

import fs from 'node:fs/promises';
import path from 'node:path';

function yearOf(day) {
  return String(day && day.date ? day.date : '').slice(0, 4);
}

function serialize(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

/* The merged shape the callers already expect: whatever metadata the index
   carries, plus every day from every year sorted oldest first. */
export async function readYearArchive(dirPath, fallback = { days: [] }) {
  let index;
  try {
    index = JSON.parse(await fs.readFile(path.join(dirPath, 'index.json'), 'utf8'));
  } catch (error) {
    return fallback;
  }
  const years = Array.isArray(index.years) ? index.years : [];
  const days = [];
  for (const entry of years) {
    const year = entry && entry.year;
    if (!year) continue;
    try {
      const text = await fs.readFile(path.join(dirPath, `${year}.json`), 'utf8');
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed.days)) days.push(...parsed.days);
    } catch (error) {
      /* A year file that will not read is a gap, not a reason to lose the rest
         of the record. The run that writes next will put it back. */
      console.warn(`Archive year ${year} unreadable in ${path.basename(dirPath)}, skipping.`);
    }
  }
  days.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const { years: _drop, total: _total, ...meta } = index;
  return { ...meta, days };
}

/* Takes the same payload the single file version took: { updatedAt, days, and
   whatever else }. Returns the years it actually wrote, so a caller can say so.
   `days` is expected sorted; it is sorted again here because callers that merge
   a map are one refactor away from not being. */
export async function writeYearArchive(dirPath, payload) {
  const days = [...(payload.days || [])]
    .filter((day) => yearOf(day).length === 4)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  await fs.mkdir(dirPath, { recursive: true });

  const byYear = new Map();
  for (const day of days) {
    const year = yearOf(day);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(day);
  }

  const written = [];
  for (const [year, yearDays] of [...byYear.entries()].sort()) {
    const file = path.join(dirPath, `${year}.json`);
    const next = serialize({ year: Number(year), days: yearDays });
    const current = await fs.readFile(file, 'utf8').catch(() => null);
    if (current === next) continue;
    await fs.writeFile(file, next, 'utf8');
    written.push(year);
  }

  /* updatedAt is deliberately dropped here as well as from the year files.
     Nothing on the site reads it off these archives, and keeping it would mean
     index.json changed on every run whether or not a single reading did, which
     is the exact churn this split exists to stop. Every field left in the index
     is derived from the content, so a quiet day touches nothing in here at all.
     The freshness a reader sees comes from the live files, which do carry a
     stamp. */
  const { days: _days, updatedAt: _stamp, ...meta } = payload;
  const index = {
    ...meta,
    total: days.length,
    years: [...byYear.entries()].sort().map(([year, yearDays]) => ({
      year: Number(year),
      days: yearDays.length,
      first: yearDays[0].date,
      last: yearDays[yearDays.length - 1].date
    }))
  };
  await fs.writeFile(path.join(dirPath, 'index.json'), serialize(index), 'utf8');

  return { written, total: days.length, years: byYear.size };
}
