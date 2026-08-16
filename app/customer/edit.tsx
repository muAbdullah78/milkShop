import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  AppHeader,
  Button,
  Card,
  Chip,
  ConfirmDialog,
  FooterBar,
  NumberField,
  Screen,
  Segmented,
  SwitchRow,
  TextField,
  Txt,
  useToast,
} from '@/components/ui';
import { useCustomer, useRoutes } from '@/data/hooks';
import { customerRepo } from '@/data/repo';
import { useShop, useShopId } from '@/data/ShopProvider';
import { useI18n } from '@/i18n';
import { WEEKDAY_ORDER } from '@/lib/dates';
import { radius, spacing, useColors } from '@/theme';
import type { BillingType, DeliverySchedule } from '@/types/models';

export default function CustomerEdit() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const shopId = useShopId();
  const { shop } = useShop();
  const { t, lang, money } = useI18n();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const { customer } = useCustomer(id);
  const routes = useRoutes();
  const isEdit = Boolean(id);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [route, setRoute] = useState('');
  const [billingType, setBillingType] = useState<BillingType>('daily');
  const [defaultQty, setDefaultQty] = useState(1);
  const [rate, setRate] = useState(0);
  const [monthlyAmount, setMonthlyAmount] = useState(0);
  const [schedule, setSchedule] = useState<DeliverySchedule>('daily');
  const [customDays, setCustomDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated) return;
    if (customer) {
      setName(customer.name);
      setPhone(customer.phone ?? '');
      setAddress(customer.address ?? '');
      setRoute(customer.route ?? '');
      setBillingType(customer.billingType);
      setDefaultQty(customer.defaultQty);
      setRate(customer.rate);
      setMonthlyAmount(customer.monthlyAmount);
      setSchedule(customer.schedule);
      setCustomDays(customer.customDays?.length ? customer.customDays : [1, 2, 3, 4, 5, 6, 0]);
      setOpeningBalance(customer.openingBalance);
      setNotes(customer.notes ?? '');
      setActive(customer.active);
      setHydrated(true);
    } else if (!isEdit && shop) {
      setRate(shop.defaultMilkRate);
      setDefaultQty(shop.defaultMilkQty || 1);
      setHydrated(true);
    }
  }, [customer, isEdit, shop, hydrated]);

  const monthlyEstimate = useMemo(() => defaultQty * rate * 30, [defaultQty, rate]);

  const save = async () => {
    if (!shopId) return;
    if (name.trim().length < 2) {
      setErrors({ name: t('err.nameTooShort') });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        route: route.trim() || undefined,
        billingType,
        defaultQty: billingType === 'daily' ? defaultQty : defaultQty,
        rate,
        monthlyAmount: billingType === 'monthly' ? monthlyAmount : 0,
        schedule,
        customDays: schedule === 'custom' ? customDays : [],
        openingBalance,
        notes: notes.trim() || undefined,
        active,
      };

      if (customer) {
        await customerRepo.update(shopId, customer.id, payload, customer);
      } else {
        await customerRepo.create(shopId, payload);
      }
      toast.success(t('cust.saved'));
      router.back();
    } catch {
      toast.error(t('err.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!shopId || !customer) return;
    if (Math.abs(customer.balance) >= 1) {
      setConfirmDelete(false);
      toast.error(t('cust.deleteBlocked'));
      return;
    }
    setSaving(true);
    try {
      await customerRepo.remove(shopId, customer.id);
      toast.success(t('ok.deleted'));
      router.dismissAll();
      router.replace('/(tabs)/customers');
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
        title={isEdit ? t('cust.edit') : t('cust.new')}
        back
        actions={
          isEdit
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
          <Card style={{ gap: spacing.lg }}>
            <TextField
              label={t('cust.name')}
              value={name}
              onChangeText={setName}
              placeholder={t('cust.nameHint')}
              icon="account-outline"
              autoCapitalize="words"
              required
              error={errors.name}
              autoFocus={!isEdit}
            />
            <TextField
              label={t('cust.phone')}
              value={phone}
              onChangeText={setPhone}
              placeholder={t('cust.phoneHint')}
              keyboardType="phone-pad"
              icon="whatsapp"
              hint={t('cust.addPhoneToWhatsapp')}
            />
            <TextField
              label={t('cust.address')}
              value={address}
              onChangeText={setAddress}
              icon="home-outline"
            />
            <View style={{ gap: 6 }}>
              <TextField
                label={t('cust.route')}
                value={route}
                onChangeText={setRoute}
                placeholder={t('cust.routeHint')}
                icon="map-marker-outline"
              />
              {routes.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {routes.map((r) => (
                    <Chip key={r} label={r} active={route === r} onPress={() => setRoute(r)} />
                  ))}
                </ScrollView>
              ) : null}
            </View>
          </Card>

          {/* Billing */}
          <Card style={{ gap: spacing.lg }}>
            <View>
              <Txt variant="subtitle" weight="700">
                {t('cust.billingType')}
              </Txt>
              <Txt variant="caption" muted style={{ marginTop: 1 }}>
                {billingType === 'daily' ? t('cust.billingDailySub') : t('cust.billingMonthlySub')}
              </Txt>
            </View>

            <Segmented
              value={billingType}
              onChange={setBillingType}
              options={[
                { value: 'daily', label: t('cust.billingDaily'), icon: 'cup' },
                { value: 'monthly', label: t('cust.billingMonthly'), icon: 'calendar-month' },
              ]}
            />

            <NumberField
              label={t('cust.defaultQty')}
              value={defaultQty}
              onChangeValue={setDefaultQty}
              suffix={t('unit.litre')}
              icon="beaker-outline"
            />

            {billingType === 'daily' ? (
              <>
                <NumberField
                  label={t('cust.rate')}
                  value={rate}
                  onChangeValue={setRate}
                  prefix={lang === 'ur' ? undefined : 'Rs'}
                  suffix={lang === 'ur' ? 'روپے' : undefined}
                  icon="cash"
                />
                {defaultQty > 0 && rate > 0 ? (
                  <View style={[styles.estimate, { backgroundColor: c.primarySoft }]}>
                    <MaterialCommunityIcons name="calculator-variant-outline" size={18} color={c.primary} />
                    <Txt variant="caption" weight="600" color={c.primary} style={{ flex: 1 }}>
                      {t('cust.thisMonthBill')} ≈ {money(monthlyEstimate)}
                    </Txt>
                  </View>
                ) : null}
              </>
            ) : (
              <NumberField
                label={t('cust.monthlyAmount')}
                value={monthlyAmount}
                onChangeValue={setMonthlyAmount}
                prefix={lang === 'ur' ? undefined : 'Rs'}
                suffix={lang === 'ur' ? 'روپے' : undefined}
                icon="cash-multiple"
                big
              />
            )}
          </Card>

          {/* Schedule */}
          <Card style={{ gap: spacing.lg }}>
            <Txt variant="subtitle" weight="700">
              {t('cust.schedule')}
            </Txt>
            <Segmented
              value={schedule}
              onChange={setSchedule}
              size="sm"
              options={[
                { value: 'daily', label: t('cust.scheduleDaily') },
                { value: 'alternate', label: t('cust.scheduleAlternate') },
                { value: 'custom', label: t('cust.scheduleCustom') },
              ]}
            />
            {schedule === 'custom' ? (
              <View style={styles.dayRow}>
                {WEEKDAY_ORDER.map((d) => {
                  const on = customDays.includes(d);
                  return (
                    <Pressable
                      key={d}
                      onPress={() =>
                        setCustomDays((prev) =>
                          prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
                        )
                      }
                      style={[
                        styles.dayPill,
                        {
                          backgroundColor: on ? c.primary : c.cardAlt,
                          borderColor: on ? c.primary : c.border,
                        },
                      ]}
                    >
                      <Txt variant="micro" weight="700" color={on ? c.onPrimary : c.textMuted} align="center">
                        {t(`day.${d}` as never)}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </Card>

          {/* Balance & status */}
          <Card style={{ gap: spacing.md }}>
            <NumberField
              label={t('cust.openingBalance')}
              hint={t('cust.openingBalanceHint')}
              value={openingBalance}
              onChangeValue={setOpeningBalance}
              prefix={lang === 'ur' ? undefined : 'Rs'}
              suffix={lang === 'ur' ? 'روپے' : undefined}
              icon="history"
            />
            <TextField label={t('common.notes')} value={notes} onChangeText={setNotes} multiline icon="note-outline" />
            <SwitchRow
              label={t('cust.markInactive')}
              sublabel={t('cust.markInactiveSub')}
              value={!active}
              onValueChange={(v) => setActive(!v)}
              icon="account-off-outline"
              iconColor={c.warning}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <FooterBar>
        <Button label={t('common.save')} icon="check" size="lg" full loading={saving} onPress={save} />
      </FooterBar>

      <ConfirmDialog
        visible={confirmDelete}
        title={t('cust.deleteQ', { name: customer?.name ?? '' })}
        message={t('cust.deleteWarn')}
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

const styles = StyleSheet.create({
  chipRow: { gap: spacing.sm, paddingVertical: 2 },
  estimate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  dayRow: { flexDirection: 'row', gap: 6 },
  dayPill: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
  },
});
