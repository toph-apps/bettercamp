"""Upsert helpers: idempotent writes into the catalog DB."""

from __future__ import annotations

from datetime import datetime, timezone

from bettercamp_shared import Establishment, Sector, Site, get_engine
from sqlmodel import Session

from .enrich import WaterResult
from .establishment import EstablishmentData
from .sector import SectorData
from .site import SiteData


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _abs(u: str | None) -> str | None:
    if not u:
        return u
    if u.startswith("//"):
        return "https:" + u
    if u.startswith("/"):
        return "https://www.sepaq.com" + u
    return u


def upsert_establishment(session: Session, data: EstablishmentData) -> None:
    import json as _json

    row = session.get(Establishment, data.link.id)
    if row is None:
        row = Establishment(id=data.link.id, name=data.link.name, url=data.link.url)
    row.name = data.link.name
    row.url = _abs(data.link.url) or row.url
    row.region = data.region or row.region
    if data.lat:
        row.lat = data.lat
    if data.lon:
        row.lon = data.lon
    if data.map_image_url:
        row.map_image_url = _abs(data.map_image_url)
    if data.sector_dots:
        row.sector_dots_json = _json.dumps(
            [{"sector_id": d.sector_id, "left": d.left, "top": d.top} for d in data.sector_dots]
        )
    row.scraped_at = _now()
    session.merge(row)


def upsert_sector(
    session: Session,
    establishment_id: str,
    data: SectorData,
    water: WaterResult | None = None,
) -> None:
    row = session.get(Sector, data.sector_id)
    if row is None:
        row = Sector(
            id=data.sector_id,
            establishment_id=establishment_id,
            name=data.name,
            url=data.url,
        )
    row.establishment_id = establishment_id
    row.name = data.name
    row.url = _abs(data.url) or row.url
    if data.lat:
        row.lat = data.lat
    if data.lon:
        row.lon = data.lon
    import json as _json2

    row.site_count = len(data.sites)
    row.amenities_json = data.amenities.model_dump_json()
    row.map_image_url = data.map_image_url or row.map_image_url
    if data.site_dots:
        row.site_dots_json = _json2.dumps(
            [{"site_id": d.site_id, "left": d.left, "top": d.top} for d in data.site_dots]
        )
    if water:
        row.waterfront_score = water.score
        row.nearest_water_name = water.name
        row.nearest_water_m = water.distance_m
    row.scraped_at = _now()
    session.merge(row)


def upsert_site(
    session: Session,
    sector_id: str,
    site_link_id: str,
    number: str,
    url: str | None,
    detail: SiteData | None = None,
    fallback_name: str | None = None,
) -> None:
    import json as _json

    row = session.get(Site, site_link_id)
    if row is None:
        row = Site(id=site_link_id, sector_id=sector_id, number=number, url=url)
    row.sector_id = sector_id
    row.number = number
    row.url = _abs(url) or row.url
    if fallback_name and not row.name:
        row.name = fallback_name
    if detail:
        if detail.name:
            row.name = detail.name
        if detail.subtitle:
            row.subtitle = detail.subtitle
        row.amenities_json = detail.amenities.model_dump_json()
        row.photos_json = _json.dumps(detail.photos)
        row.services_json = _json.dumps(detail.services)
        row.description_json = _json.dumps(detail.description)
        row.access = detail.access
        row.price_text = detail.price_text
        if detail.waterfront is not None:
            row.waterfront = detail.waterfront
    row.scraped_at = _now()
    session.merge(row)


def session_scope() -> Session:
    return Session(get_engine())
