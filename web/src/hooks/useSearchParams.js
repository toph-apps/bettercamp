import { useSearchParams } from "react-router-dom";
/** Parse URL search params into typed SearchParams. */
export function useTypedSearchParams() {
    const [sp, setSp] = useSearchParams();
    const params = {
        origin: sp.get("origin") ?? undefined,
        max_drive_min: numOrUndef(sp.get("max_drive_min")),
        waterfront: sp.get("waterfront") === "1" ? true : undefined,
        max_water_m: numOrUndef(sp.get("max_water_m")),
        min_sites: numOrUndef(sp.get("min_sites")),
        max_sites: numOrUndef(sp.get("max_sites")),
        amenities: sp.get("amenities") ?? undefined,
        region: sp.get("region") ?? undefined,
        sort: sp.get("sort") ?? undefined,
        limit: numOrUndef(sp.get("limit")),
    };
    const update = (next) => {
        const out = new URLSearchParams();
        for (const [k, v] of Object.entries(next)) {
            if (v === undefined || v === null || v === "" || v === false)
                continue;
            out.set(k, v === true ? "1" : String(v));
        }
        setSp(out, { replace: false });
    };
    return [params, update];
}
function numOrUndef(v) {
    if (v === null || v === "")
        return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}
