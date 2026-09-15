/* NOAA's monthly outlook, read at the middle of the three towns.

     node scripts/fetch/cpc-outlook.mjs              the months due, and any missing
     node scripts/fetch/cpc-outlook.mjs --backfill   every month since August 2014

   The Climate Prediction Center issues an outlook for the coming month on the
   last day of the month before. It is not a forecast of a number. It gives each
   part of the country a chance that the month finishes in the warm, middle, or
   cool third of its 1991 to 2020 months, and the same for rain, and where it has
   no lean it says equal chances. The monthly edition prints that call as NOAA's
   and scores it when the month is over. See DECISIONS.md 74.

   WHERE IT COMES FROM. ftp.cpc.ncep.noaa.gov/GIS/us_tempprcpfcst/ keeps every
   monthly update since July 2014 as a zip named for the month it was issued in:
   monthupd_temp_202608.zip is the September 2026 outlook. The early ones have no
   underscore before the date. The recent zips carry a KML as well as a shapefile
   and the old ones carry only the shapefile, so this reads the shapefile, which
   means one reader for all twelve years.

   IT READS TWO FILES OUT OF A ZIP WITHOUT DOWNLOADING THE ZIP. A zip keeps its
   table of contents at the end, so a ranged request for the last few kilobytes
   says where the .shp and the .dbf sit, and two more ranged requests fetch just
   those. That is about a megabyte a month instead of six. If the server ever
   stops honouring ranges the whole zip is fetched instead.

   THE POINT is the pair fivemile-sky.js calls the middle of the three towns. It
   is not the station's location, which stays off the site. See DECISIONS.md 58.

   One month missing from NOAA never fails the run: the file keeps every month it
   already had, and the next run tries again. */

import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_FILE = path.join(ROOT, 'fivemile-outlooks.json');
const BASE = 'https://ftp.cpc.ncep.noaa.gov/GIS/us_tempprcpfcst/';
const USER_AGENT = 'fivemile.now data refresh (fivemilec@gmail.com)';
const FIRST_MONTH = '2014-08';
const POINT = { lat: 33.640, lon: -86.870 };
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad2(n) { return String(n).padStart(2, '0'); }
function addMonth(month, n) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1);
}
function centralMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit' })
    .formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  return get('year') + '-' + get('month');
}

/* -------------------------------------------------------------------------
   Ranged reads out of a zip
   ------------------------------------------------------------------------- */
async function request(url, range) {
  const headers = { 'User-Agent': USER_AGENT };
  if (range) headers.Range = range;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (res.status === 404) return { missing: true };
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return { status: res.status, buf: Buffer.from(await res.arrayBuffer()) };
  } finally {
    clearTimeout(timer);
  }
}

/* The central directory: every entry's name, where its local header is, how
   it is compressed, and the date it was written, which is the issue date. */
function readDirectory(tail, tailStart) {
  const eocd = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd === -1) throw new Error('no end of central directory in the tail');
  const count = tail.readUInt16LE(eocd + 10);
  const dirSize = tail.readUInt32LE(eocd + 12);
  const dirOffset = tail.readUInt32LE(eocd + 16);
  const at = dirOffset - tailStart;
  if (at < 0) return { needMore: dirOffset, dirSize };
  const entries = [];
  let p = at;
  for (let i = 0; i < count; i++) {
    if (tail.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central directory entry');
    const method = tail.readUInt16LE(p + 10);
    const time = tail.readUInt16LE(p + 12);
    const date = tail.readUInt16LE(p + 14);
    const compressed = tail.readUInt32LE(p + 20);
    const nameLen = tail.readUInt16LE(p + 28);
    const extraLen = tail.readUInt16LE(p + 30);
    const commentLen = tail.readUInt16LE(p + 32);
    const offset = tail.readUInt32LE(p + 42);
    const name = tail.toString('latin1', p + 46, p + 46 + nameLen);
    const written = (1980 + (date >> 9)) + '-' + pad2((date >> 5) & 15) + '-' + pad2(date & 31);
    entries.push({ name, method, compressed, offset, written, time });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return { entries };
}

async function readZipEntries(url, wanted) {
  let tail = await request(url, 'bytes=-65536');
  if (tail.missing) return null;
  /* A 200 means the server sent the whole file and ignored the range. */
  const whole = tail.status === 200 ? tail.buf : null;
  let tailStart = whole ? 0 : null;
  if (!whole) {
    const head = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': USER_AGENT } });
    const size = Number(head.headers.get('content-length'));
    tailStart = size - tail.buf.length;
  }
  let dir = readDirectory(tail.buf, tailStart);
  if (dir.needMore != null) {
    tail = await request(url, 'bytes=' + dir.needMore + '-');
    tailStart = dir.needMore;
    dir = readDirectory(tail.buf, tailStart);
  }
  const out = {};
  for (const entry of dir.entries) {
    const ext = wanted.find((w) => entry.name.toLowerCase().endsWith(w));
    if (!ext) continue;
    let local;
    if (whole) {
      local = whole.subarray(entry.offset, entry.offset + 30 + 1024 + entry.compressed);
    } else {
      /* The local header repeats the name and may carry a different extra
         field, so its real length is read from it rather than assumed. */
      const res = await request(url, 'bytes=' + entry.offset + '-' + (entry.offset + 30 + 1024 + entry.compressed));
      local = res.buf;
    }
    if (local.readUInt32LE(0) !== 0x04034b50) throw new Error('bad local header for ' + entry.name);
    const start = 30 + local.readUInt16LE(26) + local.readUInt16LE(28);
    const data = local.subarray(start, start + entry.compressed);
    out[ext] = { name: entry.name, written: entry.written, bytes: entry.method === 8 ? zlib.inflateRawSync(data) : data };
  }
  return out;
}

/* -------------------------------------------------------------------------
   The shapefile and its table
   ------------------------------------------------------------------------- */
function readDbf(buf) {
  const records = buf.readUInt32LE(4);
  const headerLen = buf.readUInt16LE(8);
  const recordLen = buf.readUInt16LE(10);
  const fields = [];
  for (let p = 32; buf[p] !== 0x0d; p += 32) {
    fields.push({ name: buf.toString('latin1', p, p + 11).replace(/\0.*$/, '').trim(), len: buf[p + 16] });
  }
  const rows = [];
  for (let r = 0; r < records; r++) {
    let p = headerLen + r * recordLen + 1;
    const row = {};
    for (const field of fields) {
      row[field.name] = buf.toString('latin1', p, p + field.len).trim();
      p += field.len;
    }
    rows.push(row);
  }
  return rows;
}

/* Every ring of a polygon record at once, by the even-odd rule, which is what
   makes a hole in a polygon a hole without telling outer rings from inner. */
function recordHolds(buf, p, len, x, y) {
  const type = buf.readInt32LE(p);
  if (type !== 5 && type !== 15 && type !== 25) return false;
  const minX = buf.readDoubleLE(p + 4), minY = buf.readDoubleLE(p + 12);
  const maxX = buf.readDoubleLE(p + 20), maxY = buf.readDoubleLE(p + 28);
  if (x < minX || x > maxX || y < minY || y > maxY) return false;
  const numParts = buf.readInt32LE(p + 36);
  const numPoints = buf.readInt32LE(p + 40);
  const partsAt = p + 44;
  const pointsAt = partsAt + numParts * 4;
  let inside = false;
  for (let part = 0; part < numParts; part++) {
    const from = buf.readInt32LE(partsAt + part * 4);
    const to = part + 1 < numParts ? buf.readInt32LE(partsAt + (part + 1) * 4) : numPoints;
    for (let i = from, j = to - 1; i < to; j = i++) {
      const xi = buf.readDoubleLE(pointsAt + i * 16), yi = buf.readDoubleLE(pointsAt + i * 16 + 8);
      const xj = buf.readDoubleLE(pointsAt + j * 16), yj = buf.readDoubleLE(pointsAt + j * 16 + 8);
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

function recordsHolding(shp, x, y) {
  const hits = [];
  let p = 100;
  let index = 0;
  while (p + 8 <= shp.length) {
    const contentLen = shp.readInt32BE(p + 4) * 2;
    if (recordHolds(shp, p + 8, contentLen, x, y)) hits.push(index);
    p += 8 + contentLen;
    index++;
  }
  return hits;
}

/* The table says Cat and Prob. Cat is Above, Below, Normal or EC, and EC is
   equal chances, which is NOAA declining to lean. A point on no polygon at all
   is equal chances too, because the outlook only draws where it leans or where
   it says EC outright. */
function categoryOf(row) {
  const cat = String(row.Cat || row.CAT || row.cat || '').trim().toLowerCase();
  const prob = Number(row.Prob || row.PROB || row.prob);
  if (cat.startsWith('above')) return { cat: 'above', prob };
  if (cat.startsWith('below')) return { cat: 'below', prob };
  if (cat.startsWith('normal') || cat.startsWith('near')) return { cat: 'normal', prob };
  return { cat: 'equal', prob: 33 };
}

async function readOutlook(kind, target) {
  const issuedIn = addMonth(target, -1).replace('-', '');
  const names = ['monthupd_' + kind + '_' + issuedIn + '.zip', 'monthupd_' + kind + issuedIn + '.zip'];
  for (const name of names) {
    const zip = await readZipEntries(BASE + name, ['.shp', '.dbf']);
    if (!zip) continue;
    if (!zip['.shp'] || !zip['.dbf']) throw new Error(name + ' has no shapefile');
    /* lead15_Sep_temp.shp: the month in the name has to be the month asked
       for, or this is somebody else's outlook filed under the wrong date. */
    const abbr = MONTH_ABBR[Number(target.slice(5)) - 1];
    if (!new RegExp('_' + abbr + '_', 'i').test(zip['.shp'].name)) {
      throw new Error(name + ' holds ' + zip['.shp'].name + ', not ' + abbr);
    }
    const rows = readDbf(zip['.dbf'].bytes);
    const hits = recordsHolding(zip['.shp'].bytes, POINT.lon, POINT.lat);
    /* Where polygons overlap the strongest lean is the one drawn on top. */
    const calls = hits.map((i) => categoryOf(rows[i])).sort((a, b) => b.prob - a.prob);
    /* Fcst_Date is the day NOAA issued it, as YYYYMMDD. The zip's own date is
       the fallback, and is the same day on every file checked. */
    const stamp = String((rows[0] && (rows[0].Fcst_Date || rows[0].FCST_DATE)) || '');
    const issued = /^\d{8}$/.test(stamp) ? stamp.slice(0, 4) + '-' + stamp.slice(4, 6) + '-' + stamp.slice(6) : zip['.shp'].written;
    return { ...(calls[0] || { cat: 'equal', prob: 33 }), issued };
  }
  return null;
}

async function readFile() {
  try {
    return JSON.parse(await fs.readFile(OUT_FILE, 'utf8'));
  } catch {
    return null;
  }
}

export async function updateOutlooks({ backfill = false } = {}) {
  const existing = await readFile();
  const byMonth = new Map((existing && Array.isArray(existing.months) ? existing.months : []).map((m) => [m.month, m]));
  const now = centralMonth();
  const wanted = [];
  if (backfill) {
    for (let m = FIRST_MONTH; m <= addMonth(now, 1); m = addMonth(m, 1)) wanted.push(m);
  } else {
    /* This month and next. Next month's outlook turns up on the last day of
       this one, and an edition built on the 2nd needs it. */
    wanted.push(now, addMonth(now, 1));
  }
  let added = 0;
  for (const month of wanted) {
    if (byMonth.has(month)) continue;
    try {
      const temp = await readOutlook('temp', month);
      const rain = await readOutlook('prcp', month);
      if (!temp || !rain) {
        console.log(`   outlook ${month}: not issued yet.`);
        continue;
      }
      byMonth.set(month, {
        month,
        issued: temp.issued,
        temp: { cat: temp.cat, prob: temp.prob },
        rain: { cat: rain.cat, prob: rain.prob }
      });
      added++;
      console.log(`   outlook ${month}: temperature ${temp.cat} ${temp.prob}, rain ${rain.cat} ${rain.prob}.`);
    } catch (error) {
      console.error(`   outlook ${month}: ${error.message}. Keeping what the file already has.`);
    }
  }
  if (!added) return false;
  const months = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
  const next = {
    _readme: 'NOAA Climate Prediction Center monthly outlooks, read at the middle of the three towns (the point fivemile-sky.js uses). cat is above, below, normal or equal (equal chances, no lean), prob is the percent chance NOAA gives that category, issued is the day NOAA put it out. Written by scripts/fetch/cpc-outlook.mjs. See DECISIONS.md 74.',
    source: 'NOAA Climate Prediction Center, 30 day outlook, monthly update',
    updated: new Date().toISOString().slice(0, 10),
    months
  };
  await fs.writeFile(OUT_FILE, JSON.stringify(next, null, 2) + '\n', 'utf8');
  return true;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  updateOutlooks({ backfill: process.argv.includes('--backfill') }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
