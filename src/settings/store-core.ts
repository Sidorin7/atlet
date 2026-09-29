import type { AnyDb } from '@/db/types';
import { settings } from '@/db/schema';

import type { LanguagePref, ThemePref } from './resolve';

export type SettingKey = 'theme' | 'language';
export type SettingValue<K extends SettingKey> = K extends 'theme' ? ThemePref : LanguagePref;

export function setSetting<K extends SettingKey>(db: AnyDb, key: K, value: SettingValue<K>) {
  db.insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
}
