import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSettings } from '@/settings/provider';
import { spacing, typography } from '@/theme/tokens';
import type { NotificationStatus } from '../../modules/signature-reminder/src/SignatureReminderModule';
import { renewalState } from './schedule';

export type RenewalStatus = NotificationStatus | 'loading' | 'error';

export function RenewalMessage({ expiration, now, status, onEnable }: {
  expiration: string | null;
  now: Date;
  status: RenewalStatus;
  onEnable: () => void;
}) {
  const { t } = useTranslation();
  const { colors, language } = useSettings();
  const renewal = renewalState(expiration, now);
  if (!renewal || !expiration) return null;
  const deadline = new Date(expiration).toLocaleString(language, {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  });
  const shortDate = new Date(expiration).toLocaleDateString(language, { day: '2-digit', month: '2-digit' });
  const recoverable = ['disabled', 'notDetermined', 'error'].includes(status);

  return (
    <View style={styles.notice}>
      <Text
        accessibilityLabel={t('renewal.deadline', { date: deadline })}
        style={[styles.detail, { color: renewal.urgent ? colors.danger : colors.textSecondary }]}
      >
        {renewal.days === 0 ? t('renewal.today') : t('renewal.compact', { date: shortDate })}
      </Text>
      {status === 'error' && <Text style={[styles.detail, { color: colors.danger }]}>{t('renewal.failed')}</Text>}
      {recoverable && (
        <Pressable accessibilityRole="button" onPress={onEnable} style={styles.action}>
          <Text style={[typography.caption, { color: colors.text }]}>
            {status === 'error' ? t('renewal.retry') : t('renewal.allow')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { marginHorizontal: spacing.lg, paddingVertical: spacing.xs, gap: spacing.xs },
  detail: { fontSize: 12, lineHeight: 16 },
  action: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
});
