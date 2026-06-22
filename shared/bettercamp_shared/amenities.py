from enum import StrEnum

from pydantic import BaseModel, Field


class ToiletKind(StrEnum):
    FLUSH = "flush"
    VAULT = "vault"
    NONE = "none"
    UNKNOWN = "unknown"


class Amenities(BaseModel):
    """Per-site or per-sector amenity bundle.

    Stored as JSON in `amenities_json`; `raw_icons` keeps the original
    Sépaq icon labels so we can backfill new structured fields later
    without re-scraping.
    """

    toilets: ToiletKind = ToiletKind.UNKNOWN
    parking: bool = False
    drinking_water: bool = False
    fire_pit: bool = False
    electricity: bool = False
    picnic_table: bool = False
    shower: bool = False
    wheelchair: bool = False
    pets: bool = False
    raw_icons: list[str] = Field(default_factory=list)

    def matches(self, required: dict[str, str | bool]) -> bool:
        """AND-match: every required key must equal the stored value."""
        for key, want in required.items():
            cur = getattr(self, key, None)
            if isinstance(want, bool):
                if bool(cur) != want:
                    return False
            else:
                if str(cur) != str(want):
                    return False
        return True
