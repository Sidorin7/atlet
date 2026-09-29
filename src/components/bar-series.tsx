import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/settings/provider';

export type Bar = { value: number; label: string; highlight?: boolean };

/** Plain-view bar chart: one column per period, the highlighted bar is drawn in the accent colour. */
export function BarSeries({ bars, max, height }: { bars: Bar[]; max: number; height: number }) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      {bars.map((b, i) => {
        const filled = b.value > 0;
        const h = filled ? Math.max(6, (b.value / max) * height) : 4;
        return (
          <View key={i} style={styles.column}>
            <View style={{ height, justifyContent: 'flex-end', alignItems: 'center' }}>
              <View
                style={{
                  width: '62%',
                  height: h,
                  borderRadius: 6,
                  backgroundColor: b.highlight ? colors.accent : filled ? colors.placeholder : colors.background,
                }}
              />
            </View>
            <Text numberOfLines={1} style={[styles.label, { color: colors.textSecondary }]}>
              {b.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  column: { flex: 1, alignItems: 'stretch', gap: 6 },
  label: { fontSize: 10, textAlign: 'center' },
});
