import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useTypedSearchParams } from "../hooks/useSearchParams";

export default function ListView() {
  const [params] = useTypedSearchParams();
  const { data, isLoading } = useQuery({
    queryKey: ["search", params],
    queryFn: () => api.search(params),
  });

  return (
    <div className="h-full overflow-auto p-4">
      {isLoading && <div className="text-sm">loading…</div>}
      <table className="w-full table-auto text-sm">
        <thead className="sticky top-0 bg-slate-100 text-left">
          <tr>
            <th className="px-2 py-2">Sector</th>
            <th className="px-2 py-2">Establishment</th>
            <th className="px-2 py-2">Region</th>
            <th className="px-2 py-2">Drive</th>
            <th className="px-2 py-2">Sites</th>
            <th className="px-2 py-2">Water</th>
            <th className="px-2 py-2">Book</th>
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map((s) => (
            <tr key={s.sector_id} className="border-b hover:bg-slate-50">
              <td className="px-2 py-1">
                <Link to={`/sector/${s.sector_id}`} className="text-blue-700 hover:underline">
                  {s.name}
                </Link>
              </td>
              <td className="px-2 py-1">{s.establishment.name}</td>
              <td className="px-2 py-1 text-slate-500">{s.establishment.region ?? "—"}</td>
              <td className="px-2 py-1">{s.drive_min ? `${s.drive_min} min` : "—"}</td>
              <td className="px-2 py-1">{s.site_count}</td>
              <td className="px-2 py-1">
                {s.waterfront_score > 0 ? (
                  <span title={`${s.nearest_water.m} m to ${s.nearest_water.name ?? "water"}`}>
                    💧
                  </span>
                ) : (
                  ""
                )}
              </td>
              <td className="px-2 py-1">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Sépaq ↗
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
