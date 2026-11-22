"""Build Flight Master: Forever.

    python build.py          writes ../docs/index.html from src/
    python build.py --test   also writes test/index.html (the same page plus a test hook) for the test suite

src/shell.html is the page (markup and styles) with two placeholders: __GDATA__ is replaced by src/gdata.js
(the game data) and __APP__ by src/app.js (the app). Nothing else is needed: no packages, no bundler.
"""
import pathlib, sys
here = pathlib.Path(__file__).resolve().parent
src = here / "src"
page = (src / "shell.html").read_text(encoding="utf-8")
page = page.replace("__GDATA__", (src / "gdata.js").read_text(encoding="utf-8"))
page = page.replace("__APP__", (src / "app.js").read_text(encoding="utf-8"))
out = here.parent / "docs" / "index.html"
out.write_text(page, encoding="utf-8")
print("wrote", out)
if "--test" in sys.argv:
    hook = (src / "test-hook.js").read_text(encoding="utf-8").strip()
    k = page.rindex("\n}\n\n</script>")
    t = here / "test" / "index.html"
    t.write_text(page[:k] + "\n" + hook + page[k:], encoding="utf-8")
    print("wrote", t)
