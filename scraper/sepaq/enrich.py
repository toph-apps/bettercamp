"""Geocoding + waterfront enrichment.

The Sépaq map JSON endpoint is gated by server-side session state we
can't reliably reproduce in a scraper context. Until that's reverse-
engineered, fall back to Nominatim (OSM geocoder) for establishment +
sector centroids. Free, no key, ~1 req/sec rate limit.

For each sector with known centroid, find the nearest water polygon
(natural=water, waterway=*) within RADIUS_M and compute a score.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import httpx

# Public Overpass mirrors. We round-robin across them — the main de mirror
# rate-limits aggressively (returns 406 to anonymous clients) so falling
# back to kumi/lz4 keeps the crawl from stalling. Override with
# BETTERCAMP_OVERPASS=https://… if you self-host.
import os

OVERPASS_MIRRORS = [
    os.environ.get("BETTERCAMP_OVERPASS")
    or "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
]
NOMINATIM = "https://nominatim.openstreetmap.org/search"
RADIUS_M = 500
NOMINATIM_UA = "bettercamp/0.1 (+personal use; kersef@gmail.com)"
OVERPASS_UA = NOMINATIM_UA


async def geocode_nominatim(
    c: httpx.AsyncClient, query: str, *, country: str = "ca"
) -> tuple[float, float] | None:
    """Forward-geocode a name via Nominatim. Returns (lat, lon) or None."""
    try:
        r = await c.get(
            NOMINATIM,
            params={"q": query, "format": "json", "limit": 1, "countrycodes": country},
            headers={"User-Agent": NOMINATIM_UA},
        )
        r.raise_for_status()
        data = r.json()
        if not data:
            return None
        return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception:
        return None


@dataclass
class WaterResult:
    score: float  # 0..1 (1 = touching water)
    name: str | None
    distance_m: int | None


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


_QUERY = """
[out:json][timeout:25];
(
  way(around:{r},{lat},{lon})["natural"="water"];
  way(around:{r},{lat},{lon})["waterway"];
  relation(around:{r},{lat},{lon})["natural"="water"];
);
out tags center;
""".strip()


_OVERPASS_RETRYABLE = {406, 429, 502, 503, 504}
_OVERPASS_TIMEOUT_S = 20.0  # short — give other mirrors a chance


async def _query_overpass(c: httpx.AsyncClient, lat: float, lon: float) -> dict:
    """Try each mirror once with a short timeout; surface the last error."""
    q = _QUERY.format(r=RADIUS_M, lat=lat, lon=lon)
    headers = {"User-Agent": OVERPASS_UA, "Accept": "application/json"}
    last_exc: Exception | None = None
    for url in OVERPASS_MIRRORS:
        try:
            r = await c.post(
                url, data={"data": q}, headers=headers, timeout=_OVERPASS_TIMEOUT_S
            )
            if r.status_code in _OVERPASS_RETRYABLE:
                last_exc = httpx.HTTPStatusError(
                    f"{url} -> {r.status_code}", request=r.request, response=r
                )
                continue
            r.raise_for_status()
            return r.json()
        except (httpx.HTTPError, httpx.TimeoutException) as exc:
            last_exc = exc
            continue
    raise last_exc or RuntimeError("all overpass mirrors failed")


async def enrich_waterfront(
    c: httpx.AsyncClient, lat: float, lon: float
) -> WaterResult:
    try:
        data = await _query_overpass(c, lat, lon)
    except Exception:
        return WaterResult(score=0.0, name=None, distance_m=None)

    nearest: tuple[float, str | None] | None = None
    for el in data.get("elements", []):
        center = el.get("center") or {"lat": el.get("lat"), "lon": el.get("lon")}
        clat, clon = center.get("lat"), center.get("lon")
        if clat is None or clon is None:
            continue
        d = _haversine_m(lat, lon, clat, clon)
        name = (el.get("tags") or {}).get("name")
        if nearest is None or d < nearest[0]:
            nearest = (d, name)

    if nearest is None:
        return WaterResult(score=0.0, name=None, distance_m=None)
    d_m, name = nearest
    score = max(0.0, 1.0 - d_m / RADIUS_M)
    return WaterResult(score=round(score, 3), name=name, distance_m=int(d_m))
