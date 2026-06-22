import { useTypedSearchParams } from "../hooks/useSearchParams";

const AMENITY_OPTIONS: { key: string; label: string }[] = [
  { key: "toilets:flush", label: "Flush toilets" },
  { key: "toilets:vault", label: "Vault toilets" },
  { key: "water", label: "Drinking water" },
  { key: "fire_pit", label: "Fire pit" },
  { key: "electricity", label: "Electricity" },
  { key: "shower", label: "Shower" },
  { key: "pets", label: "Pets allowed" },
];

export default function FilterPanel() {
  const [params, setParams] = useTypedSearchParams();
  const selected = new Set((params.amenities ?? "").split(",").filter(Boolean));

  const toggle = (key: string) => {
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
    setParams({ ...params, amenities: [...next].join(",") || undefined });
  };

  return (
    <div className="space-y-4 text-sm">
      <section>
        <label className="block font-medium">Origin</label>
        <input
          className="mt-1 w-full rounded border px-2 py-1"
          placeholder="lat,lon (default Montreal)"
          defaultValue={params.origin ?? ""}
          onBlur={(e) => setParams({ ...params, origin: e.target.value || undefined })}
        />
      </section>

      <section>
        <label className="block font-medium">
          Max drive: {params.max_drive_min ?? "—"} min
        </label>
        <input
          type="range"
          min={30}
          max={600}
          step={30}
          value={params.max_drive_min ?? 600}
          onChange={(e) =>
            setParams({
              ...params,
              max_drive_min: Number(e.target.value) === 600 ? undefined : Number(e.target.value),
            })
          }
          className="w-full"
        />
      </section>

      <section>
        <label className="flex items-center gap-2 font-medium">
          <input
            type="checkbox"
            checked={!!params.waterfront}
            onChange={(e) => setParams({ ...params, waterfront: e.target.checked || undefined })}
          />
          Waterfront sectors only
        </label>
        {params.waterfront && (
          <div className="mt-1">
            <label>Max distance to water: {params.max_water_m ?? 500} m</label>
            <input
              type="range"
              min={50}
              max={500}
              step={50}
              value={params.max_water_m ?? 500}
              onChange={(e) => setParams({ ...params, max_water_m: Number(e.target.value) })}
              className="w-full"
            />
          </div>
        )}
      </section>

      <section>
        <label className="block font-medium">
          Sector size (sites): {params.min_sites ?? 1}–{params.max_sites ?? 200}
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            className="w-20 rounded border px-2 py-1"
            value={params.min_sites ?? ""}
            placeholder="min"
            onChange={(e) =>
              setParams({ ...params, min_sites: e.target.value ? Number(e.target.value) : undefined })
            }
          />
          <input
            type="number"
            min={1}
            className="w-20 rounded border px-2 py-1"
            value={params.max_sites ?? ""}
            placeholder="max"
            onChange={(e) =>
              setParams({ ...params, max_sites: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-medium">Amenities (all required)</h3>
        <ul className="space-y-1">
          {AMENITY_OPTIONS.map((o) => (
            <li key={o.key}>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.has(o.key)}
                  onChange={() => toggle(o.key)}
                />
                {o.label}
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <label className="block font-medium">Sort</label>
        <select
          className="mt-1 w-full rounded border px-2 py-1"
          value={params.sort ?? "name"}
          onChange={(e) => setParams({ ...params, sort: e.target.value as never })}
        >
          <option value="name">Name</option>
          <option value="drive_min">Drive time</option>
          <option value="waterfront">Waterfront score</option>
        </select>
      </section>
    </div>
  );
}
