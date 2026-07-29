import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useState } from "react";
import { api } from "../api/client";
import type { Amenities } from "../api/types";
import AmenityIcon from "../components/AmenityIcon";

type SiteResp = {
  id: string;
  sector_id: string;
  number: string;
  name: string | null;
  subtitle: string | null;
  url: string | null;
  amenities_json: string;
  photos_json: string;
  services_json: string;
  description_json: string;
  access: string | null;
  price_text: string | null;
  waterfront: boolean | null;
  notes: string | null;
};

function safeParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

type AmenityChip = { iconKey: string; label: string };

function activeAmenityChips(a: Amenities): AmenityChip[] {
  const chips: AmenityChip[] = [];
  if (a.toilets === "flush") chips.push({ iconKey: "toilets:flush", label: "Flush toilets" });
  if (a.toilets === "vault") chips.push({ iconKey: "toilets:vault", label: "Vault toilets" });
  if (a.drinking_water) chips.push({ iconKey: "water", label: "Drinking water" });
  if (a.fire_pit) chips.push({ iconKey: "fire_pit", label: "Fire pit" });
  if (a.electricity) chips.push({ iconKey: "electricity", label: "Electricity" });
  if (a.shower) chips.push({ iconKey: "shower", label: "Shower" });
  if (a.pets) chips.push({ iconKey: "pets", label: "Pets allowed" });
  if (a.parking) chips.push({ iconKey: "parking", label: "Parking" });
  if (a.picnic_table) chips.push({ iconKey: "picnic_table", label: "Picnic table" });
  if (a.wheelchair) chips.push({ iconKey: "wheelchair", label: "Wheelchair accessible" });
  return chips;
}

export default function SiteView() {
  const { id = "" } = useParams();
  const { data, isLoading } = useQuery<SiteResp>({
    queryKey: ["site", id],
    queryFn: () => api.site(id) as Promise<SiteResp>,
    enabled: Boolean(id),
  });
  const [idx, setIdx] = useState(0);

  if (isLoading) return <div className="p-6 text-sm text-ink-2">loading…</div>;
  if (!data) return <div className="p-6 text-sm text-ink-2">not found</div>;

  const photos = safeParse<string[]>(data.photos_json, []);
  const services = safeParse<string[]>(data.services_json, []);
  const description = safeParse<string[]>(data.description_json, []);
  const amenities = safeParse<Amenities>(data.amenities_json, {} as Amenities);
  const chips = activeAmenityChips(amenities);

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <Link
          to={`/sector/${data.sector_id}`}
          className="text-xs text-ink-2 underline decoration-rule underline-offset-4 hover:decoration-ink"
        >
          ← back to sector
        </Link>
        <h1 className="mt-2 font-serif text-hero">{data.name ?? `Site ${data.number}`}</h1>
        {data.subtitle && <div className="mt-1 text-sm text-ink-2">{data.subtitle}</div>}
        {data.waterfront && (
          <div className="mt-1 flex items-center gap-1 text-sm text-lake">
            <AmenityIcon amenityKey="waterfront" />
            View of a lake or river
          </div>
        )}

        {photos.length > 0 && (
          <div className="mt-4">
            <div className="relative aspect-video overflow-hidden rounded-md border border-rule bg-surface-2">
              <img
                src={photos[idx]}
                alt={`${data.name ?? data.number} photo ${idx + 1}`}
                className="h-full w-full object-cover"
              />
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous photo"
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-surface/80 p-1.5 shadow"
                    onClick={() => setIdx((i) => (i - 1 + photos.length) % photos.length)}
                  >
                    <ChevronLeft size={16} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    aria-label="Next photo"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-surface/80 p-1.5 shadow"
                    onClick={() => setIdx((i) => (i + 1) % photos.length)}
                  >
                    <ChevronRight size={16} strokeWidth={1.75} />
                  </button>
                  <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-xs tabular-nums text-white">
                    {idx + 1} / {photos.length}
                  </div>
                </>
              )}
            </div>
            {photos.length > 1 && (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {photos.map((p, i) => (
                  <button
                    key={p}
                    type="button"
                    aria-label={`View photo ${i + 1}`}
                    onClick={() => setIdx(i)}
                    className={`h-14 w-20 shrink-0 overflow-hidden rounded border ${
                      i === idx ? "border-moss" : "border-rule"
                    }`}
                  >
                    <img src={p} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {data.price_text && <p className="mt-4 text-sm font-medium">{data.price_text}</p>}
        {data.access && (
          <p className="mt-2 text-sm text-ink-2">
            <span className="font-medium text-ink">Access: </span>
            {data.access}
          </p>
        )}

        {services.length > 0 && (
          <section className="mt-4">
            <h2 className="text-base font-semibold">Services</h2>
            <ul className="mt-1 list-disc pl-5 text-sm text-ink-2">
              {services.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
        )}

        {description.length > 0 && (
          <section className="mt-4">
            <h2 className="text-base font-semibold">Description</h2>
            <ul className="mt-1 list-disc pl-5 text-sm text-ink-2">
              {description.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </section>
        )}

        {chips.length > 0 && (
          <section className="mt-4">
            <h2 className="text-base font-semibold">Amenities</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {chips.map((c) => (
                <li
                  key={c.iconKey}
                  className="flex items-center gap-1.5 rounded-full border border-rule bg-surface-2 px-2.5 py-1 text-xs text-ink"
                >
                  <AmenityIcon amenityKey={c.iconKey} className="text-ink-2" />
                  {c.label}
                </li>
              ))}
            </ul>
          </section>
        )}

        {data.url && (
          <a
            href={data.url}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-moss px-4 py-2 text-sm font-medium text-moss-fg hover:opacity-90"
          >
            Book on Sépaq
            <ExternalLink size={14} strokeWidth={1.75} />
          </a>
        )}
      </div>
    </div>
  );
}
