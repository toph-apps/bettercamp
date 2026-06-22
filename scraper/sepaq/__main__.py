"""Cron entry point: full crawl + enrich + upsert."""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
from datetime import datetime, timezone

import httpx
from bettercamp_shared import ScraperRun, init_db

from . import enrich as enrich_mod
from .establishment import fetch_establishment
from .http import check_robots, client
from .seed import fetch_seed
from .sector import fetch_sector
from .site import fetch_site
from .upsert import (
    session_scope,
    upsert_establishment,
    upsert_sector,
    upsert_site,
)

NOMINATIM_DELAY_S = 1.1  # respect 1 req/s policy

log = logging.getLogger("sepaq")


async def crawl(
    limit: int | None,
    with_sites: bool,
    with_water: bool,
    with_geocode: bool = True,
    only: list[str] | None = None,
) -> dict:
    counts = {"establishments": 0, "sectors": 0, "sites": 0, "errors": []}

    await check_robots()

    async with client() as c:
        seed = await fetch_seed(c)
        log.info("seed: %d establishments", len(seed))
        if only:
            wanted = set(only)
            seed = [e for e in seed if e.id in wanted]
            log.info("filter --only: %d remaining", len(seed))
        if limit:
            seed = seed[:limit]

        async with httpx.AsyncClient(timeout=60) as geo_c:
            for elink in seed:
                try:
                    edata = await fetch_establishment(c, elink)
                except Exception as exc:
                    log.warning("establishment %s failed: %s", elink.id, exc)
                    counts["errors"].append({"step": "establishment", "id": elink.id, "err": str(exc)})
                    continue

                if not edata.lat and with_geocode:
                    coords = await enrich_mod.geocode_nominatim(geo_c, f"{elink.name}, Quebec")
                    await asyncio.sleep(NOMINATIM_DELAY_S)
                    if coords:
                        edata.lat, edata.lon = coords

                with session_scope() as session:
                    upsert_establishment(session, edata)
                    session.commit()
                counts["establishments"] += 1

                # Single-camp establishments expose sites directly on the
                # establishment page with no sector layer. Synthesize one
                # sector so the catalog has a row to attach amenities/sites
                # to and so search returns the campground.
                sector_links = edata.sectors
                if not sector_links:
                    from .establishment import SectorLink as _SL

                    sector_links = [
                        _SL(id=f"{elink.id}__main", name=elink.name, url=elink.url)
                    ]

                for slink in sector_links:
                    try:
                        sdata = await fetch_sector(c, slink.id, slink.name, slink.url)
                    except Exception as exc:
                        log.warning("sector %s failed: %s", slink.id, exc)
                        counts["errors"].append(
                            {"step": "sector", "id": slink.id, "err": str(exc)}
                        )
                        continue

                    if not sdata.lat and with_geocode:
                        # Sector centroid: geocode by "<sector>, <establishment>, Quebec"
                        # so e.g. "Lac-Bouteille, Réserve faunique Mastigouche, Quebec"
                        # resolves; the bare sector name is too ambiguous.
                        coords = await enrich_mod.geocode_nominatim(
                            geo_c, f"{sdata.name}, {edata.link.name}, Quebec"
                        )
                        await asyncio.sleep(NOMINATIM_DELAY_S)
                        if not coords and edata.lat and edata.lon:
                            # fallback: inherit establishment centroid so map
                            # at least shows the sector at a sane location
                            sdata.lat, sdata.lon = edata.lat, edata.lon
                        elif coords:
                            sdata.lat, sdata.lon = coords

                    water = None
                    if with_water and sdata.lat and sdata.lon:
                        try:
                            water = await enrich_mod.enrich_waterfront(
                                geo_c, sdata.lat, sdata.lon
                            )
                        except Exception as exc:
                            log.info("water enrich %s skipped: %s", slink.id, exc)

                    with session_scope() as session:
                        upsert_sector(session, elink.id, sdata, water)
                        for site_link in sdata.sites:
                            detail = None
                            if with_sites and site_link.url:
                                try:
                                    detail = await fetch_site(c, site_link.id, site_link.url)
                                except Exception as exc:
                                    log.info("site %s skipped: %s", site_link.id, exc)
                            upsert_site(
                                session,
                                slink.id,
                                site_link.id,
                                site_link.number,
                                site_link.url,
                                detail,
                            )
                            counts["sites"] += 1
                        session.commit()
                    counts["sectors"] += 1

    return counts


def _log_run(started: datetime, status: str, counts: dict, error: str | None) -> None:
    with session_scope() as session:
        run = ScraperRun(
            started_at=started,
            finished_at=datetime.now(timezone.utc),
            status=status,
            error=error,
            counts_json=json.dumps(counts),
            missing_fields=json.dumps([e for e in counts.get("errors", [])])
            if counts.get("errors")
            else None,
        )
        session.add(run)
        session.commit()


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    p = argparse.ArgumentParser(description="bettercamp sepaq crawler")
    p.add_argument("--limit", type=int, default=None, help="only crawl N establishments (debug)")
    p.add_argument("--only", action="append", help="restrict to establishment slug (repeatable)")
    p.add_argument("--no-sites", action="store_true", help="skip per-site detail pages")
    p.add_argument("--no-water", action="store_true", help="skip Overpass water enrichment")
    p.add_argument("--no-geocode", action="store_true", help="skip Nominatim geocoding")
    args = p.parse_args()

    init_db()
    started = datetime.now(timezone.utc)
    try:
        counts = asyncio.run(
            crawl(
                limit=args.limit,
                with_sites=not args.no_sites,
                with_water=not args.no_water,
                with_geocode=not args.no_geocode,
                only=args.only,
            )
        )
    except Exception as exc:
        log.exception("crawl failed")
        _log_run(started, "failed", {"errors": [str(exc)]}, str(exc))
        return 1

    status = "ok" if not counts.get("errors") else "partial"
    _log_run(started, status, counts, None)
    log.info("done: %s %s", status, counts)
    return 0


if __name__ == "__main__":
    sys.exit(main())
