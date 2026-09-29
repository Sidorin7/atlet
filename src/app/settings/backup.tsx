import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { backupSummary, importBackup, InvalidBackupError } from '@/backup/backup';
import { pickBackup, shareBackup } from '@/backup/files';
import { HintText, Section } from '@/components/settings-ui';
import { ListRow } from '@/components/ui';
import { db } from '@/db/client';
import { spacing } from '@/theme/tokens';

export default function BackupScreen() {
  const { t } = useTranslation();

  const exportData = async () => {
    try {
      await shareBackup(db);
    } catch {
      Alert.alert(t('backup.errorTitle'), t('backup.exportFailed'));
    }
  };

  const importData = async () => {
    try {
      const backup = await pickBackup();
      if (!backup) return;
      Alert.alert(t('backup.confirmTitle'), t('backup.confirmMessage', backupSummary(backup)), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('backup.replace'),
          style: 'destructive',
          onPress: () => {
            try {
              importBackup(db, backup);
              Alert.alert(t('backup.importedTitle'));
            } catch {
              Alert.alert(t('backup.errorTitle'), t('backup.errorMessage'));
            }
          },
        },
      ]);
    } catch (e) {
      if (e instanceof InvalidBackupError) Alert.alert(t('backup.invalidTitle'), t('backup.invalidMessage'));
      else Alert.alert(t('backup.errorTitle'), t('backup.errorMessage'));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Section>
        <ListRow title={t('settings.export')} onPress={exportData} chevron />
        <ListRow title={t('settings.import')} onPress={importData} chevron />
      </Section>
      <HintText>{t('settings.dataHint')}</HintText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md },
});
