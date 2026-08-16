import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  AppHeader,
  Avatar,
  Button,
  Chip,
  EmptyState,
  FooterBar,
  NumberField,
  Screen,
  SearchBar,
  Sheet,
  Txt,
  useToast,
} from '@/components/ui';
import { useActiveCustomers, useCategories, useProducts } from '@/data/hooks';
import { saleRepo } from '@/data/repo';
import { useShopId } from '@/data/ShopProvider';
import { isKhaataOpen } from '@/features/khaata';
import { useI18n } from '@/i18n';
import { todayKey } from '@/lib/dates';
import { radius, spacing, useColors } from '@/theme';
import { withAlpha } from '@/theme/colors';
import type { Customer, PaymentMode, Product, SaleItem } from '@/types/models';

type CartLine = SaleItem & { key: string };

const MODES: { value: PaymentMode; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { value: 'cash', icon: 'cash' },
  { value: 'easypaisa', icon: 'cellphone' },
  { value: 'jazzcash', icon: 'cellphone-wireless' },
  { value: 'bank', icon: 'bank' },
];

export default function NewSale() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const shopId = useShopId();
  const { t, money, qty, num } = useI18n();
  const params = useLocalSearchParams<{ customerId?: string; productId?: string }>();

  const { data: products } = useProducts();
  const { data: categories } = useCategories();
  const { data: customers } = useActiveCustomers();

  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [mode, setMode] = useState<PaymentMode>('cash');
  const [onCredit, setOnCredit] = useState(false);
  const [pickCustomer, setPickCustomer] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [seeded, setSeeded] = useState(false);

  // Deep-link params: preselect a customer and/or drop a product in the cart.
  useEffect(() => {
    if (seeded) return;
    if (params.customerId && customers.length > 0) {
      const found = customers.find((x) => x.id === params.customerId);
      if (found) {
        setCustomer(found);
        setOnCredit(true);
      }
    }
    if (params.productId && products.length > 0) {
      const p = products.find((x) => x.id === params.productId);
      if (p) addToCart(p);
    }
    if (customers.length > 0 || products.length > 0) setSeeded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, products, params.customerId, params.productId, seeded]);

  const catById = useMemo(() => new Map(categories.map((x) => [x.id, x])), [categories]);

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (!p.active) return false;
      if (categoryId && p.categoryId !== categoryId) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q);
    });
  }, [products, search, categoryId]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (x) => x.name.toLowerCase().includes(q) || (x.phone ?? '').includes(q)
    );
  }, [customers, customerSearch]);

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.total, 0), [cart]);
  const total = Math.max(0, subtotal - discount);

  function addToCart(product: Product) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.productId === product.id);
      if (idx >= 0) {
        const next = [...prev];
        const line = { ...next[idx] };
        line.qty = Math.round((line.qty + 1) * 100) / 100;
        line.total = Math.round(line.qty * line.price * 100) / 100;
        next[idx] = line;
        return next;
      }
      return [
        ...prev,
        {
          key: product.id,
          productId: product.id,
          name: product.name,
          unit: product.unit,
          qty: 1,
          price: product.salePrice,
          costPrice: product.costPrice,
          total: product.salePrice,
        },
      ];
    });
  }

  const changeQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.key !== key) return l;
          const nextQty = Math.round((l.qty + delta) * 100) / 100;
          if (nextQty <= 0) return null;
          return { ...l, qty: nextQty, total: Math.round(nextQty * l.price * 100) / 100 };
        })
        .filter(Boolean) as CartLine[]
    );
  };

  const complete = async () => {
    if (!shopId || cart.length === 0) return;
    if (onCredit && !customer) {
      toast.error(t('sale.pickCustomer'));
      setPickCustomer(true);
      return;
    }
    if (onCredit && customer && !isKhaataOpen(customer)) {
      toast.error(t('khaata.needsKhaata', { name: customer.name }));
      return;
    }
    setSaving(true);
    try {
      await saleRepo.create(shopId, {
        date: todayKey(),
        customerId: customer?.id ?? null,
        customerName: customer?.name,
        items: cart.map(({ key, ...item }) => item),
        discount,
        paymentMode: mode,
        onCredit,
      });
      toast.success(t('sale.saved'));
      router.back();
    } catch {
      toast.error(t('err.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen padded={false} edges={['top']}>
      <AppHeader title={t('sale.new')} back />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing.huge }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Customer */}
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Pressable
            onPress={() => setPickCustomer(true)}
            style={[styles.customerRow, { backgroundColor: c.card, borderColor: c.border }]}
          >
            {customer ? (
              <Avatar name={customer.name} size={40} />
            ) : (
              <View style={[styles.walkIn, { backgroundColor: c.bgSunken }]}>
                <MaterialCommunityIcons name="account-outline" size={21} color={c.textMuted} />
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt variant="body" weight="600" numberOfLines={1}>
                {customer?.name ?? t('sale.walkIn')}
              </Txt>
              <Txt variant="micro" muted numberOfLines={1}>
                {customer ? `${t('cust.balanceDue')}: ${money(customer.balance)}` : t('sale.pickCustomer')}
              </Txt>
            </View>
            {customer ? (
              <Pressable
                onPress={() => {
                  setCustomer(null);
                  setOnCredit(false);
                }}
                hitSlop={10}
              >
                <MaterialCommunityIcons name="close-circle" size={21} color={c.textFaint} />
              </Pressable>
            ) : (
              <MaterialCommunityIcons name="chevron-down" size={21} color={c.textFaint} />
            )}
          </Pressable>
        </View>

        {/* Cart */}
        {cart.length > 0 ? (
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg, gap: spacing.sm }}>
            {cart.map((line) => (
              <View key={line.key} style={[styles.cartLine, { backgroundColor: c.card, borderColor: c.border }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt variant="body" weight="600" numberOfLines={1}>
                    {line.name}
                  </Txt>
                  <Txt variant="micro" muted>
                    {money(line.price)} {t('common.perUnit', { unit: t(`unit.${line.unit}.short` as never) })}
                  </Txt>
                </View>

                <View style={styles.qtyBox}>
                  <Pressable onPress={() => changeQty(line.key, -1)} hitSlop={6} style={styles.qtyBtn}>
                    <MaterialCommunityIcons name="minus" size={18} color={c.text} />
                  </Pressable>
                  <Txt variant="body" weight="700" align="center" role="numeric" style={{ minWidth: 34 }}>
                    {qty(line.qty)}
                  </Txt>
                  <Pressable onPress={() => changeQty(line.key, 1)} hitSlop={6} style={styles.qtyBtn}>
                    <MaterialCommunityIcons name="plus" size={18} color={c.primary} />
                  </Pressable>
                </View>

                <Txt variant="amount" weight="700" role="numeric" style={{ minWidth: 74 }} align="end">
                  {money(line.total)}
                </Txt>
              </View>
            ))}
          </View>
        ) : null}

        {/* Product picker */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg, gap: spacing.md }}>
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
                />
              )}
            />
          ) : null}
        </View>

        <View style={styles.grid}>
          {visibleProducts.length === 0 ? (
            <EmptyState icon="package-variant" title={t('prod.emptyTitle')} compact />
          ) : (
            visibleProducts.map((p) => {
              const tint = catById.get(p.categoryId)?.color ?? c.primary;
              const inCart = cart.find((l) => l.productId === p.id);
              return (
                <Pressable
                  key={p.id}
                  onPress={() => addToCart(p)}
                  style={({ pressed }) => [
                    styles.tile,
                    {
                      backgroundColor: inCart ? withAlpha(tint, 0.12) : c.card,
                      borderColor: inCart ? tint : c.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={(catById.get(p.categoryId)?.icon as never) ?? 'package-variant'}
                    size={22}
                    color={tint}
                  />
                  <Txt variant="caption" weight="600" align="center" numberOfLines={2}>
                    {p.name}
                  </Txt>
                  <Txt variant="micro" weight="700" color={tint} role="numeric">
                    {money(p.salePrice)}
                  </Txt>
                  {inCart ? (
                    <View style={[styles.tileBadge, { backgroundColor: tint }]}>
                      <Txt variant="micro" weight="800" color="#FFFFFF" role="numeric">
                        {qty(inCart.qty)}
                      </Txt>
                    </View>
                  ) : null}
                </Pressable>
              );
            })
          )}
        </View>

        {/* Totals & payment */}
        {cart.length > 0 ? (
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl, gap: spacing.lg }}>
            <NumberField
              label={t('sale.discount')}
              value={discount}
              onChangeValue={setDiscount}
              icon="sale"
              max={subtotal}
            />

            <View style={{ gap: spacing.sm }}>
              <Txt variant="label" weight="600" muted>
                {t('sale.paymentMode')}
              </Txt>
              <View style={styles.modeRow}>
                {MODES.map((m) => (
                  <Chip
                    key={m.value}
                    label={t(`sale.${m.value}` as never)}
                    icon={m.icon}
                    active={!onCredit && mode === m.value}
                    onPress={() => {
                      setMode(m.value);
                      setOnCredit(false);
                    }}
                  />
                ))}
                <Chip
                  label={t('sale.onKhata')}
                  icon="notebook-outline"
                  active={onCredit}
                  color={c.due}
                  onPress={() => {
                    setOnCredit(true);
                    if (!customer) setPickCustomer(true);
                  }}
                />
              </View>
              {onCredit ? (
                <Txt variant="micro" muted>
                  {t('sale.onKhataSub')}
                </Txt>
              ) : null}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <FooterBar>
        <View style={styles.totalRow}>
          <View>
            <Txt variant="micro" muted>
              {t('sale.itemsCount', { count: num(cart.length) })}
            </Txt>
            <Txt variant="amountLg" weight="800" role="numeric">
              {money(total)}
            </Txt>
          </View>
          {discount > 0 ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Txt variant="micro" muted>
                {t('sale.subtotal')} {money(subtotal)}
              </Txt>
              <Txt variant="caption" weight="700" color={c.success}>
                −{money(discount)}
              </Txt>
            </View>
          ) : null}
        </View>
        <Button
          label={t('sale.complete')}
          icon="check-circle"
          size="xl"
          full
          disabled={cart.length === 0}
          loading={saving}
          onPress={complete}
        />
      </FooterBar>

      <Sheet
        visible={pickCustomer}
        onClose={() => setPickCustomer(false)}
        title={t('sale.pickCustomer')}
      >
        <SearchBar
          value={customerSearch}
          onChangeText={setCustomerSearch}
          placeholder={t('cust.searchHint')}
          style={{ marginBottom: spacing.md }}
        />
        <Pressable
          onPress={() => {
            setCustomer(null);
            setOnCredit(false);
            setPickCustomer(false);
          }}
          style={[styles.pickRow, { backgroundColor: c.bgSunken }]}
        >
          <MaterialCommunityIcons name="account-outline" size={20} color={c.textMuted} />
          <Txt variant="body" weight="600" style={{ flex: 1 }}>
            {t('sale.walkIn')}
          </Txt>
        </Pressable>
        {filteredCustomers.map((cu) => (
          <Pressable
            key={cu.id}
            onPress={() => {
              setCustomer(cu);
              setOnCredit(true);
              setPickCustomer(false);
            }}
            style={({ pressed }) => [styles.pickRow, pressed && { backgroundColor: c.bgSunken }]}
          >
            <Avatar name={cu.name} size={38} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt variant="body" weight="600" numberOfLines={1}>
                {cu.name}
              </Txt>
              {cu.route ? (
                <Txt variant="micro" muted numberOfLines={1}>
                  {cu.route}
                </Txt>
              ) : null}
            </View>
            {cu.balance >= 1 ? (
              <Txt variant="caption" weight="700" color={c.due} role="numeric">
                {money(cu.balance)}
              </Txt>
            ) : null}
          </Pressable>
        ))}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  walkIn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cartLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  qtyBox: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  qtyBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  tile: {
    width: '31.5%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    minHeight: 96,
    justifyContent: 'center',
  },
  tileBadge: {
    position: 'absolute',
    top: 5,
    end: 5,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
});
