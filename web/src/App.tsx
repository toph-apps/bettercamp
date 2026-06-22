import { Link, NavLink, Outlet } from "react-router-dom";
import FilterPanel from "./components/FilterPanel";
import HealthBanner from "./components/HealthBanner";

export default function App() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b bg-white px-4 py-2">
        <Link to="/" className="font-semibold tracking-tight">
          bettercamp
        </Link>
        <nav className="flex gap-3 text-sm">
          <NavLink to="/" end className={navCls}>
            Map
          </NavLink>
          <NavLink to="/list" className={navCls}>
            List
          </NavLink>
        </nav>
      </header>
      <HealthBanner />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 shrink-0 overflow-y-auto border-r bg-white p-3">
          <FilterPanel />
        </aside>
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function navCls({ isActive }: { isActive: boolean }) {
  return isActive
    ? "rounded bg-slate-900 px-2 py-1 text-white"
    : "rounded px-2 py-1 hover:bg-slate-100";
}
