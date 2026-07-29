import * as Checkbox from "@radix-ui/react-checkbox";
import * as Slider from "@radix-ui/react-slider";
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { useTypedSearchParams } from "../hooks/useSearchParams";
import AmenityIcon from "./AmenityIcon";
import Field from "./Field";

const AMENITY_OPTIONS: { key: string; label: string }[] = [
  { key: "toilets:flush", label: "Flush toilets" },
  { key: "toilets:vault", label: "Vault toilets" },
  { key: "water", label: "Drinking water" },
  { key: "fire_pit", label: "Fire pit" },
  { key: "electricity", label: "Electricity" },
  { key: "shower", label: "Shower" },
  { key: "pets", label: "Pets allowed" },
];

function CheckboxRow({
  checked,
  onCheckedChange,
  label,
  icon,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  icon?: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
      <Checkbox.Root
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-rule bg-surface data-[state=checked]:border-moss data-[state=checked]:bg-moss"
      >
        <Checkbox.Indicator>
          <Check size={12} strokeWidth={2.5} className="text-moss-fg" />
        </Checkbox.Indicator>
      </Checkbox.Root>
      {icon}
      {label}
    </label>
  );
}

export default function FilterPanel() {
  const [params, setParams] = useTypedSearchParams();
  const selected = new Set((params.amenities ?? "").split(",").filter(Boolean));

  const toggle = (key: string) => {
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
    setParams({ ...params, amenities: [...next].join(",") || undefined });
  };

  const maxDrive = params.max_drive_min ?? 600;

  return (
    <div className="space-y-6 text-sm">
      <section className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-[0.08em] text-ink-2">Distance</h3>

        <Field label="From" htmlFor="origin">
          <input
            id="origin"
            className="w-full rounded border border-rule bg-surface px-2 py-1 font-mono text-xs placeholder:text-ink-3"
            placeholder="lat,lon · default Montreal"
            defaultValue={params.origin ?? ""}
            onBlur={(e) => setParams({ ...params, origin: e.target.value || undefined })}
          />
        </Field>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-ink-2">
              Max drive time
            </span>
            <span className="rounded-full border border-rule bg-surface-2 px-2 py-0.5 text-xs font-medium tabular-nums text-ink">
              {maxDrive >= 600 ? "No limit" : `Under ${maxDrive} min`}
            </span>
          </div>
          <Slider.Root
            className="relative flex h-4 w-full touch-none items-center"
            min={30}
            max={600}
            step={30}
            value={[maxDrive]}
            onValueChange={([v]) =>
              setParams({ ...params, max_drive_min: v >= 600 ? undefined : v })
            }
          >
            <Slider.Track className="relative h-1 grow rounded-full bg-surface-2">
              <Slider.Range className="absolute h-full rounded-full bg-moss" />
            </Slider.Track>
            <Slider.Thumb
              aria-label="Max drive time"
              className="block h-4 w-4 rounded-full border-2 border-moss bg-surface"
            />
          </Slider.Root>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-[0.08em] text-ink-2">Sector</h3>

        <Field label="Sites per sector">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              className="w-full rounded border border-rule bg-surface px-2 py-1 tabular-nums"
              value={params.min_sites ?? ""}
              placeholder="min"
              onChange={(e) =>
                setParams({
                  ...params,
                  min_sites: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
            <span className="text-ink-3">–</span>
            <input
              type="number"
              min={1}
              className="w-full rounded border border-rule bg-surface px-2 py-1 tabular-nums"
              value={params.max_sites ?? ""}
              placeholder="max"
              onChange={(e) =>
                setParams({
                  ...params,
                  max_sites: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
        </Field>

        <CheckboxRow
          checked={!!params.waterfront}
          onCheckedChange={(checked) =>
            setParams({ ...params, waterfront: checked || undefined, max_water_m: undefined })
          }
          label="Only waterfront sectors"
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-medium uppercase tracking-[0.08em] text-ink-2">
          Required amenities
        </h3>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {AMENITY_OPTIONS.map((o) => (
            <li key={o.key}>
              <CheckboxRow
                checked={selected.has(o.key)}
                onCheckedChange={() => toggle(o.key)}
                label={o.label}
                icon={<AmenityIcon amenityKey={o.key} className="text-ink-2" />}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
