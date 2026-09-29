import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useColors } from '@/settings/provider';

export default function ProgressLayout() {
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
      <Stack.Screen name="index" options={{ title: t('progress.title') }} />
      <Stack.Screen name="exercise/[id]" />
    </Stack>
  );
}
