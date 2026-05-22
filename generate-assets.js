// Generates optimised WebP assets from source PNGs in assets/
// Outputs:
//   assets/thumbs/  – 208×156 px WebP  (browse list, 104 px @2x)
//   assets/webp/    – 680×510 px WebP  (detail view, 340 px @2x)
//
// Run with:  node generate-assets.js
// Or:        npm run generate-assets

const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const ASSETS_DIR = path.join(__dirname, 'assets');
const THUMBS_DIR = path.join(ASSETS_DIR, 'thumbs');
const WEBP_DIR   = path.join(ASSETS_DIR, 'webp');

const THUMB_W = 208, THUMB_H = 156;   // 104 px display @2x
const FULL_W  = 680, FULL_H  = 510;   // 340 px display @2x

async function processImage(src, destThumb, destFull) {
  await Promise.all([
    sharp(src)
      .resize(THUMB_W, THUMB_H, { fit: 'inside' })
      .webp({ quality: 80 })
      .toFile(destThumb),
    sharp(src)
      .resize(FULL_W, FULL_H, { fit: 'inside' })
      .webp({ quality: 85 })
      .toFile(destFull),
  ]);
}

async function main() {
  fs.mkdirSync(THUMBS_DIR, { recursive: true });
  fs.mkdirSync(WEBP_DIR,   { recursive: true });

  const files = fs.readdirSync(ASSETS_DIR)
    .filter(f => f.startsWith('guide_') && f.endsWith('.png'))
    .sort();

  console.log(`Processing ${files.length} images…`);

  let done = 0;
  const errors = [];

  for (const file of files) {
    const webpName  = file.replace(/\.png$/i, '.webp');
    const src       = path.join(ASSETS_DIR, file);
    const destThumb = path.join(THUMBS_DIR, webpName);
    const destFull  = path.join(WEBP_DIR,   webpName);

    // Skip if both outputs are newer than source
    const srcMtime = fs.statSync(src).mtimeMs;
    const skip = [destThumb, destFull].every(
      p => fs.existsSync(p) && fs.statSync(p).mtimeMs >= srcMtime
    );
    if (skip) { done++; process.stdout.write('.'); continue; }

    try {
      await processImage(src, destThumb, destFull);
      done++;
      process.stdout.write('✓');
    } catch (e) {
      errors.push({ file, error: e.message });
      process.stdout.write('✗');
    }
  }

  console.log(`\n\nDone: ${done}/${files.length} images processed.`);
  if (errors.length) {
    console.error('Errors:');
    errors.forEach(({ file, error }) => console.error(`  ${file}: ${error}`));
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
