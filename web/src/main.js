import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import App from "./App";
import MapView from "./routes/MapView";
import ListView from "./routes/ListView";
import EstablishmentView from "./routes/EstablishmentView";
import SectorView from "./routes/SectorView";
import SiteView from "./routes/SiteView";
import "./styles.css";
const qc = new QueryClient({
    defaultOptions: { queries: { staleTime: 60 * 60 * 1000, refetchOnWindowFocus: false } },
});
ReactDOM.createRoot(document.getElementById("root")).render(_jsx(React.StrictMode, { children: _jsx(QueryClientProvider, { client: qc, children: _jsx(BrowserRouter, { children: _jsx(Routes, { children: _jsxs(Route, { element: _jsx(App, {}), children: [_jsx(Route, { index: true, element: _jsx(MapView, {}) }), _jsx(Route, { path: "list", element: _jsx(ListView, {}) }), _jsx(Route, { path: "establishment/:id", element: _jsx(EstablishmentView, {}) }), _jsx(Route, { path: "sector/:id", element: _jsx(SectorView, {}) }), _jsx(Route, { path: "site/:id", element: _jsx(SiteView, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }) }) }) }));
