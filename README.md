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

M0 skeleton in progress. See spec for roadmap (M0–M6).
