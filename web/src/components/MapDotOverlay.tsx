import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

export type Dot<T> = {
  key: string;
  left: number; // %
  top: number; // %
  to: string; // router target
  payload: T;
  highlight?: boolean; // e.g. has waterfront
};

type Props<T> = {
  src: string;
  alt: string;
  dots: Dot<T>[];
  tooltip: (payload: T) => ReactNode;
  className?: string;
};

export default function MapDotOverlay<T>({
  src,
  alt,
  dots,
  tooltip,
  className,
}: Props<T>) {
  const navigate = useNavigate();
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div
      className={`relative inline-block max-w-full overflow-hidden rounded border bg-white ${className ?? ""}`}
    >
      <img src={src} alt={alt} className="block max-w-full" />
      {dots.map((d) => {
        const active = hover === d.key;
        return (
          <button
            type="button"
            key={d.key}
            onMouseEnter={() => setHover(d.key)}
            onMouseLeave={() => setHover((h) => (h === d.key ? null : h))}
            onClick={() => navigate(d.to)}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
            style={{ left: `${d.left}%`, top: `${d.top}%` }}
          >
            <span
              className={`block h-3 w-3 rounded-full border-2 border-white shadow ring-1 ring-slate-700 ${
                d.highlight ? "bg-cyan-500" : "bg-blue-600"
              } ${active ? "h-4 w-4" : ""}`}
            />
            {active && (
              <div className="absolute left-1/2 top-full z-10 mt-1 w-56 -translate-x-1/2 rounded border bg-white p-2 text-left text-xs shadow-lg">
                {tooltip(d.payload)}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
