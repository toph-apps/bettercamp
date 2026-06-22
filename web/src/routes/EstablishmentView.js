import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
export default function EstablishmentView() {
    const { id = "" } = useParams();
    const { data, isLoading } = useQuery({
        queryKey: ["est", id],
        queryFn: () => api.establishment(id),
        enabled: Boolean(id),
    });
    if (isLoading)
        return _jsx("div", { className: "p-6", children: "loading\u2026" });
    if (!data)
        return _jsx("div", { className: "p-6", children: "not found" });
    return (_jsxs("div", { className: "h-full overflow-auto p-6", children: [_jsx("h1", { className: "text-2xl font-semibold", children: data.name }), _jsx("div", { className: "text-sm text-slate-500", children: data.region ?? "—" }), _jsx("a", { href: data.url, target: "_blank", rel: "noreferrer", className: "text-xs text-blue-600 hover:underline", children: "View on S\u00E9paq \u2197" }), _jsx("h2", { className: "mt-6 text-lg font-medium", children: "Sectors" }), _jsx("ul", { className: "mt-2 space-y-2", children: data.sectors.map((s) => (_jsxs("li", { className: "rounded border bg-white p-3", children: [_jsx(Link, { to: `/sector/${s.id}`, className: "font-medium text-blue-700 hover:underline", children: s.name }), _jsxs("span", { className: "ml-2 text-xs text-slate-500", children: [s.site_count, " sites"] })] }, s.id))) })] }));
}
