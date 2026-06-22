const BASE = "/api";
async function getJson(path, params) {
    const url = new URL(BASE + path, window.location.origin);
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            if (v === undefined || v === null || v === "")
                continue;
            url.searchParams.set(k, String(v));
        }
    }
    const r = await fetch(url.pathname + url.search);
    if (!r.ok)
        throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
}
export const api = {
    establishments: () => getJson("/establishments"),
    establishment: (id) => getJson(`/establishments/${id}`),
    sector: (id) => getJson(`/sectors/${id}`),
    site: (id) => getJson(`/sites/${id}`),
    search: (p) => getJson("/search", p),
    health: () => getJson("/health/scrape"),
};
