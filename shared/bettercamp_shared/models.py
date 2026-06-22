from datetime import datetime

from sqlmodel import Field, SQLModel


class Establishment(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    region: str | None = None
    url: str
    lat: float | None = None
    lon: float | None = None
    scraped_at: datetime | None = None


class Sector(SQLModel, table=True):
    id: str = Field(primary_key=True)
    establishment_id: str = Field(foreign_key="establishment.id", index=True)
    name: str
    url: str
    lat: float | None = None
    lon: float | None = None
    site_count: int = 0
    amenities_json: str = "{}"
    waterfront_score: float = 0.0
    nearest_water_name: str | None = None
    nearest_water_m: int | None = None
    map_image_url: str | None = None
    scraped_at: datetime | None = None


class Site(SQLModel, table=True):
    id: str = Field(primary_key=True)
    sector_id: str = Field(foreign_key="sector.id", index=True)
    number: str
    url: str | None = None
    amenities_json: str = "{}"
    waterfront: bool | None = None  # NULL = unknown
    notes: str | None = None
    scraped_at: datetime | None = None


class DistanceCache(SQLModel, table=True):
    origin_hash: str = Field(primary_key=True)
    sector_id: str = Field(primary_key=True, foreign_key="sector.id")
    driving_km: float
    driving_min: int
    cached_at: datetime = Field(default_factory=datetime.utcnow)


class ScraperRun(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    started_at: datetime
    finished_at: datetime | None = None
    status: str  # "ok" | "partial" | "failed"
    error: str | None = None
    missing_fields: str | None = None  # JSON list
    counts_json: str | None = None  # JSON: {establishments, sectors, sites}
