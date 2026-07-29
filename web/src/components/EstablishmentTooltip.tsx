import type { EstablishmentMarker } from "../lib/aggregate";
import AmenityIcon from "./AmenityIcon";

export default function EstablishmentTooltip({ e }: { e: EstablishmentMarker }) {
  return (
    <div className="w-64 rounded-md border border-rule bg-surface p-3 text-ink shadow-lg">
      <div className="text-sm font-semibold">{e.name}</div>
      <div className="text-xs text-ink-2">{e.region ?? "—"}</div>
      <dl className="mt-2 grid grid-cols-2 gap-y-1 text-xs">
        <dt className="text-ink-2">Sectors</dt>
        <dd className="tabular-nums">{e.sector_count}</dd>
        <dt className="text-ink-2">Sites</dt>
        <dd className="tabular-nums">{e.site_count}</dd>
        {e.waterfront_count > 0 && (
          <>
            <dt className="flex items-center gap-1 text-lake">
              <AmenityIcon amenityKey="waterfront" />
              Waterfront
            </dt>
            <dd className="tabular-nums">
              {e.waterfront_count} / {e.site_count}
            </dd>
          </>
        )}
        {e.drive_min !== null && (
          <>
            <dt className="text-ink-2">Drive</dt>
            <dd className="tabular-nums">
              {e.drive_min} min · {e.drive_km} km
            </dd>
          </>
        )}
      </dl>
      <div className="mt-2 flex justify-between text-xs">
        <a
          href={`/establishment/${e.establishment_id}`}
          className="text-ink underline decoration-rule underline-offset-4 hover:decoration-ink"
        >
          See sectors →
        </a>
        {e.sepaq_url && (
          <a
            href={e.sepaq_url}
            target="_blank"
            rel="noreferrer"
            className="text-ink-2 underline decoration-rule underline-offset-4 hover:decoration-ink"
          >
            View on Sépaq ↗
          </a>
        )}
      </div>
    </div>
  );
}
