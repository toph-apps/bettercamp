import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { api } from "../api/client";
import AmenityIcon from "../components/AmenityIcon";
import MapDotOverlay, { type Dot } from "../components/MapDotOverlay";

type SectorRow = {
  id: string;
  name: string;
  site_count: number;
  waterfront_count: number;
  url: string;
  waterfront_score: number;
};

type EstResp = {
  id: string;
  name: string;
  region: string | null;
  url: string;
  map_image_url: string | null;
  sector_dots_json: string;
  sectors: SectorRow[];
};

type DotPayload = SectorRow;

function safeParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function EstablishmentView() {
  const { id = "" } = useParams();
  const { data, isLoading } = useQuery<EstResp>({
    queryKey: ["est", id],
    queryFn: () => api.establishment(id) as Promise<EstResp>,
    enabled: Boolean(id),
  });

  if (isLoading) return <div className="p-6 text-sm text-ink-2">loading…</div>;
  if (!data) return <div className="p-6 text-sm text-ink-2">not found</div>;

  const sectorsById: Record<string, SectorRow> = Object.fromEntries(
    data.sectors.map((s) => [s.id, s]),
  );
  const rawDots = safeParse<{ sector_id: string; left: number; top: number }[]>(
    data.sector_dots_json,
    [],
  );
  const dots: Dot<DotPayload>[] = rawDots.flatMap((d) => {
    const s = sectorsById[d.sector_id];
    if (!s) return [];
    return [
      {
        key: d.sector_id,
        left: d.left,
        top: d.top,
        to: `/sector/${d.sector_id}`,
        payload: s,
        highlight: s.waterfront_count > 0,
      },
    ];
  });

  return (
    <div className="mx-auto h-full max-w-4xl overflow-auto px-6 py-8">
      <h1 className="font-serif text-hero">{data.name}</h1>
      <div className="mt-1 text-sm tabular-nums text-ink-2">{data.region ?? "—"}</div>
      <a
        href={data.url}
        target="_blank"
        rel="noreferrer"
        className="mt-1 inline-flex items-center gap-1 text-xs text-ink underline decoration-rule underline-offset-4 hover:decoration-ink"
      >
        View on Sépaq
        <ExternalLink size={12} strokeWidth={1.75} />
      </a>

      {data.map_image_url && dots.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-md border border-rule">
          <MapDotOverlay
            src={data.map_image_url}
            alt={`${data.name} overview map`}
            dots={dots}
            tooltip={(s) => (
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="mt-1 text-ink-2">{s.site_count} sites</div>
                {s.waterfront_count > 0 && (
                  <div className="flex items-center gap-1 text-lake">
                    <AmenityIcon amenityKey="waterfront" />
                    {s.waterfront_count} waterfront
                  </div>
                )}
                <div className="mt-1 text-ink">click to open →</div>
              </div>
            )}
          />
        </div>
      )}

      <h2 className="mt-6 text-base font-semibold">Sectors</h2>
      <ul className="mt-2 space-y-2">
        {data.sectors.map((s) => (
          <li
            key={s.id}
            className={`flex items-center gap-3 rounded-md border border-rule bg-surface p-3 ${
              s.waterfront_count > 0 ? "border-l-2 border-l-lake" : ""
            }`}
          >
            <Link
              to={`/sector/${s.id}`}
              className="font-medium text-ink underline decoration-rule underline-offset-4 hover:decoration-ink"
            >
              {s.name}
            </Link>
            <span className="text-xs tabular-nums text-ink-2">{s.site_count} sites</span>
            {s.waterfront_count > 0 && (
              <span className="flex items-center gap-1 text-xs text-lake">
                <AmenityIcon amenityKey="waterfront" />
                {s.waterfront_count} waterfront
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
