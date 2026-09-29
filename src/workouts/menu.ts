import type { TFunction } from 'i18next';
import { ActionSheetIOS, Alert } from 'react-native';

type Handlers = { onMove: () => void; onRename: (name: string) => void; onDelete: () => void };

/** The "…" menu of a workout: move to another date, rename, delete. */
export function showWorkoutMenu(t: TFunction, name: string, { onMove, onRename, onDelete }: Handlers) {
  const options = [t('workout.menuMove'), t('workout.menuRename'), t('workout.menuDelete'), t('common.cancel')];
  ActionSheetIOS.showActionSheetWithOptions(
    { title: name, options, destructiveButtonIndex: 2, cancelButtonIndex: 3 },
    (index) => {
      if (index === 0) onMove();
      else if (index === 1) {
        Alert.prompt(t('workout.renameTitle'), undefined, (value) => onRename(value), 'plain-text', name);
      } else if (index === 2) {
        Alert.alert(t('workout.deleteConfirm', { name }), t('workout.deleteMessage'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.delete'), style: 'destructive', onPress: onDelete },
        ]);
      }
    },
  );
}
