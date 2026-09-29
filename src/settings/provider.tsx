import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useLocales } from 'expo-localization';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { db } from '@/db/client';
import { settings } from '@/db/schema';
import i18n from '@/i18n';
import { palettes, type Colors } from '@/theme/tokens';

import {
  resolveLanguage,
  resolveScheme,
  type Language,
  type LanguagePref,
  type Scheme,
  type ThemePref,
} from './resolve';

type SettingsContextValue = {
  themePref: ThemePref;
  languagePref: LanguagePref;
  scheme: Scheme;
  language: Language;
  colors: Colors;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data } = useLiveQuery(db.select().from(settings));
  const map = new Map(data.map((row) => [row.key, row.value]));
  const themePref = (map.get('theme') ?? 'system') as ThemePref;
  const languagePref = (map.get('language') ?? 'system') as LanguagePref;

  // Overriding Appearance makes native UI (sheets, keyboard, status bar) follow the manual choice.
  useEffect(() => {
    Appearance.setColorScheme(themePref === 'system' ? 'unspecified' : themePref);
  }, [themePref]);

  const systemScheme = useColorScheme();
  const locales = useLocales();
  const scheme = resolveScheme(themePref, systemScheme);
  const language = resolveLanguage(
    languagePref,
    locales.map((l) => l.languageTag),
  );

  useEffect(() => {
    if (i18n.language !== language) i18n.changeLanguage(language);
  }, [language]);

  const value = useMemo(
    () => ({ themePref, languagePref, scheme, language, colors: palettes[scheme] }),
    [themePref, languagePref, scheme, language],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}

export const useColors = () => useSettings().colors;
