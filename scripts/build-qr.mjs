/* The printed QR codes, drawn from the list below so a reprint is one command
   and never a guess at what the last one said.

   Each code is written to qr-codes/ twice. The SVG is the one to hand a print
   shop: it is drawn in solid squares and scales to any size without going soft.
   The PNG is for anything that only takes a picture, and is large enough to
   print more than a foot across at 300 dots an inch.

   Every link carries utm_source and utm_medium. That is how a visit from paper
   gets its own row in Google Analytics, under Session source / medium, instead
   of being counted with everybody who typed the address. The page a reader
   lands on is the same either way. A new printed thing gets its own source, so
   stickers are sticker / print and never share a row with the flyer.

   Once a code is on paper its entry is frozen. Changing the link or the error
   correction redraws the squares, and the file here stops matching what is on
   the bulletin boards. Add a new entry instead. See DECISIONS.md 78.

   Run: node scripts/build-qr.mjs */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'qr-codes');

const CODES = [
  {
    // The half sheet flyer, September 2026. Q is the level that flyer was
    // drawn at, and it survives a pin hole or a smudge.
    name: 'fivemile-qr-flyer',
    url: 'https://fivemile.now/?utm_source=flyer&utm_medium=print',
    level: 'Q'
  }
];

// The quiet zone a scanner needs around the code, in squares.
const MARGIN = 4;
// The PNG is at least this many pixels across, in whole pixels per square.
const PNG_MIN_WIDTH = 4000;

function svgFor(qr, url) {
  const size = qr.modules.size;
  const full = size + MARGIN * 2;
  let d = '';
  for (let row = 0; row < size; row++) {
    let col = 0;
    while (col < size) {
      if (!qr.modules.get(row, col)) { col++; continue; }
      let end = col;
      while (end < size && qr.modules.get(row, end)) end++;
      d += `M${col + MARGIN} ${row + MARGIN}h${end - col}v1h${col - end}z`;
      col = end;
    }
  }
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${full} ${full}" width="1000" height="1000" shape-rendering="crispEdges">`,
    `<title>${url.replace(/&/g, '&amp;')}</title>`,
    `<rect width="${full}" height="${full}" fill="#ffffff"/>`,
    `<path fill="#000000" d="${d}"/>`,
    '</svg>',
    ''
  ].join('\n');
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  for (const code of CODES) {
    const qr = QRCode.create(code.url, { errorCorrectionLevel: code.level });
    const full = qr.modules.size + MARGIN * 2;
    const scale = Math.ceil(PNG_MIN_WIDTH / full);

    await fs.writeFile(path.join(OUT_DIR, `${code.name}.svg`), svgFor(qr, code.url), 'utf8');
    await QRCode.toFile(path.join(OUT_DIR, `${code.name}.png`), code.url, {
      errorCorrectionLevel: code.level,
      margin: MARGIN,
      scale,
      color: { dark: '#000000', light: '#ffffff' }
    });
    console.log(`${code.name}: ${code.url}, version ${qr.version}, level ${code.level}, ${full * scale}px PNG`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
