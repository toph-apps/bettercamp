import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Amenities } from "../api/types";

type SiteResp = {
  id: string;
  sector_id: string;
  number: string;
  url: string | null;
  amenities_json: string;
  waterfront: boolean | null;
  notes: string | null;
};

export default function SiteView() {
  const { id = "" } = useParams();
  const { data, isLoading } = useQuery<SiteResp>({
    queryKey: ["site", id],
    queryFn: () => api.site(id) as Promise<SiteResp>,
    enabled: Boolean(id),
  });

  if (isLoading) return <div className="p-6">loading…</div>;
  if (!data) return <div className="p-6">not found</div>;

  let am: Partial<Amenities> & { raw_icons?: string[] } = {};
  try {
    am = JSON.parse(data.amenities_json || "{}");
  } catch {
    /* ignore */
  }

  return (
    <div className="h-full overflow-auto p-6">
      <h1 className="text-2xl font-semibold">Site #{data.number}</h1>
      {data.waterfront != null && (
        <div className="mt-1 text-sm">{data.waterfront ? "💧 Waterfront" : "Inland"}</div>
      )}
      <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
        {Object.entries(am)
          .filter(([k]) => k !== "raw_icons")
          .map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-slate-500">{k}</dt>
              <dd>{String(v)}</dd>
            </div>
          ))}
      </dl>
      {data.notes && (
        <p className="mt-4 rounded bg-slate-100 p-3 text-sm">{data.notes}</p>
      )}
      {data.url && (
        <a
          href={data.url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block rounded bg-blue-600 px-3 py-1 text-sm text-white"
        >
          Book on Sépaq ↗
        </a>
      )}
    </div>
  );
}
