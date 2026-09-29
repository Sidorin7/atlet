import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useColors } from '@/settings/provider';

export default function LibraryLayout() {
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
      <Stack.Screen name="group/[id]" />
      <Stack.Screen name="group-edit" />
      <Stack.Screen name="exercise-edit" />
      <Stack.Screen name="program/[id]" options={{ title: t('program.title') }} />
      <Stack.Screen name="program-edit" />
      <Stack.Screen name="pick-exercises" options={{ title: t('program.pickTitle') }} />
    </Stack>
  );
}
