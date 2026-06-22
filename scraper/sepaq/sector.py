"""Crawl one sector page: extract sites, sector amenities, centroid, map."""

from __future__ import annotations

from dataclasses import dataclass, field

import httpx
from bettercamp_shared import Amenities
from selectolax.parser import HTMLParser

from .establishment import _extract_latlon
from .http import fetch


def _abs(src: str) -> str:
    if src.startswith("//"):
        return "https:" + src
    if src.startswith("/"):
        return "https://www.sepaq.com" + src
    return src


@dataclass
class SiteLink:
    id: str
    number: str
    url: str | None
    name: str | None = None


@dataclass
class SectorData:
    sector_id: str
    name: str
    url: str
    lat: float | None = None
    lon: float | None = None
    amenities: Amenities = field(default_factory=Amenities)
    map_image_url: str | None = None
    sites: list[SiteLink] = field(default_factory=list)


def _extract_map_image(tree: HTMLParser) -> str | None:
    # Observed: <img src="//imagescloud.s3-accelerate.amazonaws.com/images/maps/<estab>/<file>.gif">
    for sel in (
        "img[src*='/maps/']",
        "img[src*='/map/']",
        "img[alt*='map']",
        "img[alt*='carte']",
    ):
        img = tree.css_first(sel)
        if img:
            src = img.attributes.get("src") or img.attributes.get("data-src")
            if src:
                return _abs(src)
    return None


def parse_sector(html: str, sector_id: str, name: str, url: str) -> SectorData:
    tree = HTMLParser(html)
    data = SectorData(sector_id=sector_id, name=name, url=url)
    data.lat, data.lon = _extract_latlon(html)
    data.map_image_url = _extract_map_image(tree)

    # Sites: `a.resultats-item.is-blue` whose href matches `<sector_url>/<slug>`.
    # Take only one anchor per slug (the page renders each twice: a "Camping…
    # Consult" sidebar row and a clickable "Lac-Bouteille N" map dot).
    seen: set[str] = set()
    for a in tree.css("a.resultats-item.is-blue"):
        href = (a.attributes.get("href") or "").strip()
        if not href or "/reservation/camping/" not in href:
            continue
        # require leaf depth (sector slug + site slug after the sector URL)
        depth = href.rstrip("/").count("/")
        if depth < 6:
            continue
        slug = href.rstrip("/").split("/")[-1]
        if slug in seen:
            continue
        seen.add(slug)
        name_node = a.css_first(".h4.text") or a.css_first(".h4") or a
        site_name = name_node.text(strip=True) or slug
        # number = trailing digits of site name, falling back to last slug segment
        import re

        m = re.search(r"(\d+)\s*$", site_name)
        number = m.group(1) if m else slug.split("-")[-1]
        data.sites.append(
            SiteLink(
                id=f"{sector_id}__{slug}",
                number=number,
                url=href,
                name=site_name,
            )
        )

    return data


async def fetch_sector(
    c: httpx.AsyncClient, sector_id: str, name: str, url: str
) -> SectorData:
    html = await fetch(c, url)
    return parse_sector(html, sector_id, name, url)


# kept for site.py backwards-compat import
def _extract_amenity_labels(tree: HTMLParser) -> list[str]:  # pragma: no cover
    return []
