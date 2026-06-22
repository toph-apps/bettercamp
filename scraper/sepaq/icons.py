"""Translate Sépaq textual bullets into structured Amenities.

Sépaq does NOT render amenity icons on site detail pages; instead each
site has a `Services` / `Access` / `Description` section with free-text
bullets. We pattern-match those bullets into the typed Amenities bundle.

Original ID for the file kept ("icons") since we want one normalization
layer regardless of input shape.
"""

from __future__ import annotations

from bettercamp_shared import Amenities, ToiletKind

# Bullet substring → field. Case-insensitive contains-match.
_WATER_DRINKABLE = ["drinking water", "eau potable"]
_WATER_NON_DRINKABLE = ["non-drinking water", "eau non potable"]
_WATER_NEAR = ["water near", "eau près", "eau pres", "eau a proximit", "eau à proximit"]

_TOILET_FLUSH = ["flush toilet", "toilette à chasse", "toilettes à chasse", "washroom facilities"]
_TOILET_VAULT = ["dry toilet", "vault toilet", "outhouse", "toilette sèche", "toilette seche"]

_SHOWER = ["shower", "douche"]
_PETS_ALLOWED = ["dogs are allowed", "pet allowed", "pets allowed", "chiens admis"]
_PETS_BANNED = ["dogs are not allowed", "no pets", "pas de chien"]
_FIRE_PIT = ["fire pit", "foyer"]
_PARKING = ["parking", "stationnement"]
_PICNIC = ["picnic table", "table de pique"]
_ELECTRICITY = ["electrical", "120 v", "240 v", "30 amp", "50 amp", "électrique", "electrique"]
_WHEELCHAIR = ["wheelchair", "accessible to people with reduced mobility", "personnes handicap"]
_WATER_VIEW = ["view of a lake", "view of a river", "vue sur le lac", "vue sur la rivière", "vue sur la riviere", "waterfront", "bord de l'eau"]


def _has(text: str, needles: list[str]) -> bool:
    lo = text.lower()
    return any(n in lo for n in needles)


def amenities_from_bullets(bullets: list[str]) -> tuple[Amenities, bool | None]:
    """Pattern-match bullets to amenity fields.

    Returns (amenities, waterfront_or_none). `waterfront` is True when a
    bullet explicitly references a lake/river view; False is never set
    here (absence of mention != not waterfront).
    """
    am = Amenities(raw_icons=list(bullets))
    waterfront: bool | None = None
    for b in bullets:
        if _has(b, _WATER_DRINKABLE):
            am.drinking_water = True
        elif _has(b, _WATER_NON_DRINKABLE) or _has(b, _WATER_NEAR):
            # Non-drinking water counts as "water available" for our default
            # filter — refine later if needed.
            pass
        if am.toilets == ToiletKind.UNKNOWN:
            if _has(b, _TOILET_FLUSH):
                am.toilets = ToiletKind.FLUSH
            elif _has(b, _TOILET_VAULT):
                am.toilets = ToiletKind.VAULT
        if _has(b, _SHOWER):
            am.shower = True
        if _has(b, _PETS_ALLOWED):
            am.pets = True
        elif _has(b, _PETS_BANNED):
            am.pets = False
        if _has(b, _FIRE_PIT):
            am.fire_pit = True
        if _has(b, _PARKING):
            am.parking = True
        if _has(b, _PICNIC):
            am.picnic_table = True
        if _has(b, _ELECTRICITY):
            am.electricity = True
        if _has(b, _WHEELCHAIR):
            am.wheelchair = True
        if _has(b, _WATER_VIEW):
            waterfront = True
    return am, waterfront


# Backwards-compat shim: old call site treated icon-alt strings the same way.
amenities_from_labels = amenities_from_bullets


def merge_amenities(sector_am: Amenities, site_am: Amenities) -> Amenities:
    """Site amenities inherit sector defaults (parking, toilets) and
    override on any non-default field set per-site."""
    out = sector_am.model_copy(deep=True)
    for field in (
        "drinking_water",
        "fire_pit",
        "electricity",
        "picnic_table",
        "shower",
        "wheelchair",
        "parking",
    ):
        if getattr(site_am, field):
            setattr(out, field, True)
    if site_am.toilets != ToiletKind.UNKNOWN:
        out.toilets = site_am.toilets
    if site_am.pets is True:
        out.pets = True
    out.raw_icons = list({*out.raw_icons, *site_am.raw_icons})
    return out
