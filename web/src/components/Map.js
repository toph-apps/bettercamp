import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import SectorTooltip from "./SectorTooltip";
import { createRoot } from "react-dom/client";
const STYLE_URL = "https://tiles.stadiamaps.com/styles/outdoors.json";
export default function Map({ sectors }) {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef([]);
    const rootsRef = useRef([]);
    const [ready, setReady] = useState(false);
    useEffect(() => {
        if (!containerRef.current || mapRef.current)
            return;
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
        if (!m || !ready)
            return;
        // clear previous
        rootsRef.current.forEach((r) => r.unmount());
        rootsRef.current = [];
        markersRef.current.forEach((mk) => mk.remove());
        markersRef.current = [];
        for (const s of sectors) {
            if (s.lat == null || s.lon == null)
                continue;
            const el = document.createElement("div");
            el.className =
                "h-3 w-3 rounded-full border-2 border-white shadow ring-1 ring-slate-400";
            el.style.background = s.waterfront_score > 0 ? "#0891b2" : "#2563eb";
            const popupEl = document.createElement("div");
            const root = createRoot(popupEl);
            root.render(_jsx(SectorTooltip, { s: s }));
            rootsRef.current.push(root);
            const popup = new maplibregl.Popup({
                offset: 12,
                closeButton: false,
                closeOnClick: false,
            }).setDOMContent(popupEl);
            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([s.lon, s.lat])
                .setPopup(popup)
                .addTo(m);
            el.addEventListener("mouseenter", () => marker.togglePopup());
            el.addEventListener("mouseleave", () => marker.togglePopup());
            markersRef.current.push(marker);
        }
    }, [sectors, ready]);
    return _jsx("div", { ref: containerRef, className: "h-full w-full" });
}
