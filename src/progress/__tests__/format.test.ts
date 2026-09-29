import { axisScale, formatSetLine, formatVolume, shouldLabel } from '../format';
import type { ProgressRow } from '../aggregate';

const row = (over: Partial<ProgressRow>): ProgressRow => ({
  id: 1,
  date: '2026-09-29',
  exerciseId: 1,
  name: 'X',
  groupIcon: 'chest',
  type: 'weight',
  weightKg: null,
  reps: null,
  durationSec: null,
  distanceM: null,
  ...over,
});
const units = { min: 'мин', km: 'км' };

describe('formatVolume', () => {
  it('groups thousands with a non-breaking space and rounds', () => {
    expect(formatVolume(0)).toBe('0');
    expect(formatVolume(950)).toBe('950');
    expect(formatVolume(12345)).toBe('12 345');
    expect(formatVolume(1234567.6)).toBe('1 234 568');
  });
});

describe('formatSetLine', () => {
  it('weight × reps', () => {
    expect(formatSetLine(row({ weightKg: 60, reps: 8 }), units)).toBe('60 × 8');
    expect(formatSetLine(row({ weightKg: 72.5, reps: 6 }), units)).toBe('72.5 × 6');
  });
  it('bodyweight shows the signed load only when there is one', () => {
    const bw = { type: 'bodyweight' as const };
    expect(formatSetLine(row({ ...bw, reps: 10 }), units)).toBe('10');
    expect(formatSetLine(row({ ...bw, weightKg: 0, reps: 10 }), units)).toBe('10');
    expect(formatSetLine(row({ ...bw, weightKg: 10, reps: 8 }), units)).toBe('+10 × 8');
    expect(formatSetLine(row({ ...bw, weightKg: -20, reps: 6 }), units)).toBe('-20 × 6');
  });
  it('cardio shows minutes and kilometres, whichever are present', () => {
    const c = { type: 'cardio' as const };
    expect(formatSetLine(row({ ...c, durationSec: 1500, distanceM: 5000 }), units)).toBe('25 мин · 5 км');
    expect(formatSetLine(row({ ...c, durationSec: 600 }), units)).toBe('10 мин');
    expect(formatSetLine(row({ ...c, distanceM: 2400 }), units)).toBe('2.4 км');
  });
  it('falls back to the reps alone when only reps are known for a weight exercise', () => {
    expect(formatSetLine(row({ reps: 8 }), units)).toBe('8');
  });
});

describe('axisScale', () => {
  it('picks a round step so 4 sections cover the data', () => {
    expect(axisScale(65)).toEqual({ max: 80, step: 20 });
    expect(axisScale(100)).toEqual({ max: 100, step: 25 });
    expect(axisScale(7)).toEqual({ max: 8, step: 2 });
    expect(axisScale(12340)).toEqual({ max: 20000, step: 5000 });
  });
  it('never returns a zero range', () => {
    expect(axisScale(0)).toEqual({ max: 4, step: 1 });
    expect(axisScale(-5)).toEqual({ max: 4, step: 1 });
  });
  it('always covers the value', () => {
    for (const v of [1, 3, 17, 99, 250, 1234, 98765]) expect(axisScale(v).max).toBeGreaterThanOrEqual(v);
  });
});

describe('shouldLabel', () => {
  it('always labels the newest point and then every `every`-th point going back', () => {
    const labelled = (n: number, every: number) =>
      Array.from({ length: n }, (_, i) => i).filter((i) => shouldLabel(i, n, every));
    expect(labelled(7, 3)).toEqual([0, 3, 6]);
    expect(labelled(8, 3)).toEqual([1, 4, 7]);
    expect(labelled(5, 1)).toEqual([0, 1, 2, 3, 4]);
    expect(labelled(1, 4)).toEqual([0]);
  });
});
