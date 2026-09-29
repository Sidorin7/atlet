import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { EmptyText, SectionLabel, Segmented } from '@/components/ui';
import { db } from '@/db/client';
import { useLive } from '@/db/use-live';
import { dayMonthLabel } from '@/lib/dates';
import { useToday } from '@/lib/use-today';
import {
  exerciseHistory,
  exerciseSeries,
  rangeStart,
  type ProgressRow,
  type Range,
  type SeriesPoint,
} from '@/progress/aggregate';
import { axisScale, formatSetLine, shouldLabel } from '@/progress/format';
import { progressRows } from '@/progress/queries';
import { useSettings } from '@/settings/provider';
import { radius, spacing, typography } from '@/theme/tokens';
import { formatNumber } from '@/workouts/numbers';

const shortDate = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;

export default function ExerciseProgressScreen() {
  const { t } = useTranslation();
  const { colors, language } = useSettings();
  const { width } = useWindowDimensions();
  const exerciseId = Number(useLocalSearchParams<{ id: string }>().id);
  const today = useToday();
  const [range, setRange] = useState<Range>('quarter');

  const all = useLive(() => progressRows(db));
  const rows = useMemo(() => all.filter((r) => r.exerciseId === exerciseId), [all, exerciseId]);
  const first: ProgressRow | undefined = rows[0];
  const type = first?.type ?? 'weight';

  const from = rangeStart(today, range);
  const series = useMemo(() => exerciseSeries(rows, exerciseId, type, from), [rows, exerciseId, type, from]);
  const history = useMemo(() => exerciseHistory(rows, exerciseId), [rows, exerciseId]);

  const titles = {
    weight: [t('progress.maxWeight'), t('progress.tonnage')],
    bodyweight: [t('progress.maxReps'), t('progress.totalReps')],
    cardio: [t('progress.minutes'), t('progress.kilometres')],
  }[type];

  const units = { min: t('workout.unitMin'), km: t('workout.unitKm') };
  const chartWidth = width - spacing.md * 2 - spacing.lg * 2 - 36;

  return (
    <>
      <Stack.Screen options={{ title: first?.name ?? '' }} />
      <ScrollView contentContainerStyle={styles.container}>
        <Segmented
          value={range}
          onChange={setRange}
          options={[
            { value: 'month', label: t('progress.range1m') },
            { value: 'quarter', label: t('progress.range3m') },
            { value: 'year', label: t('progress.range1y') },
            { value: 'all', label: t('progress.rangeAll') },
          ]}
        />

        <SeriesChart title={titles[0]} points={series} pick="primary" width={chartWidth} noData={t('progress.noData')} />
        <SeriesChart title={titles[1]} points={series} pick="secondary" width={chartWidth} noData={t('progress.noData')} />

        <SectionLabel>{t('progress.history')}</SectionLabel>
        <View style={styles.history}>
          {history.length === 0 && <EmptyText>{t('progress.noData')}</EmptyText>}
          {history.map((day) => (
            <View key={day.date} style={[styles.day, { backgroundColor: colors.surface }]}>
              <Text style={[typography.body, { color: colors.text }]}>{dayMonthLabel(day.date, language)}</Text>
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                {day.sets.map((s) => formatSetLine(s, units)).join('   ')}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </>
  );
}

function SeriesChart({
  title,
  points,
  pick,
  width,
  noData,
}: {
  title: string;
  points: SeriesPoint[];
  pick: 'primary' | 'secondary';
  width: number;
  noData: string;
}) {
  const { colors } = useSettings();
  const values = points.map((p) => p[pick]);
  const scale = axisScale(Math.max(0, ...values));
  const spacingX = Math.max(36, (width - 24) / Math.max(1, points.length - 1));
  // Label every point when there is room, otherwise every few points so dates never overlap.
  const every = Math.max(1, Math.ceil(56 / spacingX));

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Text style={[typography.body, { color: colors.text }]}>{title}</Text>
      {points.length === 0 ? (
        <Text style={[typography.caption, styles.noData, { color: colors.textSecondary }]}>{noData}</Text>
      ) : (
        <LineChart
          data={points.map((p, i) => ({
            value: p[pick],
            label: shouldLabel(i, points.length, every) ? shortDate(p.date) : '',
            dataPointText: undefined,
          }))}
          width={width}
          height={140}
          stepHeight={35}
          stepValue={scale.step}
          spacing={spacingX}
          initialSpacing={24}
          endSpacing={24}
          color={colors.accent}
          thickness={3}
          dataPointsColor={colors.accent}
          dataPointsRadius={4}
          areaChart
          startFillColor={colors.accent}
          startOpacity={0.14}
          endFillColor={colors.accent}
          endOpacity={0.01}
          noOfSections={4}
          maxValue={scale.max}
          formatYLabel={(l) => formatNumber(Number(l))}
          yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
          yAxisThickness={0}
          xAxisThickness={0}
          yAxisLabelWidth={36}
          rulesColor={colors.background}
          xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10, width: 40 }}
          scrollToEnd
          isAnimated={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  card: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, overflow: 'hidden' },
  noData: { textAlign: 'center', paddingVertical: spacing.lg },
  history: { gap: spacing.sm },
  day: { borderRadius: radius.md, padding: spacing.md, gap: 4 },
});
