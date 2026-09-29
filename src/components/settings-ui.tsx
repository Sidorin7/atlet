import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/settings/provider';
import { radius, spacing, typography } from '@/theme/tokens';

import { CheckIcon, ChevronRightIcon } from './icons';

/** Row of the settings list: outline icon, title, current value on the right, chevron. */
export function SettingsRow({
  icon,
  title,
  value,
  onPress,
}: {
  icon: ReactNode;
  title: string;
  value?: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint={value}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.5 : 1 }]}
    >
      {icon}
      <Text numberOfLines={1} style={[typography.body, styles.rowTitle, { color: colors.text }]}>
        {title}
      </Text>
      {value ? <Text style={[typography.body, { color: colors.textSecondary }]}>{value}</Text> : null}
      <ChevronRightIcon color={colors.textSecondary} />
    </Pressable>
  );
}

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      {title ? <Text style={[typography.caption, { color: colors.textSecondary }]}>{title}</Text> : null}
      <View style={[styles.group, { backgroundColor: colors.surface }]}>{children}</View>
    </View>
  );
}

export function Options<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  const colors = useColors();
  return options.map((o) => (
    <Pressable
      key={o.value}
      onPress={() => onSelect(o.value)}
      accessibilityRole="radio"
      accessibilityState={{ selected: o.value === selected }}
      style={styles.option}
    >
      <Text style={[typography.body, { color: colors.text }]}>{o.label}</Text>
      {o.value === selected && <CheckIcon color={colors.text} />}
    </Pressable>
  ));
}

export function HintText({ children }: { children: string }) {
  const colors = useColors();
  return <Text style={[typography.caption, { color: colors.textSecondary }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  rowTitle: { flex: 1 },
  section: { gap: spacing.sm },
  group: { borderRadius: radius.lg, overflow: 'hidden' },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
});
