import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { Reader } from '@/db/types';
import { todayISO } from '@/lib/dates';

import { exportBackup, parseBackup, type BackupFile } from './backup';

/** Writes the backup to a temporary file and opens the share sheet (Save to Files, AirDrop, iCloud…). */
export async function shareBackup(db: Reader, now: Date = new Date()) {
  const file = new File(Paths.cache, `atlet-backup-${todayISO(now)}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(exportBackup(db, now)));
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json' });
}

/** Lets the user pick a file and returns the validated backup, or null if they cancelled. */
export async function pickBackup(): Promise<BackupFile | null> {
  // '*/*': files saved from other apps often arrive without a JSON type; the content is validated anyway.
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled) return null;
  return parseBackup(await new File(result.assets[0].uri).text());
}
