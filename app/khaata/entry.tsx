import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  AppHeader,
  Button,
  Card,
  Chip,
  ConfirmDialog,
  DateRow,
  FooterBar,
  NumberField,
  Screen,
  SearchBar,
  Segmented,
  TextField,
  Txt,
  useToast,
} from '@/components/ui';
import { useCategories, useCustomer, useKhaataEntries, useProducts } from '@/data/hooks';
import { khaataRepo } from '@/data/repo';
import { useShopId } from '@/data/ShopProvider';
import { isKhaataOpen } from '@/features/khaata';
import { useI18n } from '@/i18n';
import { formatStamp, todayKey } from '@/lib/dates';
import { radius, spacing, useColors } from '@/theme';
import { withAlpha } from '@/theme/colors';
import type { KhaataEntry, Product, Unit } from '@/types/models';

type Picked = { productId: string; name: string; unit: Unit; qty: number; price: number };

/** A second identical entry inside this window is almost certainly a double tap. */
const DUPLICATE_WINDOW_MS = 90_000;

export default function KhaataEntryScreen() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const shopId = useShopId();
  const { t, money, qty: fmtQty, lang } = useI18n();
  const { customerId, entryId } = useLocalSearchParams<{ customerId: string; entryId?: string }>();

  const { customer } = useCustomer(customerId);
  const { data: products } = useProducts();
  const { data: categories } = useCategories();
  const { data: entries } = useKhaataEntries(customerId);

  const existing = useMemo(() => entries.find((e) => e.id === entryId) ?? null, [entries, entryId]);

  const [kind, setKind] = useState<'debit' | 'credit'>('debit');
  const [picked, setPicked] = useState<Picked[]>([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(todayKey());
  const [ts, setTs] = useState<number>(() => Date.now());
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dupWarn, setDupWarn] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);

  useEffect(() => {
    if (hydrated || !existing) return;
    setKind(existing.kind);
    setTitle(existing.title);
    setTitleTouched(true);
    setAmount(existing.amount);
    setDate(existing.date);
    setTs(existing.ts || existing.createdAt);
    setNote(existing.note ?? '');
    if (existing.items?.length) {
      setPicked(
        existing.items.map((i) => ({
          productId: '',
          name: i.name,
          unit: i.unit,
          qty: i.qty,
          price: i.price,
        }))
      );
    }
    setHydrated(true);
  }, [existing, hydrated]);

  const catById = useMemo(() => new Map(categories.map((x) => [x.id, x])), [categories]);

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (!p.active) return false;
      if (categoryId && p.categoryId !== categoryId) return false;
      return !q || p.name.toLowerCase().includes(q);
    });
  }, [products, search, categoryId]);

  const pickedTotal = useMemo(
    () => Math.round(picked.reduce((s, i) => s + i.qty * i.price, 0) * 100) / 100,
    [picked]
  );

  // Choosing items drives the amount and the description, until the
  // shopkeeper overrides either by hand.
  useEffect(() => {
    if (picked.length === 0) return;
    setAmount(pickedTotal);
    if (!titleTouched) {
      setTitle(picked.map((i) => `${i.name} × ${fmtQty(i.qty)}`).join(', '));
    }
  }, [picked, pickedTotal, titleTouched, fmtQty]);

  const toggleProduct = (p: Product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setPicked((prev) => {
      const idx = prev.findIndex((x) => x.productId === p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: Math.round((next[idx].qty + 1) * 100) / 100 };
        return next;
      }
      return [...prev, { productId: p.id, name: p.name, unit: p.unit, qty: 1, price: p.salePrice }];
    });
  };

  const changeQty = (productId: string, delta: number) => {
    setPicked((prev) =>
      prev
        .map((x) => {
          if (x.productId !== productId) return x;
          const q = Math.round((x.qty + delta) * 100) / 100;
          return q <= 0 ? null : { ...x, qty: q };
        })
        .filter(Boolean) as Picked[]
    );
  };

  const looksDuplicate = useMemo(() => {
    if (existing || amount <= 0) return false;
    return entries.some(
      (e) =>
        e.kind === kind &&
        Math.abs(e.amount - amount) < 0.5 &&
        Date.now() - (e.ts || e.createdAt) < DUPLICATE_WINDOW_MS
    );
  }, [entries, amount, kind, existing]);

  const canSave = amount > 0 && title.trim().length > 0 && Boolean(customer);

  const doSave = async () => {
    if (!shopId || !customer || !canSave) return;
    setSaving(true);
    try {
      if (existing) {
        // Edit = remove the old line and write the new one, so the balance
        // moves by exactly the difference and the ledger stays honest.
        await khaataRepo.removeEntry(shopId, existing);
      }
      await khaataRepo.addEntry(shopId, {
        customer,
        date,
        ts,
        kind,
        title: title.trim(),
        amount,
        items: picked.length
          ? picked.map((i) => ({ name: i.name, qty: i.qty, unit: i.unit, price: i.price }))
          : undefined,
        note,
      });
      toast.success(t('khaata.saved'));
      router.back();
    } catch {
      toast.error(t('err.saveFailed'));
    } finally {
      setSaving(false);
      setDupWarn(false);
    }
  };

  const save = () => {
    if (looksDuplicate) {
      setDupWarn(true);
      return;
    }
    doSave();
  };

  if (customer && !isKhaataOpen(customer) && !existing) {
    return (
      <Screen padded={false} edges={['top']}>
        <AppHeader title={t('khaata.addEntry')} back />
        <View style={{ padding: spacing.lg }}>
          <Card style={{ alignItems: 'center', gap: spacing.md }}>
            <MaterialCommunityIcons name="lock-outline" size={38} color={c.warning} />
            <Txt variant="subtitle" weight="700" align="center">
              {t('khaata.needsKhaata', { name: customer.name })}
            </Txt>
            <Button
              label={t('khaata.open')}
              icon="notebook-plus-outline"
              full
              onPress={() => router.replace(`/khaata/${customer.id}`)}
            />
          </Card>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false} edges={['top']}>
      <AppHeader
        title={existing ? t('khaata.editEntry') : t('khaata.addEntry')}
        subtitle={customer?.name}
        back
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Segmented
            value={kind}
            onChange={setKind}
            options={[
              { value: 'debit', label: t('khaata.kindDebit'), icon: 'basket-plus-outline' },
              { value: 'credit', label: t('khaata.kindCredit'), icon: 'sale' },
            ]}
          />

          {/* Pick from the catalogue */}
          {kind === 'debit' ? (
            <Card style={{ gap: spacing.md }}>
              <Txt variant="label" weight="700" muted>
                {t('khaata.pickItems')}
              </Txt>
              <SearchBar value={search} onChangeText={setSearch} placeholder={t('prod.title')} />
              {categories.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  <Chip
                    label={t('common.all')}
                    icon="apps"
                    active={categoryId === null}
                    onPress={() => setCategoryId(null)}
                  />
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
                </ScrollView>
              ) : null}

              <View style={styles.grid}>
                {visibleProducts.map((p) => {
                  const tint = catById.get(p.categoryId)?.color ?? c.primary;
                  const inCart = picked.find((x) => x.productId === p.id);
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => toggleProduct(p)}
                      style={({ pressed }) => [
                        styles.tile,
                        {
                          backgroundColor: inCart ? withAlpha(tint, 0.13) : c.cardAlt,
                          borderColor: inCart ? tint : 'transparent',
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={(catById.get(p.categoryId)?.icon as never) ?? 'package-variant'}
                        size={19}
                        color={tint}
                      />
                      <Txt variant="micro" weight="600" align="center" numberOfLines={2}>
                        {p.name}
                      </Txt>
                      <Txt variant="micro" weight="700" color={tint} role="numeric">
                        {money(p.salePrice)}
                      </Txt>
                      {inCart ? (
                        <View style={[styles.badge, { backgroundColor: tint }]}>
                          <Txt variant="micro" weight="800" color="#FFFFFF" role="numeric">
                            {fmtQty(inCart.qty)}
                          </Txt>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>

              {picked.map((line) => (
                <View key={line.productId || line.name} style={[styles.pickedRow, { borderColor: c.border }]}>
                  <Txt variant="caption" weight="600" style={{ flex: 1 }} numberOfLines={1}>
                    {line.name}
                  </Txt>
                  <Pressable onPress={() => changeQty(line.productId, -1)} hitSlop={8} style={styles.qtyBtn}>
                    <MaterialCommunityIcons name="minus" size={16} color={c.text} />
                  </Pressable>
                  <Txt variant="caption" weight="700" role="numeric" style={{ minWidth: 28, textAlign: 'center' }}>
                    {fmtQty(line.qty)}
                  </Txt>
                  <Pressable onPress={() => changeQty(line.productId, 1)} hitSlop={8} style={styles.qtyBtn}>
                    <MaterialCommunityIcons name="plus" size={16} color={c.primary} />
                  </Pressable>
                  <Txt variant="caption" weight="700" role="numeric" style={{ minWidth: 62 }} align="end">
                    {money(line.qty * line.price)}
                  </Txt>
                </View>
              ))}
            </Card>
          ) : null}

          {/* Write it by hand */}
          <Card style={{ gap: spacing.lg }}>
            <TextField
              label={kind === 'debit' ? t('khaata.what') : t('khaata.kindCredit')}
              value={title}
              onChangeText={(v) => {
                setTitle(v);
                setTitleTouched(true);
              }}
              placeholder={t('khaata.whatHint')}
              icon="text-short"
              required
            />
            <NumberField
              label={t('common.amount')}
              value={amount}
              onChangeValue={setAmount}
              prefix={lang === 'ur' ? undefined : 'Rs'}
              suffix={lang === 'ur' ? 'روپے' : undefined}
              big
              icon="cash"
            />
            <DateRow label={t('common.date')} value={date} onChange={(d) => {
              setDate(d);
              // Keep the clock time, move the day — a line written late for
              // yesterday should still say what time it happened.
              const prev = new Date(ts);
              const next = new Date(`${d}T00:00:00`);
              next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
              setTs(next.getTime());
            }} />
            <View style={[styles.timeNote, { backgroundColor: c.primarySoft }]}>
              <MaterialCommunityIcons name="clock-outline" size={17} color={c.primary} />
              <Txt variant="caption" weight="600" color={c.primary} style={{ flex: 1 }}>
                {formatStamp(ts, lang)}
              </Txt>
            </View>
            <TextField label={t('common.note')} value={note} onChangeText={setNote} icon="note-outline" />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <FooterBar>
        <View style={styles.totalRow}>
          <Txt variant="body" muted style={{ flex: 1 }}>
            {kind === 'debit' ? t('khaata.took') : t('khaata.kindCredit')}
          </Txt>
          <Txt
            variant="amountLg"
            weight="800"
            color={kind === 'debit' ? c.due : c.success}
            role="numeric"
          >
            {money(amount)}
          </Txt>
        </View>
        <Button
          label={t('common.save')}
          icon="check"
          size="xl"
          full
          disabled={!canSave}
          loading={saving}
          onPress={save}
        />
      </FooterBar>

      <ConfirmDialog
        visible={dupWarn}
        title={t('khaata.duplicateWarn')}
        message={money(amount)}
        confirmLabel={t('common.yes')}
        cancelLabel={t('common.cancel')}
        loading={saving}
        onConfirm={doSave}
        onCancel={() => setDupWarn(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: { gap: spacing.sm, paddingVertical: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '31%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1.5,
    minHeight: 80,
  },
  badge: {
    position: 'absolute',
    top: 4,
    end: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  qtyBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  timeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
