"""Roads for "Run to" legs: source/data-tools/roads/<E|K>.json -> "roads" in src/gdata.js.

The roads were traced by hand over the game's own minimap tiles (docs/minimap, from the WoW: Forever client), one
polyline per stretch of road, in map units. An entry {"p": [...], "link": "..."} is a hand-made link the minimap can't
show (the way through Blackrock Mountain); it is kept exactly as drawn.

This script pulls every other traced line onto the middle of its road (the cheapest path through the light, road-coloured
pixels of the minimap, kept within 2 map units of the hand line), then joins the lines into one network: points closer
than 1.2 units are merged, and a line that ends within 2.5 units of another road is joined onto it.

Output, in gdata.js: "roads":{"p":[x0,y0,x1,y1,...],"e":[a0,b0,a1,b1,...]}  (points, and edges as point indexes)
Run:  python roads.py          (Pillow + numpy; run from the repository; takes a couple of minutes)
"""
import heapq, json, math, re, os
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

repo = Path(__file__).resolve().parents[2]
src = Path(__file__).resolve().parent / "roads"
gpath = repo / "source/src/gdata.js"; g = gpath.read_text(encoding="utf-8")
cont = json.loads(re.search(r'"cont":(\{.*?\}),"W"', g).group(1))
# the continent maps' world regions (UiMapAssignment 1414 Kalimdor / 1415 Eastern Kingdoms, build 1.60.1.71037),
# the same transform the flight data and the minimap tiles use
REG = {"K": [-11733.299804688, -19733.2109375, 12799.900390625, 17066.599609375],
       "E": [-16000.0, -19199.900390625, 7466.6000976562, 16000.0]}
T = 1600 / 3; PPU = 14.0; CORR = float(os.environ.get("ROADS_CORR", 6)); PFX = {"E": "e", "K": "k"}

def unit(c, X, Y):
    x0, y0, x1, y1 = REG[c]; cx, cy, cw, ch = cont[c]
    return cx + (y1 - Y) / (y1 - y0) * cw, cy + (x1 - X) / (x1 - x0) * ch

def tile_unit(c, col, row):
    a = unit(c, (32 - row) * T, (32 - col) * T); b = unit(c, (31 - row) * T, (31 - col) * T)
    return a, (b[0] - a[0], b[1] - a[1])

def mosaic(c, u0, v0, u1, v1):
    W = int((u1 - u0) * PPU); H = int((v1 - v0) * PPU); im = Image.new("RGB", (W, H), (20, 20, 30))
    a, (du, dv) = tile_unit(c, 0, 0)
    for col in range(int((u0 - a[0]) / du) - 1, int((u1 - a[0]) / du) + 2):
        for row in range(int((v0 - a[1]) / dv) - 1, int((v1 - a[1]) / dv) + 2):
            f = repo / "docs/minimap" / f"{PFX[c]}_{col}_{row}.webp"
            if not f.exists(): continue
            (tu, tv), _ = tile_unit(c, col, row); s = int(round(du * PPU)) + 1
            im.paste(Image.open(f).convert("RGB").resize((s, s), Image.LANCZOS), (int(round((tu - u0) * PPU)), int(round((tv - v0) * PPU))))
    return im

def dens(P, step):
    out = [tuple(P[0])]
    for a, b in zip(P, P[1:]):
        n = max(1, int(math.dist(a, b) / step))
        out += [(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n) for i in range(1, n + 1)]
    return out

def rdp(P, eps):
    if len(P) < 3: return P
    a, b = P[0], P[-1]; ab = (b[0] - a[0], b[1] - a[1]); L = math.hypot(*ab) or 1e-9
    d = [abs(ab[0] * (p[1] - a[1]) - ab[1] * (p[0] - a[0])) / L for p in P[1:-1]]; i = int(np.argmax(d)) + 1
    if d[i - 1] > eps: return rdp(P[:i + 1], eps)[:-1] + rdp(P[i:], eps)
    return [P[0], P[-1]]

def snap(c, P):
    D = dens(P, 0.25); us = [p[0] for p in D]; vs = [p[1] for p in D]
    u0, v0, u1, v1 = min(us) - CORR - 1, min(vs) - CORR - 1, max(us) + CORR + 1, max(vs) + CORR + 1
    a = np.asarray(mosaic(c, u0, v0, u1, v1)).astype(np.float32); L = a.mean(2)
    bg = np.asarray(Image.fromarray(L.astype(np.uint8)).filter(ImageFilter.GaussianBlur(PPU * 2))).astype(np.float32)
    road = np.clip((L - bg) / 14, 0, 1)
    # roads are grey: much less coloured than the ground round them (the best sign in most zones; snow and sand are
    # grey too, so there the lightness above does the work)
    mx, mn = a.max(2), a.min(2); sat = (mx - mn) / (mx + 1)
    sb = np.asarray(Image.fromarray((sat * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(PPU * 1.5))).astype(np.float32) / 255
    lb = np.asarray(Image.fromarray(L.astype(np.uint8)).filter(ImageFilter.GaussianBlur(PPU * 1.5))).astype(np.float32)
    grey = np.clip((sb - sat) * 6, 0, 1) * np.clip((L - lb) / 12 + 0.5, 0, 1)
    road = np.maximum(grey, road * 0.8)
    road = np.asarray(Image.fromarray((road * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255
    H, W = road.shape; dist = np.full((H, W), 1e9, np.float32); yy, xx = np.mgrid[0:H, 0:W]; r = CORR * PPU
    for p in D[::2]:
        x, y = (p[0] - u0) * PPU, (p[1] - v0) * PPU
        ya, yb, xa, xb = int(max(0, y - r)), int(min(H, y + r + 1)), int(max(0, x - r)), int(min(W, x + r + 1))
        dist[ya:yb, xa:xb] = np.minimum(dist[ya:yb, xa:xb], np.hypot(xx[ya:yb, xa:xb] - x, yy[ya:yb, xa:xb] - y))
    mask = dist <= r; cost = 1 + 8 * (1 - road) ** 2 + (dist / r) ** 2
    pix = lambda p: (min(H - 1, int((p[1] - v0) * PPU)), min(W - 1, int((p[0] - u0) * PPU)))
    s, t = pix(P[0]), pix(P[-1])
    gd = np.full((H, W), np.inf); gd[s] = 0; prev = -np.ones((H, W), np.int64); pq = [(0.0, s)]
    nb = [(-1, 0, 1), (1, 0, 1), (0, -1, 1), (0, 1, 1), (-1, -1, 1.414), (-1, 1, 1.414), (1, -1, 1.414), (1, 1, 1.414)]
    while pq:
        d, (y, x) = heapq.heappop(pq)
        if (y, x) == t: break
        if d > gd[y, x]: continue
        for dy, dx, l in nb:
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and mask[ny, nx]:
                nd = d + l * (cost[y, x] + cost[ny, nx]) / 2
                if nd < gd[ny, nx]: gd[ny, nx] = nd; prev[ny, nx] = y * W + x; heapq.heappush(pq, (nd, (ny, nx)))
    if not np.isfinite(gd[t]): return [tuple(p) for p in P]
    path = [t]
    while path[-1] != s: k = prev[path[-1]]; path.append((k // W, k % W))
    Q = np.array([(u0 + x / PPU, v0 + y / PPU) for y, x in path[::-1]]); k = 5
    if len(Q) > 2 * k:
        sm = Q.copy()
        for i in range(k, len(Q) - k): sm[i] = Q[i - k:i + k + 1].mean(0)
        Q = sm
    Q = rdp([tuple(q) for q in Q], 0.2); Q[0] = tuple(P[0]); Q[-1] = tuple(P[-1])
    return Q

lines = []
cpath = os.environ.get("ROADS_CACHE")  # optional: a file that keeps snapped lines between runs
cache = json.load(open(cpath)) if cpath and os.path.exists(cpath) else {}
for c in ("E", "K"):
    for i, r in enumerate(json.load(open(src / f"{c}.json"))):
        if isinstance(r, dict): lines.append([tuple(p) for p in r["p"]]); continue
        key = c + json.dumps(r)
        if key not in cache: cache[key] = snap(c, r)
        lines.append([tuple(p) for p in cache[key]])
    if cpath: json.dump(cache, open(cpath, "w"))
    print(c, "done", flush=True)

# one network: merge near points, join line ends onto nearby roads
P, E = [], {}
def add(p):
    for i, q in enumerate(P):
        if math.dist(p, q) < 1.2: return i
    P.append(tuple(p)); return len(P) - 1
def link(a, b):
    if a != b: E.setdefault(a, set()).add(b); E.setdefault(b, set()).add(a)
for r in lines:
    ids = [add(p) for p in r]
    for a, b in zip(ids, ids[1:]): link(a, b)
def nearest(p, skip):
    best = None
    for a in list(E):
        if a in skip: continue
        for b in E[a]:
            if b in skip: continue
            A, B = P[a], P[b]; dx, dy = B[0] - A[0], B[1] - A[1]; L = dx * dx + dy * dy or 1
            t = max(0, min(1, ((p[0] - A[0]) * dx + (p[1] - A[1]) * dy) / L)); q = (A[0] + t * dx, A[1] + t * dy); d = math.dist(p, q)
            if best is None or d < best[0]: best = (d, a, b, q)
    return best
for r in lines:
    for p in (r[0], r[-1]):
        i = add(p)
        if len(E.get(i, ())) != 1: continue
        near = {i} | E[i]
        res = nearest(p, near)
        if res and res[0] < 2.5:
            d, a, b, q = res; n = add(q)
            if n not in (a, b) and b in E[a]: E[a].discard(b); E[b].discard(a); link(a, n); link(n, b)
            link(i, n)
# lines traced in separate pieces that stop just short of each other: join the closest pair of points of two separate
# pieces of road while they are within 50 units of each other (nearest first; the gaps are where tracing stopped at the
# edge of a view. The gap left between the north and south of the Eastern Kingdoms, about 60 units, is real: Searing Gorge's
# gate to Loch Modan is locked)
JOIN = float(os.environ.get("ROADS_JOIN", 10))
def pieces():
    comp = {}
    for s0 in E:
        if s0 in comp: continue
        st = [s0]; comp[s0] = s0
        while st:
            u = st.pop()
            for v in E[u]:
                if v not in comp: comp[v] = s0; st.append(v)
    return comp
while True:
    comp = pieces(); ids = list(E); A = np.array([P[i] for i in ids]); C = np.array([comp[i] for i in ids]); best = None
    for k, i in enumerate(ids):
        d = np.hypot(*(A - A[k]).T); d[C == C[k]] = 1e9; j = int(d.argmin())
        if d[j] < JOIN and (best is None or d[j] < best[0]): best = (d[j], i, ids[j])
    if not best: break
    link(best[1], best[2])
    if os.environ.get("ROADS_DEBUG"): print("join", round(best[0], 1), P[best[1]], P[best[2]])
used = sorted(E); idx = {o: k for k, o in enumerate(used)}
pts = [round(v, 1) for o in used for v in P[o]]
edges = sorted({(min(idx[a], idx[b]), max(idx[a], idx[b])) for a in E for b in E[a]})
out = {"p": pts, "e": [v for e in edges for v in e]}
print("points", len(used), "edges", len(edges))
g = re.sub(r'"roads":\{.*?\},(?="cities":)', "", g)
g = g.replace('"cities":', f'"roads":{json.dumps(out, separators=(",", ":"))},"cities":', 1)
gpath.write_text(g, encoding="utf-8")
