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
class SectorDot:
    sector_id: str  # `<est>__<slug>`
    left: float  # 0..100
    top: float  # 0..100


@dataclass
class EstablishmentData:
    link: EstablishmentLink
    region: str | None = None
    lat: float | None = None
    lon: float | None = None
    sectors: list[SectorLink] = field(default_factory=list)
    map_image_url: str | None = None  # overview gif
    sector_dots: list[SectorDot] = field(default_factory=list)


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


_STYLE_LEFT = re.compile(r"left:\s*([\d.]+)%")
_STYLE_TOP = re.compile(r"top:\s*([\d.]+)%")


def _extract_overview_map(tree: HTMLParser) -> str | None:
    for img in tree.css("img[src*='/maps/']"):
        src = img.attributes.get("src") or img.attributes.get("data-src")
        if src:
            return ("https:" + src) if src.startswith("//") else src
    return None


def _extract_dots(
    tree: HTMLParser, est_slug: str
) -> list[SectorDot]:
    """`<li style="left:..%; top:..%;"><a href="<est>/<sector>"...></a></li>`"""
    dots: list[SectorDot] = []
    seen: set[str] = set()
    for li in tree.css(".resultats-carte-carte li, .resultats-carte li"):
        style = li.attributes.get("style") or ""
        ml = _STYLE_LEFT.search(style)
        mt = _STYLE_TOP.search(style)
        if not (ml and mt):
            continue
        a = li.css_first("a.resultats-carte-point") or li.css_first("a[href]")
        if not a:
            continue
        href = (a.attributes.get("href") or "").strip()
        if not href or "/reservation/camping/" not in href:
            continue
        slug = href.rstrip("/").split("/")[-1]
        if slug == est_slug or slug in seen:
            continue
        seen.add(slug)
        dots.append(
            SectorDot(
                sector_id=f"{est_slug}__{slug}",
                left=float(ml.group(1)),
                top=float(mt.group(1)),
            )
        )
    return dots


def parse_establishment(html: str, link: EstablishmentLink) -> EstablishmentData:
    tree = HTMLParser(html)
    data = EstablishmentData(link=link)
    data.lat, data.lon = _extract_latlon(html)
    data.region = _extract_region(html)
    data.map_image_url = _extract_overview_map(tree)
    data.sector_dots = _extract_dots(tree, link.id)

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
