export type RampBucket = 1 | 2 | 3 | 4 | 5;

/** Bucket index (1 = closest, 5 = farthest) for the shared drive-time color ramp. */
export function driveTimeBucket(minutes: number | null): RampBucket {
  if (minutes === null) return 5;
  if (minutes <= 60) return 1;
  if (minutes <= 120) return 2;
  if (minutes <= 240) return 3;
  if (minutes <= 360) return 4;
  return 5;
}

export function driveTimeRampVar(minutes: number | null): string {
  return `var(--ramp-${driveTimeBucket(minutes)})`;
}
