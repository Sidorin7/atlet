import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useColors } from '@/settings/provider';

export default function SettingsLayout() {
  const { t } = useTranslation();
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="backup" options={{ title: t('settings.backup') }} />
      <Stack.Screen name="appearance" options={{ title: t('settings.appearance') }} />
      <Stack.Screen name="language" options={{ title: t('settings.language') }} />
    </Stack>
  );
}
