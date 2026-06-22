import hashlib
import json
from typing import Literal

from bettercamp_shared import (
    Amenities,
    DistanceCache,
    Establishment,
    Sector,
    Site,
    get_session,
)
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, func, select

from app.osrm import OSRMClient

router = APIRouter(tags=["search"])
MONTREAL = (45.5017, -73.5673)


def origin_hash(lat: float, lon: float) -> str:
    return hashlib.sha1(f"{round(lat, 3)},{round(lon, 3)}".encode()).hexdigest()[:12]


def parse_origin(raw: str | None) -> tuple[float, float]:
    if not raw:
        return MONTREAL
    parts = raw.split(",")
    return float(parts[0]), float(parts[1])


def parse_amenities(raw: str | None) -> dict[str, str | bool]:
    """`toilets:flush,water,fire_pit` -> {toilets:'flush', drinking_water:True, fire_pit:True}"""
    if not raw:
        return {}
    out: dict[str, str | bool] = {}
    aliases = {"water": "drinking_water"}
    for token in raw.split(","):
        token = token.strip()
        if not token:
            continue
        if ":" in token:
            k, v = token.split(":", 1)
            out[k.strip()] = v.strip()
        else:
            key = aliases.get(token, token)
            out[key] = True
    return out


@router.get("/search")
async def search(
    session: Session = Depends(get_session),
    origin: str | None = Query(None, description="lat,lon; default Montreal"),
    max_drive_min: int | None = None,
    waterfront: bool | None = None,
    max_water_m: int | None = None,
    min_sites: int | None = None,
    max_sites: int | None = None,
    amenities: str | None = None,
    region: str | None = None,
    sort: Literal["drive_min", "name", "waterfront"] = "name",
    limit: int = 100,
):
    olat, olon = parse_origin(origin)
    ohash = origin_hash(olat, olon)
    want_amen = parse_amenities(amenities)

    stmt = select(Sector, Establishment).join(
        Establishment, Sector.establishment_id == Establishment.id
    )
    if region:
        stmt = stmt.where(Establishment.region == region)
    if min_sites is not None:
        stmt = stmt.where(Sector.site_count >= min_sites)
    if max_sites is not None:
        stmt = stmt.where(Sector.site_count <= max_sites)
    if waterfront:
        stmt = stmt.where(Sector.waterfront_score > 0)
    if max_water_m is not None:
        stmt = stmt.where(Sector.nearest_water_m <= max_water_m)

    rows = session.exec(stmt).all()

    # waterfront site counts per sector (one query)
    wf_counts: dict[str, int] = dict(
        session.exec(
            select(Site.sector_id, func.count(Site.id))
            .where(Site.waterfront == True)  # noqa: E712
            .group_by(Site.sector_id)
        ).all()
    )

    # amenity filter (in-Python since JSON match doesn't index well in SQLite)
    if want_amen:
        filtered = []
        for sec, est in rows:
            try:
                am = Amenities.model_validate_json(sec.amenities_json or "{}")
            except Exception:
                am = Amenities()
            if am.matches(want_amen):
                filtered.append((sec, est))
        rows = filtered

    # distance enrichment
    sector_ids = [s.id for s, _ in rows if s.lat and s.lon]
    cached = {
        d.sector_id: d
        for d in session.exec(
            select(DistanceCache).where(
                DistanceCache.origin_hash == ohash,
                DistanceCache.sector_id.in_(sector_ids),
            )
        ).all()
    }
    missing = [sid for sid in sector_ids if sid not in cached]
    if missing:
        coords = {
            s.id: (s.lat, s.lon)
            for s, _ in rows
            if s.id in missing and s.lat and s.lon
        }
        try:
            osrm = OSRMClient()
            matrix = await osrm.table_from(olat, olon, coords)
            for sid, (km, mins) in matrix.items():
                d = DistanceCache(
                    origin_hash=ohash,
                    sector_id=sid,
                    driving_km=km,
                    driving_min=mins,
                )
                session.merge(d)
                cached[sid] = d
            session.commit()
        except Exception:
            # OSRM unreachable: distances stay null
            pass

    out = []
    for sec, est in rows:
        d = cached.get(sec.id)
        if max_drive_min is not None and (not d or d.driving_min > max_drive_min):
            continue
        try:
            am = Amenities.model_validate_json(sec.amenities_json or "{}")
        except Exception:
            am = Amenities()
        out.append(
            {
                "sector_id": sec.id,
                "name": sec.name,
                "establishment": {"id": est.id, "name": est.name, "region": est.region},
                "lat": sec.lat,
                "lon": sec.lon,
                "drive_km": d.driving_km if d else None,
                "drive_min": d.driving_min if d else None,
                "waterfront_score": sec.waterfront_score,
                "nearest_water": {
                    "name": sec.nearest_water_name,
                    "m": sec.nearest_water_m,
                },
                "amenity_summary": am.model_dump(exclude={"raw_icons"}),
                "site_count": sec.site_count,
                "waterfront_count": int(wf_counts.get(sec.id, 0)),
                "url": sec.url,
            }
        )

    if sort == "drive_min":
        out.sort(key=lambda r: r["drive_min"] if r["drive_min"] is not None else 1e9)
    elif sort == "waterfront":
        out.sort(key=lambda r: -(r["waterfront_score"] or 0))
    else:
        out.sort(key=lambda r: r["name"])
    return out[:limit]
