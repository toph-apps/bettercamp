import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api/client";
import type { Amenities } from "../api/types";

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

export default function SiteView() {
  const { id = "" } = useParams();
  const { data, isLoading } = useQuery<SiteResp>({
    queryKey: ["site", id],
    queryFn: () => api.site(id) as Promise<SiteResp>,
    enabled: Boolean(id),
  });
  const [idx, setIdx] = useState(0);

  if (isLoading) return <div className="p-6">loading…</div>;
  if (!data) return <div className="p-6">not found</div>;

  const photos = safeParse<string[]>(data.photos_json, []);
  const services = safeParse<string[]>(data.services_json, []);
  const description = safeParse<string[]>(data.description_json, []);
  const amenities = safeParse<Amenities>(data.amenities_json, {} as Amenities);

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-4xl p-6">
        <Link
          to={`/sector/${data.sector_id}`}
          className="text-xs text-blue-600 hover:underline"
        >
          ← back to sector
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{data.name ?? `Site ${data.number}`}</h1>
        {data.subtitle && (
          <div className="text-sm text-slate-500">{data.subtitle}</div>
        )}
        {data.waterfront && (
          <div className="mt-1 text-sm text-cyan-700">💧 View of a lake or river</div>
        )}

        {photos.length > 0 && (
          <div className="mt-4">
            <div className="relative aspect-video overflow-hidden rounded border bg-slate-100">
              <img
                src={photos[idx]}
                alt={`${data.name ?? data.number} photo ${idx + 1}`}
                className="h-full w-full object-cover"
              />
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-3 py-1 text-lg shadow"
                    onClick={() => setIdx((i) => (i - 1 + photos.length) % photos.length)}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-3 py-1 text-lg shadow"
                    onClick={() => setIdx((i) => (i + 1) % photos.length)}
                  >
                    ›
                  </button>
                  <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
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
                    onClick={() => setIdx(i)}
                    className={`h-14 w-20 shrink-0 overflow-hidden rounded border ${
                      i === idx ? "ring-2 ring-blue-500" : ""
                    }`}
                  >
                    <img src={p} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {data.price_text && (
          <p className="mt-4 text-sm font-medium">{data.price_text}</p>
        )}
        {data.access && (
          <p className="mt-2 text-sm text-slate-700">
            <span className="font-medium">Access: </span>
            {data.access}
          </p>
        )}

        {services.length > 0 && (
          <section className="mt-4">
            <h2 className="text-lg font-medium">Services</h2>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {services.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
        )}

        {description.length > 0 && (
          <section className="mt-4">
            <h2 className="text-lg font-medium">Description</h2>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {description.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-4">
          <h2 className="text-lg font-medium">Amenities</h2>
          <dl className="mt-1 grid grid-cols-2 gap-y-1 text-sm md:grid-cols-3">
            {Object.entries(amenities)
              .filter(([k]) => k !== "raw_icons")
              .map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-slate-500">{k.replace(/_/g, " ")}</dt>
                  <dd>{String(v)}</dd>
                </div>
              ))}
          </dl>
        </section>

        {data.url && (
          <a
            href={data.url}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            Book on Sépaq ↗
          </a>
        )}
      </div>
    </div>
  );
}
