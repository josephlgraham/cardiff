// Generates the optimised WebP files the site actually serves, from high-res
// originals kept OUTSIDE git in _src/ (see .gitignore).
//
// Guide art:  _src/guide/*.png            -> assets/thumbs/*.webp  (208x156)
//                                            assets/webp/*.webp    (680x510)
// Photos:     _src/photos/<collection>/*  -> media/photos/<collection>/thumbs/*.webp (480w)
//                                            media/photos/<collection>/full/*.webp   (1600w)
//
// Run with:  node generate-assets.js   (or: npm run generate-assets)
// Only changed/new sources are reprocessed; commit the resulting WebP.

const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const ROOT = __dirname;

// ---- Guide art -------------------------------------------------------------
const GUIDE_SRC    = path.join(ROOT, '_src', 'guide');
const GUIDE_THUMBS = path.join(ROOT, 'assets', 'thumbs');
const GUIDE_WEBP   = path.join(ROOT, 'assets', 'webp');
const GUIDE_THUMB_W = 208, GUIDE_THUMB_H = 156;   // 104 px display @2x
const GUIDE_FULL_W  = 680, GUIDE_FULL_H  = 510;   // 340 px display @2x

// ---- Photos ----------------------------------------------------------------
const PHOTOS_SRC = path.join(ROOT, '_src', 'photos');
const PHOTOS_OUT = path.join(ROOT, 'media', 'photos');
const PHOTO_THUMB_W = 480;    // browse grid
const PHOTO_FULL_W  = 1600;   // detail view (caps the served width)
const PHOTO_EXT = /\.(jpe?g|png|webp|tiff?)$/i;

function isNewer(dest, srcMtime) {
  return fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= srcMtime;
}

async function generateGuide() {
  if (!fs.existsSync(GUIDE_SRC)) {
    console.log(`Guide: no source folder at ${path.relative(ROOT, GUIDE_SRC)} — skipping.`);
    return { done: 0, total: 0, errors: [] };
  }
  fs.mkdirSync(GUIDE_THUMBS, { recursive: true });
  fs.mkdirSync(GUIDE_WEBP, { recursive: true });

  const files = fs.readdirSync(GUIDE_SRC)
    .filter((f) => f.startsWith('guide_') && f.endsWith('.png'))
    .sort();
  console.log(`Guide: processing ${files.length} image(s)…`);

  let done = 0;
  const errors = [];
  for (const file of files) {
    const webpName  = file.replace(/\.png$/i, '.webp');
    const src       = path.join(GUIDE_SRC, file);
    const destThumb = path.join(GUIDE_THUMBS, webpName);
    const destFull  = path.join(GUIDE_WEBP, webpName);
    const srcMtime  = fs.statSync(src).mtimeMs;

    if (isNewer(destThumb, srcMtime) && isNewer(destFull, srcMtime)) {
      done++; process.stdout.write('.'); continue;
    }
    try {
      await Promise.all([
        sharp(src).resize(GUIDE_THUMB_W, GUIDE_THUMB_H, { fit: 'inside' }).webp({ quality: 80 }).toFile(destThumb),
        sharp(src).resize(GUIDE_FULL_W, GUIDE_FULL_H, { fit: 'inside' }).webp({ quality: 85 }).toFile(destFull)
      ]);
      done++; process.stdout.write('✓');
    } catch (e) {
      errors.push({ file, error: e.message }); process.stdout.write('✗');
    }
  }
  console.log(`\nGuide: ${done}/${files.length} done.`);
  return { done, total: files.length, errors };
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
  const results = [await generateGuide(), await generatePhotos()];
  const errors = results.flatMap((r) => r.errors);
  if (errors.length) {
    console.error('\nErrors:');
    errors.forEach(({ file, error }) => console.error(`  ${file}: ${error}`));
    process.exit(1);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
