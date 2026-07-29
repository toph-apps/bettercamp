"""Cron entry point: full crawl + enrich + upsert."""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
from datetime import datetime, timezone

import httpx
from bettercamp_shared import ScraperRun, Site, init_db
from sqlmodel import delete

from . import enrich as enrich_mod
from .establishment import fetch_establishment
from .http import check_robots, client, fetch
from .seed import fetch_seed
from .sector import SectorData, fetch_sector, parse_sector
from .site import parse_site
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
                        # Fall back to establishment coords so promoted
                        # sub-sectors always inherit a mappable point even
                        # when the parent sector page has no lat/lon.
                        parent_for_children = sdata
                        if not parent_for_children.lat and edata.lat:
                            parent_for_children.lat = edata.lat
                            parent_for_children.lon = edata.lon
                        await _process_children(
                            c, session, elink.id, parent_for_children,
                            with_sites, counts, log,
                        )
                        session.commit()
                    counts["sectors"] += 1

    _reconcile_site_counts()
    return counts


def _reconcile_site_counts() -> None:
    """After sub-sector promotion, a parent sector's cached `site_count` may
    over-report (it still counts its promoted children as sites). Recompute
    from the actual site rows once at end of crawl."""
    from sqlalchemy import text

    with session_scope() as session:
        session.execute(
            text(
                "UPDATE sector SET site_count = "
                "(SELECT COUNT(*) FROM site WHERE site.sector_id = sector.id)"
            )
        )
        session.commit()


def _is_sub_sector(html: str, parent_url: str, candidate_url: str) -> SectorData | None:
    """Detect a sub-sector container (a "site" whose page is actually a
    list of deeper URLs). Returns a parsed SectorData if so, else None."""
    slug = candidate_url.rstrip("/").split("/")[-1]
    sub = parse_sector(html, sector_id=slug, name=slug, url=candidate_url)
    parent_depth = parent_url.rstrip("/").count("/")
    candidate_depth = candidate_url.rstrip("/").count("/")
    deeper = [
        s for s in sub.sites
        if s.url and s.url.rstrip("/").count("/") > candidate_depth
        and s.url.rstrip("/").count("/") > parent_depth
    ]
    if not deeper:
        return None
    sub.sites = deeper
    return sub


async def _process_children(
    c: httpx.AsyncClient,
    session,
    establishment_id: str,
    parent: SectorData,
    with_sites: bool,
    counts: dict,
    log_,
) -> None:
    """Walk each child of `parent`. If it's a real leaf site, upsert as site.
    If it's actually a sub-sector container, promote to sector and recurse."""
    for site_link in parent.sites:
        if not (with_sites and site_link.url):
            upsert_site(
                session,
                parent.sector_id,
                site_link.id,
                site_link.number,
                site_link.url,
                None,
                fallback_name=site_link.name,
            )
            counts["sites"] += 1
            continue

        try:
            html = await fetch(c, site_link.url)
        except Exception as exc:
            log_.info("site fetch %s skipped: %s", site_link.id, exc)
            upsert_site(
                session,
                parent.sector_id,
                site_link.id,
                site_link.number,
                site_link.url,
                None,
                fallback_name=site_link.name,
            )
            counts["sites"] += 1
            continue

        sub = _is_sub_sector(html, parent.url, site_link.url)
        if sub is not None:
            # Promote: create a sector out of this URL. Sector id reuses the
            # site_link.id (already prefixed with establishment+parent), and
            # the display name is "Parent / Sub" so users can tell them apart.
            sub.sector_id = site_link.id
            sub.name = f"{parent.name} / {site_link.name or sub.name}"
            sub.url = site_link.url
            # Sub-sector page rarely publishes its own centroid; inherit the
            # parent sector's so the map has a plausible point to render.
            if not sub.lat:
                sub.lat, sub.lon = parent.lat, parent.lon
            # Drop any orphaned site row from a previous non-recursive scrape.
            session.exec(delete(Site).where(Site.id == site_link.id))
            upsert_sector(session, establishment_id, sub, water=None)
            counts["sectors"] += 1
            await _process_children(
                c, session, establishment_id, sub, with_sites, counts, log_
            )
            continue

        try:
            detail = parse_site(html, site_link.id)
        except Exception as exc:
            log_.info("site parse %s skipped: %s", site_link.id, exc)
            detail = None
        upsert_site(
            session,
            parent.sector_id,
            site_link.id,
            site_link.number,
            site_link.url,
            detail,
            fallback_name=site_link.name,
        )
        counts["sites"] += 1


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
