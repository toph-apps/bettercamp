import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useTypedSearchParams } from "../hooks/useSearchParams";
export default function ListView() {
    const [params] = useTypedSearchParams();
    const { data, isLoading } = useQuery({
        queryKey: ["search", params],
        queryFn: () => api.search(params),
    });
    return (_jsxs("div", { className: "h-full overflow-auto p-4", children: [isLoading && _jsx("div", { className: "text-sm", children: "loading\u2026" }), _jsxs("table", { className: "w-full table-auto text-sm", children: [_jsx("thead", { className: "sticky top-0 bg-slate-100 text-left", children: _jsxs("tr", { children: [_jsx("th", { className: "px-2 py-2", children: "Sector" }), _jsx("th", { className: "px-2 py-2", children: "Establishment" }), _jsx("th", { className: "px-2 py-2", children: "Region" }), _jsx("th", { className: "px-2 py-2", children: "Drive" }), _jsx("th", { className: "px-2 py-2", children: "Sites" }), _jsx("th", { className: "px-2 py-2", children: "Water" }), _jsx("th", { className: "px-2 py-2", children: "Book" })] }) }), _jsx("tbody", { children: (data ?? []).map((s) => (_jsxs("tr", { className: "border-b hover:bg-slate-50", children: [_jsx("td", { className: "px-2 py-1", children: _jsx(Link, { to: `/sector/${s.sector_id}`, className: "text-blue-700 hover:underline", children: s.name }) }), _jsx("td", { className: "px-2 py-1", children: s.establishment.name }), _jsx("td", { className: "px-2 py-1 text-slate-500", children: s.establishment.region ?? "—" }), _jsx("td", { className: "px-2 py-1", children: s.drive_min ? `${s.drive_min} min` : "—" }), _jsx("td", { className: "px-2 py-1", children: s.site_count }), _jsx("td", { className: "px-2 py-1", children: s.waterfront_score > 0 ? (_jsx("span", { title: `${s.nearest_water.m} m to ${s.nearest_water.name ?? "water"}`, children: "\uD83D\uDCA7" })) : ("") }), _jsx("td", { className: "px-2 py-1", children: _jsx("a", { href: s.url, target: "_blank", rel: "noreferrer", className: "text-xs text-blue-600 hover:underline", children: "S\u00E9paq \u2197" }) })] }, s.sector_id))) })] })] }));
}
