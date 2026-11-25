"""Caves and tunnels at minimap level: docs/caves/<e|k><n>.webp, listed in src/gdata.js as "caves".

The minimap tiles (minimap.py) show the ground from above, so caves, mines and tunnels (Stonewrought Pass,
the Timbermaw tunnel ...) are missing or patchy there. The game draws each of them on the minimap from its own
pictures (its WMO's minimap pictures, WMOMinimapTexture). This lays those pictures out the way the game does and
writes one see-through picture per cave, which the app draws over the minimap tiles.

Which caves there are, and where each picture goes, comes from the OpenMap addon (MIT license):
OpenMap/Data/Forever/CaveMinimap.lua (https://github.com/openmap-world/openmap), its MapCaveMinimap list:
  { continent (0 Eastern Kingdoms, 1 Kalimdor), minX, minY, maxX, maxY (yards),
    { per picture, lowest floor first: file ID, centre X, Y (yards), side (yards), rotation (radians,
      counter-clockwise), u1, v0 (texcoords 0..u1, v0..1 of the square: the picture fills its left 1/u1 and
      bottom 1/(1-v0); the rest is clear) ... } }
(Caves that Blizzard drew a world-map micro map for, and the underground cities, are not in that list.)

Inputs:
  <work>/CaveMinimap.lua          from OpenMap (above)
  <work>/blp/<FileDataID>.blp     (1,321 files, 21 MB) https://wago.tools/api/casc/<FileDataID>?download&version=1.60.1.71037
Listed in gdata.js as "caves":[[file, x, y, width, height, area it covers (map units squared)], ...]
Run:  python caves.py <work>      (Pillow; run from the repository)
"""
import json, math, re, sys
from pathlib import Path
from PIL import Image

work = Path(sys.argv[1]); repo = Path(__file__).resolve().parents[2]
out = repo / "docs" / "caves"; out.mkdir(exist_ok=True)
gpath = repo / "source/src/gdata.js"; g = gpath.read_text(encoding="utf-8")
cont = json.loads(re.search(r'"cont":(\{.*?\}),"W"', g).group(1))
# the continent maps' world regions (UiMapAssignment 1414 Kalimdor / 1415 Eastern Kingdoms, build 1.60.1.71037)
REG = {"K": [-11733.299804688, -19733.2109375, 12799.900390625, 17066.599609375],
       "E": [-16000.0, -19199.900390625, 7466.6000976562, 16000.0]}
PPU = 32       # pixels a map unit (the minimap tiles are about 14; the pictures hold about 60)
QUALITY = 90
# a picture with a fault baked into the game's own file, cleared in a box of its pixels (x0, y0, x1, y1), as OpenMap
# mends it (its MEND, tools/map-caves/minimap.py): md_mushroomcave08's 215101 has an opaque white block over its
# tunnel's mouth. CaveMinimap.lua names it  M .. "215101"
MEND = {"215101": (28, 190, 118, 256)}

def unit(c, X, Y):
    x0, y0, x1, y1 = REG[c]; cx, cy, cw, ch = cont[c]
    return cx + (y1 - Y) / (y1 - y0) * cw, cy + (x1 - X) / (x1 - x0) * ch

lua = (work / "CaveMinimap.lua").read_text(encoding="utf-8").split("ns.MapCityMinimap")[0]
caves = re.findall(r'\{ (\d+), (-?[\d.]+), (-?[\d.]+), (-?[\d.]+), (-?[\d.]+), \{([^}]*)\}', lua)
for f in out.glob("*.webp"): f.unlink()
listed = []; n = {"E": 0, "K": 0}
for x in caves:
    c = "E" if x[0] == "0" else "K"
    f = [re.sub(r'^M \.\. "(\d+)"$', r"\1", v.strip()) for v in x[5].split(",") if v.strip()]
    a = unit(c, 0, 0); b = unit(c, 0, 1000); ypu = 1000 / abs(b[0] - a[0])   # yards a map unit
    items, us, vs = [], [], []
    for i in range(0, len(f), 7):
        fid, X, Y, side, rot, u1, v0 = f[i:i + 7]
        u, v = unit(c, float(X), float(Y)); sd = float(side) / ypu; h = sd / 2 * math.sqrt(2)
        us += [u - h, u + h]; vs += [v - h, v + h]; items.append((fid, u, v, sd, float(rot), float(u1), float(v0)))
    U0, V0 = min(us), min(vs); W = int(math.ceil((max(us) - U0) * PPU)) + 2; H = int(math.ceil((max(vs) - V0) * PPU)) + 2
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for fid, u, v, sd, rot, u1, v0 in items:
        S = max(2, int(round(sd * PPU))); sq = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        pic = Image.open(work / "blp" / f"{fid}.blp").convert("RGBA")
        if fid in MEND: pic.paste((0, 0, 0, 0), MEND[fid])
        pw = max(1, int(round(S / u1))); ph = max(1, int(round(S / (1 - v0))))
        sq.paste(pic.resize((pw, ph), Image.LANCZOS), (0, S - ph))
        sq = sq.rotate(math.degrees(rot), resample=Image.BICUBIC, expand=True)
        im.alpha_composite(sq, (int(round((u - U0) * PPU - sq.width / 2)), int(round((v - V0) * PPU - sq.height / 2))))
    box = im.getbbox()
    if not box: continue
    im = im.crop(box); U0 += box[0] / PPU; V0 += box[1] / PPU
    name = f"{c.lower()}{n[c]}"; n[c] += 1
    im.save(out / f"{name}.webp", quality=QUALITY, method=6)
    area = sum(1 for a in im.getchannel("A").tobytes() if a > 128) / PPU / PPU   # the ground it lies over (map units^2)
    listed.append([f"caves/{name}.webp", round(U0, 3), round(V0, 3), round(im.width / PPU, 3), round(im.height / PPU, 3), round(area)])
print("caves", len(listed), "size", sum(p.stat().st_size for p in out.glob("*.webp")) // 1024, "KB")
g = re.sub(r'"caves":\[\[.*?\]\],', "", g)
g = g.replace('"mini":', f'"caves":{json.dumps(listed, separators=(",", ":"))},"mini":', 1)
gpath.write_text(g, encoding="utf-8")
