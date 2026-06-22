import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, NavLink, Outlet } from "react-router-dom";
import FilterPanel from "./components/FilterPanel";
import HealthBanner from "./components/HealthBanner";
export default function App() {
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsxs("header", { className: "flex items-center justify-between border-b bg-white px-4 py-2", children: [_jsx(Link, { to: "/", className: "font-semibold tracking-tight", children: "bettercamp" }), _jsxs("nav", { className: "flex gap-3 text-sm", children: [_jsx(NavLink, { to: "/", end: true, className: navCls, children: "Map" }), _jsx(NavLink, { to: "/list", className: navCls, children: "List" })] })] }), _jsx(HealthBanner, {}), _jsxs("div", { className: "flex flex-1 overflow-hidden", children: [_jsx("aside", { className: "w-72 shrink-0 overflow-y-auto border-r bg-white p-3", children: _jsx(FilterPanel, {}) }), _jsx("main", { className: "flex-1 overflow-hidden", children: _jsx(Outlet, {}) })] })] }));
}
function navCls({ isActive }) {
    return isActive
        ? "rounded bg-slate-900 px-2 py-1 text-white"
        : "rounded px-2 py-1 hover:bg-slate-100";
}
