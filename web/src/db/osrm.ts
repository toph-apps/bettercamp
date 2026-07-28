const PUBLIC_OSRM = "https://router.project-osrm.org";
const CACHE_PREFIX = "bc.osrm.v1.";

export type DriveDist = { km: number; min: number };

/** SHA-1-ish stable short key for (rounded lat, rounded lon). Matches Python's rounding. */
export function originHash(lat: number, lon: number): string {
  const r = (n: number) => (Math.round(n * 1000) / 1000).toFixed(3);
  return `${r(lat)},${r(lon)}`;
}

function cacheKey(oh: string, sectorId: string): string {
  return `${CACHE_PREFIX}${oh}::${sectorId}`;
}

function readCache(oh: string, sectorId: string): DriveDist | null {
  try {
    const raw = localStorage.getItem(cacheKey(oh, sectorId));
    if (!raw) return null;
    return JSON.parse(raw) as DriveDist;
  } catch {
    return null;
  }
}

function writeCache(oh: string, sectorId: string, d: DriveDist): void {
  try {
    localStorage.setItem(cacheKey(oh, sectorId), JSON.stringify(d));
  } catch {
    /* quota exceeded — silently ignore */
  }
}

/**
 * One-to-many drive times from origin to each destination.
 * Cache hits return synchronously via readCache before this is called.
 */
export async function osrmTable(
  origin: { lat: number; lon: number },
  destinations: { id: string; lat: number; lon: number }[],
): Promise<Record<string, DriveDist>> {
  if (destinations.length === 0) return {};
  const coords = [
    `${origin.lon},${origin.lat}`,
    ...destinations.map((d) => `${d.lon},${d.lat}`),
  ].join(";");
  const dests = destinations.map((_, i) => i + 1).join(";");
  const url =
    `${PUBLIC_OSRM}/table/v1/driving/${coords}` +
    `?sources=0&destinations=${dests}&annotations=duration,distance`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`OSRM ${r.status}`);
  const data = (await r.json()) as {
    durations?: number[][];
    distances?: number[][];
  };
  const durs = data.durations?.[0] ?? [];
  const dists = data.distances?.[0] ?? [];
  const oh = originHash(origin.lat, origin.lon);
  const out: Record<string, DriveDist> = {};
  destinations.forEach((d, i) => {
    const t = durs[i];
    const m = dists[i];
    if (t == null || m == null) return;
    const rec: DriveDist = {
      km: Math.round((m / 1000) * 10) / 10,
      min: Math.round(t / 60),
    };
    out[d.id] = rec;
    writeCache(oh, d.id, rec);
  });
  return out;
}

/** Return cached distances synchronously; caller fetches the rest. */
export function readCachedDistances(
  oh: string,
  sectorIds: string[],
): Record<string, DriveDist> {
  const out: Record<string, DriveDist> = {};
  for (const sid of sectorIds) {
    const d = readCache(oh, sid);
    if (d) out[sid] = d;
  }
  return out;
}
