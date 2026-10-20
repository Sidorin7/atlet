import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, type KeyboardTypeOptions } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';

import { useColors } from '@/settings/provider';
import { radius, spacing, typography } from '@/theme/tokens';
import { formatNumber, parseNumber } from '@/workouts/numbers';

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
  onFocus,
  onBlur,
}: {
  value: number | null;
  ghost: number | null;
  unit: string;
  keyboard: KeyboardTypeOptions;
  signed?: boolean;
  autoFocus?: boolean;
  onCommit: (n: number | null) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const colors = useColors();
  const format = (n: number | null) => formatNumber(n, { plus: signed });
  const [text, setText] = useState(format(value));

  // Follow outside changes (tap-to-fill) but never fight what the user is typing: while the text
  // is a partial number like "-", `value` does not change, so the text is left alone.
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    setShown(value);
    if (parseNumber(text, { signed }) !== value) setText(format(value));
  }

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
      onFocus={onFocus}
      onBlur={onBlur}
      selectTextOnFocus
      maxLength={8}
      accessibilityLabel={unit}
      style={[styles.pill, { backgroundColor: colors.surface, color: colors.text }]}
    />
  );
}

/**
 * "Done" bar above the number keyboard, which has no return key of its own. Render once per screen,
 * outside any scroll view: it rides on top of the keyboard and waits just below the screen otherwise.
 * (React Native's InputAccessoryView is deprecated and on 0.88 left its background inside the layout.)
 */
export function NumberPadDone() {
  const { t } = useTranslation();
  const colors = useColors();
  const keyboard = useAnimatedKeyboard();
  const ride = useAnimatedStyle(() => {
    const height = keyboard.height.get();
    return { transform: [{ translateY: height > 0 ? -height : DONE_BAR_HEIGHT }] };
  });
  return (
    <Animated.View testID="number-pad-done" style={[styles.doneBar, { backgroundColor: colors.surface }, ride]}>
      <Pressable onPress={Keyboard.dismiss} hitSlop={8} accessibilityRole="button" style={styles.done}>
        <Text style={[typography.body, { color: colors.text }]}>{t('common.done')}</Text>
      </Pressable>
    </Animated.View>
  );
}

const DONE_BAR_HEIGHT = 44;

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
  doneBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: DONE_BAR_HEIGHT,
    justifyContent: 'center',
  },
  done: { alignSelf: 'flex-end', paddingHorizontal: spacing.md, paddingVertical: 12 },
});
