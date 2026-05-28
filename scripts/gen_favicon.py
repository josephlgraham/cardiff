"""One-off: regenerate the Cardiff favicon/icon SVGs with the brand 'C'.

The 'C' is the Plus Jakarta Sans ExtraBold (wght 800) glyph used by the
masthead wordmark, outlined to a vector path so it renders identically in
browsers and when sharp rasterizes the PNGs (no font dependency).

Requires the variable font (not committed; OFL, from the google/fonts repo)
and fonttools. Full asset pipeline:
    1. python scripts/gen_favicon.py path/to/PlusJakartaSans[wght].ttf   # SVGs
    2. npm install && node scripts/gen_icon_pngs.mjs                     # PWA/apple PNGs
    3. favicon.ico — render favicon.svg to a 256px PNG with sharp, then:
         from PIL import Image
         Image.open(png).convert("RGBA").save(
             "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
"""
import sys, os
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

FONT = sys.argv[1] if len(sys.argv) > 1 else "pjs.ttf"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RED = "#9a0c22"
CREAM = "#f2e8d5"

f = TTFont(FONT)
instantiateVariableFont(f, {"wght": 800}, inplace=True)
gs = f.getGlyphSet()
gname = f.getBestCmap()[ord("C")]
pen = SVGPathPen(gs)
gs[gname].draw(pen)
d = pen.getCommands()
bp = BoundsPen(gs)
gs[gname].draw(bp)
xmin, ymin, xmax, ymax = bp.bounds
cx, cy = (xmin + xmax) / 2, (ymin + ymax) / 2
gh = ymax - ymin

def svg(size, cap_frac, rx):
    scale = cap_frac * size / gh
    half = size / 2
    # right-to-left: center glyph, flip Y, scale, move to icon center
    tf = f"translate({half} {half}) scale({scale:.5f} {-scale:.5f}) translate({-cx} {-cy})"
    rect = f'<rect width="{size}" height="{size}" rx="{rx}" fill="{RED}"/>' if rx else \
           f'<rect width="{size}" height="{size}" fill="{RED}"/>'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">\n'
            f'  {rect}\n'
            f'  <path transform="{tf}" fill="{CREAM}" d="{d}"/>\n'
            f'</svg>\n')

targets = [
    ("favicon.svg", 64, 0.62, 12),
    ("icons/icon-192.svg", 192, 0.62, 0),
    ("icons/icon-512.svg", 512, 0.62, 0),
    ("icons/apple-touch-icon.svg", 180, 0.60, 0),
]
for rel, size, cap, rx in targets:
    p = os.path.join(ROOT, *rel.split("/"))
    open(p, "w", encoding="utf-8").write(svg(size, cap, rx))
    print("wrote", rel)
