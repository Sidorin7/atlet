import { defaultGroups } from '../seed';

describe('defaultGroups', () => {
  it('returns the 8 default groups in plan order with icons and positions', () => {
    const groups = defaultGroups('ru');
    expect(groups.map((g) => g.name)).toEqual([
      'Растяжка', 'Кардио', 'Грудь', 'Спина', 'Руки', 'Ноги', 'Плечи', 'Пресс',
    ]);
    expect(groups.map((g) => g.position)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(groups.every((g) => g.icon.length > 0)).toBe(true);
  });
  it('localizes names for English', () => {
    expect(defaultGroups('en')[2].name).toBe('Chest');
  });
});
