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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route element={<App />}>
            <Route index element={<MapView />} />
            <Route path="list" element={<ListView />} />
            <Route path="establishment/:id" element={<EstablishmentView />} />
            <Route path="sector/:id" element={<SectorView />} />
            <Route path="site/:id" element={<SiteView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
