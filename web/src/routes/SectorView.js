import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
export default function SectorView() {
    const { id = "" } = useParams();
    const { data, isLoading } = useQuery({
        queryKey: ["sector", id],
        queryFn: () => api.sector(id),
        enabled: Boolean(id),
    });
    if (isLoading)
        return _jsx("div", { className: "p-6", children: "loading\u2026" });
    if (!data)
        return _jsx("div", { className: "p-6", children: "not found" });
    return (_jsxs("div", { className: "h-full overflow-auto p-6", children: [_jsx(Link, { to: `/establishment/${data.establishment_id}`, className: "text-xs text-blue-600 hover:underline", children: "\u2190 back to establishment" }), _jsx("h1", { className: "mt-2 text-2xl font-semibold", children: data.name }), _jsxs("div", { className: "text-sm text-slate-500", children: [data.site_count, " sites", data.waterfront_score > 0 && (_jsxs(_Fragment, { children: [" \u00B7 \uD83D\uDCA7 ", data.nearest_water_name ?? "water", " (", data.nearest_water_m, " m)"] }))] }), _jsx("a", { href: data.url, target: "_blank", rel: "noreferrer", className: "text-xs text-blue-600 hover:underline", children: "View on S\u00E9paq \u2197" }), data.map_image_url && (_jsx("img", { src: data.map_image_url, alt: "sector map", className: "mt-4 max-w-3xl rounded border bg-white" })), _jsx("h2", { className: "mt-6 text-lg font-medium", children: "Sites" }), _jsx("ul", { className: "mt-2 grid grid-cols-4 gap-2 md:grid-cols-8 lg:grid-cols-12", children: data.sites.map((s) => (_jsxs("li", { className: "flex flex-col items-center rounded border bg-white p-2 text-xs", children: [_jsxs(Link, { to: `/site/${s.id}`, className: "font-medium text-blue-700 hover:underline", children: ["#", s.number] }), s.waterfront && _jsx("span", { title: "waterfront", children: "\uD83D\uDCA7" })] }, s.id))) })] }));
}
