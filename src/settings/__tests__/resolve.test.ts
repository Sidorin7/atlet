import { resolveLanguage, resolveScheme } from '../resolve';

describe('resolveScheme', () => {
  it('follows the system when preference is system', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
  });
  it('falls back to light when system scheme is unknown', () => {
    expect(resolveScheme('system', null)).toBe('light');
    expect(resolveScheme('system', 'unspecified')).toBe('light');
  });
  it('uses the manual choice over the system', () => {
    expect(resolveScheme('dark', 'light')).toBe('dark');
    expect(resolveScheme('light', 'dark')).toBe('light');
  });
});

describe('resolveLanguage', () => {
  it('picks the first supported device language when preference is system', () => {
    expect(resolveLanguage('system', ['de', 'ru', 'en'])).toBe('ru');
    expect(resolveLanguage('system', ['en-US'])).toBe('en');
  });
  it('falls back to English for unsupported or missing device languages', () => {
    expect(resolveLanguage('system', ['de', 'fr'])).toBe('en');
    expect(resolveLanguage('system', [])).toBe('en');
  });
  it('uses the manual choice over the device', () => {
    expect(resolveLanguage('ru', ['en'])).toBe('ru');
  });
});
