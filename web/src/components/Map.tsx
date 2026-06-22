import { useEffect, useRef, useState } from "react";
import maplibregl, { type Map as MlMap, type Marker } from "maplibre-gl";
import { useNavigate } from "react-router-dom";
import type { EstablishmentMarker } from "../lib/aggregate";
import EstablishmentTooltip from "./EstablishmentTooltip";
import { createRoot, type Root } from "react-dom/client";

const STYLE_URL = "https://tiles.stadiamaps.com/styles/outdoors.json";

export default function Map({
  establishments,
}: {
  establishments: EstablishmentMarker[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const rootsRef = useRef<Root[]>([]);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const m = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [-72.5, 47.0],
      zoom: 5,
    });
    m.addControl(new maplibregl.NavigationControl(), "top-right");
    m.once("load", () => setReady(true));
    mapRef.current = m;
    return () => {
      m.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const m = mapRef.current;
    if (!m || !ready) return;
    rootsRef.current.forEach((r) => r.unmount());
    rootsRef.current = [];
    markersRef.current.forEach((mk) => mk.remove());
    markersRef.current = [];

    for (const e of establishments) {
      const el = document.createElement("div");
      el.className =
        "h-4 w-4 rounded-full border-2 border-white shadow-md ring-1 ring-slate-400 cursor-pointer";
      el.style.background = e.waterfront_count > 0 ? "#0891b2" : "#2563eb";

      const popupEl = document.createElement("div");
      const root = createRoot(popupEl);
      root.render(<EstablishmentTooltip e={e} />);
      rootsRef.current.push(root);

      const popup = new maplibregl.Popup({
        offset: 16,
        closeButton: false,
        closeOnClick: false,
        anchor: "bottom",
      })
        .setLngLat([e.lon, e.lat])
        .setDOMContent(popupEl);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([e.lon, e.lat])
        .addTo(m);

      let hideTimer: ReturnType<typeof setTimeout> | null = null;
      const cancelHide = () => {
        if (hideTimer) {
          clearTimeout(hideTimer);
          hideTimer = null;
        }
      };
      const open = () => {
        cancelHide();
        if (!popup.isOpen()) popup.addTo(m);
      };
      const scheduleClose = () => {
        cancelHide();
        hideTimer = setTimeout(() => {
          if (popup.isOpen()) popup.remove();
        }, 120);
      };
      el.addEventListener("mouseenter", open);
      el.addEventListener("mouseleave", scheduleClose);
      el.addEventListener("click", () =>
        navigate(`/establishment/${e.establishment_id}`),
      );
      popup.on("open", () => {
        const node = popup.getElement();
        node?.addEventListener("mouseenter", cancelHide);
        node?.addEventListener("mouseleave", scheduleClose);
      });
      markersRef.current.push(marker);
    }
  }, [establishments, ready, navigate]);

  return <div ref={containerRef} className="h-full w-full" />;
}
