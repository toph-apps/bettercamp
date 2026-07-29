import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import Map from "../components/Map";
import { useTypedSearchParams } from "../hooks/useSearchParams";
import { aggregateByEstablishment } from "../lib/aggregate";

export default function MapView() {
  const [params] = useTypedSearchParams();
  // Map view shows every matching sector — cap high enough that the default
  // list-view limit doesn't silently hide dots.
  const mapParams = { ...params, limit: params.limit ?? 1000 };
  const { data, isLoading, error } = useQuery({
    queryKey: ["search-map", mapParams],
    queryFn: () => api.search(mapParams),
  });
  const establishments = useMemo(
    () => aggregateByEstablishment(data ?? []),
    [data],
  );

  if (error)
    return (
      <div className="p-6 text-sm text-red-700">
        Failed to load: {(error as Error).message}
      </div>
    );
  return (
    <div className="relative h-full">
      <Map establishments={establishments} />
      {isLoading && (
        <div className="absolute left-2 top-2 rounded bg-white/90 px-2 py-1 text-xs shadow">
          loading…
        </div>
      )}
      {data && (
        <div className="absolute right-2 top-2 rounded bg-white/90 px-2 py-1 text-xs shadow">
          {establishments.length} establishments · {data.length} sectors
        </div>
      )}
    </div>
  );
}
