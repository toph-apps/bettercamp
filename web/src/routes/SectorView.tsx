import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

type SectorResp = {
  id: string;
  establishment_id: string;
  name: string;
  url: string;
  site_count: number;
  amenities_json: string;
  map_image_url: string | null;
  waterfront_score: number;
  nearest_water_name: string | null;
  nearest_water_m: number | null;
  sites: Array<{ id: string; number: string; url: string | null; waterfront: boolean | null }>;
};

export default function SectorView() {
  const { id = "" } = useParams();
  const { data, isLoading } = useQuery<SectorResp>({
    queryKey: ["sector", id],
    queryFn: () => api.sector(id) as Promise<SectorResp>,
    enabled: Boolean(id),
  });

  if (isLoading) return <div className="p-6">loading…</div>;
  if (!data) return <div className="p-6">not found</div>;

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
        {data.waterfront_score > 0 && (
          <> · 💧 {data.nearest_water_name ?? "water"} ({data.nearest_water_m} m)</>
        )}
      </div>
      <a
        href={data.url}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-blue-600 hover:underline"
      >
        View on Sépaq ↗
      </a>
      {data.map_image_url && (
        <img
          src={data.map_image_url}
          alt="sector map"
          className="mt-4 max-w-3xl rounded border bg-white"
        />
      )}
      <h2 className="mt-6 text-lg font-medium">Sites</h2>
      <ul className="mt-2 grid grid-cols-4 gap-2 md:grid-cols-8 lg:grid-cols-12">
        {data.sites.map((s) => (
          <li
            key={s.id}
            className="flex flex-col items-center rounded border bg-white p-2 text-xs"
          >
            <Link to={`/site/${s.id}`} className="font-medium text-blue-700 hover:underline">
              #{s.number}
            </Link>
            {s.waterfront && <span title="waterfront">💧</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
