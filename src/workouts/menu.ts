import type { TFunction } from 'i18next';
import { ActionSheetIOS, Alert } from 'react-native';

type Handlers = {
  /** Left out for today's workout, where repeating it today makes no sense. */
  onRepeatToday?: () => void;
  onMove: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
};

/** The "…" menu of a workout: repeat today, move to another date, rename, delete. */
export function showWorkoutMenu(t: TFunction, name: string, { onRepeatToday, onMove, onRename, onDelete }: Handlers) {
  const items = [
    ...(onRepeatToday ? [{ label: t('workout.menuRepeatToday'), run: onRepeatToday }] : []),
    { label: t('workout.menuMove'), run: onMove },
    {
      label: t('workout.menuRename'),
      run: () => Alert.prompt(t('workout.renameTitle'), undefined, (value) => onRename(value), 'plain-text', name),
    },
    {
      label: t('workout.menuDelete'),
      run: () =>
        Alert.alert(t('workout.deleteConfirm', { name }), t('workout.deleteMessage'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.delete'), style: 'destructive', onPress: onDelete },
        ]),
    },
  ];
  const options = [...items.map((item) => item.label), t('common.cancel')];
  ActionSheetIOS.showActionSheetWithOptions(
    { title: name, options, destructiveButtonIndex: items.length - 1, cancelButtonIndex: items.length },
    (index) => items[index]?.run(),
  );
}
