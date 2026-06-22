import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import Map from "../components/Map";
import { useTypedSearchParams } from "../hooks/useSearchParams";
export default function MapView() {
    const [params] = useTypedSearchParams();
    const { data, isLoading, error } = useQuery({
        queryKey: ["search", params],
        queryFn: () => api.search(params),
    });
    if (error)
        return (_jsxs("div", { className: "p-6 text-sm text-red-700", children: ["Failed to load: ", error.message] }));
    return (_jsxs("div", { className: "relative h-full", children: [_jsx(Map, { sectors: data ?? [] }), isLoading && (_jsx("div", { className: "absolute left-2 top-2 rounded bg-white/90 px-2 py-1 text-xs shadow", children: "loading\u2026" })), data && (_jsxs("div", { className: "absolute right-2 top-2 rounded bg-white/90 px-2 py-1 text-xs shadow", children: [data.length, " sectors"] }))] }));
}
