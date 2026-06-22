import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import MapDotOverlay, { type Dot } from "../components/MapDotOverlay";

type SiteRow = {
  id: string;
  number: string;
  name: string | null;
  subtitle: string | null;
  url: string | null;
  photos_json: string;
  waterfront: boolean | null;
};

type SectorResp = {
  id: string;
  establishment_id: string;
  name: string;
  url: string;
  site_count: number;
  amenities_json: string;
  map_image_url: string | null;
  site_dots_json: string;
  waterfront_score: number;
  nearest_water_name: string | null;
  nearest_water_m: number | null;
  sites: SiteRow[];
};

function firstPhoto(s: SiteRow): string | null {
  try {
    const arr = JSON.parse(s.photos_json || "[]");
    return Array.isArray(arr) && arr.length > 0 ? String(arr[0]) : null;
  } catch {
    return null;
  }
}

function safeParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function SectorView() {
  const { id = "" } = useParams();
  const { data, isLoading } = useQuery<SectorResp>({
    queryKey: ["sector", id],
    queryFn: () => api.sector(id) as Promise<SectorResp>,
    enabled: Boolean(id),
  });

  if (isLoading) return <div className="p-6">loading…</div>;
  if (!data) return <div className="p-6">not found</div>;

  const waterfrontCount = data.sites.filter((s) => s.waterfront).length;
  const sitesById: Record<string, SiteRow> = Object.fromEntries(
    data.sites.map((s) => [s.id, s]),
  );
  const rawDots = safeParse<{ site_id: string; left: number; top: number }[]>(
    data.site_dots_json,
    [],
  );
  const dots: Dot<SiteRow>[] = rawDots.flatMap((d) => {
    const s = sitesById[d.site_id];
    if (!s) return [];
    return [
      {
        key: d.site_id,
        left: d.left,
        top: d.top,
        to: `/site/${d.site_id}`,
        payload: s,
        highlight: Boolean(s.waterfront),
      },
    ];
  });

  return (
    <div className="h-full overflow-auto p-6">
      <Link
        to={`/establishment/${data.establishment_id}`}
        className="text-xs text-blue-600 hover:underline"
      >
        ← back to establishment
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{data.name}</h1>
      <div className="text-sm text-slate-500">
        {data.site_count} sites
        {waterfrontCount > 0 && (
          <span className="ml-2 text-cyan-700">
            💧 {waterfrontCount} waterfront
          </span>
        )}
      </div>
      <a
        href={data.url}
        target="_blank"
        rel="noreferrer"
        className="mt-1 inline-block text-xs text-blue-600 hover:underline"
      >
        View on Sépaq ↗
      </a>

      {data.map_image_url && (
        <div className="mt-4">
          {dots.length > 0 ? (
            <MapDotOverlay
              src={data.map_image_url}
              alt={`${data.name} sector map`}
              dots={dots}
              tooltip={(s) => {
                const photo = firstPhoto(s);
                return (
                  <div>
                    {photo && (
                      <img
                        src={photo}
                        alt=""
                        className="mb-1 h-20 w-full rounded object-cover"
                      />
                    )}
                    <div className="font-semibold">
                      {s.name ?? `Site ${s.number}`}
                    </div>
                    {s.subtitle && (
                      <div className="text-slate-500">{s.subtitle}</div>
                    )}
                    {s.waterfront && (
                      <div className="text-cyan-700">💧 waterfront</div>
                    )}
                    <div className="mt-1 text-blue-700">click to open →</div>
                  </div>
                );
              }}
            />
          ) : (
            <img
              src={data.map_image_url}
              alt={`${data.name} sector map`}
              className="max-w-3xl rounded border bg-white"
            />
          )}
        </div>
      )}

      <h2 className="mt-6 text-lg font-medium">Sites</h2>
      {data.sites.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">
          No site detail yet. Run scraper without <code>--no-sites</code> to populate.
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {data.sites.map((s) => {
            const photo = firstPhoto(s);
            return (
              <li key={s.id} className="overflow-hidden rounded border bg-white shadow-sm">
                <Link to={`/site/${s.id}`} className="block">
                  <div className="aspect-[4/3] bg-slate-100">
                    {photo ? (
                      <img
                        src={photo}
                        alt={s.name ?? `site ${s.number}`}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-400">
                        no photo
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <div className="text-sm font-medium">{s.name ?? `#${s.number}`}</div>
                    {s.subtitle && (
                      <div className="text-xs text-slate-500">{s.subtitle}</div>
                    )}
                    {s.waterfront && (
                      <div className="mt-1 text-xs text-cyan-700">💧 waterfront</div>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
