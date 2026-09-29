import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  InputAccessoryView,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type KeyboardTypeOptions,
} from 'react-native';

import { useColors } from '@/settings/provider';
import { radius, spacing, typography } from '@/theme/tokens';
import { formatNumber, parseNumber } from '@/workouts/numbers';

const ACCESSORY_ID = 'number-pill-done';

export const PILL_HEIGHT = 44;

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
      inputAccessoryViewID={ACCESSORY_ID}
      autoFocus={autoFocus}
      selectTextOnFocus
      maxLength={8}
      accessibilityLabel={unit}
      style={[styles.pill, { backgroundColor: colors.surface, color: colors.text }]}
    />
  );
}

/** "Done" bar above the number keyboard, which has no return key of its own. Render once per screen. */
export function NumberPadDone() {
  const { t } = useTranslation();
  const colors = useColors();
  return (
    <InputAccessoryView nativeID={ACCESSORY_ID} backgroundColor={colors.surface}>
      <Pressable onPress={Keyboard.dismiss} hitSlop={8} accessibilityRole="button" style={styles.done}>
        <Text style={[typography.body, { color: colors.text }]}>{t('common.done')}</Text>
      </Pressable>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    height: PILL_HEIGHT,
    borderRadius: radius.sm,
    textAlign: 'center',
    paddingHorizontal: 8,
    fontSize: 19,
    fontWeight: '700',
  },
  done: { alignSelf: 'flex-end', paddingHorizontal: spacing.md, paddingVertical: 12 },
});
