import { filterExercises, moveItem } from '../utils';

describe('moveItem', () => {
  it('moves an item forward and backward without mutating the input', () => {
    const src = ['a', 'b', 'c', 'd'];
    expect(moveItem(src, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(src, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
    expect(src).toEqual(['a', 'b', 'c', 'd']);
  });
  it('returns an equal copy for a no-op or out-of-range move', () => {
    expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 5, 0)).toEqual(['a', 'b']);
  });
});

describe('filterExercises', () => {
  const list = [
    { id: 1, name: 'Жим лёжа' },
    { id: 2, name: 'Жим стоя' },
    { id: 3, name: 'Bench Press' },
  ];
  it('matches case-insensitively by substring across the whole list', () => {
    expect(filterExercises(list, 'ЖИМ').map((e) => e.id)).toEqual([1, 2]);
    expect(filterExercises(list, 'bench').map((e) => e.id)).toEqual([3]);
  });
  it('treats ё and е as the same letter', () => {
    expect(filterExercises(list, 'лежа').map((e) => e.id)).toEqual([1]);
  });
  it('returns everything for an empty or blank query', () => {
    expect(filterExercises(list, '')).toHaveLength(3);
    expect(filterExercises(list, '   ')).toHaveLength(3);
  });
});
