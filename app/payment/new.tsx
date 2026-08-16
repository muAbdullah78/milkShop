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
  SearchBar,
  Sheet,
  SwitchRow,
  TextField,
  Txt,
  useToast,
} from '@/components/ui';
import { useActiveCustomers } from '@/data/hooks';
import { paymentRepo } from '@/data/repo';
import { useShop, useShopId } from '@/data/ShopProvider';
import { buildPaymentThanksMessage } from '@/features/billText';
import { openWhatsApp } from '@/features/whatsapp';
import { useI18n } from '@/i18n';
import { todayKey } from '@/lib/dates';
import { radius, spacing, useColors } from '@/theme';
import type { Customer, PaymentMode } from '@/types/models';

const MODES: { value: PaymentMode; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { value: 'cash', icon: 'cash' },
  { value: 'easypaisa', icon: 'cellphone' },
  { value: 'jazzcash', icon: 'cellphone-wireless' },
  { value: 'bank', icon: 'bank' },
];

export default function NewPayment() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const shopId = useShopId();
  const { shop } = useShop();
  const { t, money, qty, lang } = useI18n();
  const params = useLocalSearchParams<{ customerId?: string }>();

  const { data: customers } = useActiveCustomers();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [amount, setAmount] = useState(0);
  const [mode, setMode] = useState<PaymentMode>('cash');
  const [date, setDate] = useState(todayKey());
  const [note, setNote] = useState('');
  const [sendThanks, setSendThanks] = useState(true);
  const [picking, setPicking] = useState(!params.customerId);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customer || !params.customerId || customers.length === 0) return;
    const found = customers.find((x) => x.id === params.customerId);
    if (found) {
      setCustomer(found);
      setAmount(Math.max(0, Math.round(found.balance)));
    }
  }, [customers, params.customerId, customer]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...customers].sort((a, b) => b.balance - a.balance);
    if (!q) return sorted;
    return sorted.filter((x) => x.name.toLowerCase().includes(q) || (x.phone ?? '').includes(q));
  }, [customers, search]);

  const after = customer ? Math.round((customer.balance - amount) * 100) / 100 : 0;

  const save = async () => {
    if (!shopId || !customer || amount <= 0) return;
    setSaving(true);
    try {
      await paymentRepo.create(shopId, { date, customer, amount, mode, note: note.trim() || undefined });
      toast.success(t('pay.saved'));

      if (sendThanks && customer.phone) {
        const message = buildPaymentThanksMessage(
          { amount, date, customerName: customer.name },
          after,
          { lang, t: t as never, money, qty, shop }
        );
        await openWhatsApp(customer.phone, message);
      }
      router.back();
    } catch {
      toast.error(t('err.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen padded={false} edges={['top']}>
      <AppHeader title={t('pay.take')} back />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => setPicking(true)}
            style={[styles.customerRow, { backgroundColor: c.card, borderColor: customer ? c.primary : c.border }]}
          >
            {customer ? (
              <Avatar name={customer.name} size={46} />
            ) : (
              <View style={[styles.placeholder, { backgroundColor: c.bgSunken }]}>
                <MaterialCommunityIcons name="account-search-outline" size={22} color={c.textMuted} />
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt variant="bodyLg" weight="600" numberOfLines={1}>
                {customer?.name ?? t('sale.pickCustomer')}
              </Txt>
              {customer ? (
                <Txt variant="caption" color={customer.balance >= 1 ? c.due : c.success} weight="600">
                  {t('pay.currentDue', { amount: money(customer.balance) })}
                </Txt>
              ) : null}
            </View>
            <MaterialCommunityIcons name="chevron-down" size={22} color={c.textFaint} />
          </Pressable>

          {customer ? (
            <>
              <Card style={{ gap: spacing.lg }}>
                <NumberField
                  label={t('pay.amount')}
                  value={amount}
                  onChangeValue={setAmount}
                  prefix={lang === 'ur' ? undefined : 'Rs'}
                  suffix={lang === 'ur' ? 'روپے' : undefined}
                  big
                  autoFocus
                  icon="cash-multiple"
                />

                {customer.balance > 0 ? (
                  <View style={styles.presetRow}>
                    <Chip
                      label={t('pay.payFull', { amount: money(customer.balance) })}
                      icon="check-all"
                      active={amount === Math.round(customer.balance)}
                      onPress={() => setAmount(Math.round(customer.balance))}
                    />
                    {[500, 1000, 2000, 5000].map((v) => (
                      <Chip key={v} label={money(v)} active={amount === v} onPress={() => setAmount(v)} />
                    ))}
                  </View>
                ) : null}

                <View style={[styles.afterBox, { backgroundColor: after > 0 ? c.dueSoft : c.successSoft }]}>
                  <MaterialCommunityIcons
                    name={after > 0 ? 'wallet-outline' : 'check-decagram'}
                    size={20}
                    color={after > 0 ? c.due : c.success}
                  />
                  <Txt variant="body" weight="700" color={after > 0 ? c.due : c.success} style={{ flex: 1 }}>
                    {after > 0
                      ? t('pay.afterPayment', { amount: money(after) })
                      : t('cust.balanceClear')}
                  </Txt>
                </View>
              </Card>

              <Card style={{ gap: spacing.lg }}>
                <View style={{ gap: spacing.sm }}>
                  <Txt variant="label" weight="600" muted>
                    {t('pay.mode')}
                  </Txt>
                  <View style={styles.presetRow}>
                    {MODES.map((m) => (
                      <Chip
                        key={m.value}
                        label={t(`sale.${m.value}` as never)}
                        icon={m.icon}
                        active={mode === m.value}
                        onPress={() => setMode(m.value)}
                      />
                    ))}
                  </View>
                </View>

                <DateRow label={t('common.date')} value={date} onChange={setDate} />

                <TextField label={t('common.note')} value={note} onChangeText={setNote} icon="note-outline" />

                <SwitchRow
                  label={t('pay.thanksMsg')}
                  value={sendThanks && Boolean(customer.phone)}
                  onValueChange={setSendThanks}
                  disabled={!customer.phone}
                  icon="whatsapp"
                  iconColor="#25D366"
                  sublabel={customer.phone ? undefined : t('cust.addPhoneToWhatsapp')}
                />
              </Card>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <FooterBar>
        <Button
          label={t('common.save')}
          icon="check"
          size="xl"
          full
          disabled={!customer || amount <= 0}
          loading={saving}
          onPress={save}
        />
      </FooterBar>

      <Sheet visible={picking} onClose={() => setPicking(false)} title={t('sale.pickCustomer')}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t('cust.searchHint')}
          style={{ marginBottom: spacing.md }}
        />
        {filtered.map((cu) => (
          <Pressable
            key={cu.id}
            onPress={() => {
              setCustomer(cu);
              setAmount(Math.max(0, Math.round(cu.balance)));
              setPicking(false);
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
            <Txt
              variant="caption"
              weight="700"
              color={cu.balance >= 1 ? c.due : c.textFaint}
              role="numeric"
            >
              {money(cu.balance)}
            </Txt>
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
  placeholder: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  afterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
});
