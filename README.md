# bettercamp

Better search UI for [Sépaq](https://www.sepaq.com) camping reservations in Quebec. Browse campsites by amenities, driving distance from Montreal, and per-site pricing. Bookings still happen on sepaq.com — this is a search-and-discovery layer.

**Live:** https://bettercamp.pages.dev

See [`docs/superpowers/specs/2026-06-21-bettercamp-design.md`](docs/superpowers/specs/2026-06-21-bettercamp-design.md) for the full design.

## How it works

The production build is a **fully static site** on Cloudflare Pages. The frontend loads a pre-built SQLite catalog (`data/catalog.db`) via [sql.js](https://sql.js.org/) and runs every search, filter, and sort in the browser. There is no backend at runtime.

- **Driving distance** from Montreal is precomputed by the scraper against public OSRM and stored in the DB. Custom-origin distances fall back to `router.project-osrm.org` from the browser and cache in `localStorage`.
- **Map tiles** come from [OpenFreeMap](https://openfreemap.org/) (no key required).
- **Auto-deploy**: every push to `master` triggers `.github/workflows/deploy.yml`, which builds `web/dist` and publishes to Cloudflare Pages via `wrangler`.

The FastAPI backend under `api/` still exists for local dev convenience but is not used in production.

## Project Structure

```
api/        FastAPI backend (dev-only; not deployed)
scraper/    Sépaq crawler + distance precompute
web/        Vite + React + TypeScript + MapLibre + sql.js frontend
osrm/       Optional self-hosted OSRM (docker) for offline precompute
docs/       Design specs & architecture
data/       SQLite catalog (35 establishments, 331 sectors, ~7000 sites)
```

## Quickest Start (Automated)

**👉 See [SETUP.md](SETUP.md) for detailed step-by-step instructions.**

**Quick version:**

1. Download: https://github.com/toph-apps/bettercamp → **Code** → **Download ZIP** → Extract
2. Open Terminal / PowerShell in the extracted folder
3. Run: `./install.sh` (macOS / Linux) or `powershell -ExecutionPolicy Bypass -File install.ps1` (Windows)

The installers will:
- Detect and install missing tools (uv, Node.js)
- Install Python + frontend dependencies
- Start the dev server and open the app in your browser

After installation, use `./run.sh` (macOS / Linux) or `.\run.ps1` (Windows) to start again.

---

## Prerequisites (manual setup)

- **Python 3.12+** (install [`uv`](https://docs.astral.sh/uv/getting-started/installation/))
- **Node.js 20+** and npm
- **Git**
- **Docker** — only needed if you want to self-host OSRM instead of using the public demo when precomputing distances

## Setup

```bash
git clone https://github.com/toph-apps/bettercamp.git
cd bettercamp

# Python deps (scraper + FastAPI + shared models)
uv sync --all-packages

# Frontend deps
cd web && npm install && cd ..
```

## Running

```bash
make dev
# API on :8000, web on :5173, opens http://localhost:5173
```

The web app loads the shipped `data/catalog.db` directly, so the API server is optional in dev too — it is kept around only because a couple of scraper scripts and tests import through it.

## Refreshing the catalog

```bash
make scrape            # crawl Sépaq, detect sub-sectors, update data/catalog.db
make osrm-precompute   # recompute Montreal driving distances (public OSRM by default)
git add data/catalog.db
git commit -m "data refresh"
git push               # auto-deploys via .github/workflows/deploy.yml
```

`make scrape` takes ~30 min (Sépaq rate-limits). `make osrm-precompute` takes seconds against the public OSRM demo. Add `--osrm-url http://localhost:5000` to hit your own OSRM instance instead.

## Available Commands

| Command | Purpose |
|---|---|
| `make dev` | Run API (:8000) + web (:5173) with hot reload |
| `make test` | Run pytest + vitest |
| `make build` | Production build of frontend (outputs to `web/dist`) |
| `make scrape` | Update `data/catalog.db` by crawling Sépaq |
| `make osrm-precompute` | Precompute Montreal driving distances into `distancecache` |
| `make osrm-build` | (Optional) Download Quebec OSM data + build local OSRM graph (~15 min, 700 MB) |
| `make osrm-up` / `make osrm-down` | (Optional) Start / stop local OSRM |

## Deploy notes

Cloudflare Pages project `bettercamp` is wired to the repo. The GitHub Action needs two repo secrets:

- `CLOUDFLARE_API_TOKEN` — scoped to `Pages: Write`
- `CLOUDFLARE_ACCOUNT_ID`

The `_headers` file marks `/assets/*` as immutable (Vite fingerprints the JS, CSS, WASM, and the DB) and forces the HTML shell to revalidate so users pick up new asset hashes.
