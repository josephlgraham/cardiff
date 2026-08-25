// Turns the chosen candidate photographs into the files the site serves, and
// writes the credits into fivemile-guide.json.
//
//   node scripts/build-guide-photos.mjs
//
// Inputs
//   scripts/guide-photo-picks.json     which candidate, and the alt text
//   _src/guide-candidates/             the downloaded originals, outside git
//
// Outputs
//   fivemile_photos/guide/*.webp       the sheet photograph, 800px wide
//   fivemile_photos/guide/thumbs/*     the grid photograph, 360px wide
//   fivemile-guide.json                photos[] on each species
//
// The picks file is committed so this is repeatable. It records a choice a
// person made looking at contact sheets, and that choice is not recoverable
// from anything else in the repo.

import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT   = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC    = path.join(ROOT, '_src', 'guide-candidates');
const OUT    = path.join(ROOT, 'fivemile_photos', 'guide');
const THUMBS = path.join(OUT, 'thumbs');

const FULL_W = 800, THUMB_W = 360;

// Only the three the licence sweep allowed, plus what Commons calls its own.
const LICENCE = {
  cc0: 'CC0', 'cc-by': 'CC BY', 'cc-by-sa': 'CC BY-SA',
  'CC BY-SA 4.0': 'CC BY-SA 4.0', 'CC BY 4.0': 'CC BY 4.0',
  'Public domain': 'Public domain'
};

const slug = s => String(s || 'unknown').normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 22) || 'unknown';

const picks = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'guide-photo-picks.json'), 'utf8'));
const cand  = JSON.parse(fs.readFileSync(path.join(SRC, 'candidates.json'), 'utf8'));
const guidePath = path.join(ROOT, 'fivemile-guide.json');
const guide = JSON.parse(fs.readFileSync(guidePath, 'utf8'));

fs.mkdirSync(THUMBS, { recursive: true });

// id -> the photo records built for it, so a borrowing entry can point at them
const built = {};
let files = 0, bytes = 0;

async function derive(srcFile, base) {
  const full  = `${base}.webp`;
  const thumb = `${base}.webp`;
  // The sheet gets the whole photograph, because a guide that crops the top
  // off a standing heron is not a guide. The grid gets it cut to 4:3, which is
  // the shape the card holds and the shape the choices were made in.
  await sharp(srcFile).rotate().resize({ width: FULL_W, withoutEnlargement: true })
    .webp({ quality: 68, effort: 5 }).toFile(path.join(OUT, full));
  await sharp(srcFile).rotate()
    .resize(THUMB_W, Math.round(THUMB_W * 3 / 4), { fit: 'cover', position: 'centre' })
    .webp({ quality: 62, effort: 5 }).toFile(path.join(THUMBS, thumb));
  files += 2;
  bytes += fs.statSync(path.join(OUT, full)).size + fs.statSync(path.join(THUMBS, thumb)).size;
  return {
    src: `fivemile_photos/guide/${full}`,
    thumb: `fivemile_photos/guide/thumbs/${thumb}`
  };
}

// Borrowing entries run in a second pass, because what they borrow has to
// exist first and the species are not in a helpful order.
for (const sp of guide.species) {
  const chosen = picks[sp.id];
  if (!chosen || chosen.borrow) { sp.photos = []; continue; }

  const list = cand[sp.id] || [];
  const out = [];
  let n = 0;
  for (const [pick, alt] of chosen) {
    const c = list[pick - 1];
    if (!c) { console.log(`${sp.id}: no candidate ${pick}`); continue; }
    const srcFile = path.join(SRC, c.file);
    if (!fs.existsSync(srcFile)) { console.log(`${sp.id}: missing ${c.file}`); continue; }

    const year = (c.observedOn || '').slice(0, 4) || 'undated';
    const base = `${sp.id}_${year}_${slug(c.observerLogin || c.observer)}_${++n}`;
    const paths = await derive(srcFile, base);

    out.push({
      ...paths,
      alt,
      credit: c.observer || c.attribution || 'Unknown',
      license: LICENCE[c.license] || c.license,
      url: c.obsUrl,
      where: c.place || null,
      when: c.observedOn || null,
      source: c.scope === 'Wikimedia Commons' ? 'Wikimedia Commons' : 'iNaturalist'
    });
  }
  sp.photos = out;
  built[sp.id] = out;
}

// "borrow": an entry that is not one species. Wildflowers is the case. It is a
// category rather than an organism, so it shows the flowers the guide already
// carries instead of pretending to a photograph of its own. The credit travels
// with the picture, which is the whole reason this is a copy and not a
// reshoot.
for (const sp of guide.species) {
  const chosen = picks[sp.id];
  if (!chosen?.borrow) continue;
  sp.photos = chosen.borrow
    .map(([from, i]) => (built[from] || [])[i])
    .filter(Boolean)
    .map(p => ({ ...p }));
  if (!sp.photos.length) console.log(`${sp.id}: borrowed nothing`);
}

guide.updated = new Date().toISOString().slice(0, 10);
fs.writeFileSync(guidePath, JSON.stringify(guide, null, 1));

const withPhotos = guide.species.filter(s => s.photos.length).length;
const total = guide.species.reduce((n, s) => n + s.photos.length, 0);
const inAlabama = guide.species.flatMap(s => s.photos)
  .filter(p => /,\s*AL\b|Alabama/i.test(p.where || '')).length;

console.log(`${files} files, ${(bytes / 1048576).toFixed(1)}MB`);
console.log(`${withPhotos} of ${guide.species.length} species have photographs`);
console.log(`${total} photographs, ${inAlabama} of them taken in Alabama`);
console.log('species with none:', guide.species.filter(s => !s.photos.length).map(s => s.id).join(', ') || 'none');
