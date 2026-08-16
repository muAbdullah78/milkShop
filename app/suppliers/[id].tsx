import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  AppHeader,
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  ListRow,
  MiniStat,
  NumberField,
  Screen,
  SectionHeader,
  Sheet,
  Txt,
  useToast,
} from '@/components/ui';
import { useSupplierPurchases, useSuppliers } from '@/data/hooks';
import { supplierPaymentRepo } from '@/data/repo';
import { useShopId } from '@/data/ShopProvider';
import { callNumber } from '@/features/whatsapp';
import { useI18n } from '@/i18n';
import { formatDayLong, todayKey } from '@/lib/dates';
import { spacing, useColors } from '@/theme';
import type { PaymentMode } from '@/types/models';

const MODES: PaymentMode[] = ['cash', 'easypaisa', 'jazzcash', 'bank'];

export default function SupplierDetail() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const shopId = useShopId();
  const { t, money, qty, num, lang } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: suppliers } = useSuppliers();
  const { data: purchases } = useSupplierPurchases(id);
  const supplier = suppliers.find((s) => s.id === id);

  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState(0);
  const [mode, setMode] = useState<PaymentMode>('cash');
  const [saving, setSaving] = useState(false);

  const stats = useMemo(
    () => ({
      total: purchases.reduce((s, p) => s + p.amount, 0),
      paid: purchases.reduce((s, p) => s + p.paid, 0),
      count: purchases.length,
    }),
    [purchases]
  );

  const history = useMemo(
    () => [...purchases].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 50),
    [purchases]
  );

  if (!supplier) {
    return (
      <Screen padded={false} edges={['top']}>
        <AppHeader title={t('sup.title')} back />
        <EmptyState icon="truck-alert-outline" title={t('common.noResults')} />
      </Screen>
    );
  }

  const pay = async () => {
    if (!shopId || amount <= 0) return;
    setSaving(true);
    try {
      await supplierPaymentRepo.create(shopId, { date: todayKey(), supplier, amount, mode });
      toast.success(t('sup.paid'));
      setPaying(false);
      setAmount(0);
    } catch {
      toast.error(t('err.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen padded={false} edges={['top']}>
      <AppHeader
        title={supplier.name}
        subtitle={supplier.phone}
        back
        actions={[
          ...(supplier.phone
            ? [{ icon: 'phone' as const, onPress: () => callNumber(supplier.phone), tint: c.info }]
            : []),
          { icon: 'pencil-outline' as const, onPress: () => router.push(`/suppliers/edit?id=${supplier.id}`) },
        ]}
      />

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge }}
        showsVerticalScrollIndicator={false}
      >
        <Card level={2} style={{ alignItems: 'center' }}>
          <Avatar name={supplier.name} size={58} icon="truck-delivery" />
          <Txt variant="caption" muted style={{ marginTop: spacing.md }}>
            {supplier.balance >= 1 ? t('sup.youOwe') : t('sup.clear')}
          </Txt>
          <Txt
            variant="amountXl"
            weight="800"
            color={supplier.balance >= 1 ? c.danger : c.success}
            role="numeric"
          >
            {money(Math.max(0, supplier.balance))}
          </Txt>

          <View style={styles.actions}>
            <Button
              label={t('sup.payThem')}
              icon="cash-check"
              variant="success"
              style={{ flex: 1 }}
              disabled={supplier.balance < 1}
              onPress={() => {
                setAmount(Math.max(0, Math.round(supplier.balance)));
                setPaying(true);
              }}
            />
            <Button
              label={t('pur.new')}
              icon="cart-plus"
              variant="tonal"
              style={{ flex: 1 }}
              onPress={() => router.push(`/purchases/new?supplierId=${supplier.id}`)}
            />
          </View>
        </Card>

        <Card style={{ marginTop: spacing.lg }}>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <MiniStat label={t('pur.title')} value={money(stats.total)} />
            <MiniStat label={t('pur.amountPaid')} value={money(stats.paid)} color={c.success} />
            <MiniStat label={t('common.total')} value={num(stats.count)} />
          </View>
        </Card>

        <SectionHeader title={t('pur.title')} icon="history" style={{ marginTop: spacing.xxl }} />
        <Card padded={false}>
          {history.length === 0 ? (
            <EmptyState icon="cart-outline" title={t('pur.emptyTitle')} subtitle={t('pur.emptySub')} compact />
          ) : (
            history.map((p, i) => (
              <View key={p.id}>
                {i > 0 ? <View style={[styles.sep, { backgroundColor: c.divider }]} /> : null}
                <ListRow
                  title={p.title}
                  subtitle={`${formatDayLong(p.date, lang)} · ${qty(p.qty)} ${t(`unit.${p.unit}.short` as never)} × ${money(p.rate)}`}
                  icon="cart-arrow-down"
                  iconColor={c.info}
                  meta={money(p.amount)}
                  metaSub={p.paid < p.amount ? t('pur.remaining', { amount: money(p.amount - p.paid) }) : undefined}
                  compact
                  chevron={false}
                />
              </View>
            ))
          )}
        </Card>
      </ScrollView>

      <Sheet
        visible={paying}
        onClose={() => setPaying(false)}
        title={t('sup.payThem')}
        subtitle={supplier.name}
        scrollable={false}
        footer={
          <Button
            label={t('common.save')}
            icon="check"
            size="lg"
            full
            disabled={amount <= 0}
            loading={saving}
            onPress={pay}
          />
        }
      >
        <View style={{ gap: spacing.lg, paddingBottom: spacing.md }}>
          <NumberField
            value={amount}
            onChangeValue={setAmount}
            prefix={lang === 'ur' ? undefined : 'Rs'}
            suffix={lang === 'ur' ? 'روپے' : undefined}
            big
            icon="cash"
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {MODES.map((m) => (
              <Chip
                key={m}
                label={t(`sale.${m}` as never)}
                active={mode === m}
                onPress={() => setMode(m)}
              />
            ))}
          </View>
          <View style={[styles.hint, { backgroundColor: c.infoSoft }]}>
            <MaterialCommunityIcons name="information-outline" size={18} color={c.info} />
            <Txt variant="caption" color={c.info} style={{ flex: 1 }}>
              {t('pur.remaining', { amount: money(Math.max(0, supplier.balance - amount)) })}
            </Txt>
          </View>
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl, alignSelf: 'stretch' },
  sep: { height: StyleSheet.hairlineWidth, marginStart: spacing.lg + 50 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: 14 },
});
