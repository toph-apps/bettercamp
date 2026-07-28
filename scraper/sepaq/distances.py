"""Precompute driving distances from Montreal to every sector.

Populates `distancecache` with fixed `origin_hash='MONTREAL'` so the frontend
can serve driving-distance filters and sort without a live OSRM dependency.

Run once after `make osrm-up`:

    make osrm-precompute

or directly:

    uv run python -m sepaq.distances [--force] [--osrm-url URL]
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys
from datetime import datetime, timezone

import httpx
from bettercamp_shared import DistanceCache, Sector, get_engine
from sqlmodel import Session, select

MONTREAL = (45.5017, -73.5673)
MONTREAL_HASH = "MONTREAL"
DEFAULT_OSRM = "http://localhost:5000"

log = logging.getLogger("distances")


async def osrm_table(
    base_url: str,
    origin: tuple[float, float],
    destinations: dict[str, tuple[float, float]],
) -> dict[str, tuple[float, int]]:
    """One-to-many OSRM table. Returns {sector_id: (km, minutes)}."""
    if not destinations:
        return {}
    ids = list(destinations.keys())
    coords = [(origin[1], origin[0])] + [
        (destinations[i][1], destinations[i][0]) for i in ids
    ]
    coord_str = ";".join(f"{lon},{lat}" for lon, lat in coords)
    dests = ";".join(str(i + 1) for i in range(len(ids)))
    url = (
        f"{base_url.rstrip('/')}/table/v1/driving/{coord_str}"
        f"?sources=0&destinations={dests}"
        f"&annotations=duration,distance"
    )
    async with httpx.AsyncClient(timeout=120.0) as c:
        r = await c.get(url)
        r.raise_for_status()
        data = r.json()
    durations = data.get("durations", [[]])[0]
    distances = data.get("distances", [[]])[0]
    out: dict[str, tuple[float, int]] = {}
    for idx, sid in enumerate(ids):
        d_m = distances[idx] if idx < len(distances) else None
        t_s = durations[idx] if idx < len(durations) else None
        if d_m is None or t_s is None:
            continue
        out[sid] = (round(d_m / 1000.0, 1), int(round(t_s / 60.0)))
    return out


async def precompute(base_url: str, force: bool) -> int:
    engine = get_engine()
    with Session(engine) as session:
        sectors = session.exec(
            select(Sector).where(Sector.lat.is_not(None), Sector.lon.is_not(None))
        ).all()
        if not sectors:
            log.warning("no sectors with coords; run the scraper first")
            return 0

        existing = {
            d.sector_id
            for d in session.exec(
                select(DistanceCache).where(DistanceCache.origin_hash == MONTREAL_HASH)
            ).all()
        }
        targets = [s for s in sectors if force or s.id not in existing]
        log.info(
            "sectors=%d cached=%d to_compute=%d force=%s",
            len(sectors),
            len(existing),
            len(targets),
            force,
        )
        if not targets:
            return 0

        coords = {s.id: (s.lat, s.lon) for s in targets}
        matrix = await osrm_table(base_url, MONTREAL, coords)
        log.info("osrm returned %d/%d rows", len(matrix), len(coords))

        now = datetime.now(timezone.utc)
        for sid, (km, mins) in matrix.items():
            session.merge(
                DistanceCache(
                    origin_hash=MONTREAL_HASH,
                    sector_id=sid,
                    driving_km=km,
                    driving_min=mins,
                    cached_at=now,
                )
            )
        session.commit()
        return len(matrix)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--force", action="store_true", help="recompute rows already cached")
    ap.add_argument(
        "--osrm-url",
        default=os.environ.get("OSRM_URL", DEFAULT_OSRM),
        help=f"OSRM base URL (default: {DEFAULT_OSRM})",
    )
    args = ap.parse_args()

    try:
        wrote = asyncio.run(precompute(args.osrm_url, args.force))
    except httpx.HTTPError as exc:
        log.error("OSRM request failed: %s", exc)
        log.error("is OSRM running? try `make osrm-up`")
        return 2

    log.info("wrote %d rows to distancecache", wrote)
    return 0


if __name__ == "__main__":
    sys.exit(main())
