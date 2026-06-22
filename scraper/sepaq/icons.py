"""Map Sépaq icon labels (or alt text) to Amenities fields.

Selectors and class names vary; this layer normalises whatever the scraper
collects so downstream code is icon-name-agnostic. Add new mappings as
`raw_icons` reveals them via the /admin missing-fields view.
"""

from __future__ import annotations

from bettercamp_shared import Amenities, ToiletKind

# Substring matchers, case-insensitive. First hit wins per field.
_PARKING = ["parking", "stationnement"]
_WATER = ["drinking water", "eau potable", "potable water"]
_FIRE = ["fire", "feu", "foyer"]
_ELECTRIC = ["electric", "électric", "120", "240"]
_PICNIC = ["picnic", "table"]
_SHOWER = ["shower", "douche"]
_WHEEL = ["wheelchair", "accessib", "handicap"]
_PETS = ["pet", "chien", "dog"]
_TOILET_FLUSH = ["flush toilet", "toilette à chasse", "toilet (flush)"]
_TOILET_VAULT = ["vault toilet", "dry toilet", "toilette sèche", "outhouse"]


def _has(label: str, candidates: list[str]) -> bool:
    label_l = label.lower()
    return any(c in label_l for c in candidates)


def amenities_from_labels(labels: list[str]) -> Amenities:
    am = Amenities(raw_icons=list(labels))
    for label in labels:
        if _has(label, _PARKING):
            am.parking = True
        if _has(label, _WATER):
            am.drinking_water = True
        if _has(label, _FIRE):
            am.fire_pit = True
        if _has(label, _ELECTRIC):
            am.electricity = True
        if _has(label, _PICNIC):
            am.picnic_table = True
        if _has(label, _SHOWER):
            am.shower = True
        if _has(label, _WHEEL):
            am.wheelchair = True
        if _has(label, _PETS):
            am.pets = True
        if am.toilets == ToiletKind.UNKNOWN:
            if _has(label, _TOILET_FLUSH):
                am.toilets = ToiletKind.FLUSH
            elif _has(label, _TOILET_VAULT):
                am.toilets = ToiletKind.VAULT
    return am
