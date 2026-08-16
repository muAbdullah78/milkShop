import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import {
  AppHeader,
  Avatar,
  Badge,
  Button,
  Chip,
  EmptyState,
  MonthStepper,
  ProgressBar,
  Screen,
  SearchBar,
  StatTile,
  Txt,
  useToast,
} from '@/components/ui';
import {
  useCustomers,
  useDeliveriesForMonth,
  useInvoicesForMonth,
  usePaymentsForMonth,
  useSalesForMonth,
} from '@/data/hooks';
import { useLock } from '@/data/LockProvider';
import { invoiceRepo } from '@/data/repo';
import { useShop, useShopId } from '@/data/ShopProvider';
import { billTotals, buildAllBills } from '@/features/billing';
import { buildBillMessage } from '@/features/billText';
import { openWhatsApp } from '@/features/whatsapp';
import { useI18n } from '@/i18n';
import { thisMonthKey } from '@/lib/dates';
import { radius, spacing, useColors } from '@/theme';
import type { BillSummary } from '@/types/models';

type Filter = 'all' | 'unsent' | 'due';

export default function BillsScreen() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const shopId = useShopId();
  const { shop } = useShop();
  const { beginExternalAction } = useLock();
  const { t, money, qty, num, lang } = useI18n();

  const [month, setMonth] = useState(thisMonthKey());
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sendingId, setSendingId] = useState<string | null>(null);

  const { data: customers, loading } = useCustomers();
  const { data: deliveries } = useDeliveriesForMonth(month);
  const { data: sales } = useSalesForMonth(month);
  const { data: payments } = usePaymentsForMonth(month);
  const { data: invoices } = useInvoicesForMonth(month);

  const bills = useMemo(
    () => buildAllBills({ customers, month, deliveries, sales, payments, invoices }),
    [customers, month, deliveries, sales, payments, invoices]
  );

  const totals = useMemo(() => billTotals(bills), [bills]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bills.filter((b) => {
      if (filter === 'unsent' && b.status === 'sent') return false;
      if (filter === 'due' && b.total < 1) return false;
      if (!q) return true;
      return b.customer.name.toLowerCase().includes(q) || (b.customer.route ?? '').toLowerCase().includes(q);
    });
  }, [bills, search, filter]);

  const sendOne = async (bill: BillSummary) => {
    if (!shopId) return;
    setSendingId(bill.customer.id);
    try {
      beginExternalAction();
      const result = await openWhatsApp(
        bill.customer.phone,
        buildBillMessage(bill, { lang, t: t as never, money, qty, shop })
      );
      if (result === 'no-number') {
        toast.error(t('cust.addPhoneToWhatsapp'));
        return;
      }
      if (result === 'not-installed') {
        toast.error(t('bill.noWhatsapp'));
        return;
      }
      await invoiceRepo.markSent(shopId, {
        month,
        customer: bill.customer,
        milkQty: bill.milkQty,
        milkAmount: bill.milkAmount,
        milkDays: bill.milkDays,
        itemsAmount: bill.itemsAmount,
        previousBalance: bill.previousBalance,
        paidInMonth: bill.paidInMonth,
        total: bill.total,
        postFixedCharge:
          bill.customer.billingType === 'monthly' && bill.status !== 'sent'
            ? bill.customer.monthlyAmount || 0
            : 0,
      });
    } catch {
      toast.error(t('err.somethingWrong'));
    } finally {
      setSendingId(null);
    }
  };

  const sentProgress = totals.count > 0 ? totals.sent / totals.count : 0;

  return (
    <Screen padded={false} edges={['top']}>
      <AppHeader title={t('bill.title')} subtitle={t('bill.subtitle')} back />

      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
        <MonthStepper value={month} onChange={setMonth} />

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <StatTile
            label={t('bill.totalToCollect')}
            value={money(totals.toCollect)}
            sub={t('bill.readyCount', { count: num(totals.count) })}
            icon="wallet-outline"
            tint={c.due}
            emphasis="solid"
          />
          <StatTile
            label={t('bill.sent')}
            value={`${num(totals.sent)} / ${num(totals.count)}`}
            sub={t('rep.milkSold') + ` ${qty(totals.milkQty)} ${t('unit.litre.short')}`}
            icon="check-circle-outline"
            tint={c.success}
          />
        </View>

        {totals.count > 0 ? <ProgressBar progress={sentProgress} color={c.success} /> : null}

        <SearchBar value={search} onChangeText={setSearch} placeholder={t('cust.searchHint')} />

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Chip label={t('common.all')} active={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip
            label={t('bill.notSent')}
            icon="send-clock-outline"
            active={filter === 'unsent'}
            onPress={() => setFilter('unsent')}
            count={totals.count - totals.sent}
          />
          <Chip
            label={t('cust.filterDue')}
            icon="wallet-outline"
            active={filter === 'due'}
            onPress={() => setFilter('due')}
          />
        </View>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(b) => b.customer.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: spacing.sm }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          loading ? null : (
            <EmptyState icon="receipt" title={t('bill.emptyTitle')} subtitle={t('bill.emptySub')} />
          )
        }
        renderItem={({ item }) => (
          <BillRow
            bill={item}
            sending={sendingId === item.customer.id}
            onSend={() => sendOne(item)}
            onOpen={() => router.push(`/bill/${item.customer.id}`)}
          />
        )}
        ListFooterComponent={
          visible.length > 0 ? (
            <View style={styles.footerNote}>
              <MaterialCommunityIcons name="information-outline" size={15} color={c.textFaint} />
              <Txt variant="micro" faint style={{ flex: 1 }}>
                {t('bill.sendAllSub', { count: num(visible.filter((b) => b.status !== 'sent').length) })}
              </Txt>
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

function BillRow({
  bill,
  sending,
  onSend,
  onOpen,
}: {
  bill: BillSummary;
  sending: boolean;
  onSend: () => void;
  onOpen: () => void;
}) {
  const c = useColors();
  const { t, money, qty, num } = useI18n();
  const sent = bill.status === 'sent';

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: c.card,
          borderColor: sent ? c.border : c.borderStrong,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Avatar name={bill.customer.name} size={46} />

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Txt variant="bodyLg" weight="600" numberOfLines={1} style={{ flexShrink: 1 }}>
            {bill.customer.name}
          </Txt>
          {sent ? <Badge label={t('bill.sent')} color={c.success} size="sm" icon="check" /> : null}
        </View>
        <Txt variant="micro" muted numberOfLines={1} style={{ marginTop: 2 }}>
          {bill.customer.billingType === 'monthly'
            ? t('bill.fixedLine')
            : `${qty(bill.milkQty)} ${t('unit.litre.short')} · ${t('bill.days', { count: num(bill.milkDays) })}`}
          {bill.itemsAmount > 0 ? ` · ${t('bill.itemsLine')} ${money(bill.itemsAmount)}` : ''}
        </Txt>
        <Txt
          variant="amount"
          weight="800"
          color={bill.total > 0 ? c.due : c.success}
          role="numeric"
          style={{ marginTop: 2 }}
        >
          {money(bill.total)}
        </Txt>
      </View>

      <Button
        label=""
        icon="whatsapp"
        variant={sent ? 'outline' : 'primary'}
        size="md"
        loading={sending}
        onPress={onSend}
        style={styles.sendBtn}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  sendBtn: { width: 52, paddingHorizontal: 0 },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
});
