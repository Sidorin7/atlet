import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, type KeyboardTypeOptions } from 'react-native';

import { useColors } from '@/settings/provider';
import { radius, typography } from '@/theme/tokens';
import { formatNumber, parseNumber } from '@/workouts/numbers';

/** Big grey input for one number of a set. `ghost` is last time's value, shown grey when empty. */
export function NumberPill({
  value,
  ghost,
  unit,
  keyboard,
  signed,
  autoFocus,
  onCommit,
}: {
  value: number | null;
  ghost: number | null;
  unit: string;
  keyboard: KeyboardTypeOptions;
  signed?: boolean;
  autoFocus?: boolean;
  onCommit: (n: number | null) => void;
}) {
  const colors = useColors();
  const format = (n: number | null) => formatNumber(n, { plus: signed });
  const [text, setText] = useState(format(value));

  // Follow outside changes (tap-to-fill) but never fight what the user is typing: while the text
  // is a partial number like "-", `value` does not change, so this effect does not run.
  useEffect(() => {
    if (parseNumber(text, { signed }) !== value) setText(format(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <TextInput
      value={text}
      onChangeText={(next) => {
        setText(next);
        const n = parseNumber(next, { signed });
        if (n !== undefined) onCommit(n);
      }}
      placeholder={ghost !== null ? format(ghost) : unit}
      placeholderTextColor={ghost !== null ? colors.textSecondary : colors.placeholder}
      keyboardType={keyboard}
      autoFocus={autoFocus}
      selectTextOnFocus
      maxLength={8}
      accessibilityLabel={unit}
      style={[styles.pill, typography.title, { backgroundColor: colors.surface, color: colors.text }]}
    />
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    height: 56,
    borderRadius: radius.md,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
