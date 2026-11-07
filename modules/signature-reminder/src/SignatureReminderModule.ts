import { requireOptionalNativeModule } from 'expo';

export type NotificationStatus = 'enabled' | 'disabled' | 'notDetermined' | 'unavailable';
export type ReminderRequest = { id: string; timestamp: number; title: string; body: string };
export type SignatureReminderModule = {
  expirationDate(): string | null;
  syncReminders(requests: ReminderRequest[], requestPermission: boolean): Promise<NotificationStatus>;
};

// Android, Expo Go, and older builds can still open the workout journal.
export default requireOptionalNativeModule<SignatureReminderModule>('SignatureReminder');
