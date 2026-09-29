import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { GROUP_ICON_KEYS, GroupIcon } from '@/components/group-icons';
import { Button, HeaderSave, SectionLabel, TextField } from '@/components/ui';
import { db } from '@/db/client';
import { createGroup, deleteGroup, GroupNotEmptyError, updateGroup } from '@/library/repo';
import { groupById } from '@/library/queries';
import { useColors } from '@/settings/provider';
import { radius, spacing } from '@/theme/tokens';

export default function GroupEditScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const groupId = id ? Number(id) : null;

  const [initial] = useState(() => (groupId ? groupById(db, groupId).all()[0] : undefined));
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? GROUP_ICON_KEYS[0]);

  const save = () => {
    if (groupId) updateGroup(db, groupId, { name, icon });
    else createGroup(db, { name, icon });
    router.back();
  };

  const remove = () => {
    if (!groupId) return;
    Alert.alert(t('group.deleteConfirm', { name }), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          try {
            deleteGroup(db, groupId);
            router.dismissTo('/library');
          } catch (e) {
            if (e instanceof GroupNotEmptyError) Alert.alert(t('common.error'), t('group.notEmpty'));
            else throw e;
          }
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: groupId ? t('group.editTitle') : t('group.newTitle'),
          headerRight: () => (
            <HeaderSave title={t('common.save')} onPress={save} disabled={name.trim() === ''} />
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View>
          <SectionLabel>{t('group.name')}</SectionLabel>
          <TextField
            value={name}
            onChangeText={setName}
            placeholder={t('group.namePlaceholder')}
            autoFocus={!groupId}
          />
        </View>
        <View>
          <SectionLabel>{t('group.icon')}</SectionLabel>
          <View style={styles.icons}>
            {GROUP_ICON_KEYS.map((key) => {
              const selected = key === icon;
              return (
                <Pressable
                  key={key}
                  onPress={() => setIcon(key)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[
                    styles.icon,
                    { backgroundColor: selected ? colors.accent : colors.surface },
                  ]}
                >
                  <GroupIcon name={key} color={selected ? colors.onAccent : colors.text} />
                </Pressable>
              );
            })}
          </View>
        </View>
        {groupId && <Button title={t('group.delete')} variant="danger" onPress={remove} />}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  icon: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
