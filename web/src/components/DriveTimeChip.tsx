import { driveTimeRampVar } from "../lib/driveTimeRamp";

export default function DriveTimeChip({ minutes }: { minutes: number | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface px-2 py-0.5 text-xs">
      <span
        aria-hidden
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: driveTimeRampVar(minutes) }}
      />
      <span className="tabular-nums">{minutes !== null ? `${minutes} min` : "—"}</span>
    </span>
  );
}
