// Pulls candidate photographs for the field guide from iNaturalist.
//
// Every species in fivemile-guide.json carries an `inat` taxon id. For each
// one this asks iNaturalist for research grade observations in Alabama whose
// photographs are licensed CC0, CC BY, or CC BY-SA, and downloads the best
// few to _src/guide-candidates/, which is outside git.
//
// Nothing here writes into the site. Choosing among the candidates and
// producing the served WebP is scripts/build-guide-photos.mjs.
//
//   node scripts/fetch-guide-photos.mjs            all species
//   node scripts/fetch-guide-photos.mjs bream fox  only these
//
// Alabama first, because a field guide for three towns on Five Mile Creek
// should show the animal as it looks here and not as it looks in Ontario. A
// species with too few Alabama photographs falls back to the whole country,
// and the fallback is recorded so the shortfall is visible rather than
// silent.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT  = path.join(ROOT, '_src', 'guide-candidates');
const META = path.join(OUT, 'candidates.json');

const ALABAMA = 19;              // iNaturalist place id
const LICENSES = 'cc0,cc-by,cc-by-sa';
const WANT = 6;                  // candidates to keep per species
const FLOOR = 3;                 // below this, widen the search
const UA = 'FIVEMILE field guide (https://fivemile.now, fivemilec@gmail.com)';

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

// iNaturalist serves every photo at a set of fixed sizes off one base name.
const sized = (url, size) => url.replace(/\/(square|small|medium|large|original)\./, `/${size}.`);

function observationCandidates(json, scope) {
  const out = [];
  for (const obs of json?.results || []) {
    for (const photo of obs.photos || []) {
      if (!LICENSES.split(',').includes(String(photo.license_code || '').toLowerCase())) continue;
      out.push({
        photoId: photo.id,
        url: sized(photo.url, 'large'),
        license: photo.license_code,
        attribution: photo.attribution,
        observer: obs.user?.name || obs.user?.login || null,
        observerLogin: obs.user?.login || null,
        observedOn: obs.observed_on || null,
        place: obs.place_guess || null,
        obsUrl: `https://www.inaturalist.org/observations/${obs.id}`,
        faves: obs.faves_count || 0,
        scope
      });
      break; // one photograph per observation, so a set is six different animals
    }
  }
  return out;
}

// Observations somebody annotated as a living animal. Mammals are the reason
// this exists. Sorted by votes and filtered only by licence, a mammal comes
// back as roadkill, a skull, and a trail camera frame, because that is what
// people actually stop and record. The annotation is optional and most
// observations do not carry it, so this is a smaller and much better pool
// rather than a complete one.
const ALIVE = 'term_id=17&term_value_id=18';

async function candidatesFor(taxon, opts = {}) {
  const want = opts.want || WANT;
  const base = `https://api.inaturalist.org/v1/observations?taxon_id=${taxon}`
    + `&quality_grade=research&photos=true&photo_license=${LICENSES}`
    + (opts.alive ? `&${ALIVE}` : '')
    + `&order_by=votes&per_page=${want * 2}`;

  let list = observationCandidates(await api(`${base}&place_id=${ALABAMA}`), 'Alabama');
  await sleep(1100);

  if (list.length < Math.max(FLOOR, want)) {
    const wider = observationCandidates(await api(base), 'anywhere');
    await sleep(1100);
    const have = new Set(list.map(c => c.photoId));
    list = list.concat(wider.filter(c => !have.has(c.photoId)));
  }
  return list.slice(0, want);
}

// Wikimedia Commons, for the entries that are a thing rather than an
// organism. iNaturalist records living things at a place and a time, so it has
// no way to answer "a cast antler lying in the leaves". Files are named
// outright rather than searched, because a search result that changes under
// you is not a source.
const COMMONS = {
  shedantler: [
    'File:2024-02-06 11 29 00 An antler shed from a White-tailed Deer on the grounds of Mountain View Golf Course in Ewing Township, Mercer County, New Jersey.jpg',
    'File:White-tailed deer antler shed at Seedskadee National Wildlife Refuge (46107114355).jpg'
  ]
};

const stripTags = h => String(h || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function commonsCandidates(titles) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo'
    + '&iiprop=url|extmetadata&iiurlwidth=1600&titles=' + encodeURIComponent(titles.join('|'));
  const json = await api(url);
  const pages = json?.query?.pages || {};
  const out = [];
  for (const title of titles) {
    const page = Object.values(pages).find(p => p.title === title);
    const ii = page?.imageinfo?.[0];
    if (!ii) continue;
    const m = ii.extmetadata || {};
    out.push({
      photoId: 'c' + (page.pageid),
      url: ii.thumburl || ii.url,
      license: stripTags(m.LicenseShortName?.value) || 'see Commons',
      attribution: stripTags(m.Artist?.value),
      observer: stripTags(m.Artist?.value) || null,
      observerLogin: null,
      observedOn: (stripTags(m.DateTimeOriginal?.value) || '').slice(0, 10) || null,
      place: null,
      obsUrl: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(title.replace(/ /g, '_')),
      faves: 0,
      scope: 'Wikimedia Commons'
    });
  }
  return out;
}

async function download(url, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 4096) return 'cached';
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) return null;
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
  return 'fetched';
}

const species = JSON.parse(fs.readFileSync(path.join(ROOT, 'fivemile-guide.json'), 'utf8')).species;
const args = process.argv.slice(2);
const alive = args.includes('--alive');   // living animals only, see ALIVE above
const deep  = args.includes('--deep');    // twelve candidates instead of six
const only = new Set(args.filter(a => a[0] !== '-'));
fs.mkdirSync(OUT, { recursive: true });

const meta = fs.existsSync(META) ? JSON.parse(fs.readFileSync(META, 'utf8')) : {};

for (const sp of species) {
  if (only.size && !only.has(sp.id)) continue;
  if (!sp.inat && !COMMONS[sp.id]) { console.log(`${sp.id.padEnd(16)} no taxon, skipped`); continue; }

  const list = COMMONS[sp.id]
    ? await commonsCandidates(COMMONS[sp.id])
    : await candidatesFor(sp.inat, { alive, want: deep ? 12 : WANT });
  if (!list.length) { console.log(`${sp.id.padEnd(16)} nothing licensed`); continue; }

  const dir = path.join(OUT, sp.id);
  fs.mkdirSync(dir, { recursive: true });

  let n = 0;
  for (const c of list) {
    const file = `${String(++n).padStart(2, '0')}_${c.photoId}.jpg`;
    c.file = path.join(sp.id, file).replace(/\\/g, '/');
    if (!await download(c.url, path.join(dir, file))) c.file = null;
    await sleep(120);
  }

  meta[sp.id] = list.filter(c => c.file);
  const local = meta[sp.id].filter(c => c.scope === 'Alabama').length;
  console.log(`${sp.id.padEnd(16)} ${meta[sp.id].length} candidates, ${local} from Alabama`);
  fs.writeFileSync(META, JSON.stringify(meta, null, 1));
}

console.log(`\ncandidates for ${Object.keys(meta).length} species in ${OUT}`);
