import { formatChange, formatScore, formatSetLine, formatVolume } from '../format';
import type { ProgressRow } from '../aggregate';

const row = (over: Partial<ProgressRow>): ProgressRow => ({
  id: 1,
  date: '2026-09-29',
  exerciseId: 1,
  name: 'X',
  groupId: 1,
  groupName: 'Грудь',
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

describe('formatScore', () => {
  const u = { ...units, kg: 'кг' };
  it('adds the estimated max to a weight set with more than one rep', () => {
    expect(formatScore(row({ weightKg: 80, reps: 5 }), u)).toBe('80 × 5 · ≈93 кг');
    expect(formatScore(row({ weightKg: 100, reps: 1 }), u)).toBe('100 × 1');
  });
  it('shows other sets as they are', () => {
    expect(formatScore(row({ type: 'bodyweight', reps: 12 }), u)).toBe('12');
  });
});

describe('formatChange', () => {
  it('signs the percent, and shows = for no change', () => {
    expect(formatChange(6)).toBe('+6\u00A0%');
    expect(formatChange(-3)).toBe('−3\u00A0%');
    expect(formatChange(0)).toBe('=');
  });
});
