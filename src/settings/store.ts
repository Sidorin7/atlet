import { db } from '@/db/client';

import { setSetting as setSettingIn, type SettingKey, type SettingValue } from './store-core';

export type { SettingKey, SettingValue };

export function setSetting<K extends SettingKey>(key: K, value: SettingValue<K>) {
  setSettingIn(db, key, value);
}
