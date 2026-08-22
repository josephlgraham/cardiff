"""Pack favicon.ico from the PNGs written by gen_icon_pngs.mjs.

The old scripts/gen_favicon.py outlined a glyph from the wordmark font, which
was right when the mark was a letter C set in Plus Jakarta Sans. The FIVEMILE
mark is drawn, not set, so the source of truth is favicon.svg and this just
packs the rasterized sizes.

Run gen_icon_pngs.mjs first, then:
    python scripts/gen_favicon_ico.py
"""
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "scripts", ".ico-src")
SIZES = [16, 32, 48]

frames = {}
for size in SIZES:
    path = os.path.join(SRC, "%d.png" % size)
    if not os.path.exists(path):
        sys.exit("missing %s. Run: node scripts/gen_icon_pngs.mjs" % path)
    frames[size] = Image.open(path).convert("RGBA")

# Save from the LARGEST frame and append the rest. Saving from the smallest
# makes Pillow upscale 16px art into the 32 and 48 entries, which looks like
# a blurry thumbnail in a browser tab and is easy to miss.
order = sorted(SIZES, reverse=True)
base = frames[order[0]]
out = os.path.join(ROOT, "favicon.ico")
base.save(
    out,
    format="ICO",
    sizes=[(s, s) for s in order],
    append_images=[frames[s] for s in order[1:]],
)

check = Image.open(out)
packed = sorted(check.ico.sizes())
print("wrote favicon.ico, %d bytes, sizes %s" % (os.path.getsize(out), packed))
if packed != sorted((s, s) for s in SIZES):
    sys.exit("ERROR: packed sizes do not match %s" % SIZES)
