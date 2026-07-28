import type {
  Amenities,
  EstablishmentSummary,
  Health,
  SearchParams,
  SectorSearchResult,
} from "../api/types";
import { openDb, rowsToObjects } from "./loader";
import {
  originHash,
  osrmTable,
  readCachedDistances,
  type DriveDist,
} from "./osrm";

const MONTREAL = { lat: 45.5017, lon: -73.5673 };
const MONTREAL_ORIGIN_HASH = "MONTREAL";

/* ---------- amenities parity with shared/bettercamp_shared/amenities.py ---------- */

const DEFAULT_AMENITIES: Amenities = {
  toilets: "unknown",
  parking: false,
  drinking_water: false,
  fire_pit: false,
  electricity: false,
  picnic_table: false,
  shower: false,
  wheelchair: false,
  pets: false,
};

function parseAmenitiesJson(raw: string | null | undefined): Amenities {
  if (!raw) return { ...DEFAULT_AMENITIES };
  try {
    const parsed = JSON.parse(raw) as Partial<Amenities>;
    return { ...DEFAULT_AMENITIES, ...parsed };
  } catch {
    return { ...DEFAULT_AMENITIES };
  }
}

const AMENITY_ALIASES: Record<string, string> = { water: "drinking_water" };

function parseRequired(raw: string | undefined): Record<string, string | boolean> {
  if (!raw) return {};
  const out: Record<string, string | boolean> = {};
  for (const token of raw.split(",")) {
    const t = token.trim();
    if (!t) continue;
    if (t.includes(":")) {
      const [k, v] = t.split(":", 2);
      out[k.trim()] = v.trim();
    } else {
      out[AMENITY_ALIASES[t] ?? t] = true;
    }
  }
  return out;
}

/** AND-match: every required key must equal the stored value. Mirrors Amenities.matches. */
function amenitiesMatch(am: Amenities, required: Record<string, string | boolean>): boolean {
  for (const [key, want] of Object.entries(required)) {
    const cur = (am as unknown as Record<string, unknown>)[key];
    if (typeof want === "boolean") {
      if (Boolean(cur) !== want) return false;
    } else {
      if (String(cur) !== String(want)) return false;
    }
  }
  return true;
}

/* ---------- endpoints ---------- */

export async function listEstablishments(): Promise<EstablishmentSummary[]> {
  const db = await openDb();
  return rowsToObjects<EstablishmentSummary>(
    db,
    `SELECT e.id, e.name, e.region, e.lat, e.lon,
            COUNT(s.id) AS sector_count,
            COALESCE(SUM(s.site_count), 0) AS site_count
     FROM establishment e
     LEFT JOIN sector s ON s.establishment_id = e.id
     GROUP BY e.id
     ORDER BY e.name`,
  );
}

export async function getEstablishment(id: string): Promise<unknown> {
  const db = await openDb();
  const est = rowsToObjects(db, `SELECT * FROM establishment WHERE id = ?`, [id])[0];
  if (!est) throw new Error("Establishment not found");
  const sectors = rowsToObjects<Record<string, unknown>>(
    db,
    `SELECT * FROM sector WHERE establishment_id = ?`,
    [id],
  );
  const wfCounts = new Map<string, number>();
  if (sectors.length) {
    const placeholders = sectors.map(() => "?").join(",");
    const rows = rowsToObjects<{ sector_id: string; c: number }>(
      db,
      `SELECT sector_id, COUNT(id) AS c FROM site
       WHERE waterfront = 1 AND sector_id IN (${placeholders})
       GROUP BY sector_id`,
      sectors.map((s) => s.id as string),
    );
    for (const r of rows) wfCounts.set(r.sector_id, Number(r.c));
  }
  return {
    ...est,
    sectors: sectors.map((s) => ({
      ...s,
      waterfront_count: wfCounts.get(s.id as string) ?? 0,
    })),
  };
}

export async function getSector(id: string): Promise<unknown> {
  const db = await openDb();
  const sec = rowsToObjects(db, `SELECT * FROM sector WHERE id = ?`, [id])[0];
  if (!sec) throw new Error("Sector not found");
  const sites = rowsToObjects(db, `SELECT * FROM site WHERE sector_id = ?`, [id]);
  return { ...sec, sites };
}

export async function getSite(id: string): Promise<unknown> {
  const db = await openDb();
  const site = rowsToObjects(db, `SELECT * FROM site WHERE id = ?`, [id])[0];
  if (!site) throw new Error("Site not found");
  return site;
}

export async function getHealth(): Promise<Health> {
  const db = await openDb();
  const row = rowsToObjects<{ started_at: string; status: string }>(
    db,
    `SELECT started_at, status FROM scraperrun ORDER BY started_at DESC LIMIT 1`,
  )[0];
  if (!row) return { last_run: null, status: "never", stale_days: null };
  const started = new Date(row.started_at.replace(" ", "T") + "Z");
  const staleDays = Math.floor((Date.now() - started.getTime()) / 86400000);
  return {
    last_run: started.toISOString(),
    status: row.status as Health["status"],
    stale_days: staleDays,
  };
}

/* ---------- search: port of api/app/routes/search.py::search ---------- */

type SectorRow = {
  id: string;
  name: string;
  lat: number | null;
  lon: number | null;
  site_count: number;
  amenities_json: string;
  waterfront_score: number;
  nearest_water_name: string | null;
  nearest_water_m: number | null;
  url: string;
  est_id: string;
  est_name: string;
  est_region: string | null;
};

function parseOrigin(raw: string | undefined): { lat: number; lon: number } {
  if (!raw) return MONTREAL;
  const [lat, lon] = raw.split(",").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return MONTREAL;
  return { lat, lon };
}

function isMontreal(o: { lat: number; lon: number }): boolean {
  return Math.abs(o.lat - MONTREAL.lat) < 1e-9 && Math.abs(o.lon - MONTREAL.lon) < 1e-9;
}

export async function search(p: SearchParams): Promise<SectorSearchResult[]> {
  const db = await openDb();
  const origin = parseOrigin(p.origin);
  const wantAmen = parseRequired(p.amenities);

  const clauses: string[] = [];
  const args: unknown[] = [];
  if (p.region) {
    clauses.push("e.region = ?");
    args.push(p.region);
  }
  if (p.min_sites != null) {
    clauses.push("s.site_count >= ?");
    args.push(p.min_sites);
  }
  if (p.max_sites != null) {
    clauses.push("s.site_count <= ?");
    args.push(p.max_sites);
  }
  if (p.waterfront) clauses.push("s.waterfront_score > 0");
  if (p.max_water_m != null) {
    clauses.push("s.nearest_water_m <= ?");
    args.push(p.max_water_m);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const rows = rowsToObjects<SectorRow>(
    db,
    `SELECT s.id, s.name, s.lat, s.lon, s.site_count, s.amenities_json,
            s.waterfront_score, s.nearest_water_name, s.nearest_water_m, s.url,
            e.id AS est_id, e.name AS est_name, e.region AS est_region
     FROM sector s JOIN establishment e ON e.id = s.establishment_id
     ${where}`,
    args,
  );

  const wfRows = rowsToObjects<{ sector_id: string; c: number }>(
    db,
    `SELECT sector_id, COUNT(id) AS c FROM site WHERE waterfront = 1 GROUP BY sector_id`,
  );
  const wfCounts = new Map<string, number>();
  for (const r of wfRows) wfCounts.set(r.sector_id, Number(r.c));

  const withAmen = rows.map((r) => ({ row: r, am: parseAmenitiesJson(r.amenities_json) }));
  const filtered = Object.keys(wantAmen).length
    ? withAmen.filter(({ am }) => amenitiesMatch(am, wantAmen))
    : withAmen;

  const distances = await resolveDistances(
    db,
    origin,
    filtered.map(({ row }) => row).filter((r) => r.lat != null && r.lon != null) as {
      id: string;
      lat: number;
      lon: number;
    }[],
  );

  const out: SectorSearchResult[] = [];
  for (const { row, am } of filtered) {
    const d = distances[row.id];
    if (p.max_drive_min != null && (!d || d.min > p.max_drive_min)) continue;
    out.push({
      sector_id: row.id,
      name: row.name,
      establishment: { id: row.est_id, name: row.est_name, region: row.est_region },
      lat: row.lat,
      lon: row.lon,
      drive_km: d?.km ?? null,
      drive_min: d?.min ?? null,
      waterfront_score: row.waterfront_score,
      nearest_water: { name: row.nearest_water_name, m: row.nearest_water_m },
      amenity_summary: am,
      site_count: row.site_count,
      waterfront_count: wfCounts.get(row.id) ?? 0,
      url: row.url,
    });
  }

  const sort = p.sort ?? "name";
  if (sort === "drive_min") {
    out.sort((a, b) => (a.drive_min ?? 1e9) - (b.drive_min ?? 1e9));
  } else if (sort === "waterfront") {
    out.sort((a, b) => -((a.waterfront_score ?? 0) - (b.waterfront_score ?? 0)));
  } else {
    out.sort((a, b) => a.name.localeCompare(b.name));
  }
  return out.slice(0, p.limit ?? 100);
}

async function resolveDistances(
  db: import("sql.js").Database,
  origin: { lat: number; lon: number },
  sectors: { id: string; lat: number; lon: number }[],
): Promise<Record<string, DriveDist>> {
  if (sectors.length === 0) return {};

  if (isMontreal(origin)) {
    const ids = sectors.map((s) => s.id);
    const placeholders = ids.map(() => "?").join(",");
    const rows = rowsToObjects<{ sector_id: string; driving_km: number; driving_min: number }>(
      db,
      `SELECT sector_id, driving_km, driving_min FROM distancecache
       WHERE origin_hash = ? AND sector_id IN (${placeholders})`,
      [MONTREAL_ORIGIN_HASH, ...ids],
    );
    const out: Record<string, DriveDist> = {};
    for (const r of rows) out[r.sector_id] = { km: r.driving_km, min: r.driving_min };
    return out;
  }

  // Custom origin: localStorage cache + public OSRM fallback.
  const oh = originHash(origin.lat, origin.lon);
  const cached = readCachedDistances(oh, sectors.map((s) => s.id));
  const missing = sectors.filter((s) => !(s.id in cached));
  if (missing.length === 0) return cached;
  try {
    const fresh = await osrmTable(origin, missing);
    return { ...cached, ...fresh };
  } catch {
    // OSRM unreachable: what we cached is what you get; missing stays undefined.
    return cached;
  }
}
