# bettercamp — design

**Date:** 2026-06-21
**Status:** draft, brainstorming approved

A third-party search UI over Sépaq's camping reservation catalog (`sepaq.com/en/reservation/camping`). Sépaq's own UI surfaces almost no per-site metadata until you click three levels deep; bettercamp pre-scrapes that metadata and exposes it as filters, tooltips, and a map.

Bookings stay on Sépaq — bettercamp links out.

## Goals

- Filter Sépaq campgrounds by driving distance from a point (default Montreal), amenities (toilets, parking, water, fire), waterfront proximity, and campground size.
- Show all relevant metadata in hover tooltips so users don't have to drill down three levels to compare options.
- Refresh catalog weekly. Live availability is out of scope for v1.

## Non-goals

- Live availability or booking. Sépaq handles those.
- Multi-user accounts, payments, mobile-native app, French UI, push alerts.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Vite + React 19 + TypeScript + TanStack Query + MapLibre GL + Radix + Tailwind | Static build, vector map, URL-as-state |
| Backend | Python 3.12 + FastAPI + SQLModel | Existing Sépaq scraper prior art is Python; FastAPI auto-OpenAPI feeds frontend codegen |
| Scraper | `httpx` + `selectolax` | Faster than BS4; async by default |
| DB | SQLite (file-based) | ~50 establishments, ~500 sectors, ~5k sites — fits easily |
| Routing | Self-hosted OSRM (Docker, `quebec-latest.osm.pbf`) | No rate limits, owns its data |
| Deploy | `docker-compose.yml` on any host | Five services in one file |

## Architecture

```
┌──────────────────┐    ┌──────────────────┐
│  scraper (cron)  │───▶│  SQLite          │
│  Python          │    │  catalog.db      │
└──────────────────┘    └────────┬─────────┘
                                 │
                        ┌────────▼─────────┐    ┌──────────────────┐
                        │  FastAPI :8000   │───▶│  OSRM :5000      │
                        └────────┬─────────┘    └──────────────────┘
                                 │
                        ┌────────▼─────────┐
                        │  React+Vite      │
                        │  MapLibre GL     │
                        └──────────────────┘
```

- Scraper runs weekly via host cron or an `apscheduler` sidecar. Writes `catalog.db` in one transaction; prior good DB stays if the run fails partway.
- FastAPI reads SQLite read-only at runtime, calls OSRM for distance queries, caches results in `distance_cache`.
- Frontend is a static Vite build served by FastAPI or Caddy. Single-origin removes the CORS question.

## Data model

Sépaq hierarchy: **Region → Establishment → Sector → Site**.

```sql
establishment(
  id            TEXT PRIMARY KEY,    -- slug "reserve-faunique-mastigouche"
  name          TEXT,
  region        TEXT,
  url           TEXT,                -- sepaq deep link
  lat REAL, lon REAL,                -- centroid
  scraped_at    TIMESTAMP
);

sector(
  id                 TEXT PRIMARY KEY, -- "mastigouche__lac-bouteille"
  establishment_id   TEXT REFERENCES establishment(id),
  name               TEXT,
  url                TEXT,
  lat REAL, lon REAL,                  -- centroid
  site_count         INTEGER,           -- density proxy
  amenities_json     TEXT,              -- typed schema below
  waterfront_score   REAL,              -- 0..1, OSM water within radius
  nearest_water_name TEXT,
  nearest_water_m    INTEGER,
  map_image_url      TEXT               -- cached sepaq sector PNG path
);

site(
  id          TEXT PRIMARY KEY,         -- "mastigouche__lac-bouteille__07"
  sector_id   TEXT REFERENCES sector(id),
  number      TEXT,                     -- "7"
  url         TEXT,
  amenities_json TEXT,                  -- per-site overrides
  waterfront  BOOLEAN,                  -- NULL = unknown; v2 OCR / v3 admin
  notes       TEXT                      -- admin freeform
);

distance_cache(
  origin_hash TEXT,                     -- sha1(lat,lon rounded to 3dp)
  sector_id   TEXT REFERENCES sector(id),
  driving_km  REAL,
  driving_min INTEGER,
  PRIMARY KEY(origin_hash, sector_id)
);

scraper_runs(
  id INTEGER PRIMARY KEY,
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  status TEXT,                          -- "ok" | "partial" | "failed"
  error TEXT,
  missing_fields TEXT                   -- JSON list, surfaces in /health/scrape
);
```

`amenities_json` schema (validated by Pydantic in code):

```ts
{
  toilets: "flush" | "vault" | "none",
  parking: boolean,
  drinking_water: boolean,
  fire_pit: boolean,
  electricity: boolean,
  picnic_table: boolean,
  shower: boolean,
  wheelchair: boolean,
  pets: boolean,
  raw_icons: string[]    // literal Sépaq icon list, for forward-compat
}
```

Storing as JSON instead of columns means new icons don't trigger a migration; `raw_icons` keeps the raw list so future structured fields can backfill from existing rows.

## Scraping pipeline

Weekly cron:

1. **seed** — `GET /en/reservation/camping/init`, parse `a.resultats-item.is-blue` → list of establishment slugs + URLs.
2. **establishment** — for each, follow the link; extract sectors (same selector pattern) and centroid (`<script type="application/ld+json">` or `/maps` page).
3. **sector** — for each sector URL, extract site list, per-site detail links, sector-level amenity icon row. Download sector map PNG to local cache.
4. **site** — per-site amenity overrides + price tier.
5. **enrich** — for each sector centroid, query Overpass API for water polygons within 500 m. Compute `waterfront_score`, `nearest_water_name`, `nearest_water_m`.
6. **upsert** — single SQLite transaction; log diff to `scraper_runs`.

### Politeness

- `User-Agent: bettercamp/0.1 (personal use; <contact>)`.
- `httpx.AsyncClient` with `asyncio.Semaphore(4)`.
- 250 ms jitter between requests to the same host.
- `urllib.robotparser` check at start of run.

### Failure modes

- **Selector drift** → scraper writes status to `scraper_runs`; FastAPI exposes `/health/scrape`; frontend shows a stale-data banner if `last_run.status != "ok"` or `stale_days > 14`.
- **429 / 403** → exponential backoff (1s, 4s, 16s), abort run, keep last good DB.
- **Partial parse** → unknown icons land in `raw_icons[]`; admin UI surfaces them so missing fields can be mapped.

## API

FastAPI, all JSON, all GET (no auth in v1 — single user). Pydantic models mirror DB rows.

```
GET  /api/establishments
       → [{id, name, region, lat, lon, sector_count, site_count}]

GET  /api/establishments/{id}
       → establishment + nested sector summaries

GET  /api/sectors/{id}
       → sector + amenities + waterfront + nested site summaries

GET  /api/sites/{id}
       → full site detail (amenities, notes, sepaq booking URL)

GET  /api/search?
       origin=lat,lon                 # default Montreal 45.5017,-73.5673
       max_drive_min=240
       waterfront=true
       max_water_m=200
       min_sites=null
       max_sites=20
       amenities=toilets:flush,water,fire_pit   # AND-match
       region=laurentides
       sort=drive_min|name|waterfront
       limit=100
     → [{sector_id, name, establishment, drive_min, drive_km,
         waterfront_score, nearest_water, amenity_summary, site_count}]

GET  /api/distance?origin=lat,lon&sector_id=...
       → {km, min}

GET  /api/health/scrape
       → {last_run, status, stale_days, missing_fields[]}

POST /api/admin/sites/{id}/tag        # v3, basic auth
       body: {waterfront?: bool, notes?: string}
```

**Caching:** `Cache-Control: public, max-age=3600` on reads. ETag = row `scraped_at`. Frontend uses TanStack Query with `staleTime: 1h`.

**Search execution:** single SQL join across `sector`, `establishment`, `distance_cache`. If the request's origin isn't in `distance_cache`, FastAPI fires one OSRM table-service call for all sector centroids (~50 destinations, < 500 ms), persists results, then re-runs the query.

## Frontend UX

URL search params are the source of truth (`?drive=240&waterfront=1&...`) so deep-linking and browser-back work.

### Routes

| Path | Purpose |
|---|---|
| `/` | Map + filter panel (default view) |
| `/list` | Same data, sortable table |
| `/establishment/:id` | Establishment detail, sector cards |
| `/sector/:id` | Sector detail, site grid, cached Sépaq sector map |
| `/site/:id` | Site detail, full amenity list, "Book on Sépaq" button |
| `/admin` | v3 tagging UI |

### Main screen layout

```
┌────────────────────────────────────────────────────────────────┐
│  bettercamp                                  [Map][List][⚙]    │
├────────────┬───────────────────────────────────────────────────┤
│ FILTERS    │                                                   │
│ Origin     │             MapLibre map                          │
│ [Montreal▾]│             • sized markers (site_count)          │
│ Max drive  │             • color by drive_min ramp             │
│ [4h───●──] │             • blue tint = waterfront              │
│ Waterfront │                                                   │
│ [✓] <200m  │                                                   │
│ Amenities  │                                                   │
│ ☑ Toilets  │                                                   │
│ ☑ Water    │                                                   │
│ ☐ Electr.  │                                                   │
│ Size       │                                                   │
│ [1──●──50] │                                                   │
└────────────┴───────────────────────────────────────────────────┘
```

### Tooltips (the headline UX fix)

- **Establishment marker hover** → name · region · # sectors · # sites · drive time · waterfront indicator · nearest water · top amenities · region map thumbnail.
- **Sector marker hover** (zoomed in) → name · # sites · amenity icons · waterfront badge · "X of N sites waterfront" · sector PNG thumbnail.
- **Site dot hover** (sector detail page) → site # · amenities · waterfront flag · "Book on Sépaq →".

Radix `HoverCard`, 150 ms delay, sticky-on-click to pin.

### Map layers

- **base:** MapTiler Outdoor (free tier) or Stadia.
- **water overlay:** OSM water polygons rendered as GeoJSON layer.
- **markers:** clustered above zoom 8, individual below.
- **isochrone overlay (stretch):** OSRM-driven, shaded by drive_min from origin.

### List view

Virtualized TanStack Table. Columns: name, region, drive, waterfront, size, amenity chips, link. Same search hook drives both views.

## Repo layout

```
bettercamp/
  api/              FastAPI app, Pydantic models, OSRM client
  scraper/          httpx + selectolax pipeline, cron entry
  web/              Vite + React + TS
  osrm/             Dockerfile + OSM-extract download script
  shared/           OpenAPI client codegen target (orval) → web/src/api
  docs/             this spec + future ADRs
  docker-compose.yml
  Makefile          targets: scrape, dev, build, deploy
```

## Phased roadmap

| Milestone | Duration | Deliverable |
|---|---|---|
| M0 skeleton | 1 day | End-to-end wiring: scraper stub, FastAPI sample, React renders MapLibre with one marker |
| M1 catalog | 3–5 days | Establishment + sector crawl, amenity filter, map + list views |
| M2 distance | 2 days | OSRM container, `distance_cache`, drive filter + sort |
| M3 waterfront (sector) | 2 days | Overpass enrichment, waterfront filter + tooltip |
| M4 per-site detail | 2–3 days | Per-site scrape, `/site/:id`, tooltips on sector-map dots |
| M5 OCR per-site waterfront | 3–5 days | `ocr_sector_map.py` populates `site.waterfront` |
| M6 admin tagging | 1–2 days | `/admin` route, overrides OCR result |

## Legal posture

Per recon: Sépaq's `robots.txt` allows `/en/` and `/fr/`, disallows `/dotCMS/`, `/servlets/`, `/recherche/`, `?dispatch=` params. Bettercamp confines itself to allowed paths, identifies itself in `User-Agent`, throttles, and refreshes once weekly. Non-commercial personal use. Booking traffic still goes through Sépaq.
