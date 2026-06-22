import type {
  EstablishmentSummary,
  Health,
  SearchParams,
  SectorSearchResult,
} from "./types";

const BASE = "/api";

async function getJson<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const url = new URL(BASE + path, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  const r = await fetch(url.pathname + url.search);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json() as Promise<T>;
}

export const api = {
  establishments: () => getJson<EstablishmentSummary[]>("/establishments"),
  establishment: (id: string) => getJson<unknown>(`/establishments/${id}`),
  sector: (id: string) => getJson<unknown>(`/sectors/${id}`),
  site: (id: string) => getJson<unknown>(`/sites/${id}`),
  search: (p: SearchParams) => getJson<SectorSearchResult[]>("/search", p as Record<string, unknown>),
  health: () => getJson<Health>("/health/scrape"),
};
