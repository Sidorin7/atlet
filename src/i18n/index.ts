import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import type { Language } from '@/settings/resolve';

import { en } from './locales/en';
import { ru } from './locales/ru';

export const resources = {
  ru: { translation: ru },
  en: { translation: en },
} as const;

export function initI18n(lng: Language) {
  if (i18n.isInitialized) return i18n;
  i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: 'en',
    supportedLngs: ['ru', 'en'],
    interpolation: { escapeValue: false },
  });
  return i18n;
}

export default i18n;
