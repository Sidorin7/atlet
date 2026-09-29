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

/** Axis max and step for 4 sections, rounded to 1/2/2.5/5 × 10ⁿ so labels stay readable. */
export function axisScale(top: number): { max: number; step: number } {
  if (!(top > 0)) return { max: 4, step: 1 };
  const raw = top / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? 10 * magnitude);
  return { max: step * 4, step };
}

/** Which points of a series get an axis label: the newest one and every `every`-th before it. */
export const shouldLabel = (index: number, count: number, every: number) => (count - 1 - index) % every === 0;
