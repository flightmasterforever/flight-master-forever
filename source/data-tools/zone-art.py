"""Sharp close-up art for the small zones: docs/zones/<slug>.webp, listed in src/gdata.js as "zart".

The detailed zone art (docs/hires3) is one picture per continent at about 3.5 pixels per map unit, so small zones
(Searing Gorge is 150 units wide) are squeezed to half the detail the game's own zone maps have, and their place
names end up a few pixels tall. This rebuilds each zone's map the way the game draws it (base tiles plus the
explored-area overlays), colour-matches it to hires3, keeps only the part hires3 takes from that zone (neighbouring
zones and the parchment frame are cut away with a soft edge), and writes it out at the game's full 1002x668.
The app draws these over hires3 only when zoomed in past what hires3 can show.

Inputs, all from the WoW: Forever client (build 1.60.1.71037) via wago.tools:
  <work>/db/UiMap.csv, UiMapXMapArt.csv, UiMapArtTile.csv, WorldMapOverlay.csv, WorldMapOverlayTile.csv
      https://wago.tools/db2/<table>/csv?build=1.60.1.71037
  <work>/fid/<FileDataID>.blp   every tile those tables name for the zones below
      https://wago.tools/api/casc/<FileDataID>?download&version=1.60.1.71037
Run:  python zone-art.py <work>          (Pillow + numpy; run from the repository)
"""
import csv, json, re, sys, collections
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

work = Path(sys.argv[1]); repo = Path(__file__).resolve().parents[2]
docs = repo / "docs"; gpath = repo / "source/src/gdata.js"
g = gpath.read_text(encoding="utf-8")
zones = json.loads(re.search(r'"zones":(\[\[.*?\]\])', g).group(1))
hires = json.loads(re.search(r'"hires3":(\[\[.*?\]\])', g).group(1))
P = 1024 / 292.57          # hires3 pixels per map unit
ZW, ZH = 1002, 668         # the game's zone map size
GAIN = 1.15                # only zones whose own map has at least this much more detail than hires3

rd = lambda t: list(csv.DictReader(open(work / "db" / f"{t}.csv", encoding="utf-8")))
uimap = {r["Name_lang"]: r["ID"] for r in rd("UiMap")}
artof = {r["UiMapID"]: r["UiMapArtID"] for r in rd("UiMapXMapArt")}
base = collections.defaultdict(list)
for r in rd("UiMapArtTile"): base[r["UiMapArtID"]].append((int(r["RowIndex"]), int(r["ColIndex"]), int(r["LayerIndex"]), r["FileDataID"]))
ovl = collections.defaultdict(list)
for r in rd("WorldMapOverlay"): ovl[r["UiMapArtID"]].append(r)
ovt = collections.defaultdict(list)
for r in rd("WorldMapOverlayTile"): ovt[r["WorldMapOverlayID"]].append((int(r["RowIndex"]), int(r["ColIndex"]), r["FileDataID"]))
blp = lambda f: Image.open(work / "fid" / f"{f}.blp").convert("RGBA")

def zone_map(name):
    a = artof[uimap[name]]; im = Image.new("RGBA", (1024, 768))
    for r, c, l, f in sorted(base[a], key=lambda t: t[2]): im.paste(blp(f), (c * 256, r * 256))
    for o in ovl[a]:
        for r, c, f in ovt[o["ID"]]:
            x, y = int(o["OffsetX"]) + c * 256, int(o["OffsetY"]) + r * 256
            if x < 1024 and y < 768: im.alpha_composite(blp(f), (x, y))
    return np.asarray(im.convert("RGB").crop((0, 0, ZW, ZH))).astype(np.float32)

def continent(pre):
    ts = [t for t in hires if t[0].startswith("hires3/" + pre)]
    x0, y0 = min(t[1] for t in ts), min(t[2] for t in ts)
    w = round((max(t[1] + t[3] for t in ts) - x0) * P) + 4; h = round((max(t[2] + t[4] for t in ts) - y0) * P) + 4
    c = Image.new("RGBA", (w, h))
    for t in ts: c.paste(Image.open(docs / t[0]).convert("RGBA"), (round((t[1] - x0) * P), round((t[2] - y0) * P)))
    return np.asarray(c).astype(np.float32), x0, y0
cont = {"k": continent("k"), "e": continent("e")}

def fit_colour(src, dst, keep):
    """least-squares 3x3 + bias colour map from src to dst on the kept pixels, refitted on the best-matching 60%"""
    X = np.c_[src[keep], np.ones(keep.sum())]; Y = dst[keep]
    for _ in range(3):
        M = np.linalg.lstsq(X, Y, rcond=None)[0]; err = np.abs(X @ M - Y).mean(1)
        sel = err <= np.percentile(err, 60); X, Y = X[sel], Y[sel]
    return M

def blur(a, r):
    return np.asarray(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32)

def fill_holes(m):
    """a mask with every enclosed hole filled (flood the outside from the border)"""
    pad = Image.new("L", (m.width + 2, m.height + 2), 0); pad.paste(m, (1, 1))
    ImageDraw.floodfill(pad, (0, 0), 128)
    return pad.crop((1, 1, m.width + 1, m.height + 1)).point(lambda v: 0 if v == 128 else 255)

# every zone's map, colour-matched to hires3, and how far it is from hires3 at each hires3 pixel
info = {}
for z in zones:
    name, (x, y, w, h) = z[0], z[2:6]
    if name not in uimap or name == "Zephras Isle": continue
    H, x0, y0 = cont["k" if x < 1500 else "e"]
    X, Y = round((x - x0) * P), round((y - y0) * P)
    hr = H[Y:Y + round(h * P), X:X + round(w * P)]; Hh, W = hr.shape[:2]
    full = zone_map(name)
    sm = np.asarray(Image.fromarray(full.astype(np.uint8)).resize((W, Hh), Image.LANCZOS)).astype(np.float32)
    M = fit_colour(sm, hr[..., :3], hr[..., 3] > 250)
    err = np.abs((np.c_[sm.reshape(-1, 3), np.ones(W * Hh)] @ M).reshape(Hh, W, 3) - hr[..., :3]).mean(2)
    info[name] = dict(z=z, X=X, Y=Y, W=W, Hh=Hh, H=H, M=M, full=full, err=blur(err, 6), land=hr[..., 3] > 250)

out = []; (docs / "zones").mkdir(exist_ok=True)
for name, d in info.items():
    x, y, w, h = d["z"][2:6]
    if ZW / w < P * GAIN: continue
    # this zone owns a pixel where its map matches hires3 at least as well as any neighbouring zone's map does
    best_other = np.full(d["err"].shape, 255, np.float32)
    for o, e in info.items():
        if o == name or e["H"] is not d["H"]: continue
        ax, ay = max(d["X"], e["X"]), max(d["Y"], e["Y"]); bx, by = min(d["X"] + d["W"], e["X"] + e["W"]), min(d["Y"] + d["Hh"], e["Y"] + e["Hh"])
        if ax >= bx or ay >= by: continue
        sub = e["err"][ay - e["Y"]:by - e["Y"], ax - e["X"]:bx - e["X"]]
        reg = best_other[ay - d["Y"]:by - d["Y"], ax - d["X"]:bx - d["X"]]
        np.minimum(reg, sub, out=reg)
    own = (d["err"] <= best_other + 1.5) & (d["err"] < 28) & d["land"]
    m = Image.fromarray((own * 255).astype(np.uint8))
    m = m.filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(15)).filter(ImageFilter.MinFilter(9))  # drop specks, close gaps
    m = fill_holes(m)
    m = m.resize((ZW, ZH), Image.BILINEAR).filter(ImageFilter.MinFilter(9)).filter(ImageFilter.GaussianBlur(5))  # soft edge, kept inside
    rgb = np.c_[d["full"].reshape(-1, 3), np.ones(ZW * ZH)] @ d["M"]
    img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8).reshape(ZH, ZW, 3)).convert("RGBA"); img.putalpha(m)
    bb = m.point(lambda v: 255 if v > 8 else 0).getbbox()
    if not bb: continue
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower().replace("'", "")).strip("-")
    img.crop(bb).save(docs / "zones" / f"{slug}.webp", "WEBP", quality=88, method=6)
    sx, sy = w / ZW, h / ZH
    out.append([f"zones/{slug}.webp", round(x + bb[0] * sx, 2), round(y + bb[1] * sy, 2), round((bb[2] - bb[0]) * sx, 2), round((bb[3] - bb[1]) * sy, 2)])
    print(f"{name:22s} {ZW / w / P:.2f}x detail, covers {np.mean(np.asarray(m) > 128):.0%} of its map")

z = json.dumps(out, separators=(",", ":"))
g = re.sub(r',"zart":\[\[.*?\]\]', "", g)
g = g.replace('"cities":', f'"zart":{z},"cities":', 1)
gpath.write_text(g, encoding="utf-8")
print("zones", len(out))
