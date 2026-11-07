import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState, Linking } from 'react-native';

import i18n from '@/i18n';
import { useSettings } from '@/settings/provider';
import native from '../../modules/signature-reminder/src/SignatureReminderModule';
import { RenewalMessage, type RenewalStatus } from './message';
import { reminderDates } from './schedule';

// Foreground, language, and permission changes must never race to replace the same requests.
let notificationQueue: Promise<unknown> = Promise.resolve();
const RenewalContext = createContext<ReactNode>(null);

export function RenewalProvider({ children }: { children: ReactNode }) {
  const { language } = useSettings();
  const [expiration] = useState(() => native?.expirationDate() ?? null);
  const [now, setNow] = useState(() => new Date());
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState<RenewalStatus>('loading');

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        setNow(new Date());
        setRevision(value => value + 1);
      }
    });
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => { sub.remove(); clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!native) return;
    let cancelled = false;
    const bridge = native;
    const task = notificationQueue.catch(() => {}).then(async () => {
      const t = i18n.getFixedT(language);
      const requests = reminderDates(expiration).map(request => ({
        ...request,
        title: t('renewal.notificationTitle'),
        body: t(request.id.endsWith('.2') ? 'renewal.notificationTwoDays' : 'renewal.notificationOneDay'),
      }));
      return bridge.syncReminders(requests, true);
    });
    notificationQueue = task;
    task.then(value => { if (!cancelled) setStatus(value); }, () => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [expiration, language, revision]);

  const enable = () => {
    if (status === 'disabled') {
      Linking.openSettings().catch(() => setStatus('error'));
    } else {
      setStatus('loading');
      setRevision(value => value + 1);
    }
  };

  return (
    <RenewalContext.Provider value={<RenewalMessage expiration={expiration} now={now} status={status} onEnable={enable} />}>
      {children}
    </RenewalContext.Provider>
  );
}

export function BuildRenewalNotice() {
  return useContext(RenewalContext);
}
