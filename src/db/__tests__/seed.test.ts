import { exercises, muscleGroups } from '../schema';
import { defaultGroups, seedDefaults } from '../seed';
import { createTestDb } from '../test-db';

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

describe('seedDefaults', () => {
  it('creates the groups with starter exercises in them, once', async () => {
    const db = await createTestDb();
    seedDefaults(db, 'ru');
    seedDefaults(db, 'ru');
    const groups = db.select().from(muscleGroups).all();
    const all = db.select().from(exercises).all();
    expect(groups).toHaveLength(8);
    expect(all).toHaveLength(17);
    const inGroup = (icon: string) =>
      all.filter((e) => e.groupId === groups.find((g) => g.icon === icon)!.id).map((e) => e.name);
    expect(inGroup('legs')).toEqual(['Приседания со штангой', 'Разгибание ног сидя', 'Сгибание ног лежа']);
    expect(inGroup('arms')).toHaveLength(4);
    expect(inGroup('stretch')).toEqual([]);
    expect(all.every((e) => e.type === 'weight' && !e.archived)).toBe(true);
  });

  it('uses English names for an English install', async () => {
    const db = await createTestDb();
    seedDefaults(db, 'en');
    expect(db.select().from(exercises).all()[0].name).toBe('Barbell squat');
  });
});
