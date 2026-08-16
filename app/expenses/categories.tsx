import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, View } from 'react-native';

import {
  AppHeader,
  Button,
  Card,
  ColorPicker,
  ConfirmDialog,
  EmptyState,
  FAB,
  IconPicker,
  ListRow,
  Screen,
  Sheet,
  TextField,
  Txt,
  useToast,
} from '@/components/ui';
import { useExpenseCategories, useExpensesForMonth } from '@/data/hooks';
import { expenseCategoryRepo } from '@/data/repo';
import { CATEGORY_ICONS } from '@/data/seed';
import { useShopId } from '@/data/ShopProvider';
import { useI18n } from '@/i18n';
import { thisMonthKey } from '@/lib/dates';
import { spacing, useColors } from '@/theme';
import { swatches } from '@/theme/colors';
import type { ExpenseCategory } from '@/types/models';

export default function ExpenseCategories() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const shopId = useShopId();
  const { t, num } = useI18n();

  const { data: categories, loading } = useExpenseCategories();
  const { data: expenses } = useExpensesForMonth(thisMonthKey());

  const [editing, setEditing] = useState<ExpenseCategory | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('cash');
  const [color, setColor] = useState<string>(swatches.blue);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ExpenseCategory | null>(null);

  const open = (cat: ExpenseCategory | null) => {
    setEditing(cat);
    setCreating(cat === null);
    setName(cat?.name ?? '');
    setIcon(cat?.icon ?? 'cash');
    setColor(cat?.color ?? swatches.blue);
  };

  const close = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = async () => {
    if (!shopId || name.trim().length < 1) return;
    setSaving(true);
    try {
      if (editing) {
        await expenseCategoryRepo.update(shopId, editing.id, { name: name.trim(), icon, color });
      } else {
        await expenseCategoryRepo.create(shopId, {
          name: name.trim(),
          icon,
          color,
          sortOrder: categories.length,
        });
      }
      toast.success(t('ok.saved'));
      close();
    } catch {
      toast.error(t('err.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!shopId || !confirmDelete) return;
    setSaving(true);
    try {
      await expenseCategoryRepo.remove(shopId, confirmDelete.id);
      toast.success(t('ok.deleted'));
    } catch {
      toast.error(t('err.saveFailed'));
    } finally {
      setSaving(false);
      setConfirmDelete(null);
    }
  };

  return (
    <Screen padded={false} edges={['top']}>
      <AppHeader title={t('exp.manageCats')} back />

      <FlatList
        data={categories}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: spacing.sm }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? null : <EmptyState icon="shape-outline" title={t('cat.emptyTitle')} subtitle={t('cat.emptySub')} />
        }
        renderItem={({ item }) => {
          const used = expenses.filter((e) => e.categoryId === item.id).length;
          return (
            <Card padded={false}>
              <ListRow
                title={item.name}
                subtitle={used > 0 ? `${num(used)} · ${t('common.thisMonth')}` : undefined}
                icon={item.icon as never}
                iconColor={item.color}
                onPress={() => open(item)}
                onLongPress={() => setConfirmDelete(item)}
              />
            </Card>
          );
        }}
      />

      <FAB icon="plus" onPress={() => open(null)} />

      <Sheet
        visible={editing !== null || creating}
        onClose={close}
        title={editing ? t('cat.edit') : t('cat.add')}
        footer={
          <>
            <Button
              label={t('common.save')}
              icon="check"
              size="lg"
              full
              loading={saving}
              disabled={name.trim().length < 1}
              onPress={save}
            />
            {editing ? (
              <Button
                label={t('common.delete')}
                variant="ghost"
                full
                onPress={() => {
                  const target = editing;
                  close();
                  setConfirmDelete(target);
                }}
              />
            ) : null}
          </>
        }
      >
        <View style={{ gap: spacing.lg, paddingBottom: spacing.md }}>
          <TextField
            label={t('cat.name')}
            value={name}
            onChangeText={setName}
            placeholder={t('cat.nameHint')}
            autoFocus
          />
          <View style={{ gap: spacing.sm }}>
            <Txt variant="label" weight="600" muted>
              {t('cat.color')}
            </Txt>
            <ColorPicker value={color} onChange={setColor} />
          </View>
          <View style={{ gap: spacing.sm }}>
            <Txt variant="label" weight="600" muted>
              {t('cat.icon')}
            </Txt>
            <IconPicker icons={CATEGORY_ICONS} value={icon} onChange={setIcon} color={color} />
          </View>
        </View>
      </Sheet>

      <ConfirmDialog
        visible={confirmDelete !== null}
        title={t('cat.deleteQ', { name: confirmDelete?.name ?? '' })}
        message={t('common.deleteWarn')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={saving}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(null)}
      />
    </Screen>
  );
}
