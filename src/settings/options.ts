import type { TFunction } from 'i18next';

import type { LanguagePref, ThemePref } from './resolve';

export const themeOptions = (t: TFunction): { value: ThemePref; label: string }[] => [
  { value: 'system', label: t('settings.system') },
  { value: 'light', label: t('settings.light') },
  { value: 'dark', label: t('settings.dark') },
];

export const languageOptions = (t: TFunction): { value: LanguagePref; label: string }[] => [
  { value: 'system', label: t('settings.system') },
  { value: 'ru', label: t('settings.russian') },
  { value: 'en', label: t('settings.english') },
];

/** Where "Contact" in settings writes to. */
export const CONTACT_EMAIL = 'ford1k8@yandex.ru';
