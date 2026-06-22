# bettercamp

Better search UI for Sépaq's camping reservations in Quebec. Browse campsites by location, amenities, and driving distance. Bookings still go through sepaq.com — this is a search-and-discovery layer.

See [`docs/superpowers/specs/2026-06-21-bettercamp-design.md`](docs/superpowers/specs/2026-06-21-bettercamp-design.md) for the full design.

## Quickest Start (Automated)

**macOS / Linux:**
```bash
git clone https://github.com/toph-apps/bettercamp.git
cd bettercamp
./install.sh   # Installs dependencies, then prompts to start
```

**Windows:**
```powershell
git clone https://github.com/toph-apps/bettercamp.git
cd bettercamp
powershell -ExecutionPolicy Bypass -File install.ps1
```

The installers will:
- Detect and install missing tools (uv, Node.js, Docker)
- Install Python + frontend dependencies
- Offer to start the dev server

After installation, use `./run.sh` (macOS/Linux) or `.\run.ps1` (Windows) to start the app.

---

## Project Structure

```
api/        FastAPI backend (Python)
scraper/    Weekly Sépaq + Overpass crawler
web/        Vite + React + TypeScript + MapLibre frontend
osrm/       Self-hosted OSRM (Docker) for driving distance
docs/       Design specs & architecture
data/       SQLite database with camping catalog (included)
```

## Prerequisites

- **Python 3.12+** (install [`uv`](https://docs.astral.sh/uv/getting-started/installation/))
- **Node.js 18+** and npm
- **Docker** (for OSRM routing service)
- **Git**

## Setup

```bash
# Clone the repo
git clone https://github.com/toph-apps/bettercamp.git
cd bettercamp

# Install Python dependencies
uv sync --all-packages

# Install frontend dependencies
cd web && npm install && cd ..
```

## Running

### Quick start (basic search, no driving distance)

```bash
make dev
# Opens http://localhost:5173 with API on :8000
# Database has 35 establishments, 141 sectors, 2,575 sites; search works immediately
```

### With driving distance (requires Docker)

```bash
# Build OSRM routing (one-time, ~15 min)
make osrm-build

# Start OSRM service
make osrm-up

# In another terminal
make dev
# Now `/api/search` includes driving distance from Montreal
```

Stop OSRM with `make osrm-down`.

## What's Included

- **Pre-populated database** (`data/catalog.db`, ~5 MB) with 35 establishments, 141 sectors, and 2,575 campsites
- **Full API** with `/api/establishments`, `/api/search`, and `/api/health/scrape`
- **Frontend** with interactive map and amenity search filters
- **Scraper** to update the database from Sépaq and Overpass (optional)

## Available Commands

| Command | Purpose |
|---|---|
| `make dev` | Run API (:8000) + web (:5173) with hot reload |
| `make test` | Run pytest + vitest |
| `make build` | Production build of frontend (outputs to `web/dist`) |
| `make scrape` | Update database by scraping Sépaq |
| `make osrm-build` | Download Quebec OSM data and build OSRM graph (~15 min, 700 MB) |
| `make osrm-up` | Start OSRM routing service on :5000 |
| `make osrm-down` | Stop OSRM |

## Status

End-to-end functional. Known limitations:

| What's Missing | Why | To Fix |
|---|---|---|
| Amenity icons | Sépaq HTML selectors don't match | Update scraper selectors in `scraper/sepaq/sector.py` |
| Region field | Sépaq doesn't expose it | Hard-code region mapping by campsite slug |
| Driving distance | Requires OSRM | Run `make osrm-build && make osrm-up` |
| Waterfront score | Disabled to speed up scraping | Re-run scraper without `--no-water` flag |

See [`docs/superpowers/specs/2026-06-21-bettercamp-design.md`](docs/superpowers/specs/2026-06-21-bettercamp-design.md) for roadmap (M0–M6).
