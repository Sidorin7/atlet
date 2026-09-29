// Hermes on iOS ships without Intl.PluralRules, so i18next would fall back to the 'other' form.
describe('plural forms without a native Intl.PluralRules', () => {
  const native = Intl.PluralRules;
  afterEach(() => {
    Object.defineProperty(Intl, 'PluralRules', { value: native, configurable: true, writable: true });
  });

  it('picks the right Russian and English forms', () => {
    // @ts-expect-error simulating the Hermes runtime
    delete Intl.PluralRules;
    jest.isolateModules(() => {
      const { initI18n } = require('../index');
      const i18n = initI18n('ru');
      const count = (n: number) => i18n.t('library.exerciseCount', { count: n });
      expect([1, 2, 5, 11, 21, 22, 25].map(count)).toEqual([
        '1 упражнение',
        '2 упражнения',
        '5 упражнений',
        '11 упражнений',
        '21 упражнение',
        '22 упражнения',
        '25 упражнений',
      ]);
      i18n.changeLanguage('en');
      expect([1, 2].map(count)).toEqual(['1 exercise', '2 exercises']);
    });
  });
});
