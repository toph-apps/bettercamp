import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTypedSearchParams } from "../hooks/useSearchParams";
const AMENITY_OPTIONS = [
    { key: "toilets:flush", label: "Flush toilets" },
    { key: "toilets:vault", label: "Vault toilets" },
    { key: "water", label: "Drinking water" },
    { key: "fire_pit", label: "Fire pit" },
    { key: "electricity", label: "Electricity" },
    { key: "shower", label: "Shower" },
    { key: "pets", label: "Pets allowed" },
];
export default function FilterPanel() {
    const [params, setParams] = useTypedSearchParams();
    const selected = new Set((params.amenities ?? "").split(",").filter(Boolean));
    const toggle = (key) => {
        const next = new Set(selected);
        next.has(key) ? next.delete(key) : next.add(key);
        setParams({ ...params, amenities: [...next].join(",") || undefined });
    };
    return (_jsxs("div", { className: "space-y-4 text-sm", children: [_jsxs("section", { children: [_jsx("label", { className: "block font-medium", children: "Origin" }), _jsx("input", { className: "mt-1 w-full rounded border px-2 py-1", placeholder: "lat,lon (default Montreal)", defaultValue: params.origin ?? "", onBlur: (e) => setParams({ ...params, origin: e.target.value || undefined }) })] }), _jsxs("section", { children: [_jsxs("label", { className: "block font-medium", children: ["Max drive: ", params.max_drive_min ?? "—", " min"] }), _jsx("input", { type: "range", min: 30, max: 600, step: 30, value: params.max_drive_min ?? 600, onChange: (e) => setParams({
                            ...params,
                            max_drive_min: Number(e.target.value) === 600 ? undefined : Number(e.target.value),
                        }), className: "w-full" })] }), _jsxs("section", { children: [_jsxs("label", { className: "flex items-center gap-2 font-medium", children: [_jsx("input", { type: "checkbox", checked: !!params.waterfront, onChange: (e) => setParams({ ...params, waterfront: e.target.checked || undefined }) }), "Waterfront sectors only"] }), params.waterfront && (_jsxs("div", { className: "mt-1", children: [_jsxs("label", { children: ["Max distance to water: ", params.max_water_m ?? 500, " m"] }), _jsx("input", { type: "range", min: 50, max: 500, step: 50, value: params.max_water_m ?? 500, onChange: (e) => setParams({ ...params, max_water_m: Number(e.target.value) }), className: "w-full" })] }))] }), _jsxs("section", { children: [_jsxs("label", { className: "block font-medium", children: ["Sector size (sites): ", params.min_sites ?? 1, "\u2013", params.max_sites ?? 200] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "number", min: 1, className: "w-20 rounded border px-2 py-1", value: params.min_sites ?? "", placeholder: "min", onChange: (e) => setParams({ ...params, min_sites: e.target.value ? Number(e.target.value) : undefined }) }), _jsx("input", { type: "number", min: 1, className: "w-20 rounded border px-2 py-1", value: params.max_sites ?? "", placeholder: "max", onChange: (e) => setParams({ ...params, max_sites: e.target.value ? Number(e.target.value) : undefined }) })] })] }), _jsxs("section", { children: [_jsx("h3", { className: "mb-2 font-medium", children: "Amenities (all required)" }), _jsx("ul", { className: "space-y-1", children: AMENITY_OPTIONS.map((o) => (_jsx("li", { children: _jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: selected.has(o.key), onChange: () => toggle(o.key) }), o.label] }) }, o.key))) })] }), _jsxs("section", { children: [_jsx("label", { className: "block font-medium", children: "Sort" }), _jsxs("select", { className: "mt-1 w-full rounded border px-2 py-1", value: params.sort ?? "name", onChange: (e) => setParams({ ...params, sort: e.target.value }), children: [_jsx("option", { value: "name", children: "Name" }), _jsx("option", { value: "drive_min", children: "Drive time" }), _jsx("option", { value: "waterfront", children: "Waterfront score" })] })] })] }));
}
