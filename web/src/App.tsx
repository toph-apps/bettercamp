import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { SlidersHorizontal, X } from "lucide-react";
import FilterPanel from "./components/FilterPanel";
import HealthBanner from "./components/HealthBanner";
import ThemeToggle from "./theme/ThemeToggle";

export default function App() {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  return (
    <div className="flex h-full min-h-screen flex-col bg-bg text-ink">
      <header className="flex items-center justify-between border-b border-rule bg-surface px-4 py-2">
        <Link to="/" className="font-serif text-hero">
          bettercamp
        </Link>
        <div className="flex items-center gap-3">
          <nav className="flex gap-4 text-sm">
            <NavLink to="/" end className={navCls}>
              Map
            </NavLink>
            <NavLink to="/list" className={navCls}>
              List
            </NavLink>
          </nav>
          <ThemeToggle />
        </div>
      </header>
      <HealthBanner />
      <div className="relative flex flex-1 overflow-hidden">
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-rule bg-surface p-4 lg:block">
          <FilterPanel />
        </aside>

        {mobileFiltersOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/40 lg:hidden"
            onClick={() => setMobileFiltersOpen(false)}
          />
        )}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-72 max-w-[85vw] transform overflow-y-auto border-r border-rule bg-surface p-4 transition-transform duration-150 ease-out lg:hidden ${
            mobileFiltersOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-2">
              Filters
            </span>
            <button
              type="button"
              aria-label="Close filters"
              onClick={() => setMobileFiltersOpen(false)}
              className="rounded p-1 text-ink-2 hover:bg-surface-2 hover:text-ink"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>
          <FilterPanel />
        </aside>

        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>

        <button
          type="button"
          aria-label="Open filters"
          onClick={() => setMobileFiltersOpen(true)}
          className="fixed bottom-4 right-4 z-10 flex items-center gap-2 rounded-full bg-moss px-4 py-2 text-sm font-medium text-moss-fg shadow-md lg:hidden"
        >
          <SlidersHorizontal size={16} strokeWidth={1.75} />
          Filters
        </button>
      </div>
    </div>
  );
}

function navCls({ isActive }: { isActive: boolean }) {
  return isActive
    ? "border-b-2 border-moss px-1 py-1 font-medium text-ink"
    : "border-b-2 border-transparent px-1 py-1 text-ink-2 hover:text-ink";
}
