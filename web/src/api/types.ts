export type Amenities = {
  toilets: "flush" | "vault" | "none" | "unknown";
  parking: boolean;
  drinking_water: boolean;
  fire_pit: boolean;
  electricity: boolean;
  picnic_table: boolean;
  shower: boolean;
  wheelchair: boolean;
  pets: boolean;
};

export type EstablishmentSummary = {
  id: string;
  name: string;
  region: string | null;
  lat: number | null;
  lon: number | null;
  sector_count: number;
  site_count: number;
};

export type SectorSearchResult = {
  sector_id: string;
  name: string;
  establishment: { id: string; name: string; region: string | null };
  lat: number | null;
  lon: number | null;
  drive_km: number | null;
  drive_min: number | null;
  waterfront_score: number;
  nearest_water: { name: string | null; m: number | null };
  amenity_summary: Amenities;
  site_count: number;
  url: string;
};

export type SearchParams = {
  origin?: string;
  max_drive_min?: number;
  waterfront?: boolean;
  max_water_m?: number;
  min_sites?: number;
  max_sites?: number;
  amenities?: string;
  region?: string;
  sort?: "drive_min" | "name" | "waterfront";
  limit?: number;
};

export type Health = {
  last_run: string | null;
  status: "ok" | "partial" | "failed" | "never";
  stale_days: number | null;
};
