import { formatNumber } from '@/workouts/numbers';

import type { ProgressRow } from './aggregate';

/** 12345 → "12 345" (non-breaking spaces, so numbers never wrap). */
export function formatVolume(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** One set as a short line: "60 × 8", "+10 × 8", "25 мин · 5 км". */
export function formatSetLine(r: ProgressRow, units: { min: string; km: string }): string {
  if (r.type === 'cardio') {
    const parts: string[] = [];
    if (r.durationSec !== null) parts.push(`${formatNumber(r.durationSec / 60)} ${units.min}`);
    if (r.distanceM !== null) parts.push(`${formatNumber(r.distanceM / 1000)} ${units.km}`);
    return parts.join(' · ');
  }
  const reps = r.reps === null ? '' : String(r.reps);
  const load = r.weightKg;
  const showLoad = load !== null && (r.type === 'weight' || load !== 0);
  if (!showLoad || reps === '') return showLoad ? formatNumber(load) : reps;
  return `${formatNumber(load, { plus: r.type === 'bodyweight' })} × ${reps}`;
}
