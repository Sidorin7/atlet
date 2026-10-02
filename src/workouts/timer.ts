/** With nothing logged for this long, the workout counts as over even if some sets stay empty. */
export const IDLE_LIMIT_MS = 30 * 60_000;

export type Timing = { first: number | null; last: number | null; empty: number };

/**
 * Workout duration: from the first logged set to the latest one. While the workout is on today,
 * still has empty sets and the latest set is fresh, it keeps counting up to `now`.
 */
export function workoutClock(timing: Timing | undefined, isToday: boolean, now: number) {
  if (!timing || timing.first === null || timing.last === null) return null;
  const running = isToday && timing.empty > 0 && now - timing.last < IDLE_LIMIT_MS;
  const end = running ? Math.max(now, timing.last) : timing.last;
  return { minutes: Math.floor((end - timing.first) / 60_000), running };
}
