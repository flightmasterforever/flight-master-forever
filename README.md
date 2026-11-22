# Flight Master: Forever

A route planner for World of Warcraft®: Forever: flight paths, boats, zeppelins, skyships, the tram and teleports on one
world map. Intended home: https://flightmasterforever.com/

Unofficial, non-commercial fan project. Not affiliated with or endorsed by Blizzard Entertainment.

## What's in this zip

```
docs/      the finished website. GitHub Pages serves this folder
source/    everything needed to change and rebuild it
```

### docs/

A static site, about 7 MB: no server code, no database, no build step needed to host it.

| File | What it is |
|---|---|
| `index.html` | the whole app: page, styles, game data and code in one file |
| `azeroth.jpg`, `azeroth-clean.jpg` | the world map shown at first |
| `hires3/` | full-detail map tiles, loaded only for the part of the map in view |
| `cities/` | capital city maps, shown when zoomed in close |
| `landmask.png`, `seamask.png`, `seatex.png`, `grain.png` | map shading |
| `zephras-isle.webp` | Zephras Isle, drawn in the sky north of the Maelstrom |
| `icons/` | boat, zeppelin, dungeon, raid, coin and faction icons |
| `favicon.svg`, `favicon.ico`, `apple-touch-icon.png` | site icons (the neutral logo, the same for both factions) |
| `logo-alliance.svg`, `logo-horde.svg` | the header logo for each faction (blue pin and gold wing / red pin and iron wing) |
| `CNAME`, `.nojekyll` | tell GitHub Pages the site's domain, and to serve the files as they are |
| `og-image.jpg` | the picture shown when the link is pasted into Discord, iMessage and so on |

### source/

| Path | What it is |
|---|---|
| `src/shell.html` | the page: markup, styles, About text. `__GDATA__` and `__APP__` mark where the data and code go |
| `src/app.js` | the app: map drawing, route finding, panel |
| `src/gdata.js` | the game data: flight points, flights, fares, boats, zones, map placement |
| `src/test-hook.js` | one line that exposes the app's internals to the tests (test build only) |
| `build.py` | builds `docs/index.html` from `src/` |
| `test/` | the route and UI tests |
| `brand/` | the favicon and faction logo sources (and the earlier S-curve design) |
| `data-tools/` | the script and intermediate files used to turn wago.tools exports into flight data (reference) |
| `LICENSES/OpenMap-MIT.txt` | OpenMap's licence, for the dock, sailing-path and entrance positions |

## Hosting

This repository is laid out for GitHub Pages: in the repository's Settings → Pages, choose "Deploy from a branch",
branch `main`, folder `/docs`, and set the custom domain to flightmasterforever.com. Then point the domain's DNS at
GitHub (four A records for the bare domain, a CNAME for `www` to `<your-username>.github.io`) and turn on
"Enforce HTTPS". Any other static host works too: just serve the `docs` folder. The link previews, the page's own address and the canonical link all
already use `https://flightmasterforever.com/`.

No cookie banner is needed: the site stores your faction, character options and panel layout in your own browser
(localStorage) and sends nothing anywhere.

## Changing the site

1. Edit files in `source/src/`.
2. Run `python build.py` from `source/` (Python 3, no packages). It rewrites `docs/index.html`.
3. Run the tests (below), then commit and push. GitHub Pages republishes within a minute or two.

Some settings worth knowing about, all in `src/app.js`:

- `ISLE_AT` (top of the file): where Zephras Isle sits on the world map and how big. Change it if Blizzard ever
  places the island officially.
- `STARTER`: the starter route for each faction (Stormwind → Ratchet, Orgrimmar → Booty Bay).
- `CAPITAL`: flight points that backup routes assume every character has.
- `KEEP_ON_MAP`: set to `false` to let the map be dragged past the parchment's edge.

Shareable links look like `?f=A&from=stormwind&to=ratchet`. `f` is `A` or `H`; place names are lower case with
anything that isn't a letter turned into `-` (Light's Hope Chapel is `light-s-hope-chapel`).

## Tests

```
pip install playwright
playwright install chromium
cd source
python build.py --test
cd test
python run.py      # every start/destination pair for both factions, options and spot checks
python runui.py    # fields, lists, swapping and options in the panel
```

`run.py` checks, for all ~12,800 pairs: that a route is found; that flights follow the game's booking rule (a direct
flight if there is one, otherwise the shortest chain by flight-path length); that backup routes follow the same rule
without the missing flight path; times and fares add up; and that alternatives are sorted and not duplicated.
Expect `problems 0` for both factions.

## Updating the game data

When Blizzard patches Forever, the flight data may change. The data in `src/gdata.js` was built from the game's
own tables (TaxiNodes, TaxiPath, TaxiPathNode, UiMap, UiMapAssignment and the map art tables) for the build named
in the About notes, read through wago.tools. `data-tools/` holds the script and files used for that, as a
reference.

## Credits

- Map art, icons and faction crests © Blizzard Entertainment, Inc. World of Warcraft, Warcraft and Blizzard
  Entertainment are trademarks or registered trademarks of Blizzard Entertainment, Inc., in the U.S. and/or other
  countries.
- Inspired by Classic Tinker's Flight Master: https://classictinker.com/flight-master/
- Game data via wago.tools: https://wago.tools
- Dock, sailing-path and dungeon/raid entrance positions from OpenMap
  (https://github.com/openmap-world/openmap), MIT licence: see `source/LICENSES/OpenMap-MIT.txt`.
