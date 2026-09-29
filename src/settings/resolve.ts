export type ThemePref = 'system' | 'light' | 'dark';
export type LanguagePref = 'system' | 'ru' | 'en';
export type Scheme = 'light' | 'dark';
export type Language = 'ru' | 'en';

export const SUPPORTED_LANGUAGES: readonly Language[] = ['ru', 'en'];

export function resolveScheme(pref: ThemePref, system: string | null | undefined): Scheme {
  if (pref !== 'system') return pref;
  return system === 'dark' ? 'dark' : 'light';
}

/** `deviceLanguages` are BCP-47 tags or bare codes, most preferred first. */
export function resolveLanguage(pref: LanguagePref, deviceLanguages: readonly string[]): Language {
  if (pref !== 'system') return pref;
  for (const tag of deviceLanguages) {
    const code = tag.split('-')[0].toLowerCase();
    if ((SUPPORTED_LANGUAGES as readonly string[]).includes(code)) return code as Language;
  }
  return 'en';
}
