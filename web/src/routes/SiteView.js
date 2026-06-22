import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
export default function SiteView() {
    const { id = "" } = useParams();
    const { data, isLoading } = useQuery({
        queryKey: ["site", id],
        queryFn: () => api.site(id),
        enabled: Boolean(id),
    });
    if (isLoading)
        return _jsx("div", { className: "p-6", children: "loading\u2026" });
    if (!data)
        return _jsx("div", { className: "p-6", children: "not found" });
    let am = {};
    try {
        am = JSON.parse(data.amenities_json || "{}");
    }
    catch {
        /* ignore */
    }
    return (_jsxs("div", { className: "h-full overflow-auto p-6", children: [_jsxs("h1", { className: "text-2xl font-semibold", children: ["Site #", data.number] }), data.waterfront != null && (_jsx("div", { className: "mt-1 text-sm", children: data.waterfront ? "💧 Waterfront" : "Inland" })), _jsx("dl", { className: "mt-4 grid grid-cols-2 gap-y-2 text-sm", children: Object.entries(am)
                    .filter(([k]) => k !== "raw_icons")
                    .map(([k, v]) => (_jsxs("div", { className: "contents", children: [_jsx("dt", { className: "text-slate-500", children: k }), _jsx("dd", { children: String(v) })] }, k))) }), data.notes && (_jsx("p", { className: "mt-4 rounded bg-slate-100 p-3 text-sm", children: data.notes })), data.url && (_jsx("a", { href: data.url, target: "_blank", rel: "noreferrer", className: "mt-4 inline-block rounded bg-blue-600 px-3 py-1 text-sm text-white", children: "Book on S\u00E9paq \u2197" }))] }));
}
