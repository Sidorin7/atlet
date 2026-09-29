import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useColors } from '@/settings/provider';
import { programGradients, radius, spacing, typography, type ProgramColor } from '@/theme/tokens';

import { CheckIcon, ChevronRightIcon } from './icons';

export function TextField(props: TextInputProps) {
  const colors = useColors();
  return (
    <TextInput
      placeholderTextColor={colors.placeholder}
      {...props}
      style={[styles.field, { backgroundColor: colors.surface, color: colors.text }, props.style]}
    />
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.surface }]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && { backgroundColor: colors.accent }]}
          >
            <Text
              numberOfLines={1}
              style={[typography.body, { color: selected ? colors.onAccent : colors.textSecondary }]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  const colors = useColors();
  const bg = variant === 'primary' ? colors.accent : colors.surface;
  const fg = variant === 'primary' ? colors.onAccent : variant === 'danger' ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={[typography.body, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function ListRow({
  left,
  title,
  subtitle,
  right,
  onPress,
  onLongPress,
  chevron,
}: {
  left?: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  chevron?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress && !onLongPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      {left}
      <View style={styles.rowText}>
        <Text numberOfLines={1} style={[typography.body, { color: colors.text }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[typography.caption, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {chevron ? <ChevronRightIcon color={colors.textSecondary} /> : null}
    </Pressable>
  );
}

/** Header action for editors: stays visible above the keyboard. */
export function HeaderSave({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={8} accessibilityRole="button">
      <Text style={[typography.body, { color: colors.text, opacity: disabled ? 0.35 : 1 }]}>{title}</Text>
    </Pressable>
  );
}

export function RadioRow({ title, selected, onPress }: { title: string; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <ListRow
      title={title}
      onPress={onPress}
      right={selected ? <CheckIcon color={colors.text} /> : undefined}
    />
  );
}

export function AddedBadge({ count }: { count?: number }) {
  const colors = useColors();
  if (!count) return null;
  return (
    <View style={styles.badge}>
      {count > 1 && <Text style={[typography.caption, { color: colors.textSecondary }]}>×{count}</Text>}
      <CheckIcon color={colors.text} />
    </View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  const colors = useColors();
  return <Text style={[typography.caption, styles.label, { color: colors.textSecondary }]}>{children}</Text>;
}

export function EmptyText({ children }: { children: string }) {
  const colors = useColors();
  return <Text style={[typography.body, styles.empty, { color: colors.textSecondary }]}>{children}</Text>;
}

export function GradientCard({
  color,
  title,
  subtitle,
  onPress,
}: {
  color: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
}) {
  const stops = programGradients[color as ProgramColor] ?? programGradients.pink;
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}>
      <LinearGradient
        colors={[...stops]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <Text numberOfLines={2} style={[typography.title, styles.cardTitle]}>
          {title}
        </Text>
        {subtitle ? <Text style={[typography.caption, styles.cardSubtitle]}>{subtitle}</Text> : null}
      </LinearGradient>
    </Pressable>
  );
}

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: ProgramColor) => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.swatches}>
      {(Object.keys(programGradients) as ProgramColor[]).map((key) => (
        <Pressable
          key={key}
          onPress={() => onChange(key)}
          accessibilityRole="radio"
          accessibilityState={{ selected: key === value }}
          style={[styles.swatchRing, key === value && { borderColor: colors.accent }]}
        >
          <LinearGradient
            colors={[...programGradients[key]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.swatch}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 17,
    fontWeight: '600',
  },
  segmented: { flexDirection: 'row', borderRadius: radius.full, padding: 4 },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.full,
  },
  button: {
    height: 54,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: 60,
  },
  rowText: { flex: 1, gap: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { marginBottom: spacing.sm, marginTop: spacing.sm },
  empty: { textAlign: 'center', marginTop: spacing.xl },
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  cardTitle: { color: '#FFFFFF' },
  cardSubtitle: { color: 'rgba(255,255,255,0.85)' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatchRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: { width: 36, height: 36, borderRadius: 18 },
});
