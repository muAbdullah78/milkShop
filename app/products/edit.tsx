import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import {
  AppHeader,
  Button,
  Card,
  Chip,
  ConfirmDialog,
  FooterBar,
  NumberField,
  Screen,
  SwitchRow,
  TextField,
  Txt,
  useToast,
} from '@/components/ui';
import { useCategories, useProducts } from '@/data/hooks';
import { productRepo } from '@/data/repo';
import { useShopId } from '@/data/ShopProvider';
import { useI18n } from '@/i18n';
import { radius, spacing, useColors } from '@/theme';
import { UNITS, type Unit } from '@/types/models';

export default function ProductEdit() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const shopId = useShopId();
  const { t, lang, money } = useI18n();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const { data: products } = useProducts();
  const { data: categories } = useCategories();
  const existing = products.find((p) => p.id === id);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [unit, setUnit] = useState<Unit>('piece');
  const [salePrice, setSalePrice] = useState(0);
  const [costPrice, setCostPrice] = useState(0);
  const [trackStock, setTrackStock] = useState(false);
  const [stock, setStock] = useState(0);
  const [lowStockAt, setLowStockAt] = useState(5);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated) return;
    if (existing) {
      setName(existing.name);
      setCategoryId(existing.categoryId);
      setUnit(existing.unit);
      setSalePrice(existing.salePrice);
      setCostPrice(existing.costPrice);
      setTrackStock(existing.trackStock);
      setStock(existing.stock);
      setLowStockAt(existing.lowStockAt || 5);
      setActive(existing.active);
      setHydrated(true);
    } else if (!id && categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id);
    }
  }, [existing, id, categories, categoryId, hydrated]);

  const margin = salePrice - costPrice;

  const save = async () => {
    if (!shopId || name.trim().length < 1 || !categoryId) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        categoryId,
        unit,
        salePrice,
        costPrice,
        trackStock,
        stock: trackStock ? stock : 0,
        lowStockAt: trackStock ? lowStockAt : 0,
        isMilk: existing?.isMilk ?? false,
        active,
      };
      if (existing) await productRepo.update(shopId, existing.id, payload);
      else await productRepo.create(shopId, payload);
      toast.success(t('ok.saved'));
      router.back();
    } catch {
      toast.error(t('err.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!shopId || !existing) return;
    setSaving(true);
    try {
      await productRepo.remove(shopId, existing.id);
      toast.success(t('ok.deleted'));
      router.back();
    } catch {
      toast.error(t('err.saveFailed'));
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  };

  return (
    <Screen padded={false} edges={['top']}>
      <AppHeader
        title={existing ? t('prod.edit') : t('prod.add')}
        back
        actions={
          existing && !existing.isMilk
            ? [{ icon: 'trash-can-outline', onPress: () => setConfirmDelete(true), tint: c.danger }]
            : undefined
        }
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {existing?.isMilk ? (
            <View style={[styles_milkNote, { backgroundColor: c.primarySoft }]}>
              <MaterialCommunityIcons name="cup" size={19} color={c.primary} />
              <Txt variant="caption" weight="600" color={c.primary} style={{ flex: 1 }}>
                {t('del.title')}
              </Txt>
            </View>
          ) : null}

          <Card style={{ gap: spacing.lg }}>
            <TextField
              label={t('prod.name')}
              value={name}
              onChangeText={setName}
              placeholder={t('prod.nameHint')}
              icon="package-variant"
              autoCapitalize="words"
              required
              autoFocus={!id}
            />

            <View style={{ gap: spacing.sm }}>
              <Txt variant="label" weight="600" muted>
                {t('prod.category')}
              </Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {categories.map((cat) => (
                  <Chip
                    key={cat.id}
                    label={cat.name}
                    icon={cat.icon as never}
                    color={cat.color}
                    active={categoryId === cat.id}
                    onPress={() => setCategoryId(cat.id)}
                  />
                ))}
              </View>
            </View>

            <View style={{ gap: spacing.sm }}>
              <Txt variant="label" weight="600" muted>
                {t('prod.unit')}
              </Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {UNITS.map((u) => (
                  <Chip
                    key={u}
                    label={t(`unit.${u}` as never)}
                    active={unit === u}
                    onPress={() => setUnit(u)}
                  />
                ))}
              </View>
            </View>
          </Card>

          <Card style={{ gap: spacing.lg }}>
            <NumberField
              label={t('prod.salePrice')}
              value={salePrice}
              onChangeValue={setSalePrice}
              prefix={lang === 'ur' ? undefined : 'Rs'}
              suffix={lang === 'ur' ? 'روپے' : undefined}
              icon="tag-outline"
              big
            />
            <NumberField
              label={t('prod.costPrice')}
              hint={t('prod.costPriceHint')}
              value={costPrice}
              onChangeValue={setCostPrice}
              prefix={lang === 'ur' ? undefined : 'Rs'}
              suffix={lang === 'ur' ? 'روپے' : undefined}
              icon="cart-arrow-down"
            />
            {salePrice > 0 && costPrice > 0 ? (
              <View
                style={[
                  styles_milkNote,
                  { backgroundColor: margin >= 0 ? c.successSoft : c.dangerSoft },
                ]}
              >
                <MaterialCommunityIcons
                  name={margin >= 0 ? 'trending-up' : 'trending-down'}
                  size={18}
                  color={margin >= 0 ? c.success : c.danger}
                />
                <Txt variant="caption" weight="700" color={margin >= 0 ? c.success : c.danger} style={{ flex: 1 }}>
                  {t('prod.margin', { amount: money(margin), unit: t(`unit.${unit}.short` as never) })}
                </Txt>
              </View>
            ) : null}
          </Card>

          <Card style={{ gap: spacing.md }}>
            <SwitchRow
              label={t('prod.trackStock')}
              sublabel={t('prod.trackStockSub')}
              value={trackStock}
              onValueChange={setTrackStock}
              icon="package-variant-closed"
              iconColor={c.accent}
            />
            {trackStock ? (
              <>
                <NumberField
                  label={t('prod.stock')}
                  value={stock}
                  onChangeValue={setStock}
                  suffix={t(`unit.${unit}.short` as never)}
                  icon="cube-outline"
                />
                <NumberField
                  label={t('prod.lowStockAt')}
                  value={lowStockAt}
                  onChangeValue={setLowStockAt}
                  suffix={t(`unit.${unit}.short` as never)}
                  icon="alert-outline"
                />
              </>
            ) : null}
            <SwitchRow
              label={t('prod.inactive')}
              value={!active}
              onValueChange={(v) => setActive(!v)}
              icon="eye-off-outline"
              iconColor={c.warning}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <FooterBar>
        <Button
          label={t('common.save')}
          icon="check"
          size="lg"
          full
          disabled={name.trim().length < 1 || !categoryId}
          loading={saving}
          onPress={save}
        />
      </FooterBar>

      <ConfirmDialog
        visible={confirmDelete}
        title={t('prod.deleteQ', { name: existing?.name ?? '' })}
        message={t('common.deleteWarn')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={saving}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </Screen>
  );
}

const styles_milkNote = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: spacing.sm,
  padding: spacing.md,
  borderRadius: radius.md,
};
