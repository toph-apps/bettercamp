import type { ReactNode } from "react";

export default function Field({
  label,
  children,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-xs font-medium uppercase tracking-[0.08em] text-ink-2"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
