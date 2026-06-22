import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

type EstResp = {
  id: string;
  name: string;
  region: string | null;
  url: string;
  sectors: Array<{ id: string; name: string; site_count: number; url: string }>;
};

export default function EstablishmentView() {
  const { id = "" } = useParams();
  const { data, isLoading } = useQuery<EstResp>({
    queryKey: ["est", id],
    queryFn: () => api.establishment(id) as Promise<EstResp>,
    enabled: Boolean(id),
  });

  if (isLoading) return <div className="p-6">loading…</div>;
  if (!data) return <div className="p-6">not found</div>;

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
      <h2 className="mt-6 text-lg font-medium">Sectors</h2>
      <ul className="mt-2 space-y-2">
        {data.sectors.map((s) => (
          <li key={s.id} className="rounded border bg-white p-3">
            <Link to={`/sector/${s.id}`} className="font-medium text-blue-700 hover:underline">
              {s.name}
            </Link>
            <span className="ml-2 text-xs text-slate-500">{s.site_count} sites</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
