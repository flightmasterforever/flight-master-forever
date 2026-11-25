"""Minimap-level close-up tiles: docs/minimap/<e|k>_<col>_<row>.webp, listed in src/gdata.js as "mini".

Past the point where the world map art runs out of detail, the app fades over to the game's own minimap
terrain (512x512 pixels for each 533 1/3-yard map tile, about 14 pixels a map unit, 4x the world map art).
Only land is kept: each tile takes its see-through parts from the world map art (docs/hires3, which is see-through
over open sea), so the sea stays the map's own sea, and tiles with no land at all (open sea, the flat placeholder
tiles some sea spots have) are left out.

Inputs, all from the WoW: Forever client (build 1.60.1.71037) via wago.tools:
  <work>/all.txt                  lines "world/minimaps/<azeroth|kalimdor>/map<col>_<row>.blp <FileDataID>"
                                  (every such file in the wago.tools file list: https://wago.tools/files?search=...)
  <work>/fid/<FileDataID>.blp     https://wago.tools/api/casc/<FileDataID>?download&version=1.60.1.71037
  <work>/db/UiMapAssignment.csv   https://wago.tools/db2/UiMapAssignment/csv?build=1.60.1.71037
Run:  python minimap.py <work>          (Pillow; run from the repository)
"""
import csv, json, re, sys
from pathlib import Path
from PIL import Image
import numpy as np

work = Path(sys.argv[1]); repo = Path(__file__).resolve().parents[2]
out = repo / "docs" / "minimap"; out.mkdir(exist_ok=True)
gpath = repo / "source/src/gdata.js"; g = gpath.read_text(encoding="utf-8")
cont = json.loads(re.search(r'"cont":(\{.*?\}),"W"', g).group(1))
hires = json.loads(re.search(r'"hires3":(\[\[.*?\]\])', g).group(1))
T = 1600 / 3  # yards per map tile
P = 1024 / 292.57  # hires3 pixels per map unit
QUALITY = 90

# the continent maps' world regions (Kalimdor 1414, Eastern Kingdoms 1415): the same transform the flight data uses
reg = {}
for r in csv.DictReader(open(work / "db" / "UiMapAssignment.csv", encoding="utf-8")):
    if r["UiMapID"] in ("1414", "1415") and r["OrderIndex"] == "0":
        reg["K" if r["UiMapID"] == "1414" else "E"] = [float(r[f"Region_{i}"]) for i in (0, 1, 3, 4)]

def unit(c, X, Y):
    x0, y0, x1, y1 = reg[c]; cx, cy, cw, ch = cont[c]
    return cx + (y1 - Y) / (y1 - y0) * cw, cy + (x1 - X) / (x1 - x0) * ch

def land(pre):
    """the continent's hires3 alpha (land) as one picture, and its top-left corner in map units"""
    ts = [t for t in hires if t[0].startswith("hires3/" + pre)]
    x0, y0 = min(t[1] for t in ts), min(t[2] for t in ts)
    w = round((max(t[1] + t[3] for t in ts) - x0) * P) + 4; h = round((max(t[2] + t[4] for t in ts) - y0) * P) + 4
    c = Image.new("L", (w, h))
    for t in ts: c.paste(Image.open(repo / "docs" / t[0]).getchannel("A"), (round((t[1] - x0) * P), round((t[2] - y0) * P)))
    return c, x0, y0
lands = {"K": land("k"), "E": land("e")}

def tile(line):
    name, fid = line.split()
    m = re.search(r"minimaps/(azeroth|kalimdor)/map(\d+)_(\d+)\.blp", name)
    src = work / "fid" / f"{fid}.blp"
    # files that are not in the Forever client (later expansions' tiles) come back empty
    if not m or not src.exists() or src.stat().st_size == 0: return None
    c = "E" if m.group(1) == "azeroth" else "K"; col, row = int(m.group(2)), int(m.group(3))
    # tile columns run west to east (world Y falling), rows north to south (world X falling)
    ux0, uy0 = unit(c, (32 - row) * T, (32 - col) * T); ux1, uy1 = unit(c, (31 - row) * T, (31 - col) * T)
    # the tile's land: hires3's alpha over the same ground, smoothly enlarged to the tile's size
    L, lx, ly = lands[c]
    bx0, by0, bx1, by1 = (ux0 - lx) * P, (uy0 - ly) * P, (ux1 - lx) * P, (uy1 - ly) * P
    cx0, cy0 = int(bx0) - 2, int(by0) - 2  # crop (see-through past the art's edge) a little wider, then enlarge
    piece = L.crop((cx0, cy0, int(bx1) + 3, int(by1) + 3))
    im = Image.open(src).convert("RGB")
    a = piece.resize(im.size, Image.BICUBIC, box=(bx0 - cx0, by0 - cy0, bx1 - cx0, by1 - cy0))
    an = np.asarray(a)
    if an.max() < 8: return "sea"
    f = f"minimap/{c.lower()}_{col}_{row}.webp"
    if an.min() < 250: im.putalpha(a)
    im.save(repo / "docs" / f, "webp", quality=QUALITY, method=6)
    return [f, round(ux0, 3), round(uy0, 3), round(ux1 - ux0, 3), round(uy1 - uy0, 3)]

if __name__ == "__main__":
    import multiprocessing
    for old in out.glob("*.webp"): old.unlink()
    with multiprocessing.Pool() as pool: res = pool.map(tile, [l for l in open(work / "all.txt") if l.strip()])
    mini = [r for r in res if isinstance(r, list)]; skipped = res.count("sea")
    mini.sort()
    g = re.sub(r'"mini":\[\[.*?\]\],', "", g)
    g = g.replace('"cities":', f'"mini":{json.dumps(mini, separators=(",", ":"))},"cities":', 1)
    gpath.write_text(g, encoding="utf-8")
    print(len(mini), "tiles,", skipped, "all-sea tiles left out")
