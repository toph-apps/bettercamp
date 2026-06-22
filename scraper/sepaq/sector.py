"""Crawl one sector page: extract sites, amenities, centroid, map image."""

from __future__ import annotations

from dataclasses import dataclass, field

import httpx
from bettercamp_shared import Amenities
from selectolax.parser import HTMLParser

from .establishment import _extract_latlon
from .http import fetch
from .icons import amenities_from_labels


@dataclass
class SiteLink:
    id: str
    number: str
    url: str | None


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


def _extract_amenity_labels(tree: HTMLParser) -> list[str]:
    """Sépaq renders amenity icons as <img alt='...'> or <i title='...'>.
    Collect any label-bearing attribute under the services section.
    """
    labels: list[str] = []
    containers = (
        tree.css(".services")
        + tree.css(".amenities")
        + tree.css("[data-services]")
        + tree.css(".caracteristiques")
    )
    if not containers:
        containers = [tree.root]  # last resort: scan whole page
    seen: set[str] = set()
    for cont in containers:
        if cont is None:
            continue
        for node in cont.css("img[alt], i[title], svg title, [data-tooltip]"):
            label = (
                node.attributes.get("alt")
                or node.attributes.get("title")
                or node.attributes.get("data-tooltip")
                or node.text(strip=True)
                or ""
            ).strip()
            if label and label not in seen:
                seen.add(label)
                labels.append(label)
    return labels


def _extract_map_image(tree: HTMLParser, sector_url: str) -> str | None:
    img = tree.css_first(".carte img, .map img, img[alt*='map'], img[alt*='carte']")
    if img:
        src = img.attributes.get("src") or img.attributes.get("data-src")
        if src:
            if src.startswith("//"):
                return "https:" + src
            if src.startswith("/"):
                return "https://www.sepaq.com" + src
            return src
    return None


def parse_sector(html: str, sector_id: str, name: str, url: str) -> SectorData:
    tree = HTMLParser(html)
    data = SectorData(sector_id=sector_id, name=name, url=url)
    data.lat, data.lon = _extract_latlon(html)
    data.amenities = amenities_from_labels(_extract_amenity_labels(tree))
    data.map_image_url = _extract_map_image(tree, url)

    # site list: Sépaq renders an SVG/HTML map with one node per site.
    # Heuristic: <a> with data-site-id or numeric link, or <div class="site">.
    seen: set[str] = set()
    site_anchors = (
        tree.css("a[data-site-id]")
        + tree.css("a[data-emplacement]")
        + tree.css("a.emplacement")
    )
    for a in site_anchors:
        sid = (
            a.attributes.get("data-site-id")
            or a.attributes.get("data-emplacement")
            or a.text(strip=True)
        )
        if not sid or sid in seen:
            continue
        seen.add(sid)
        href = a.attributes.get("href")
        data.sites.append(
            SiteLink(id=f"{sector_id}__{sid}", number=str(sid), url=href)
        )
    return data


async def fetch_sector(
    c: httpx.AsyncClient, sector_id: str, name: str, url: str
) -> SectorData:
    html = await fetch(c, url)
    return parse_sector(html, sector_id, name, url)
