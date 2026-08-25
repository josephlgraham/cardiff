// Pulls candidate photographs for the garden desk's seed packets from
// Wikimedia Commons.
//
// The field guide gets its photographs from iNaturalist, Alabama first, and
// that is the right source for a living thing somebody walked up on. It is the
// wrong source for a row of okra. iNaturalist records wild observations, so a
// search for the garden vegetables comes back nearly empty in this state, and
// what it does return is often the roadside weed rather than the crop: prickly
// lettuce for lettuce, wild carrot for carrots. Commons carries the United
// States Department of Agriculture photograph libraries, which are public
// domain and are pictures of the crop in a field or a bed.
//
//   node scripts/fetch-garden-photos.mjs             every crop
//   node scripts/fetch-garden-photos.mjs okra corn   only these
//
// Candidates land in _src/garden-candidates/, which is outside git, one
// numbered file per crop plus a contact sheet to choose from. Nothing here
// writes into the site. Choosing among the candidates and producing the served
// WebP is scripts/build-garden-photos.mjs.

import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT  = path.join(ROOT, '_src', 'garden-candidates');
const META = path.join(OUT, 'candidates.json');

const WANT = 4;                  // candidates to keep per crop
const UA = 'FIVEMILE garden photographs (https://fivemile.now, fivemilec@gmail.com)';

// What Commons calls the licences this site will serve. Anything else is
// dropped rather than argued with.
const OK_LICENCE = /^(cc0|public domain|cc by(-sa)? [234]\.0)/i;

// Nineteenth century seed catalogues are all over Commons and they answer
// every one of these searches better than any photograph does, because the
// page is nothing but the crop's name set in type. They are engravings, and a
// packet window holding an engraving beside a photograph reads as a mistake.
// The titles vary too much to filter on, but the scans nearly all arrive
// through the Biodiversity Heritage Library and say so in the credit.
const CATALOGUE = /catalogu?e|almanac|price list|\((1[6-9]\d\d)\)/i;
const SCANNED = /biodivlibrary|biodiversity heritage|internet archive|seed trade catalog|nursery and seed/i;

// The crop each packet wants a picture of. Some planting guide entries share
// one: fall tomatoes and tomatoes are the same plant, and the fall greens
// entry is the same bed as collards in a later month.
const CROPS = {
  tomatoes:     ['USDA tomatoes garden vine ripe', 'Solanum lycopersicum plant fruit garden'],
  peppers:      ['Capsicum annuum plant peppers growing garden', 'bell pepper fruit plant bed'],
  okra:         ['okra pods plant field', 'Abelmoschus esculentus pods plant'],
  collards:     ['USDA collard greens field', 'collard greens plants garden bed'],
  turnips:      ['turnips vegetable roots bunch', 'Brassica rapa rapa turnip plant'],
  brassica:     ['Brassica oleracea broccoli head plant field', 'cabbage plants growing garden row'],
  beans:        ['Phaseolus vulgaris bean pods plant garden', 'green bean plants growing bed'],
  southernpeas: ['cowpea Vigna unguiculata pods field', 'USDA southern peas field'],
  englishpeas:  ['Pisum sativum pea pods plant garden', 'garden peas vine pods'],
  corn:         ['USDA sweet corn field ears', 'Zea mays sweet corn garden'],
  potatoes:     ['Solanum tuberosum potato plants field flowering', 'potato tubers freshly dug soil'],
  sweetpotato:  ['sweet potato slips planting', 'USDA sweet potato harvest field'],
  garlic:       ['Allium sativum garlic bulbs', 'garlic bulbs cloves harvest'],
  lettuce:      ['Lactuca sativa lettuce plants bed garden', 'lettuce heads row vegetable garden'],
  spinach:      ['Spinacia oleracea spinach plants leaves', 'spinach bed rows garden'],
  carrots:      ['Daucus carota sativus carrots roots bunch', 'carrots growing bed garden row'],
  radishes:     ['USDA radishes harvest', 'Raphanus sativus radish garden harvest'],
  seedlings:    ['vegetable seedlings tray transplants greenhouse', 'tomato seedlings pots young plants'],
  covercrop:    ['crimson clover cover crop field', 'USDA cover crop winter rye field']
};

const strip = h => String(h || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (r.ok) return await r.json();
      if (r.status === 429) { await sleep(5000 * attempt); continue; }
      return null;
    } catch { await sleep(1500 * attempt); }
  }
  return null;
}

async function search(query, limit) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search'
    + '&gsrsearch=' + encodeURIComponent('filetype:bitmap ' + query)
    + '&gsrnamespace=6&gsrlimit=' + limit
    + '&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1200';
  const pages = (await api(url))?.query?.pages || {};
  return Object.values(pages).map(page => {
    const ii = page.imageinfo?.[0] || {};
    const m = ii.extmetadata || {};
    return {
      pageid: page.pageid,
      title: page.title,
      url: ii.thumburl || ii.url,
      width: ii.width,
      height: ii.height,
      licence: strip(m.LicenseShortName?.value),
      author: strip(m.Artist?.value),
      credit: strip(m.Credit?.value),
      description: strip(m.ImageDescription?.value).slice(0, 200),
      date: (strip(m.DateTimeOriginal?.value) || '').slice(0, 10),
      pageUrl: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(page.title.replace(/ /g, '_'))
    };
  });
}

function usable(c) {
  if (!c.url) return false;
  if (!OK_LICENCE.test(c.licence)) return false;
  if (CATALOGUE.test(c.title)) return false;
  if (SCANNED.test(c.author + ' ' + c.credit + ' ' + c.title)) return false;
  if (c.width && c.height && (c.width / c.height > 2.4 || c.height / c.width > 2.4)) return false;
  return true;
}

// Commons throttles a run of image requests, and a throttled candidate that
// is quietly dropped leaves a crop looking like it has no photographs when it
// has plenty. Three tries, backing off, then say so.
async function download(url, file) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (r.ok) { fs.writeFileSync(file, Buffer.from(await r.arrayBuffer())); return true; }
      await sleep(2500 * attempt);
    } catch { await sleep(2500 * attempt); }
  }
  return false;
}

// Four panels across, cut to the shape the packet window holds, so a choice is
// made in the shape it will be seen in.
async function contactSheet(dir, files, out) {
  const W = 320, H = 240;
  const panels = [];
  for (let i = 0; i < files.length; i++) {
    panels.push({
      input: await sharp(path.join(dir, files[i])).rotate()
        .resize(W, H, { fit: 'cover', position: 'centre' }).toBuffer(),
      left: i * (W + 8),
      top: 0
    });
  }
  await sharp({ create: { width: files.length * (W + 8) - 8, height: H, channels: 3,
    background: { r: 242, g: 232, b: 213 } } })
    .composite(panels).webp({ quality: 74 }).toFile(out);
}

const only = process.argv.slice(2);
const wanted = only.length ? only : Object.keys(CROPS);
fs.mkdirSync(OUT, { recursive: true });
const meta = fs.existsSync(META) ? JSON.parse(fs.readFileSync(META, 'utf8')) : {};

for (const slug of wanted) {
  const queries = CROPS[slug];
  if (!queries) { console.log(slug.padEnd(13), 'no such crop'); continue; }

  const seen = new Set();
  const keep = [];
  for (const q of queries) {
    if (keep.length >= WANT) break;
    for (const c of await search(q, 12)) {
      if (keep.length >= WANT) break;
      if (seen.has(c.pageid) || !usable(c)) continue;
      seen.add(c.pageid);
      keep.push(c);
    }
    await sleep(900);
  }

  const dir = path.join(OUT, slug);
  fs.mkdirSync(dir, { recursive: true });
  const files = [];
  for (let i = 0; i < keep.length; i++) {
    const file = `${i + 1}.jpg`;
    if (await download(keep[i].url, path.join(dir, file))) files.push(file);
    else keep[i].failed = true;
    await sleep(400);
  }

  if (files.length) await contactSheet(dir, files, path.join(OUT, slug + '-sheet.webp'));
  meta[slug] = keep.filter(c => !c.failed);
  console.log(slug.padEnd(13), String(files.length).padStart(2), 'candidates:',
    keep.map(c => c.licence).join(', '));
}

fs.writeFileSync(META, JSON.stringify(meta, null, 1));
console.log('\ncandidates and contact sheets in', path.relative(ROOT, OUT));
