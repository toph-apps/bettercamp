import type { SectorSearchResult } from "../api/types";

export type EstablishmentMarker = {
  establishment_id: string;
  name: string;
  region: string | null;
  lat: number;
  lon: number;
  sector_count: number;
  site_count: number;
  waterfront_count: number;
  waterfront_sector_count: number;
  drive_min: number | null;
  drive_km: number | null;
  sepaq_url: string | null;
};

export function aggregateByEstablishment(
  sectors: SectorSearchResult[],
): EstablishmentMarker[] {
  const byId: Record<string, EstablishmentMarker> = {};
  for (const s of sectors) {
    if (s.lat == null || s.lon == null) continue;
    const id = s.establishment.id;
    const cur = byId[id];
    if (!cur) {
      byId[id] = {
        establishment_id: id,
        name: s.establishment.name,
        region: s.establishment.region,
        lat: s.lat,
        lon: s.lon,
        sector_count: 1,
        site_count: s.site_count,
        waterfront_count: s.waterfront_count,
        waterfront_sector_count: s.waterfront_score > 0 ? 1 : 0,
        drive_min: s.drive_min,
        drive_km: s.drive_km,
        sepaq_url: extractEstablishmentUrl(s.url),
      };
    } else {
      cur.sector_count += 1;
      cur.site_count += s.site_count;
      cur.waterfront_count += s.waterfront_count;
      if (s.waterfront_score > 0) cur.waterfront_sector_count += 1;
      if (cur.drive_min === null && s.drive_min !== null) {
        cur.drive_min = s.drive_min;
        cur.drive_km = s.drive_km;
      }
    }
  }
  return Object.values(byId);
}

function extractEstablishmentUrl(sectorUrl: string): string | null {
  // sector URL: https://www.sepaq.com/en/reservation/camping/<est>/<sector>
  // establishment URL: https://www.sepaq.com/en/reservation/camping/<est>
  try {
    const u = new URL(sectorUrl);
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("camping");
    if (idx < 0 || idx + 1 >= parts.length) return null;
    return `${u.origin}/${parts.slice(0, idx + 2).join("/")}`;
  } catch {
    return null;
  }
}
