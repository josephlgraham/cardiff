/* One photograph per species on the sightings roll, from iNaturalist.

   The rows on Nature Watch and in the species room carried an emoji for the
   whole group, so a moth, a beetle and a dragonfly were all the same
   butterfly. Joe asked for photographs instead. See DECISIONS.md 83.

   WHAT THIS IS NOT. It is not a photograph of the sighting. A record's own
   photograph is usually all rights reserved, and of the last forty eight
   records only four carried a licence this site can use. This is a photograph
   OF THE SPECIES, chosen the way the field guide chooses its own: research
   grade, licensed CC0, CC BY or CC BY-SA, Alabama first and the rest of the
   country after. Nothing on a row may say or imply that the person who filed
   the sighting took the picture.

   ONE PHOTOGRAPH PER SPECIES, KEPT FOREVER. The file grows when a species
   turns up here for the first time and never otherwise, which is what makes
   this affordable where a thumbnail per record was not. A species already in
   the file is never looked up again, so a run that learns nothing writes
   nothing and the repo stays still.

   THE CREDIT IS VISIBLE, on the card the photographs appear on, because
   DECISIONS.md 18 says a credit is never a title attribute, and CC BY and
   CC BY-SA both require one. */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* sharp is loaded only when there is a photograph to shrink, and not at the
   top of this file. fetch-site-data.mjs imports this module, so a
   top-level import made every run of it, the ten minute one included, need a
   package that lives in node_modules. When that package was missing on the
   runner the whole script died before it asked the station anything, and the
   weather and the gauge went stale for a day. See DECISIONS.md 83. */
let sharpModule = null;
async function loadSharp() {
  if (!sharpModule) sharpModule = (await import('sharp')).default;
  return sharpModule;
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ROLL_FILE = path.join(ROOT, 'fivemile-observations.json');
const OUT_FILE = path.join(ROOT, 'fivemile-species-photos.json');
const PHOTO_DIR = path.join(ROOT, 'fivemile_photos', 'species');
const PHOTO_HREF = 'fivemile_photos/species';

const USER_AGENT = 'FIVEMILE species photographs (https://fivemile.now, fivemilec@gmail.com)';
const LICENSES = ['cc0', 'cc-by', 'cc-by-sa'];
const ALABAMA = 19;
/* A row shows it at 44px, and twice that covers a dense screen. */
const SIZE = 88;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function api(url) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (response.ok) return await response.json();
      if (response.status === 429) { await sleep(4000 * attempt); continue; }
      return null;
    } catch (error) {
      await sleep(1500 * attempt);
    }
  }
  return null;
}

const sized = (url, size) => String(url).replace(/\/(square|small|medium|large|original)\./, '/' + size + '.');

/* Plain ascii, because this is a file name. Anything else becomes a dash and
   the dashes collapse. */
const slug = (value) => String(value || 'species').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 28) || 'species';

/* "(c) Dan Vickers, some rights reserved (CC BY)" is the shape iNaturalist
   sends. The name is what goes on the card. */
function creditFrom(photo, observation) {
  const match = /\(c\)\s*([^,]+)/i.exec(photo.attribution || '');
  if (match) return match[1].trim();
  return observation?.user?.name || observation?.user?.login || null;
}

/* The state and the country, and nothing finer. A photograph's own place is
   somebody else's yard in another county, and it is not this site's sighting,
   so it never carries a street. */
function placeOf(observation) {
  const parts = String(observation.place_guess || '').split(',').map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts.slice(-2).join(', ') : null;
}

async function pick(taxon) {
  const base = 'https://api.inaturalist.org/v1/observations?taxon_id=' + taxon
    + '&quality_grade=research&photos=true&photo_license=' + LICENSES.join(',')
    + '&order_by=votes&per_page=5';
  /* Alabama first, so a species reads the way it looks here. */
  for (const url of [base + '&place_id=' + ALABAMA, base]) {
    const json = await api(url);
    for (const observation of json?.results || []) {
      for (const photo of observation.photos || []) {
        const license = String(photo.license_code || '').toLowerCase();
        if (!LICENSES.includes(license)) continue;
        return { photo, observation, license };
      }
    }
    await sleep(600);
  }
  return null;
}

async function download(url) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error('photo ' + response.status);
  return Buffer.from(await response.arrayBuffer());
}

export async function updateSpeciesPhotos() {
  const roll = await fs.readFile(ROLL_FILE, 'utf8').then(JSON.parse).then((data) => data.roll || []).catch(() => []);
  if (!roll.length) {
    console.log('   Species photographs: no roll to read, nothing to do.');
    return null;
  }
  const previous = await fs.readFile(OUT_FILE, 'utf8').then(JSON.parse).catch(() => null);
  const photos = { ...(previous?.photos || {}) };
  await fs.mkdir(PHOTO_DIR, { recursive: true });

  let added = 0;
  let missing = 0;
  for (const entry of roll) {
    const key = String(entry.taxon);
    if (photos[key]) continue;
    try {
      const found = await pick(entry.taxon);
      if (!found) {
        missing += 1;
        continue;
      }
      const buffer = await download(sized(found.photo.url, 'medium'));
      const file = slug(entry.name) + '-' + entry.taxon + '.webp';
      const sharp = await loadSharp();
      await sharp(buffer).rotate()
        .resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
        .webp({ quality: 66, effort: 5 })
        .toFile(path.join(PHOTO_DIR, file));
      photos[key] = {
        taxon: entry.taxon,
        name: entry.name,
        file: PHOTO_HREF + '/' + file,
        credit: creditFrom(found.photo, found.observation),
        license: found.license,
        url: 'https://www.inaturalist.org/observations/' + found.observation.id,
        where: placeOf(found.observation),
        when: found.observation.observed_on || null
      };
      added += 1;
      await sleep(900);
    } catch (error) {
      /* One species failing is one emoji left standing, never a failed run. */
      console.warn('   Species photographs: ' + entry.name + ' failed, ' + error.message);
      missing += 1;
    }
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    source: 'iNaturalist',
    note: 'One photograph of each species recorded here, and not of the sighting itself. Research grade and licensed CC0, CC BY, or CC BY-SA, Alabama first.',
    licenses: LICENSES,
    size: SIZE,
    counts: { species: roll.length, with_photo: Object.keys(photos).length },
    photos
  };

  const text = JSON.stringify(payload, null, 2) + '\n';
  const currentText = previous ? JSON.stringify(previous, null, 2) + '\n' : null;
  const strip = (value) => (value ? value.replace(/"updatedAt": "[^"]*",?\n/, '') : value);
  if (strip(currentText) === strip(text)) {
    console.log('   Species photographs: ' + Object.keys(photos).length + ' on file, unchanged.');
    return payload;
  }

  await fs.writeFile(OUT_FILE, text, 'utf8');
  console.log('   Species photographs: ' + added + ' added, ' + Object.keys(photos).length
    + ' on file, ' + missing + ' with none free to use.');
  return payload;
}

if (process.argv[1] && process.argv[1].endsWith('inat-species-photos.mjs')) {
  updateSpeciesPhotos().catch((error) => {
    console.error('Species photographs failed:', error.message);
    process.exit(1);
  });
}
