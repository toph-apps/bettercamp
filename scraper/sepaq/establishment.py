"""Crawl one establishment page: extract sectors + centroid."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field

import httpx
from selectolax.parser import HTMLParser

from .http import fetch
from .seed import EstablishmentLink


@dataclass
class SectorLink:
    id: str
    name: str
    url: str


@dataclass
class EstablishmentData:
    link: EstablishmentLink
    region: str | None = None
    lat: float | None = None
    lon: float | None = None
    sectors: list[SectorLink] = field(default_factory=list)


_LATLNG_RE = re.compile(r'"latitude"\s*:\s*([-\d.]+).*?"longitude"\s*:\s*([-\d.]+)', re.S)


def _extract_latlon(html: str) -> tuple[float | None, float | None]:
    """Look for JSON-LD or inline coords."""
    tree = HTMLParser(html)
    for node in tree.css("script[type='application/ld+json']"):
        try:
            data = json.loads(node.text())
        except Exception:
            continue
        items = data if isinstance(data, list) else [data]
        for item in items:
            geo = item.get("geo") if isinstance(item, dict) else None
            if isinstance(geo, dict):
                lat = geo.get("latitude")
                lon = geo.get("longitude")
                if lat and lon:
                    try:
                        return float(lat), float(lon)
                    except (ValueError, TypeError):
                        pass
    m = _LATLNG_RE.search(html)
    if m:
        try:
            return float(m.group(1)), float(m.group(2))
        except ValueError:
            pass
    return None, None


def _extract_region(html: str) -> str | None:
    tree = HTMLParser(html)
    # Common patterns: breadcrumb, meta description, h-region tag
    crumb = tree.css(".breadcrumb a, nav.breadcrumb a")
    if crumb:
        # second crumb is typically the region
        if len(crumb) >= 2:
            return crumb[1].text(strip=True) or None
    region_meta = tree.css_first("meta[name='region']")
    if region_meta:
        return region_meta.attributes.get("content")
    return None


def parse_establishment(html: str, link: EstablishmentLink) -> EstablishmentData:
    tree = HTMLParser(html)
    data = EstablishmentData(link=link)
    data.lat, data.lon = _extract_latlon(html)
    data.region = _extract_region(html)

    anchors = tree.css("a.resultats-item.is-blue")
    if not anchors:
        anchors = [
            a
            for a in tree.css(f"a[href*='/reservation/camping/{link.id}/']")
        ]
    seen: set[str] = set()
    for a in anchors:
        href = (a.attributes.get("href") or "").strip()
        if not href or href in seen:
            continue
        seen.add(href)
        slug = href.rstrip("/").split("/")[-1]
        if slug == link.id:
            continue  # self-link
        name_node = a.css_first(".h4.text") or a.css_first(".h4") or a
        name = name_node.text(strip=True) or slug
        data.sectors.append(
            SectorLink(id=f"{link.id}__{slug}", name=name, url=href)
        )
    return data


async def fetch_establishment(
    c: httpx.AsyncClient, link: EstablishmentLink
) -> EstablishmentData:
    html = await fetch(c, link.url)
    return parse_establishment(html, link)
