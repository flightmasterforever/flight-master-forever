"""Minimap-level close-up tiles: docs/minimap/<e|k>_<col>_<row>.webp, listed in src/gdata.js as "mini".

Past the point where the world map art runs out of detail, the app fades over to the game's own minimap
terrain (512x512 pixels for each 533 1/3-yard map tile, about 14 pixels a map unit, 4x the world map art).
Only land is kept: each tile takes its see-through parts from the world map art (docs/hires3, which is see-through
over open sea), so the sea stays the map's own sea, and tiles with no land at all (open sea, the flat placeholder
tiles some sea spots have) are left out.
Out-of-bounds patches are hidden too: in places (mountain walls between zones, some coasts) the game's minimap has
blocks of unfinished terrain, whole map chunks (33 yards square) that are flat and blurry and meet the real
terrain along a straight, sharp step. Those blocks are made see-through, with a soft edge, so the world map art
shows there instead.

Inputs, all from the WoW: Forever client (build 1.60.1.71037) via wago.tools:
  <work>/all.txt                  lines "world/minimaps/<azeroth|kalimdor>/map<col>_<row>.blp <FileDataID>"
                                  (every such file in the wago.tools file list: https://wago.tools/files?search=...)
  <work>/fid/<FileDataID>.blp     https://wago.tools/api/casc/<FileDataID>?download&version=1.60.1.71037
  <work>/db/UiMapAssignment.csv   https://wago.tools/db2/UiMapAssignment/csv?build=1.60.1.71037
Run:  python minimap.py <work>          (Pillow; run from the repository)
"""
import csv, json, re, sys
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np
import collections

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

CH, NC = 32, 16  # chunk size in pixels (of a 512 tile) and chunks per tile side

def tiles_listed():
    out = {}
    for line in open(work / "all.txt"):
        name, fid = line.split()
        m = re.search(r"minimaps/(azeroth|kalimdor)/map(\d+)_(\d+)\.blp", name)
        src = work / "fid" / f"{fid}.blp"
        if m and src.exists() and src.stat().st_size: out[(m.group(1), int(m.group(2)), int(m.group(3)))] = fid
    return out

def edge_stats(A, B, IA, IB):
    """pixel rows (..., 32, 3) of log color either side of chunk edges (and one pixel further in) ->
    is it a straight, sharp step: big jump across the edge, little change just inside, same sign all along"""
    d = np.median(A - B, -2); m = np.abs(d).max(-1)
    inner = np.maximum(np.abs(np.median(IA - A, -2)), np.abs(np.median(B - IB, -2))).max(-1)
    cons = (np.sign((A - B).mean(-1)) == np.sign(d.sum(-1))[..., None]).mean(-1)
    return (m > 0.3) & (inner < 0.35 * m) & (cons > 0.85)

def survey(item):
    """one tile: each chunk's detail (mean absolute Laplacian), its sharp-step chunk edges, and its border pixels"""
    key, fid = item
    im = Image.open(work / "fid" / f"{fid}.blp").convert("RGB")
    if im.size != (512, 512): im = im.resize((512, 512), Image.BICUBIC)
    rgb = np.asarray(im).astype(np.float32); L = np.log(rgb + 4); g = rgb.mean(2)
    lap = np.pad(np.abs(4 * g[1:-1, 1:-1] - g[:-2, 1:-1] - g[2:, 1:-1] - g[1:-1, :-2] - g[1:-1, 2:]), 1, mode="edge")
    detail = lap.reshape(NC, CH, NC, CH).mean((1, 3))
    xs = np.arange(NC - 1) * CH + CH - 1
    v = lambda x: L[:, x].reshape(NC, CH, NC - 1, 3).transpose(0, 2, 1, 3)
    h = lambda y: L[y, :].reshape(NC - 1, NC, CH, 3)
    return key, detail, edge_stats(v(xs), v(xs + 1), v(xs - 1), v(xs + 2)), edge_stats(h(xs), h(xs + 1), h(xs - 1), h(xs + 2)), \
        dict(l=L[:, :2], r=L[:, -2:], t=L[:2, :], b=L[-2:, :])

def find_junk(pool):
    """chunks of unfinished terrain: flat (low detail) chunks joined to the real terrain by a sharp straight step,
    and every flat chunk connected to those"""
    res = pool.map(survey, list(tiles_listed().items()), chunksize=8)
    det, steps, borders = {}, [], {}
    for (cont, col, row), detail, V, H, bd in res:
        borders[(cont, col, row)] = bd
        for r in range(NC):
            for c in range(NC):
                det[(cont, col * NC + c, row * NC + r)] = detail[r, c]
        for r, c in zip(*np.nonzero(V)): steps.append(((cont, col * NC + c, row * NC + r), (cont, col * NC + c + 1, row * NC + r)))
        for r, c in zip(*np.nonzero(H)): steps.append(((cont, col * NC + c, row * NC + r), (cont, col * NC + c, row * NC + r + 1)))
    for (cont, col, row), bd in borders.items():
        if (cont, col + 1, row) in borders:
            o = borders[(cont, col + 1, row)]
            st = edge_stats(*[x.reshape(NC, CH, 3) for x in (bd["r"][:, 1], o["l"][:, 0], bd["r"][:, 0], o["l"][:, 1])])
            for r in np.nonzero(st)[0]: steps.append(((cont, col * NC + NC - 1, row * NC + r), (cont, (col + 1) * NC, row * NC + r)))
        if (cont, col, row + 1) in borders:
            o = borders[(cont, col, row + 1)]
            st = edge_stats(*[x.reshape(NC, CH, 3) for x in (bd["b"][1], o["t"][0], bd["b"][0], o["t"][1])])
            for c in np.nonzero(st)[0]: steps.append(((cont, col * NC + c, row * NC + NC - 1), (cont, col * NC + c, (row + 1) * NC)))
    low = {k for k, v in det.items() if 0.5 < v < 6.5}  # 0 is empty open sea
    seeds = [p for e in steps for p in e if p in low and any(q not in low for q in e)]
    junk = set(); todo = collections.deque(seeds)
    while todo:
        k = todo.popleft()
        if k in junk: continue
        junk.add(k); cont, x, y = k
        for q in ((cont, x + 1, y), (cont, x - 1, y), (cont, x, y + 1), (cont, x, y - 1)):
            if q in low and q not in junk: todo.append(q)
    return junk

def keep_mask(c, col, row, size):
    """alpha multiplier for one tile: 0 over junk chunks, soft-edged (neighbor tiles' chunks count at the edges)"""
    cont = "azeroth" if c == "E" else "kalimdor"
    grid = np.array([[0 if (cont, col * NC + cx, row * NC + cy) in JUNK else 255 for cx in range(-1, NC + 1)] for cy in range(-1, NC + 1)], np.uint8)
    if grid.min() == 255: return None
    s = size / NC; big = Image.fromarray(grid).resize((round(s * (NC + 2)),) * 2, Image.BILINEAR)
    big = big.crop((round(s), round(s), round(s) + size, round(s) + size))
    return big.filter(ImageFilter.GaussianBlur(s / 4))

JUNK = set()

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
    k = keep_mask(c, col, row, im.size[0])
    if k is not None: a = Image.fromarray((np.asarray(a).astype(np.float32) * np.asarray(k) / 255).round().astype(np.uint8))
    an = np.asarray(a)
    if an.max() < 8: return "sea"
    f = f"minimap/{c.lower()}_{col}_{row}.webp"
    if an.min() < 250: im.putalpha(a)
    im.save(repo / "docs" / f, "webp", quality=QUALITY, method=6)
    return [f, round(ux0, 3), round(uy0, 3), round(ux1 - ux0, 3), round(uy1 - uy0, 3)]

if __name__ == "__main__":
    import multiprocessing
    for old in out.glob("*.webp"): old.unlink()
    with multiprocessing.Pool() as pool: JUNK = find_junk(pool)
    print(len(JUNK), "out-of-bounds chunks hidden", flush=True)
    with multiprocessing.Pool() as pool: res = pool.map(tile, [l for l in open(work / "all.txt") if l.strip()])
    mini = [r for r in res if isinstance(r, list)]; skipped = res.count("sea")
    mini.sort()
    g = re.sub(r'"mini":\[\[.*?\]\],', "", g)
    g = g.replace('"cities":', f'"mini":{json.dumps(mini, separators=(",", ":"))},"cities":', 1)
    gpath.write_text(g, encoding="utf-8")
    print(len(mini), "tiles,", skipped, "all-sea tiles left out")
