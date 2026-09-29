import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { getLocales } from 'expo-localization';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { db } from '@/db/client';
import { seedDefaults } from '@/db/seed';
import { initI18n } from '@/i18n';
import { SettingsProvider, useSettings } from '@/settings/provider';
import { resolveLanguage } from '@/settings/resolve';
import migrations from '../../drizzle/migrations';

SplashScreen.preventAutoHideAsync();

const deviceLanguage = resolveLanguage(
  'system',
  getLocales().map((l) => l.languageTag),
);
initI18n(deviceLanguage);

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!success) return;
    seedDefaults(db, deviceLanguage);
    setSeeded(true);
  }, [success]);

  useEffect(() => {
    if (seeded || error) SplashScreen.hideAsync();
  }, [seeded, error]);

  if (error) {
    return (
      <View style={styles.error}>
        <Text>Database migration failed: {error.message}</Text>
      </View>
    );
  }
  if (!seeded) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SettingsProvider>
        <AppStack />
      </SettingsProvider>
    </GestureHandlerRootView>
  );
}

function AppStack() {
  const { scheme, colors } = useSettings();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: colors.background, card: colors.background, text: colors.text },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen
          name="library"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.75, 1],
            sheetGrabberVisible: true,
            sheetCornerRadius: 24,
          }}
        />
        <Stack.Screen
          name="progress"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.9, 1],
            sheetGrabberVisible: true,
            sheetCornerRadius: 24,
          }}
        />
        <Stack.Screen
          name="move-workout"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.85],
            sheetGrabberVisible: true,
            sheetCornerRadius: 24,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.8, 1],
            sheetGrabberVisible: true,
            sheetCornerRadius: 24,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
