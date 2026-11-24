"""Sharp close-up art for the small zones: docs/zones/<slug>.webp, listed in src/gdata.js as "zart".

The detailed zone art (docs/hires3) is one picture per continent at about 3.5 pixels per map unit, so small zones
(Searing Gorge is 150 units wide) are squeezed to half the detail the game's own zone maps have, and their place
names end up a few pixels tall. This rebuilds each zone's map the way the game draws it (base tiles plus the
explored-area overlays), color-matches it to hires3, keeps only the part hires3 takes from that zone (neighboring
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
HF = 22                    # fine-detail mismatch (hires3 vs a zone's map) above which a pixel is never taken
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

def fit_color(src, dst, keep):
    """least-squares 3x3 + bias color map from src to dst on the kept pixels, refitted on the best-matching 60%"""
    X = np.c_[src[keep], np.ones(keep.sum())]; Y = dst[keep]
    for _ in range(3):
        M = np.linalg.lstsq(X, Y, rcond=None)[0]; err = np.abs(X @ M - Y).mean(1)
        sel = err <= np.percentile(err, 60); X, Y = X[sel], Y[sel]
    return M

def blur(a, r):
    return np.asarray(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32)

def fblur(a, sigma):
    """gaussian blur of a float image (any channels), edges extended"""
    r = int(3 * sigma) + 1; k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2); k /= k.sum()
    for ax in (0, 1):
        pad = [(0, 0)] * a.ndim; pad[ax] = (r, r); b = np.pad(a, pad, mode="edge")
        a = sum(k[i] * np.take(b, range(i, i + a.shape[ax]), axis=ax) for i in range(2 * r + 1))
    return a

def big_parts(m, keep=0.25):
    """the largest connected piece of a mask, plus any piece at least `keep` of its size"""
    a = np.asarray(m) > 127; lab = np.zeros(a.shape, np.int32); sizes = [0]
    for y0, x0 in zip(*np.nonzero(a)):
        if lab[y0, x0]: continue
        n = len(sizes); sizes.append(0); st = [(y0, x0)]; lab[y0, x0] = n
        while st:
            y, x = st.pop(); sizes[n] += 1
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < a.shape[0] and 0 <= xx < a.shape[1] and a[yy, xx] and not lab[yy, xx]: lab[yy, xx] = n; st.append((yy, xx))
    if len(sizes) == 1: return m
    big = max(sizes); ok = [i for i, sz in enumerate(sizes) if i and sz >= keep * big]
    return Image.fromarray((np.isin(lab, ok) * 255).astype(np.uint8))

def fill_holes(m):
    """a mask with every enclosed hole filled (flood the outside from the border)"""
    pad = Image.new("L", (m.width + 2, m.height + 2), 0); pad.paste(m, (1, 1))
    ImageDraw.floodfill(pad, (0, 0), 128)
    return pad.crop((1, 1, m.width + 1, m.height + 1)).point(lambda v: 0 if v == 128 else 255)

# every zone's map, color-matched to hires3, and how far it is from hires3 at each hires3 pixel
info = {}
for z in zones:
    name, (x, y, w, h) = z[0], z[2:6]
    if name not in uimap or name == "Zephras Isle": continue
    H, x0, y0 = cont["k" if x < 1500 else "e"]
    X, Y = round((x - x0) * P), round((y - y0) * P)
    hr = H[Y:Y + round(h * P), X:X + round(w * P)]; Hh, W = hr.shape[:2]
    cache = work / "cache" / f"{name}.npy"; cache.parent.mkdir(exist_ok=True)
    if cache.exists(): full = np.load(cache)
    else: full = zone_map(name); np.save(cache, full)
    sm = np.asarray(Image.fromarray(full.astype(np.uint8)).resize((W, Hh), Image.LANCZOS)).astype(np.float32)
    M = fit_color(sm, hr[..., :3], hr[..., 3] > 250)
    err = np.abs((np.c_[sm.reshape(-1, 3), np.ones(W * Hh)] @ M).reshape(Hh, W, 3) - hr[..., :3]).mean(2)
    # fine detail (lettering, icons, outlines) that hires3 shows here but this zone's map doesn't: a neighbor's label
    # near the border must not be painted over
    hp = lambda a: a.mean(2) - fblur(a.mean(2), 1.5)
    fit = (np.c_[sm.reshape(-1, 3), np.ones(W * Hh)] @ M).reshape(Hh, W, 3)
    hf = fblur(np.abs(hp(hr[..., :3]) - hp(fit)), 4)
    info[name] = dict(z=z, X=X, Y=Y, W=W, Hh=Hh, H=H, M=M, full=full, err=blur(err, 6) + 1.5 * hf, hf=hf, land=hr[..., 3] > 250, hr=hr, sm=sm)

out = []; (docs / "zones").mkdir(exist_ok=True)
for name, d in info.items():
    x, y, w, h = d["z"][2:6]
    if ZW / w < P * GAIN: continue
    # this zone owns a pixel where its map explains hires3 (color plus fine detail such as lettering) at least as well as any neighboring zone's map does
    best_other = np.full(d["err"].shape, 255, np.float32)
    for o, e in info.items():
        if o == name or e["H"] is not d["H"]: continue
        ax, ay = max(d["X"], e["X"]), max(d["Y"], e["Y"]); bx, by = min(d["X"] + d["W"], e["X"] + e["W"]), min(d["Y"] + d["Hh"], e["Y"] + e["Hh"])
        if ax >= bx or ay >= by: continue
        sub = e["err"][ay - e["Y"]:by - e["Y"], ax - e["X"]:bx - e["X"]]
        reg = best_other[ay - d["Y"]:by - d["Y"], ax - d["X"]:bx - d["X"]]
        np.minimum(reg, sub, out=reg)
    own = (d["err"] <= best_other + 1.5) & (d["err"] < 40) & (d["hf"] < HF) & d["land"]
    m = Image.fromarray((own * 255).astype(np.uint8))
    m = m.filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(15)).filter(ImageFilter.MinFilter(9))  # drop specks, close gaps
    m = fill_holes(big_parts(m))  # a stray piece of a neighboring zone that happens to match is dropped
    m = m.resize((ZW, ZH), Image.BILINEAR).filter(ImageFilter.MinFilter(9)).filter(ImageFilter.GaussianBlur(5))  # soft edge, kept inside
    # hires3 stays exactly as it is at its own size (all its color and contrast); the zone map only adds the detail
    # finer than hires3 can hold: its full-size picture minus itself blurred down to hires3's size
    W, Hh = d["W"], d["Hh"]
    up = lambda a: np.stack([np.asarray(Image.fromarray(a[..., c].astype(np.float32), "F").resize((ZW, ZH), Image.BICUBIC)) for c in range(3)], -1)
    fit = (np.c_[d["full"].reshape(-1, 3), np.ones(ZW * ZH)] @ d["M"]).reshape(ZH, ZW, 3)
    down = np.stack([np.asarray(Image.fromarray(fit[..., c].astype(np.float32), "F").resize((W, Hh), Image.LANCZOS)) for c in range(3)], -1)
    rgb = up(d["hr"][..., :3]) + (fit - up(down))
    # where hires3 itself is see-through (a few cut-outs), the map below shows there; leave those alone too
    ha = Image.fromarray(d["hr"][..., 3].astype(np.uint8)).resize((ZW, ZH), Image.BILINEAR).filter(ImageFilter.MinFilter(5))
    m = Image.fromarray((np.asarray(m, np.float32) * np.asarray(ha, np.float32) / 255).astype(np.uint8))
    img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).convert("RGBA"); img.putalpha(m)
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
