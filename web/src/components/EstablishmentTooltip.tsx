import type { EstablishmentMarker } from "../lib/aggregate";

export default function EstablishmentTooltip({ e }: { e: EstablishmentMarker }) {
  return (
    <div className="w-64 rounded-md border bg-white p-3 shadow-lg">
      <div className="text-sm font-semibold">{e.name}</div>
      <div className="text-xs text-slate-500">{e.region ?? "—"}</div>
      <dl className="mt-2 grid grid-cols-2 gap-y-1 text-xs">
        <dt className="text-slate-500">Sectors</dt>
        <dd>{e.sector_count}</dd>
        <dt className="text-slate-500">Sites</dt>
        <dd>{e.site_count}</dd>
        {e.waterfront_count > 0 && (
          <>
            <dt className="text-slate-500">💧 Waterfront</dt>
            <dd>
              {e.waterfront_count} / {e.site_count}
            </dd>
          </>
        )}
        {e.drive_min !== null && (
          <>
            <dt className="text-slate-500">Drive</dt>
            <dd>
              {e.drive_min} min · {e.drive_km} km
            </dd>
          </>
        )}
      </dl>
      <div className="mt-2 flex justify-between text-xs">
        <a
          href={`/establishment/${e.establishment_id}`}
          className="text-blue-700 hover:underline"
        >
          See sectors →
        </a>
        {e.sepaq_url && (
          <a
            href={e.sepaq_url}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            View on Sépaq ↗
          </a>
        )}
      </div>
    </div>
  );
}
