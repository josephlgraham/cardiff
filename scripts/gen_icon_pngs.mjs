// Rasterize the icon SVGs to the PNGs the manifest and the apple-touch link
// serve. Requires the sharp devDependency (run `npm install` first).
//
// The .ico is packed separately, from the PNGs this writes into
// scripts/.ico-src, by scripts/gen_favicon_ico.py. Run this first.
//
// Usage:
//   node scripts/gen_icon_pngs.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ICO_SRC = path.join(ROOT, 'scripts', '.ico-src');
fs.mkdirSync(ICO_SRC, { recursive: true });

const jobs = [
  // App and manifest icons. The rounded mark, matching the site's 14px radius.
  ['icons/icon-192.svg', 'icons/icon-192.png', 192],
  ['icons/icon-512.svg', 'icons/icon-512.png', 512],
  // Full bleed. iOS applies its own corner mask, so a rounded source would be
  // rounded twice and read as a shrunken square.
  ['icons/apple-touch-icon.svg', 'icons/apple-touch-icon.png', 180],
  // Full bleed, artwork at 66% inside the safe zone. Android may crop to a
  // circle, which would clip the creek line on the standard mark.
  ['icons/icon-maskable-512.svg', 'icons/icon-maskable-512.png', 512],
  // Sizes that get packed into favicon.ico.
  ['favicon.svg', 'scripts/.ico-src/16.png', 16],
  ['favicon.svg', 'scripts/.ico-src/32.png', 32],
  ['favicon.svg', 'scripts/.ico-src/48.png', 48],
];

for (const [src, dest, size] of jobs) {
  await sharp(path.join(ROOT, src), { density: 512 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(ROOT, dest));
  console.log('wrote', dest, size + 'px');
}
