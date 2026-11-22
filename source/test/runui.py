"""UI checks (fields, lists, swapping, options). Build with `python ../build.py --test` first."""
import os, pathlib
from playwright.sync_api import sync_playwright
here = pathlib.Path(__file__).resolve().parent
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get("CHROME") or None)
    pg = b.new_page(viewport={"width": 1280, "height": 900}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto((here / "index.html").as_uri()); pg.wait_for_timeout(1500); pg.set_default_timeout(600000)
    print(pg.evaluate((here / "ui.js").read_text(encoding="utf-8"))); print("page errors", errs[:5])
    b.close()
