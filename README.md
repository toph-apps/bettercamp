# bettercamp

Third-party search UI over Sépaq's camping reservation catalog. Bookings still go through sepaq.com — this is a search-and-discovery layer.

See [`docs/superpowers/specs/2026-06-21-bettercamp-design.md`](docs/superpowers/specs/2026-06-21-bettercamp-design.md) for the full design.

## Layout

```
api/        FastAPI app
scraper/    Weekly sepaq + Overpass crawler
web/        Vite + React + TypeScript + MapLibre
osrm/       Self-hosted OSRM (Docker) for driving distance
docs/       Design specs
```

## Quick start (Bazzite DX / Fedora Atomic)

Bazzite DX ships Docker + Podman + Distrobox. Two paths:

### Direct on host (Bazzite ships docker, python, node)

```bash
# one-time
curl -LsSf https://astral.sh/uv/install.sh | sh    # Python toolchain
# node + npm are already on Bazzite DX

# install deps
uv sync --all-packages
( cd web && npm install )

# run
make dev
```

`pnpm` works too but its v11 build-script gating is annoying with esbuild;
the project is tested against npm.

OSRM always runs in Docker (its build chain is heavy):

```bash
make osrm-build   # one-time, downloads ~700 MB Quebec OSM extract
make osrm-up
```

## Make targets

| Target | What |
|---|---|
| `make dev` | Run API on :8000 + web on :5173 |
| `make scrape` | Run the weekly scraper once |
| `make osrm-build` | Download Quebec PBF and prebuild OSRM graph |
| `make osrm-up` | Start OSRM service on :5000 |
| `make osrm-down` | Stop OSRM |
| `make test` | Run pytest + vitest |
| `make build` | Production build of web |

## Status

Skeleton is functional end-to-end. Walkthrough:

```bash
uv sync --all-packages
( cd web && npm install )

# 1. Scrape two real establishments (~35 s incl. Nominatim throttle)
BETTERCAMP_DB=$PWD/data/catalog.db uv run --package bettercamp-scraper \
  python -m sepaq --only camping-des-voltigeurs --only reserve-faunique-mastigouche \
  --no-sites --no-water

# 2. Start API + web
make dev
# → http://localhost:5173  (proxies /api → :8000)
```

Verified working:

- `/api/establishments` returns rows with lat/lon (Nominatim-geocoded fallback)
- `/api/search` returns sector list with structured amenity bundle
- `/api/health/scrape` surfaces last run status + counts
- Single-camp establishments get a synthetic `__main` sector
- Frontend builds (94 modules, 76 kB CSS + 1 MB JS)
- 6 pytest cases pass

Known gaps (next morning's punch list):

| Gap | Why | Fix |
|---|---|---|
| Amenity icons all `false`/`unknown` | Sector-page selectors (`.services`, `.amenities`, `.caracteristiques`) didn't match real HTML | Curl a sector page, inspect actual icon DOM, update `scraper/sepaq/sector.py:_extract_amenity_labels` |
| Region always null | Sépaq doesn't expose region on establishment page | Hard-code region mapping by slug, or scrape from the `/destinations/` page |
| Drive time always null in API | OSRM container not built | `make osrm-build` (~15 min one-time) then `make osrm-up` |
| Waterfront score always 0 | Need to re-scrape without `--no-water` | Drop the flag; first run takes ~20 min on full catalog due to Overpass throttle |
| Sector centroids inherit establishment centroid | Nominatim doesn't resolve sub-names like "Lac-Bouteille" reliably | Manual override in admin UI (M6) or scrape Sépaq's sector-map PNG bounding box |

See `docs/superpowers/specs/2026-06-21-bettercamp-design.md` for the full design and roadmap (M0–M6).
