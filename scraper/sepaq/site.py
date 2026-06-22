"""Crawl one individual site page.

Sépaq exposes per-site data as text sections (Services / Access /
Description), not icons. We grab the structured bullets so the UI can
render them, plus a photo gallery URL list and the price/subtitle.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field

import httpx
from bettercamp_shared import Amenities
from selectolax.parser import HTMLParser

from .http import fetch
from .icons import amenities_from_bullets


def _abs(src: str) -> str:
    if src.startswith("//"):
        return "https:" + src
    if src.startswith("/"):
        return "https://www.sepaq.com" + src
    return src


@dataclass
class SiteData:
    site_id: str
    name: str | None = None
    subtitle: str | None = None
    photos: list[str] = field(default_factory=list)
    services: list[str] = field(default_factory=list)
    description: list[str] = field(default_factory=list)
    access: str | None = None
    price_text: str | None = None
    amenities: Amenities = field(default_factory=Amenities)
    waterfront: bool | None = None


def _section_bullets(t: HTMLParser, heading: str) -> list[str]:
    """For each <h3>heading</h3>, gather its sibling .collapsible-content
    bullet lines (split by inner-text linebreaks)."""
    out: list[str] = []
    for h in t.css(".fiche-section h3, .fiche-section h4"):
        if h.text(strip=True) != heading:
            continue
        # find sibling .collapsible-content within the same .fiche-sous-section
        parent = h.parent
        if parent is None:
            continue
        for body in parent.css(".collapsible-content"):
            for li in body.css("li"):
                txt = li.text(strip=True)
                if txt:
                    out.append(txt)
            if not out:
                # fall back: split inner text by <br> or newlines
                for line in re.split(r"[\r\n]+", body.text(separator="\n", strip=True)):
                    line = line.strip()
                    if line:
                        out.append(line)
    return out


def _subtitle(t: HTMLParser, name: str | None) -> str | None:
    """The page-title head includes '<name> - <subtitle> - <establishment>'.
    Pull the <title> tag and split on ' - ' to find it."""
    title_el = t.css_first("title")
    if not title_el:
        return None
    raw = title_el.text(strip=True)
    # "Lac-Bouteille 1 - Rustic campsite - Réserve faunique Mastigouche - Sépaq"
    parts = [p.strip() for p in raw.split(" - ")]
    if name and name in parts:
        idx = parts.index(name)
        if idx + 1 < len(parts):
            return parts[idx + 1]
    return None


def _photos(t: HTMLParser) -> list[str]:
    urls: list[str] = []
    seen: set[str] = set()
    for img in t.css(".fiche-section.medias img, [class*=photo] img"):
        src = img.attributes.get("src") or img.attributes.get("data-src") or ""
        if not src or "imagescloud" not in src:
            continue
        full = _abs(src)
        if full in seen:
            continue
        seen.add(full)
        urls.append(full)
    return urls


def _price_text(t: HTMLParser) -> str | None:
    el = t.css_first(".fiche-section-price")
    if el:
        return el.text(strip=True) or None
    return None


def parse_site(html: str, site_id: str) -> SiteData:
    t = HTMLParser(html)
    name_el = t.css_first(".fiche h2") or t.css_first("h2")
    name = name_el.text(strip=True) if name_el else None
    subtitle = _subtitle(t, name)

    services = _section_bullets(t, "Services")
    access_list = _section_bullets(t, "Access")
    description = _section_bullets(t, "Description")

    am, water = amenities_from_bullets(services + description + access_list)

    return SiteData(
        site_id=site_id,
        name=name,
        subtitle=subtitle,
        photos=_photos(t),
        services=services,
        description=description,
        access=" / ".join(access_list) if access_list else None,
        price_text=_price_text(t),
        amenities=am,
        waterfront=water,
    )


async def fetch_site(c: httpx.AsyncClient, site_id: str, url: str) -> SiteData:
    html = await fetch(c, url)
    return parse_site(html, site_id)
