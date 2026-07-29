import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { SearchParams } from "../api/types";
import AmenityIcon from "../components/AmenityIcon";
import DriveTimeChip from "../components/DriveTimeChip";
import { useTypedSearchParams } from "../hooks/useSearchParams";

type SortKey = NonNullable<SearchParams["sort"]>;

const SORTABLE: { key: SortKey; label: string }[] = [
  { key: "name", label: "Sector" },
  { key: "drive_min", label: "Drive" },
  { key: "waterfront", label: "Water" },
];

function SortableHeader({
  sortKey,
  label,
  active,
  onSort,
}: {
  sortKey: SortKey;
  label: string;
  active: boolean;
  onSort: (key: SortKey) => void;
}) {
  return (
    <th className="px-2 py-2 text-xs font-medium uppercase tracking-[0.08em]" aria-sort={active ? "ascending" : "none"}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-ink ${active ? "text-ink" : ""}`}
      >
        {label}
        {active && <ChevronDown size={12} strokeWidth={2} />}
      </button>
    </th>
  );
}

export default function ListView() {
  const [params, setParams] = useTypedSearchParams();
  const { data, isLoading } = useQuery({
    queryKey: ["search", params],
    queryFn: () => api.search(params),
  });
  const results = data ?? [];
  const activeSort: SortKey = params.sort ?? "name";
  const setSort = (key: SortKey) => setParams({ ...params, sort: key });

  return (
    <div className="h-full overflow-auto p-4">
      <div className="mb-2 flex items-center justify-between gap-2 lg:hidden">
        <span className="text-xs text-ink-2">
          {isLoading ? "loading…" : `${results.length} sectors`}
        </span>
        <div className="inline-flex rounded border border-rule p-0.5">
          {SORTABLE.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setSort(o.key)}
              className={`rounded px-2.5 py-1 text-xs font-medium ${
                activeSort === o.key ? "bg-moss text-moss-fg" : "text-ink-2 hover:text-ink"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <table className="hidden w-full table-auto text-sm lg:table">
        <thead className="sticky top-0 bg-surface-2 text-left text-ink-2">
          <tr>
            <SortableHeader sortKey="name" label="Sector" active={activeSort === "name"} onSort={setSort} />
            <th className="px-2 py-2 text-xs font-medium uppercase tracking-[0.08em]">
              Establishment
            </th>
            <th className="px-2 py-2 text-xs font-medium uppercase tracking-[0.08em]">Region</th>
            <SortableHeader
              sortKey="drive_min"
              label="Drive"
              active={activeSort === "drive_min"}
              onSort={setSort}
            />
            <th className="px-2 py-2 text-xs font-medium uppercase tracking-[0.08em]">Sites</th>
            <SortableHeader
              sortKey="waterfront"
              label="Water"
              active={activeSort === "waterfront"}
              onSort={setSort}
            />
            <th className="px-2 py-2 text-xs font-medium uppercase tracking-[0.08em]">Book</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr>
              <td className="px-2 py-2 text-xs text-ink-2" colSpan={7}>
                loading…
              </td>
            </tr>
          )}
          {results.map((s) => (
            <tr key={s.sector_id} className="border-b border-rule hover:bg-surface-2">
              <td
                className={`px-2 py-1 ${
                  s.waterfront_score > 0 ? "border-l-2 border-lake pl-2" : ""
                }`}
              >
                <Link
                  to={`/sector/${s.sector_id}`}
                  className="text-ink underline decoration-rule underline-offset-4 hover:decoration-ink"
                >
                  {s.name}
                </Link>
              </td>
              <td className="px-2 py-1">{s.establishment.name}</td>
              <td className="px-2 py-1 text-ink-2">{s.establishment.region ?? "—"}</td>
              <td className="px-2 py-1">
                <DriveTimeChip minutes={s.drive_min} />
              </td>
              <td className="px-2 py-1 tabular-nums">{s.site_count}</td>
              <td className="px-2 py-1">
                {s.waterfront_score > 0 ? (
                  <AmenityIcon
                    amenityKey="waterfront"
                    label={`${s.nearest_water.m} m to ${s.nearest_water.name ?? "water"}`}
                    className="text-lake"
                  />
                ) : null}
              </td>
              <td className="px-2 py-1">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Book on Sépaq"
                  className="inline-flex rounded p-1 text-ink-2 hover:bg-surface-2 hover:text-ink"
                >
                  <ExternalLink size={16} strokeWidth={1.75} />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile card list */}
      <ul className="space-y-2 lg:hidden">
        {results.map((s) => (
          <li
            key={s.sector_id}
            className={`rounded border border-rule bg-surface p-3 ${
              s.waterfront_score > 0 ? "border-l-2 border-l-lake" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <Link
                to={`/sector/${s.sector_id}`}
                className="font-medium text-ink underline decoration-rule underline-offset-4 hover:decoration-ink"
              >
                {s.name}
              </Link>
              <DriveTimeChip minutes={s.drive_min} />
            </div>
            <div className="mt-0.5 text-xs text-ink-2">
              {s.establishment.name} · {s.establishment.region ?? "—"}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-ink-2">
              <span className="tabular-nums">
                {s.site_count} sites
                {s.waterfront_score > 0 &&
                  s.nearest_water.m !== null &&
                  ` · ${s.nearest_water.m} m to water`}
              </span>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-ink underline decoration-rule underline-offset-4 hover:decoration-ink"
              >
                Book on Sépaq
                <ExternalLink size={12} strokeWidth={1.75} />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
