import React, { useMemo, useState } from 'react';
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
import { useCategories, useProducts } from '@/data/hooks';
import { categoryRepo } from '@/data/repo';
import { CATEGORY_ICONS } from '@/data/seed';
import { useShopId } from '@/data/ShopProvider';
import { useI18n } from '@/i18n';
import { spacing } from '@/theme';
import { swatches } from '@/theme/colors';
import type { Category } from '@/types/models';

export default function CategoriesScreen() {
  const toast = useToast();
  const shopId = useShopId();
  const { t, num } = useI18n();

  const { data: categories, loading } = useCategories();
  const { data: products } = useProducts();

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => map.set(p.categoryId, (map.get(p.categoryId) ?? 0) + 1));
    return map;
  }, [products]);

  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('shape');
  const [color, setColor] = useState<string>(swatches.blue);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);

  const open = (cat: Category | null) => {
    setEditing(cat);
    setCreating(cat === null);
    setName(cat?.name ?? '');
    setIcon(cat?.icon ?? 'shape');
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
        await categoryRepo.update(shopId, editing.id, { name: name.trim(), icon, color });
      } else {
        await categoryRepo.create(shopId, {
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

  const askDelete = (cat: Category) => {
    const used = counts.get(cat.id) ?? 0;
    if (used > 0) {
      setBlocked(t('cat.deleteHasItems', { count: num(used) }));
      return;
    }
    setConfirmDelete(cat);
  };

  const remove = async () => {
    if (!shopId || !confirmDelete) return;
    setSaving(true);
    try {
      await categoryRepo.remove(shopId, confirmDelete.id);
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
      <AppHeader title={t('cat.title')} subtitle={t('cat.emptySub')} back />

      <FlatList
        data={categories}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: spacing.sm }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="shape-outline"
              title={t('cat.emptyTitle')}
              subtitle={t('cat.emptySub')}
              action={<Button label={t('cat.add')} icon="plus" size="lg" onPress={() => open(null)} />}
            />
          )
        }
        renderItem={({ item }) => (
          <Card padded={false}>
            <ListRow
              title={item.name}
              subtitle={t('cat.itemsCount', { count: num(counts.get(item.id) ?? 0) })}
              icon={item.icon as never}
              iconColor={item.color}
              onPress={() => open(item)}
              onLongPress={() => askDelete(item)}
            />
          </Card>
        )}
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
                  askDelete(target);
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

      <ConfirmDialog
        visible={blocked !== null}
        title={t('common.deleteQ')}
        message={blocked ?? ''}
        confirmLabel={t('common.ok')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => setBlocked(null)}
        onCancel={() => setBlocked(null)}
      />
    </Screen>
  );
}
