import { db } from '@/db/client';
import { settings } from '@/db/schema';

import type { LanguagePref, ThemePref } from './resolve';

export type SettingKey = 'theme' | 'language';
export type SettingValue<K extends SettingKey> = K extends 'theme' ? ThemePref : LanguagePref;

export async function setSetting<K extends SettingKey>(key: K, value: SettingValue<K>) {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}
