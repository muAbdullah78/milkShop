import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import {
  Badge,
  Button,
  Chip,
  EmptyState,
  FAB,
  NumberField,
  Screen,
  SearchBar,
  Sheet,
  StatTile,
  Txt,
  useToast,
} from '@/components/ui';
import { useCategories, useProducts, useSalesForMonth } from '@/data/hooks';
import { productRepo } from '@/data/repo';
import { useShopId } from '@/data/ShopProvider';
import { useI18n } from '@/i18n';
import { thisMonthKey } from '@/lib/dates';
import { radius, spacing, useColors } from '@/theme';
import { withAlpha } from '@/theme/colors';
import type { Product } from '@/types/models';

export default function ShopScreen() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const shopId = useShopId();
  const { t, money, qty, num } = useI18n();

  const { data: products, loading } = useProducts();
  const { data: categories } = useCategories();
  const { data: sales } = useSalesForMonth(thisMonthKey());

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [stockDraft, setStockDraft] = useState(0);
  const [stockMode, setStockMode] = useState<'add' | 'set'>('add');
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryId && p.categoryId !== categoryId) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q);
    });
  }, [products, search, categoryId]);

  const monthTotals = useMemo(
    () => ({
      sales: sales.reduce((s, x) => s + x.total, 0),
      profit: sales.reduce((s, x) => s + (x.total - x.cost), 0),
      count: sales.length,
    }),
    [sales]
  );

  const catById = useMemo(() => new Map(categories.map((x) => [x.id, x])), [categories]);

  const applyStock = async () => {
    if (!shopId || !selected) return;
    setBusy(true);
    try {
      if (stockMode === 'add') await productRepo.addStock(shopId, selected.id, stockDraft);
      else await productRepo.setStock(shopId, selected.id, stockDraft);
      toast.success(t('prod.stockAdded'));
      setSelected(null);
    } catch {
      toast.error(t('err.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md }}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Txt variant="display" weight="700">
              {t('nav.shop')}
            </Txt>
            <Txt variant="caption" muted>
              {t('cat.itemsCount', { count: num(products.length) })}
            </Txt>
          </View>
          <Pressable
            onPress={() => router.push('/categories')}
            style={[styles.headBtn, { backgroundColor: c.primarySoft }]}
          >
            <MaterialCommunityIcons name="shape-outline" size={20} color={c.primary} />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <StatTile
            label={t('dash.todaySales')}
            value={money(monthTotals.sales)}
            sub={t('common.thisMonth')}
            icon="cart-outline"
            tint={c.primary}
          />
          <StatTile
            label={t('dash.profit')}
            value={money(monthTotals.profit)}
            sub={t('sale.itemsCount', { count: num(monthTotals.count) })}
            icon="trending-up"
            tint={c.success}
          />
        </View>

        <Button
          label={t('sale.new')}
          icon="cart-plus"
          size="lg"
          full
          onPress={() => router.push('/sale/new')}
        />

        <SearchBar value={search} onChangeText={setSearch} placeholder={t('prod.title')} />

        {categories.length > 0 ? (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[null, ...categories]}
            keyExtractor={(x) => x?.id ?? '__all__'}
            contentContainerStyle={{ gap: spacing.sm, paddingBottom: 2 }}
            renderItem={({ item }) => (
              <Chip
                label={item?.name ?? t('common.all')}
                icon={(item?.icon as never) ?? 'apps'}
                color={item?.color}
                active={categoryId === (item?.id ?? null)}
                onPress={() => setCategoryId(item?.id ?? null)}
                count={item ? products.filter((p) => p.categoryId === item.id).length : undefined}
              />
            )}
          />
        ) : null}
      </View>

      <FlatList
        data={list}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.md }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: spacing.md }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="package-variant"
              title={t('prod.emptyTitle')}
              subtitle={t('prod.emptySub')}
              action={
                <Button label={t('prod.add')} icon="plus" size="lg" onPress={() => router.push('/products/edit')} />
              }
            />
          )
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            categoryColor={catById.get(item.categoryId)?.color}
            categoryIcon={catById.get(item.categoryId)?.icon}
            onPress={() => {
              setSelected(item);
              setStockDraft(0);
              setStockMode('add');
            }}
          />
        )}
      />

      <FAB icon="plus" onPress={() => router.push('/products/edit')} />

      <Sheet
        visible={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.name}
        subtitle={
          selected
            ? `${money(selected.salePrice)} ${t('common.perUnit', { unit: t(`unit.${selected.unit}` as never) })}`
            : undefined
        }
        scrollable={false}
      >
        {selected ? (
          <View style={{ gap: spacing.lg, paddingBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <StatTile
                label={t('prod.salePrice')}
                value={money(selected.salePrice)}
                icon="tag-outline"
                tint={c.primary}
              />
              <StatTile
                label={t('prod.margin', {
                  amount: money(selected.salePrice - selected.costPrice),
                  unit: t(`unit.${selected.unit}.short` as never),
                }).split(' ')[0]}
                value={money(selected.salePrice - selected.costPrice)}
                icon="trending-up"
                tint={c.success}
              />
              {selected.trackStock ? (
                <StatTile
                  label={t('prod.stock')}
                  value={qty(selected.stock)}
                  icon="package-variant"
                  tint={selected.stock <= selected.lowStockAt ? c.warning : c.accent}
                />
              ) : null}
            </View>

            {selected.trackStock ? (
              <View style={{ gap: spacing.md }}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Chip
                    label={t('prod.addStock')}
                    icon="plus-box"
                    active={stockMode === 'add'}
                    onPress={() => setStockMode('add')}
                  />
                  <Chip
                    label={t('prod.setStock')}
                    icon="pencil-box"
                    active={stockMode === 'set'}
                    onPress={() => setStockMode('set')}
                  />
                </View>
                <NumberField
                  value={stockDraft}
                  onChangeValue={setStockDraft}
                  suffix={t(`unit.${selected.unit}` as never)}
                  icon="package-variant-closed"
                  big
                />
                <Button
                  label={t('common.save')}
                  icon="check"
                  full
                  size="lg"
                  loading={busy}
                  disabled={stockDraft === 0 && stockMode === 'add'}
                  onPress={applyStock}
                />
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Button
                label={t('sale.quick')}
                icon="cart-plus"
                variant="tonal"
                style={{ flex: 1 }}
                onPress={() => {
                  const id = selected.id;
                  setSelected(null);
                  router.push(`/sale/new?productId=${id}`);
                }}
              />
              <Button
                label={t('common.edit')}
                icon="pencil"
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => {
                  const id = selected.id;
                  setSelected(null);
                  router.push(`/products/edit?id=${id}`);
                }}
              />
            </View>
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

function ProductCard({
  product,
  categoryColor,
  categoryIcon,
  onPress,
}: {
  product: Product;
  categoryColor?: string;
  categoryIcon?: string;
  onPress: () => void;
}) {
  const c = useColors();
  const { t, money, qty } = useI18n();
  const tint = categoryColor ?? c.primary;
  const low = product.trackStock && product.stock <= product.lowStockAt;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.prodCard,
        { backgroundColor: c.card, borderColor: low ? withAlpha(c.warning, 0.45) : c.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.prodTop}>
        <View style={[styles.prodIcon, { backgroundColor: withAlpha(tint, 0.14) }]}>
          <MaterialCommunityIcons
            name={(categoryIcon as never) ?? 'package-variant'}
            size={22}
            color={tint}
          />
        </View>
        {product.trackStock ? (
          <Badge
            label={product.stock <= 0 ? t('prod.outOfStock') : `${qty(product.stock)}`}
            color={product.stock <= 0 ? c.danger : low ? c.warning : c.textMuted}
            size="sm"
          />
        ) : null}
      </View>

      <Txt variant="body" weight="700" numberOfLines={2} style={{ marginTop: spacing.md }}>
        {product.name}
      </Txt>

      <Txt variant="micro" faint numberOfLines={1}>
        {t('common.perUnit', { unit: t(`unit.${product.unit}` as never) })}
      </Txt>

      <Txt variant="amount" weight="800" color={tint} style={{ marginTop: spacing.sm }} role="numeric">
        {money(product.salePrice)}
      </Txt>

      {!product.active ? (
        <Badge label={t('prod.inactive')} color={c.textMuted} size="sm" style={{ marginTop: 4 }} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headBtn: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  prodCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    minHeight: 138,
  },
  prodTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  prodIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
