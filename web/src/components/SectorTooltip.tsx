import type { SectorSearchResult } from "../api/types";

const AMENITY_ICONS: Record<keyof SectorSearchResult["amenity_summary"], string> = {
  toilets: "🚻",
  parking: "🅿️",
  drinking_water: "🚰",
  fire_pit: "🔥",
  electricity: "⚡",
  picnic_table: "🪵",
  shower: "🚿",
  wheelchair: "♿",
  pets: "🐶",
};

export default function SectorTooltip({ s }: { s: SectorSearchResult }) {
  const am = s.amenity_summary;
  const chips = Object.entries(am)
    .filter(([k, v]) => (k === "toilets" ? v !== "unknown" && v !== "none" : Boolean(v)))
    .map(([k]) => AMENITY_ICONS[k as keyof typeof AMENITY_ICONS])
    .filter(Boolean);

  return (
    <div className="w-64 rounded-md border bg-white p-3 shadow-lg">
      <div className="text-sm font-semibold">{s.name}</div>
      <div className="text-xs text-slate-500">
        {s.establishment.name} · {s.establishment.region ?? "—"}
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-y-1 text-xs">
        <dt className="text-slate-500">Sites</dt>
        <dd>{s.site_count}</dd>
        {s.waterfront_count > 0 && (
          <>
            <dt className="text-slate-500">💧 Waterfront</dt>
            <dd>
              {s.waterfront_count} / {s.site_count}
            </dd>
          </>
        )}
        {s.drive_min !== null && (
          <>
            <dt className="text-slate-500">Drive</dt>
            <dd>
              {s.drive_min} min · {s.drive_km} km
            </dd>
          </>
        )}
        {s.waterfront_score > 0 && s.waterfront_count === 0 && (
          <>
            <dt className="text-slate-500">Water</dt>
            <dd>
              {s.nearest_water.name ?? "nearby"}
              {s.nearest_water.m !== null ? ` · ${s.nearest_water.m} m` : ""}
            </dd>
          </>
        )}
      </dl>
      {chips.length > 0 && <div className="mt-2 text-lg">{chips.join(" ")}</div>}
      <div className="mt-2 flex justify-between text-xs">
        <a
          href={`/sector/${s.sector_id}`}
          className="text-blue-700 hover:underline"
        >
          See sites →
        </a>
        <a
          href={s.url}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 hover:underline"
        >
          View on Sépaq ↗
        </a>
      </div>
    </div>
  );
}
