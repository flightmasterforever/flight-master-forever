"""Blizzard's own maps of caves and dungeon entrance areas: docs/caves/m<uiMapID>.webp, added to "caves" in
src/gdata.js (run caves.py first: it rewrites that list; this adds to it).

For some caves Blizzard drew a world-map micro map (the Deadmines' entrance tunnels, the inside of Blackrock
Mountain, the Wailing Caverns and Gnomeregan approaches, mines ...). caves.py leaves those out; this draws
Blizzard's map instead, cut to the cave's shape, the way OpenMap does.

From the OpenMap addon (MIT license, https://github.com/openmap-world/openmap):
  OpenMap/Data/Forever/Caves.lua          MapCaves: [uiMapID] = { name, continent (0 Eastern Kingdoms, 1 Kalimdor),
                                          minX, minY, maxX, maxY (world yards), uiMin x, y, uiMax x, y,
                                          { 12 tile file IDs, 4 across, 3 down } }; the 1002 x 668 picture of
                                          its 1024 x 768 tiles covers the box
  OpenMap/Media/Textures/Forever/MapCave/<uiMapID>.tga
                                          its mask (alpha: the cave, without the map's frame and paper)
One floor a place: a place with several (Fargodeep Mine, the Master's Cellar, Maraudon) shows its first, and
Blackrock Mountain's deeper floors (34, 35: Blackrock Caverns, the way down to the Depths) lie under its main one
and are left out, as OpenMap does.

Inputs:
  <work>/Caves.lua, <work>/mask/<uiMapID>.tga      from OpenMap (above)
  <work>/blp/<FileDataID>.blp                      (468 files, 21 MB)
                                                   https://wago.tools/api/casc/<FileDataID>?download&version=1.60.1.71037
Run:  python cavemaps.py <work>      (Pillow; run from the repository, after caves.py)
"""
import json, re, sys
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter

work = Path(sys.argv[1]); repo = Path(__file__).resolve().parents[2]
out = repo / "docs" / "caves"; out.mkdir(exist_ok=True)
gpath = repo / "source/src/gdata.js"; g = gpath.read_text(encoding="utf-8")
cont = json.loads(re.search(r'"cont":(\{.*?\}),"W"', g).group(1))
REG = {"K": [-11733.299804688, -19733.2109375, 12799.900390625, 17066.599609375],
       "E": [-16000.0, -19199.900390625, 7466.6000976562, 16000.0]}
SKIP = {34, 35}
QUALITY = 90
EDGE = 60       # pixels of the 1002 x 668 picture

def unit(c, X, Y):
    x0, y0, x1, y1 = REG[c]; cx, cy, cw, ch = cont[c]
    return cx + (y1 - Y) / (y1 - y0) * cw, cy + (x1 - X) / (x1 - x0) * ch

rows = re.findall(r'\[(\d+)\] = \{ "([^"]+)", (\d), (-?[\d.]+), (-?[\d.]+), (-?[\d.]+), (-?[\d.]+), [-\d., ]+\{ ([\d, ]+) \} \}',
                  (work / "Caves.lua").read_text(encoding="utf-8"))
first = {}
for r in rows:
    i = int(r[0])
    if i not in SKIP and (r[1] not in first or i < int(first[r[1]][0])): first[r[1]] = r
for f in out.glob("m*.webp"): f.unlink()
listed = []
for mid, name, cn, x0, y0, x1, y1, tiles in sorted(first.values(), key=lambda r: int(r[0])):
    c = "E" if cn == "0" else "K"
    u0, v0 = unit(c, float(x1), float(y1)); u1, v1 = unit(c, float(x0), float(y0))   # north-west, south-east
    art = Image.new("RGB", (1024, 768))
    for n, fid in enumerate(t.strip() for t in tiles.split(",")):
        art.paste(Image.open(work / "blp" / f"{fid}.blp").convert("RGB"), ((n % 4) * 256, (n // 4) * 256))
    art = art.crop((0, 0, 1002, 668)).convert("RGBA")
    mask = Image.open(work / "mask" / f"{mid}.tga").getchannel("A").resize(art.size, Image.BICUBIC)
    # a few masks (Frostmane Hold, Ban'ethil Barrow Den) run out to the picture's edge, which would end in a
    # straight cut: fade every mask out over the last EDGE pixels of the picture
    ramp = Image.new("L", art.size, 0); ramp.paste(255, (EDGE, EDGE, art.width - EDGE, art.height - EDGE))
    ramp = ramp.filter(ImageFilter.GaussianBlur(EDGE / 2))
    mask = ImageChops.multiply(mask, ramp)
    art.putalpha(mask)
    box = art.getbbox()
    W, H = u1 - u0, v1 - v0
    art = art.crop(box)
    bu, bv = u0 + box[0] / 1002 * W, v0 + box[1] / 668 * H
    bw, bh = art.width / 1002 * W, art.height / 668 * H
    area = sum(1 for a in art.getchannel("A").tobytes() if a > 128) * (W / 1002) * (H / 668)
    art.save(out / f"m{mid}.webp", quality=QUALITY, method=6)
    listed.append([f"caves/m{mid}.webp", round(bu, 3), round(bv, 3), round(bw, 3), round(bh, 3), round(area)])
    print(mid, name, c, round(W, 1), round(H, 1), round(area))
m = re.search(r'"caves":(\[\[.*?\]\]),', g)
caves = [t for t in json.loads(m.group(1)) if not t[0].startswith("caves/m")] + listed
g = g[:m.start(1)] + json.dumps(caves, separators=(",", ":")) + g[m.end(1):]
gpath.write_text(g, encoding="utf-8")
print("cave maps", len(listed), "size", sum(p.stat().st_size for p in out.glob("m*.webp")) // 1024, "KB")
