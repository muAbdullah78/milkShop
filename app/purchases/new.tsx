import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  AppHeader,
  Avatar,
  Button,
  Card,
  Chip,
  DateRow,
  FooterBar,
  NumberField,
  Screen,
  Sheet,
  SwitchRow,
  TextField,
  Txt,
  useToast,
} from '@/components/ui';
import { useProducts, useSuppliers } from '@/data/hooks';
import { purchaseRepo } from '@/data/repo';
import { useShopId } from '@/data/ShopProvider';
import { useI18n } from '@/i18n';
import { todayKey } from '@/lib/dates';
import { radius, spacing, useColors } from '@/theme';
import { UNITS, type Product, type Supplier, type Unit } from '@/types/models';

export default function NewPurchase() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const shopId = useShopId();
  const { t, money, lang } = useI18n();
  const params = useLocalSearchParams<{ supplierId?: string }>();

  const { data: suppliers } = useSuppliers();
  const { data: products } = useProducts();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [title, setTitle] = useState('');
  const [qtyValue, setQtyValue] = useState(0);
  const [unit, setUnit] = useState<Unit>('litre');
  const [rate, setRate] = useState(0);
  const [paid, setPaid] = useState(0);
  const [date, setDate] = useState(todayKey());
  const [addToStock, setAddToStock] = useState(false);
  const [note, setNote] = useState('');
  const [pickSupplier, setPickSupplier] = useState(false);
  const [pickProduct, setPickProduct] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (supplier || !params.supplierId || suppliers.length === 0) return;
    const found = suppliers.find((s) => s.id === params.supplierId);
    if (found) setSupplier(found);
  }, [suppliers, params.supplierId, supplier]);

  const amount = useMemo(() => Math.round(qtyValue * rate * 100) / 100, [qtyValue, rate]);
  const remaining = Math.max(0, Math.round((amount - paid) * 100) / 100);
  const canSave = qtyValue > 0 && rate > 0 && (title.trim().length > 0 || product !== null);

  const chooseProduct = (p: Product | null) => {
    setProduct(p);
    if (p) {
      setTitle(p.name);
      setUnit(p.unit);
      setRate(p.costPrice || p.salePrice);
      setAddToStock(p.trackStock);
    }
    setPickProduct(false);
  };

  const save = async () => {
    if (!shopId || !canSave) return;
    setSaving(true);
    try {
      await purchaseRepo.create(shopId, {
        date,
        supplierId: supplier?.id ?? null,
        supplierName: supplier?.name,
        productId: product?.id ?? null,
        title: title.trim() || product?.name || t('pur.title'),
        qty: qtyValue,
        unit,
        rate,
        paid,
        addToStock: addToStock && Boolean(product),
        note: note.trim() || undefined,
      });
      toast.success(t('pur.saved'));
      router.back();
    } catch {
      toast.error(t('err.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen padded={false} edges={['top']}>
      <AppHeader title={t('pur.new')} back />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => setPickSupplier(true)}
            style={[styles.pickBox, { backgroundColor: c.card, borderColor: c.border }]}
          >
            {supplier ? (
              <Avatar name={supplier.name} size={42} icon="truck-delivery" />
            ) : (
              <View style={[styles.blank, { backgroundColor: c.bgSunken }]}>
                <MaterialCommunityIcons name="truck-outline" size={21} color={c.textMuted} />
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt variant="micro" muted>
                {t('pur.supplier')}
              </Txt>
              <Txt variant="body" weight="600" numberOfLines={1}>
                {supplier?.name ?? t('common.optional')}
              </Txt>
            </View>
            <MaterialCommunityIcons name="chevron-down" size={21} color={c.textFaint} />
          </Pressable>

          <Card style={{ gap: spacing.lg }}>
            <Pressable
              onPress={() => setPickProduct(true)}
              style={[styles.pickBox, { backgroundColor: c.cardAlt, borderColor: c.border }]}
            >
              <MaterialCommunityIcons name="package-variant" size={21} color={c.primary} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt variant="micro" muted>
                  {t('prod.title')}
                </Txt>
                <Txt variant="body" weight="600" numberOfLines={1}>
                  {product?.name ?? t('common.optional')}
                </Txt>
              </View>
              <MaterialCommunityIcons name="chevron-down" size={21} color={c.textFaint} />
            </Pressable>

            <TextField
              label={t('pur.what')}
              value={title}
              onChangeText={setTitle}
              placeholder={t('prod.nameHint')}
              icon="text-short"
              required
            />

            <View style={{ gap: spacing.sm }}>
              <Txt variant="label" weight="600" muted>
                {t('prod.unit')}
              </Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {UNITS.map((u) => (
                  <Chip key={u} label={t(`unit.${u}` as never)} active={unit === u} onPress={() => setUnit(u)} />
                ))}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <NumberField
                label={t('pur.qty')}
                value={qtyValue}
                onChangeValue={setQtyValue}
                suffix={t(`unit.${unit}.short` as never)}
                style={{ flex: 1 }}
              />
              <NumberField
                label={t('pur.rate')}
                value={rate}
                onChangeValue={setRate}
                prefix={lang === 'ur' ? undefined : 'Rs'}
                style={{ flex: 1 }}
              />
            </View>

            <View style={[styles.totalBox, { backgroundColor: c.primarySoft }]}>
              <Txt variant="body" weight="600" color={c.primary} style={{ flex: 1 }}>
                {t('common.total')}
              </Txt>
              <Txt variant="amountLg" weight="800" color={c.primary} role="numeric">
                {money(amount)}
              </Txt>
            </View>
          </Card>

          <Card style={{ gap: spacing.lg }}>
            <NumberField
              label={t('pur.amountPaid')}
              value={paid}
              onChangeValue={setPaid}
              max={amount}
              prefix={lang === 'ur' ? undefined : 'Rs'}
              icon="cash-check"
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Chip label={t('common.none')} active={paid === 0} onPress={() => setPaid(0)} />
              <Chip
                label={t('pay.payFull', { amount: money(amount) })}
                active={paid === amount && amount > 0}
                onPress={() => setPaid(amount)}
              />
            </View>
            {remaining > 0 ? (
              <View style={[styles.totalBox, { backgroundColor: c.warningSoft }]}>
                <MaterialCommunityIcons name="alert-outline" size={18} color={c.warning} />
                <Txt variant="caption" weight="700" color={c.warning} style={{ flex: 1 }}>
                  {t('pur.remaining', { amount: money(remaining) })}
                  {!supplier ? ` · ${t('pur.supplier')}?` : ''}
                </Txt>
              </View>
            ) : null}

            <DateRow label={t('common.date')} value={date} onChange={setDate} />

            {product?.trackStock ? (
              <SwitchRow
                label={t('pur.addToStock')}
                value={addToStock}
                onValueChange={setAddToStock}
                icon="package-variant-closed"
                iconColor={c.accent}
              />
            ) : null}

            <TextField label={t('common.note')} value={note} onChangeText={setNote} icon="note-outline" />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <FooterBar>
        <Button
          label={t('common.save')}
          icon="check"
          size="lg"
          full
          disabled={!canSave}
          loading={saving}
          onPress={save}
        />
      </FooterBar>

      <Sheet visible={pickSupplier} onClose={() => setPickSupplier(false)} title={t('pur.supplier')}>
        <Pressable
          onPress={() => {
            setSupplier(null);
            setPickSupplier(false);
          }}
          style={[styles.row, { backgroundColor: c.bgSunken }]}
        >
          <MaterialCommunityIcons name="close-circle-outline" size={20} color={c.textMuted} />
          <Txt variant="body" weight="600" style={{ flex: 1 }}>
            {t('common.none')}
          </Txt>
        </Pressable>
        {suppliers.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => {
              setSupplier(s);
              setPickSupplier(false);
            }}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.bgSunken }]}
          >
            <Avatar name={s.name} size={38} icon="truck-delivery" />
            <Txt variant="body" weight="600" style={{ flex: 1 }} numberOfLines={1}>
              {s.name}
            </Txt>
            {s.balance >= 1 ? (
              <Txt variant="caption" weight="700" color={c.danger} role="numeric">
                {money(s.balance)}
              </Txt>
            ) : null}
          </Pressable>
        ))}
        <Button
          label={t('sup.add')}
          icon="plus"
          variant="ghost"
          full
          onPress={() => {
            setPickSupplier(false);
            router.push('/suppliers/edit');
          }}
        />
      </Sheet>

      <Sheet visible={pickProduct} onClose={() => setPickProduct(false)} title={t('prod.title')}>
        <Pressable
          onPress={() => chooseProduct(null)}
          style={[styles.row, { backgroundColor: c.bgSunken }]}
        >
          <MaterialCommunityIcons name="close-circle-outline" size={20} color={c.textMuted} />
          <Txt variant="body" weight="600" style={{ flex: 1 }}>
            {t('common.none')}
          </Txt>
        </Pressable>
        {products.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => chooseProduct(p)}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.bgSunken }]}
          >
            <MaterialCommunityIcons name="package-variant" size={20} color={c.primary} />
            <Txt variant="body" weight="600" style={{ flex: 1 }} numberOfLines={1}>
              {p.name}
            </Txt>
            <Txt variant="caption" muted role="numeric">
              {money(p.costPrice || p.salePrice)}
            </Txt>
          </Pressable>
        ))}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pickBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  blank: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  totalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
});
