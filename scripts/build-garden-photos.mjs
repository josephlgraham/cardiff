// Turns the chosen candidate photographs into the files the garden desk
// serves, and writes the credits into fivemile-garden-photos.json.
//
//   node scripts/build-garden-photos.mjs
//
// Inputs
//   scripts/garden-photo-picks.json    which candidate, the alt text, and
//                                      which planting guide entry uses it
//   _src/garden-candidates/            the downloaded originals, outside git
//
// Outputs
//   fivemile_photos/garden/*.webp      the packet window photograph, 480px
//   fivemile-garden-photos.json        what the page reads
//
// The picks file is committed so this is repeatable. It records a choice a
// person made looking at contact sheets, and that choice is not recoverable
// from anything else in the repo.
//
// Every packet window is 4:3 and the photograph is cut to fill it, so the
// choice was made in that shape on the contact sheet. A crop with no pick is
// left out of the manifest entirely rather than written in empty: the page
// shows the empty window for anything it cannot find, and a window waiting on
// a photograph is the truth about that crop.

import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT  = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC   = path.join(ROOT, '_src', 'garden-candidates');
const OUT   = path.join(ROOT, 'fivemile_photos', 'garden');
const MANIFEST = path.join(ROOT, 'fivemile-garden-photos.json');

const WIDTH = 480;

// What Commons calls a licence, said the way the field guide says it.
const LICENCE = {
  cc0: 'CC0',
  'public domain': 'Public domain',
  'cc by 2.0': 'CC BY 2.0', 'cc by 3.0': 'CC BY 3.0', 'cc by 3.0 us': 'CC BY 3.0 US', 'cc by 4.0': 'CC BY 4.0',
  'cc by-sa 2.0': 'CC BY-SA 2.0', 'cc by-sa 3.0': 'CC BY-SA 3.0', 'cc by-sa 4.0': 'CC BY-SA 4.0'
};

const slug = s => String(s || 'unknown').normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 22) || 'unknown';

// Commons puts markup, a licence template, and sometimes a whole paragraph in
// the author field. What the credit line wants is the name.
function person(author) {
  const first = String(author || '').split(/,| at | \(/)[0].trim();
  return first || 'Unknown photographer';
}

const picksFile = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'garden-photo-picks.json'), 'utf8'));
const cand = JSON.parse(fs.readFileSync(path.join(SRC, 'candidates.json'), 'utf8'));

fs.mkdirSync(OUT, { recursive: true });

const photos = {};
let files = 0, bytes = 0;

for (const [crop, pick] of Object.entries(picksFile.picks)) {
  const [index, alt] = pick;
  const source = (cand[crop] || [])[index - 1];
  const file = path.join(SRC, crop, index + '.jpg');
  if (!source || !fs.existsSync(file)) {
    console.log(crop.padEnd(13), 'candidate', index, 'is not in _src/garden-candidates, skipped');
    continue;
  }

  const name = crop + '_' + slug(person(source.author)) + '.webp';
  await sharp(file).rotate()
    .resize(WIDTH, Math.round(WIDTH * 3 / 4), { fit: 'cover', position: 'centre' })
    .webp({ quality: 68, effort: 5 })
    .toFile(path.join(OUT, name));

  const size = fs.statSync(path.join(OUT, name)).size;
  files += 1;
  bytes += size;

  photos[crop] = {
    src: 'fivemile_photos/garden/' + name,
    alt: alt,
    credit: person(source.author),
    license: LICENCE[String(source.licence || '').toLowerCase()] || source.licence,
    url: source.pageUrl,
    source: 'Wikimedia Commons'
  };
  console.log(crop.padEnd(13), name.padEnd(34), (size / 1024).toFixed(0) + 'kB', photos[crop].license);
}

// The entry to crop map is copied through rather than worked out here, because
// which photograph a planting guide entry uses is an editorial decision and
// belongs in the file a person edits.
const items = {};
for (const [entry, crop] of Object.entries(picksFile.items)) {
  if (photos[crop]) items[entry] = crop;
}

fs.writeFileSync(MANIFEST, JSON.stringify({
  note: 'Written by scripts/build-garden-photos.mjs. Edit scripts/garden-photo-picks.json instead.',
  photos: photos,
  items: items
}, null, 1) + '\n');

console.log('\n' + files + ' photographs, ' + (bytes / 1024).toFixed(0) + 'kB, and '
  + Object.keys(items).length + ' planting guide entries pointed at them.');
