"""Gilneas: Blizzard's own map of it, laid in where the map was blank: docs/gaps/gilneas.webp, "gaps" in src/gdata.js.

No zone map in the game's tables covers Gilneas (walled off in classic), so the map showed only the world map's blurry
continent art there. The game's files still hold a Gilneas base map (12 tiles, 4 across, 3 down, 1002 x 668 of
1024 x 768); OpenMap lays it in the same way (OpenMap/Data/Forever/Gaps.lua, its "art" list, MIT), at
{ 0.652549, 0.722944, 0.349999, 0.420411 } of the world map (947: x from, x to, y from, y to; our map is that
art at 3 units a pixel, 3006 x 2004).

Kept: Gilneas's own land, its islands and the shallows round it (not the paper sea beyond, the map's frame or its
margin, nor the land the zone maps already paint, Silverpine's coast), soft-edged and colour-matched to the zone art
round it.

Inputs:  <work>/blp/<FileDataID>.blp  https://wago.tools/api/casc/<FileDataID>?download&version=1.60.1.71037
Run:     python gilneas.py <work>     (Pillow + numpy; run from the repository)
"""
import json, re, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

work = Path(sys.argv[1]); repo = Path(__file__).resolve().parents[2]
gpath = repo / "source/src/gdata.js"; g = gpath.read_text(encoding="utf-8")
TILES = [308492, 308496, 308497, 308498, 308499, 308500, 308501, 308502, 308503, 308493, 308494, 308495]
RECT = (0.652549, 0.722944, 0.349999, 0.420411)
W, H = 3006, 2004
art = Image.new("RGB", (1024, 768))
for n, fid in enumerate(TILES):
    art.paste(Image.open(work / "blp" / f"{fid}.blp").convert("RGB"), ((n % 4) * 256, (n // 4) * 256))
art = art.crop((0, 0, 1002, 668))
x0, x1, y0, y1 = RECT[0] * W, RECT[1] * W, RECT[2] * H, RECT[3] * H
a = np.asarray(art).astype(np.float32)
# Gilneas, its islands and the grey-blue shallows round it; not the paper sea beyond (hatched, as warm as the land,
# so it can't be told by colour alone), the frame or the paper margin. The shallows: flood the blue channel from
# points in them (they're bluer than both the land and the hatching); the land: flood from inside it, walled in by
# the shallows and by a few lines (picture pixels) across the gaps where the land runs to the picture's edge.
B = art.getchannel("B").filter(ImageFilter.MedianFilter(5)); b = np.asarray(B)
sh = B.copy()
seeds = [(190, 330), (300, 580), (500, 300), (330, 100), (215, 230)] + [(60, y) for y in range(80, 600, 20)] + \
        [(x, y) for x in range(80, 1000, 20) for y in (600, 620)] + [(x, y) for x in (870, 900, 940, 975) for y in range(150, 600, 20)]
for s in seeds:
    if 75 <= b[s[1], s[0]] <= 125 and sh.getpixel(s) != 255: ImageDraw.floodfill(sh, s, 255, thresh=28)
water = np.asarray(sh) == 255
wall = Image.fromarray(np.where(water, 255, 0).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))
inside = Image.fromarray(255 - np.asarray(wall)).copy(); dr = ImageDraw.Draw(inside)
for L in [[(180, 40), (180, 58), (195, 120), (205, 180), (212, 300)], [(180, 40), (1002, 40)], [(470, 40), (480, 100)],
          [(550, 628), (705, 628)], [(950, 150), (1002, 150)], [(968, 150), (968, 668)]]:
    dr.line(L, fill=0, width=5)
for s in [(350, 450), (560, 150)]: ImageDraw.floodfill(inside, s, 128)
land = np.asarray(inside) == 128
keep = (land & ~water).astype(np.uint8) * 255      # the land alone, for the colour match below
both = Image.fromarray(((land | water) * 255).astype(np.uint8))
ImageDraw.Draw(both).polygon([(830, 668), (1002, 490), (1002, 668)], fill=0)     # the frame's bottom-right corner piece
mask = both.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9)).filter(ImageFilter.GaussianBlur(3))
# not where the zone art already paints (the zone tiles' own alpha)
hires = json.loads(re.search(r'"hires3":(\[\[.*?\]\])', g).group(1))
cover = Image.new("L", (1002, 668), 0)
for f, hx, hy, hw, hh in hires:
    if hx > x1 or hx + hw < x0 or hy > y1 or hy + hh < y0: continue
    t = Image.open(repo / "docs" / f).convert("RGBA").getchannel("A")
    sx, sy = 1002 / (x1 - x0), 668 / (y1 - y0)
    t = t.resize((max(1, round(hw * sx)), max(1, round(hh * sy))), Image.BILINEAR)
    cover.paste(t, (round((hx - x0) * sx), round((hy - y0) * sy)), t)
free = Image.eval(cover.filter(ImageFilter.GaussianBlur(14)), lambda v: 255 - v)
m = np.minimum(np.asarray(mask), np.asarray(free)).astype(np.uint8)
# colour: match the zone art round it (its mean and spread per channel, where both are land)
ref = []
for f, hx, hy, hw, hh in hires:
    if abs(hx + hw / 2 - (x0 + x1) / 2) < 400 and abs(hy + hh / 2 - (y0 + y1) / 2) < 400:
        t = np.asarray(Image.open(repo / "docs" / f).convert("RGBA")).astype(np.float32)
        ref.append(t[t[..., 3] > 250][:, :3])
ref = np.concatenate(ref)
src = a[keep > 0]
out = a.copy()
for c in range(3):
    out[..., c] = (a[..., c] - src[:, c].mean()) / (src[:, c].std() + 1e-6) * ref[:, c].std() * 0.9 + ref[:, c].mean()
out = np.clip(out, 0, 255).astype(np.uint8)
res = Image.fromarray(np.dstack([out, m]), "RGBA")
(repo / "docs" / "gaps").mkdir(exist_ok=True)
res.save(repo / "docs" / "gaps" / "gilneas.webp", quality=90, method=6)
entry = [["gaps/gilneas.webp", round(x0, 3), round(y0, 3), round(x1 - x0, 3), round(y1 - y0, 3)]]
g = re.sub(r'"gaps":\[\[.*?\]\],', "", g)
g = g.replace('"caves":', f'"gaps":{json.dumps(entry, separators=(",", ":"))},"caves":', 1)
gpath.write_text(g, encoding="utf-8")
print(entry, (repo / "docs/gaps/gilneas.webp").stat().st_size // 1024, "KB")
