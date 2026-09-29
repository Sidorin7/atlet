import { fieldsFor, ghostPatch, suggestions, type SetRecord } from '../fields';

const units = { kg: 'кг', load: '±кг', reps: 'повт.', min: 'мин', km: 'км' };
const weight = fieldsFor('weight', units);
const cardio = fieldsFor('cardio', units);

let nextId = 1;
const set = (values: Partial<SetRecord> = {}): SetRecord => ({
  id: nextId++,
  workoutExerciseId: 1,
  position: 0,
  weightKg: null,
  reps: null,
  durationSec: null,
  distanceM: null,
  ...values,
});
const pairs = (rows: (SetRecord | undefined)[]) => rows.map((s) => (s ? [s.weightKg, s.reps] : undefined));

describe('suggestions', () => {
  it('offers the set just typed for the next one', () => {
    const rows = [set({ weightKg: 60, reps: 10 }), set()];
    expect(pairs(suggestions(weight, rows, []))).toEqual([undefined, [60, 10]]);
  });

  it('keeps offering the same numbers down a chain of sets', () => {
    const rows = [set({ weightKg: 60, reps: 10 }), set({ weightKg: 60, reps: 10 }), set()];
    expect(pairs(suggestions(weight, rows, [])).at(-1)).toEqual([60, 10]);
  });

  it('uses last time for the first set and where nothing is typed above', () => {
    const last = [set({ weightKg: 50, reps: 12 }), set({ weightKg: 55, reps: 10 })];
    expect(pairs(suggestions(weight, [set(), set()], last))).toEqual([
      [50, 12],
      [55, 10],
    ]);
  });

  it('prefers the set above today over last time', () => {
    const last = [set({ weightKg: 50, reps: 12 }), set({ weightKg: 55, reps: 10 })];
    const rows = [set({ weightKg: 70, reps: 8 }), set()];
    expect(pairs(suggestions(weight, rows, last))[1]).toEqual([70, 8]);
  });

  it('fills a field missing above from last time', () => {
    const last = [set(), set({ weightKg: 55, reps: 10 })];
    const rows = [set({ weightKg: 70 }), set()];
    expect(pairs(suggestions(weight, rows, last))[1]).toEqual([70, 10]);
  });

  it('suggests nothing without a set above or a last time', () => {
    expect(suggestions(weight, [set()], [])).toEqual([undefined]);
  });

  it('works for cardio fields', () => {
    const rows = [set({ durationSec: 1200, distanceM: 3000 }), set()];
    const [, next] = suggestions(cardio, rows, []);
    expect([next?.durationSec, next?.distanceM]).toEqual([1200, 3000]);
  });
});

describe('ghostPatch', () => {
  it('fills only the empty fields', () => {
    expect(ghostPatch(weight, set({ weightKg: 80 }), set({ weightKg: 60, reps: 10 }))).toEqual({ reps: 10 });
  });

  it('is null when there is nothing to fill', () => {
    expect(ghostPatch(weight, set({ weightKg: 60, reps: 10 }), set({ weightKg: 60, reps: 10 }))).toBeNull();
    expect(ghostPatch(weight, set(), undefined)).toBeNull();
  });
});
