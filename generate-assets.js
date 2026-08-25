// Generates the optimised WebP files the site actually serves, from high-res
// originals kept OUTSIDE git in _src/ (see .gitignore).
//
// Photos:     _src/photos/<collection>/*  -> media/photos/<collection>/thumbs/*.webp (480w)
//                                            media/photos/<collection>/full/*.webp   (1600w)
//
// Run with:  node generate-assets.js   (or: npm run generate-assets)
// Only changed/new sources are reprocessed; commit the resulting WebP.

const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const ROOT = __dirname;

// The guide art section came out with the drawings it processed. The field
// guide's photographs are real ones under a Creative Commons licence and they
// have their own two scripts, scripts/fetch-guide-photos.mjs and
// scripts/build-guide-photos.mjs, because a picture that has to carry a
// photographer's name is not the same job as resizing a folder. See
// DECISIONS.md 39.

// ---- Photos ----------------------------------------------------------------
const PHOTOS_SRC = path.join(ROOT, '_src', 'photos');
const PHOTOS_OUT = path.join(ROOT, 'media', 'photos');
const PHOTO_THUMB_W = 480;    // browse grid
const PHOTO_FULL_W  = 1600;   // detail view (caps the served width)
const PHOTO_EXT = /\.(jpe?g|png|webp|tiff?)$/i;

function isNewer(dest, srcMtime) {
  return fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= srcMtime;
}

async function generatePhotos() {
  if (!fs.existsSync(PHOTOS_SRC)) {
    console.log(`Photos: no source folder at ${path.relative(ROOT, PHOTOS_SRC)} — skipping.`);
    return { done: 0, total: 0, errors: [] };
  }
  const collections = fs.readdirSync(PHOTOS_SRC, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let done = 0, total = 0;
  const errors = [];
  for (const collection of collections) {
    const srcDir    = path.join(PHOTOS_SRC, collection);
    const thumbsDir = path.join(PHOTOS_OUT, collection, 'thumbs');
    const fullDir   = path.join(PHOTOS_OUT, collection, 'full');
    const files = fs.readdirSync(srcDir).filter((f) => PHOTO_EXT.test(f)).sort();
    if (!files.length) continue;
    fs.mkdirSync(thumbsDir, { recursive: true });
    fs.mkdirSync(fullDir, { recursive: true });
    console.log(`Photos/${collection}: processing ${files.length} image(s)…`);

    for (const file of files) {
      total++;
      const webpName  = file.replace(PHOTO_EXT, '.webp');
      const src       = path.join(srcDir, file);
      const destThumb = path.join(thumbsDir, webpName);
      const destFull  = path.join(fullDir, webpName);
      const srcMtime  = fs.statSync(src).mtimeMs;

      if (isNewer(destThumb, srcMtime) && isNewer(destFull, srcMtime)) {
        done++; process.stdout.write('.'); continue;
      }
      try {
        await Promise.all([
          sharp(src).rotate().resize(PHOTO_THUMB_W, null, { withoutEnlargement: true }).webp({ quality: 80 }).toFile(destThumb),
          sharp(src).rotate().resize(PHOTO_FULL_W, null, { withoutEnlargement: true }).webp({ quality: 82 }).toFile(destFull)
        ]);
        done++; process.stdout.write('✓');
      } catch (e) {
        errors.push({ file: `${collection}/${file}`, error: e.message }); process.stdout.write('✗');
      }
    }
    process.stdout.write('\n');
  }
  console.log(`Photos: ${done}/${total} done across ${collections.length} collection(s).`);
  return { done, total, errors };
}

async function main() {
  const results = [await generatePhotos()];
  const errors = results.flatMap((r) => r.errors);
  if (errors.length) {
    console.error('\nErrors:');
    errors.forEach(({ file, error }) => console.error(`  ${file}: ${error}`));
    process.exit(1);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
