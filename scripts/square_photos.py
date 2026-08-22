"""Normalize fivemile_photos to a single square size for the home anchor.

Originals are moved to fivemile_photos/_originals/ first, so nothing is lost.
Output is a center-cropped 840x840 JPEG, progressive, EXIF stripped.
"""
import os
import shutil
from PIL import Image, ImageOps

SIZE = 840
SRC = r"C:\Users\josep\OneDrive\Documents\GitHub\cardiff\fivemile_photos"
KEEP = os.path.join(SRC, "_originals")

os.makedirs(KEEP, exist_ok=True)

names = sorted(f for f in os.listdir(SRC) if f.lower().endswith((".jpg", ".jpeg", ".png")))
for name in names:
    src = os.path.join(SRC, name)
    orig = os.path.join(KEEP, name)
    if not os.path.exists(orig):
        shutil.copy2(src, orig)

    im = ImageOps.exif_transpose(Image.open(orig)).convert("RGB")
    out = ImageOps.fit(im, (SIZE, SIZE), method=Image.LANCZOS, centering=(0.5, 0.5))

    stem = os.path.splitext(name)[0]
    dest = os.path.join(SRC, stem + ".jpg")
    out.save(dest, "JPEG", quality=86, optimize=True, progressive=True)
    if dest != src:
        os.remove(src)
    print(name, "->", os.path.basename(dest), out.size, round(os.path.getsize(dest) / 1024), "KB")
