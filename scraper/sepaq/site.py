"""Crawl one individual site page for per-site amenity overrides."""

from __future__ import annotations

from dataclasses import dataclass

import httpx
from bettercamp_shared import Amenities
from selectolax.parser import HTMLParser

from .http import fetch
from .icons import amenities_from_labels
from .sector import _extract_amenity_labels


@dataclass
class SiteData:
    site_id: str
    amenities: Amenities


def parse_site(html: str, site_id: str) -> SiteData:
    tree = HTMLParser(html)
    am = amenities_from_labels(_extract_amenity_labels(tree))
    return SiteData(site_id=site_id, amenities=am)


async def fetch_site(c: httpx.AsyncClient, site_id: str, url: str) -> SiteData:
    html = await fetch(c, url)
    return parse_site(html, site_id)
