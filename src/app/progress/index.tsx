import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarSeries, type Bar } from '@/components/bar-series';
import { CloseButton, EmptyText, Segmented } from '@/components/ui';
import { db } from '@/db/client';
import { useLive } from '@/db/use-live';
import { dayNumber, shortMonth } from '@/lib/dates';
import { useToday } from '@/lib/use-today';
import { periodBuckets, type Granularity } from '@/progress/aggregate';
import { formatVolume } from '@/progress/format';
import { progressRows } from '@/progress/queries';
import { useSettings } from '@/settings/provider';
import { radius, spacing, typography } from '@/theme/tokens';

const PERIODS = 12;

export default function ProgressScreen() {
  const { t } = useTranslation();
  const { language } = useSettings();
  const today = useToday();
  const rows = useLive(() => progressRows(db));
  const [g, setG] = useState<Granularity>('week');

  const buckets = useMemo(() => periodBuckets(rows, g, today, PERIODS), [rows, g, today]);
  const current = buckets[buckets.length - 1];

  const label = (start: string) => (g === 'week' ? String(dayNumber(start)) : shortMonth(start, language));
  const bars = (value: (i: number) => number): Bar[] =>
    buckets.map((b, i) => ({ value: value(i), label: label(b.start), highlight: i === buckets.length - 1 }));

  // No value axis is drawn, so the tallest bar simply fills the height.
  const volumeMax = Math.max(1, ...buckets.map((b) => b.volume));
  const workoutsMax = Math.max(1, ...buckets.map((b) => b.workouts));

  const close = (
    <Stack.Screen
      options={{
        headerRight: () => (
          <CloseButton label={t('common.close')} onPress={() => router.dismissTo('/')} />
        ),
      }}
    />
  );

  if (rows.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        {close}
        <EmptyText>{t('progress.empty')}</EmptyText>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {close}
      <Segmented
        value={g}
        onChange={setG}
        options={[
          { value: 'week', label: t('progress.weeks') },
          { value: 'month', label: t('progress.months') },
        ]}
      />

      <View style={styles.stats}>
        <Stat
          title={t('progress.workouts')}
          value={String(current.workouts)}
          caption={g === 'week' ? t('progress.thisWeek') : t('progress.thisMonth')}
        />
        <Stat
          title={t('progress.volume')}
          value={`${formatVolume(current.volume)} ${t('progress.volumeUnit')}`}
          caption={g === 'week' ? t('progress.thisWeek') : t('progress.thisMonth')}
        />
      </View>

      <ChartCard title={t('progress.volume')}>
        <BarSeries bars={bars((i) => buckets[i].volume)} max={volumeMax} height={130} />
      </ChartCard>

      <ChartCard title={t('progress.workouts')}>
        <BarSeries bars={bars((i) => buckets[i].workouts)} max={workoutsMax} height={80} />
      </ChartCard>

    </ScrollView>
  );
}

function Stat({ title, value, caption }: { title: string; value: string; caption: string }) {
  const { colors } = useSettings();
  return (
    <View style={[styles.stat, { backgroundColor: colors.surface }]}>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{title}</Text>
      <Text style={[typography.title, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{caption}</Text>
    </View>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useSettings();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Text style={[typography.body, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  emptyWrap: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, borderRadius: radius.lg, padding: spacing.md, gap: 4 },
  card: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, overflow: 'hidden' },
});
