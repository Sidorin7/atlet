import { formatNumber } from '@/workouts/numbers';

import { oneRepMax, type ProgressRow } from './aggregate';

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

/** A set with its estimated max for weights: "80 × 5 · ≈93 кг"; other sets as `formatSetLine`. */
export function formatScore(r: ProgressRow, units: { min: string; km: string; kg: string }): string {
  const line = formatSetLine(r, units);
  if (r.type !== 'weight' || r.weightKg === null || r.reps === null || r.reps <= 1 || r.weightKg <= 0) return line;
  return `${line} · ≈${Math.round(oneRepMax(r.weightKg, r.reps))} ${units.kg}`;
}

/** Percent change: "+6 %", "−3 %", or "=" when it rounds to zero. */
export const formatChange = (percent: number): string =>
  percent === 0 ? '=' : `${percent > 0 ? '+' : '−'}${Math.abs(percent)}\u00A0%`;
