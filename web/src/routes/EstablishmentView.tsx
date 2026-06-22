import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
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

  if (isLoading) return <div className="p-6">loading…</div>;
  if (!data) return <div className="p-6">not found</div>;

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
    <div className="h-full overflow-auto p-6">
      <h1 className="text-2xl font-semibold">{data.name}</h1>
      <div className="text-sm text-slate-500">{data.region ?? "—"}</div>
      <a
        href={data.url}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-blue-600 hover:underline"
      >
        View on Sépaq ↗
      </a>

      {data.map_image_url && dots.length > 0 && (
        <div className="mt-4">
          <MapDotOverlay
            src={data.map_image_url}
            alt={`${data.name} overview map`}
            dots={dots}
            tooltip={(s) => (
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="mt-1 text-slate-500">{s.site_count} sites</div>
                {s.waterfront_count > 0 && (
                  <div className="text-cyan-700">
                    💧 {s.waterfront_count} waterfront
                  </div>
                )}
                <div className="mt-1 text-blue-700">click to open →</div>
              </div>
            )}
          />
        </div>
      )}

      <h2 className="mt-6 text-lg font-medium">Sectors</h2>
      <ul className="mt-2 space-y-2">
        {data.sectors.map((s) => (
          <li
            key={s.id}
            className="flex items-center gap-3 rounded border bg-white p-3"
          >
            <Link
              to={`/sector/${s.id}`}
              className="font-medium text-blue-700 hover:underline"
            >
              {s.name}
            </Link>
            <span className="text-xs text-slate-500">{s.site_count} sites</span>
            {s.waterfront_count > 0 && (
              <span className="text-xs text-cyan-700">
                💧 {s.waterfront_count} waterfront
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
