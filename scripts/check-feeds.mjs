#!/usr/bin/env node
/* ===========================================================================
   scripts/check-feeds.mjs

   Pings every feed in fetch-news.mjs and reports what came back. Run this
   before the first real gather, and again any time the news page goes thin
   for no reason. Feed addresses move without notice and there is no warning
   when one does: the gatherer just quietly returns nothing.

     node scripts/check-feeds.mjs

   For each source it prints:
     ok      the feed answered and had items
     empty   the feed answered but nothing parsed, so the address is wrong
             or the outlet changed format
     fail    the request failed, with the reason

   It also counts how many items in each feed carried a picture. A feed with
   items but no pictures is not broken, it just means we will be looking up
   og:image on those articles instead.
   =========================================================================== */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const UA = 'FivemileBot/1.0 (+https://fivemile.now/; fivemilec@gmail.com)';

/* Pull the source table straight out of the gatherer so the two can never
   drift apart. A rough parse is fine here: we only need the addresses.

   Comments are stripped first and the whole table is then read as one string
   rather than line by line. Several rows are written across two lines, the
   Google News ones in particular, and reading a line at a time found the id
   on the first line and the query on the second and reported every one of
   them as having no address. */
const script = await readFile(path.join(HERE, 'fetch-news.mjs'), 'utf8');
const table = script
  .split('const SOURCES = [')[1]
  .split('\n];')[0]
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const rows = [];
for (const entry of table.match(/\{[^{}]*\}/g) || []) {
  const id = (entry.match(/id:\s*'([^']+)'/) || [])[1];
  const outlet = (entry.match(/outlet:\s*'([^']*)'/) || [])[1] || id;
  const url = (entry.match(/url:\s*'([^']*)'/) || [])[1];
  const query = (entry.match(/query:\s*'([^']*)'/) || [])[1];
  if (!id) continue;
  rows.push({
    id,
    outlet,
    url: query
      ? `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`
      : url
  });
}

const pad = (s, n) => String(s).padEnd(n).slice(0, n);
let ok = 0;
let bad = 0;

console.log(`Checking ${rows.length} feeds\n`);

for (const row of rows) {
  if (!row.url) {
    console.log(`${pad(row.id, 18)} ${pad('skip', 7)} no address set`);
    continue;
  }
  try {
    const res = await fetch(row.url, {
      headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml, */*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) {
      bad += 1;
      console.log(`${pad(row.id, 18)} ${pad('fail', 7)} HTTP ${res.status}`);
      continue;
    }
    const xml = await res.text();
    const items = (xml.match(/<item\b/gi) || []).length || (xml.match(/<entry\b/gi) || []).length;
    const shots = (xml.match(/<media:content\b|<media:thumbnail\b|<enclosure[^>]+image\//gi) || []).length;
    const newest = (xml.match(/<(?:pubDate|published|updated)>([^<]+)</i) || [])[1] || '';
    if (!items) {
      bad += 1;
      console.log(`${pad(row.id, 18)} ${pad('empty', 7)} answered but nothing parsed`);
      continue;
    }
    ok += 1;
    const age = newest ? Math.round((Date.now() - new Date(newest).getTime()) / 3600000) : null;
    console.log(
      `${pad(row.id, 18)} ${pad('ok', 7)} ${pad(`${items} items`, 11)}` +
      `${pad(`${shots} with photo`, 16)}${age === null ? '' : `newest ${age}h old`}`
    );
  } catch (error) {
    bad += 1;
    console.log(`${pad(row.id, 18)} ${pad('fail', 7)} ${error.message}`);
  }
}

console.log(`\n${ok} working, ${bad} to fix`);
if (bad) {
  console.log('For each failure: open the outlet\'s homepage, view source, and search for');
  console.log('"application/rss" or "feed". Paste the working address into SOURCES.');
}
