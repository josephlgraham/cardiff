// Rasterize the icon SVGs to the PNGs the manifest/apple link serve. Requires
// the sharp devDependency (run `npm install` first). The favicon.ico fallback
// is packed separately — see scripts/gen_favicon.py. Usage:
//   node scripts/gen_icon_pngs.mjs
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const jobs = [
  ['icons/icon-192.svg', 'icons/icon-192.png', 192],
  ['icons/icon-512.svg', 'icons/icon-512.png', 512],
  ['icons/apple-touch-icon.svg', 'icons/apple-touch-icon.png', 180],
];
for (const [src, dest, size] of jobs) {
  await sharp(path.join(ROOT, src), { density: 384 })
    .resize(size, size)
    .png()
    .toFile(path.join(ROOT, dest));
  console.log('wrote', dest);
}
