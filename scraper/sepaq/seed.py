"""Seed step: list every campground establishment.

Sépaq's `init` endpoint serves an HTML fragment with one link per
establishment. Selector observed during recon: `a.resultats-item.is-blue`.
If selector drifts, fall back to any anchor inside the results list with an
href under /en/reservation/camping/.
"""

from __future__ import annotations

from dataclasses import dataclass

import httpx
from selectolax.parser import HTMLParser

from .http import fetch

SEED_PATH = "/en/reservation/camping/init"


@dataclass
class EstablishmentLink:
    id: str  # slug
    name: str
    url: str  # absolute path


def _slug_from_href(href: str) -> str:
    parts = [p for p in href.strip("/").split("/") if p]
    # /en/reservation/camping/<slug>
    return parts[-1] if parts else href


def parse_seed(html: str) -> list[EstablishmentLink]:
    tree = HTMLParser(html)
    anchors = tree.css("a.resultats-item.is-blue")
    if not anchors:
        # fallback: any link under /en/reservation/camping/<x>
        anchors = [
            a
            for a in tree.css("a[href*='/reservation/camping/']")
            if a.attributes.get("href", "").count("/") >= 4
        ]
    out: list[EstablishmentLink] = []
    seen: set[str] = set()
    for a in anchors:
        href = (a.attributes.get("href") or "").strip()
        if not href or href in seen:
            continue
        seen.add(href)
        name_node = a.css_first(".h4.text") or a.css_first(".h4") or a
        name = (name_node.text(strip=True) or _slug_from_href(href)).strip()
        slug = _slug_from_href(href)
        out.append(EstablishmentLink(id=slug, name=name, url=href))
    return out


async def fetch_seed(c: httpx.AsyncClient) -> list[EstablishmentLink]:
    html = await fetch(c, SEED_PATH)
    return parse_seed(html)
