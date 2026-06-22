import { jsx as _jsx } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
export default function HealthBanner() {
    const { data } = useQuery({ queryKey: ["health"], queryFn: api.health });
    if (!data)
        return null;
    if (data.status === "ok" && (data.stale_days ?? 0) < 14)
        return null;
    const msg = data.status === "never"
        ? "No scrape has run yet — run `make scrape` to populate the catalog."
        : data.status === "failed"
            ? "Last scrape failed — data may be stale."
            : (data.stale_days ?? 0) >= 14
                ? `Data is ${data.stale_days} days old.`
                : "Last scrape only partially succeeded.";
    return (_jsx("div", { className: "border-b border-amber-200 bg-amber-50 px-4 py-1 text-xs text-amber-900", children: msg }));
}
