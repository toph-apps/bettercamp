import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
const AMENITY_ICONS = {
    toilets: "🚻",
    parking: "🅿️",
    drinking_water: "🚰",
    fire_pit: "🔥",
    electricity: "⚡",
    picnic_table: "🪵",
    shower: "🚿",
    wheelchair: "♿",
    pets: "🐶",
};
export default function SectorTooltip({ s }) {
    const am = s.amenity_summary;
    const chips = Object.entries(am)
        .filter(([k, v]) => (k === "toilets" ? v !== "unknown" && v !== "none" : Boolean(v)))
        .map(([k]) => AMENITY_ICONS[k])
        .filter(Boolean);
    return (_jsxs("div", { className: "w-64 rounded-md border bg-white p-3 shadow-lg", children: [_jsx("div", { className: "text-sm font-semibold", children: s.name }), _jsxs("div", { className: "text-xs text-slate-500", children: [s.establishment.name, " \u00B7 ", s.establishment.region ?? "—"] }), _jsxs("dl", { className: "mt-2 grid grid-cols-2 gap-y-1 text-xs", children: [_jsx("dt", { className: "text-slate-500", children: "Sites" }), _jsx("dd", { children: s.site_count }), s.drive_min !== null && (_jsxs(_Fragment, { children: [_jsx("dt", { className: "text-slate-500", children: "Drive" }), _jsxs("dd", { children: [s.drive_min, " min \u00B7 ", s.drive_km, " km"] })] })), s.waterfront_score > 0 && (_jsxs(_Fragment, { children: [_jsx("dt", { className: "text-slate-500", children: "Water" }), _jsxs("dd", { children: [s.nearest_water.name ?? "nearby", s.nearest_water.m !== null ? ` · ${s.nearest_water.m} m` : ""] })] }))] }), chips.length > 0 && _jsx("div", { className: "mt-2 text-lg", children: chips.join(" ") }), _jsx("a", { href: s.url, target: "_blank", rel: "noreferrer", className: "mt-2 block text-xs text-blue-600 hover:underline", children: "Book on S\u00E9paq \u2197" })] }));
}
