"""Route tests: every start/destination pair for both factions, character options and spot checks.

    pip install playwright && playwright install chromium
    python ../build.py --test
    python run.py

Set CHROME=/path/to/chrome to use an installed Chrome instead of Playwright's Chromium.
"""
import json, os, pathlib
from playwright.sync_api import sync_playwright
here = pathlib.Path(__file__).resolve().parent
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get("CHROME") or None)
    pg = b.new_page(viewport={"width": 1280, "height": 900}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto((here / "index.html").as_uri()); pg.wait_for_timeout(1500)
    pg.set_default_timeout(600000)
    R = pg.evaluate((here / "checks.js").read_text(encoding="utf-8"))
    json.dump(R, open(here / "report.json", "w"), indent=1)
    print("page errors", errs)
    print("DATA notes:", len(R["data"])); [print("  ", x) for x in R["data"][:40]]
    for f, o in R["pairs"].items():
        print(f"\n{f}: {o['pairs']} pairs, unreachable {len(o['unreachable'])}, problems {len(o['problems'])}, slowest {o['slowest']}")
        for x in o["unreachable"][:20]: print("   UNREACH", x)
        for x in o["problems"][:40]: print("   PROB", x)
    print("\nOPTIONS"); [print("  ", o) for o in R["options"]]
    print("\nSPOT"); [print("  ", "OK " if s["ok"] else "BAD", s["fac"], s["route"], "=>", s["got"]) for s in R["spot"]]
    print("perf", R["perf"])
    b.close()
