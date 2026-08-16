import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BillCard } from '@/components/BillCard';
import {
  AppHeader,
  Badge,
  Button,
  EmptyState,
  FooterBar,
  MonthStepper,
  Screen,
  SwitchRow,
  Txt,
  useToast,
} from '@/components/ui';
import {
  useCustomer,
  useCustomerDeliveries,
  useCustomerPayments,
  useCustomerSales,
  useInvoicesForMonth,
} from '@/data/hooks';
import { invoiceRepo } from '@/data/repo';
import { useLock } from '@/data/LockProvider';
import { useShop, useShopId } from '@/data/ShopProvider';
import { billImageName, shareBillPdf, shareViewAsImage } from '@/features/billExport';
import { buildBill } from '@/features/billing';
import { buildBillMessage } from '@/features/billText';
import { openWhatsApp } from '@/features/whatsapp';
import { useI18n } from '@/i18n';
import { thisMonthKey } from '@/lib/dates';
import { spacing, useColors } from '@/theme';

export default function BillDetail() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const shopId = useShopId();
  const { shop } = useShop();
  const { beginExternalAction } = useLock();
  const { t, money, qty, num, lang } = useI18n();
  const { customerId } = useLocalSearchParams<{ customerId: string }>();

  const [month, setMonth] = useState(thisMonthKey());
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [busy, setBusy] = useState<'text' | 'pdf' | 'image' | 'mark' | null>(null);
  const shotRef = useRef<View>(null);

  const { customer } = useCustomer(customerId);
  const { data: deliveries } = useCustomerDeliveries(customerId);
  const { data: sales } = useCustomerSales(customerId);
  const { data: payments } = useCustomerPayments(customerId);
  const { data: invoices } = useInvoicesForMonth(month);

  const invoice = useMemo(
    () => invoices.find((i) => i.customerId === customerId),
    [invoices, customerId]
  );

  const bill = useMemo(() => {
    if (!customer) return null;
    return buildBill({ customer, month, deliveries, sales, payments, invoice });
  }, [customer, month, deliveries, sales, payments, invoice]);

  if (!customer || !bill) {
    return (
      <Screen padded={false} edges={['top']}>
        <AppHeader title={t('bill.title')} back />
        <EmptyState icon="receipt" title={t('common.loading')} />
      </Screen>
    );
  }

  const ctx = { lang, t: t as never, money, qty, shop };
  const htmlCtx = { lang, money, qty, num, shop };

  const postCharge = () =>
    customer.billingType === 'monthly' && !invoice?.chargePosted ? customer.monthlyAmount || 0 : 0;

  const recordSent = async () => {
    if (!shopId) return;
    await invoiceRepo.markSent(shopId, {
      month,
      customer,
      milkQty: bill.milkQty,
      milkAmount: bill.milkAmount,
      milkDays: bill.milkDays,
      itemsAmount: bill.itemsAmount,
      previousBalance: bill.previousBalance,
      paidInMonth: bill.paidInMonth,
      total: bill.total,
      postFixedCharge: postCharge(),
    });
  };

  const sendText = async () => {
    setBusy('text');
    try {
      beginExternalAction();
      const result = await openWhatsApp(customer.phone, buildBillMessage(bill, ctx));
      if (result === 'no-number') {
        toast.error(t('cust.addPhoneToWhatsapp'));
        return;
      }
      if (result === 'not-installed') {
        toast.error(t('bill.noWhatsapp'));
        return;
      }
      await recordSent();
    } catch {
      toast.error(t('err.somethingWrong'));
    } finally {
      setBusy(null);
    }
  };

  const sendPdf = async () => {
    setBusy('pdf');
    try {
      beginExternalAction();
      const ok = await shareBillPdf(bill, htmlCtx, t('bill.sendPdf'), { includeBreakdown: showBreakdown });
      if (!ok) {
        toast.error(t('err.somethingWrong'));
        return;
      }
      await recordSent();
    } catch {
      toast.error(t('err.somethingWrong'));
    } finally {
      setBusy(null);
    }
  };

  const sendImage = async () => {
    setBusy('image');
    try {
      beginExternalAction();
      const ok = await shareViewAsImage(shotRef, billImageName(bill), t('bill.sendImage'));
      if (!ok) {
        toast.error(t('err.somethingWrong'));
        return;
      }
      await recordSent();
    } catch {
      toast.error(t('err.somethingWrong'));
    } finally {
      setBusy(null);
    }
  };

  const markSent = async () => {
    setBusy('mark');
    try {
      await recordSent();
      toast.success(t('bill.sent'));
    } catch {
      toast.error(t('err.saveFailed'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen padded={false} edges={['top']}>
      <AppHeader
        title={t('bill.forCustomer', { name: customer.name })}
        subtitle={bill.status === 'sent' ? t('bill.sent') : t('bill.notSent')}
        back
        actions={[
          { icon: 'account-details-outline', onPress: () => router.push(`/customer/${customer.id}`) },
        ]}
      />

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <MonthStepper value={month} onChange={setMonth} />

        {bill.status === 'sent' ? (
          <View style={[styles.sentBanner, { backgroundColor: c.successSoft }]}>
            <MaterialCommunityIcons name="check-circle" size={19} color={c.success} />
            <Txt variant="caption" weight="700" color={c.success} style={{ flex: 1 }}>
              {t('bill.sent')}
            </Txt>
            <Badge label={money(bill.total)} color={c.success} />
          </View>
        ) : null}

        {/* The captured view */}
        <View ref={shotRef} collapsable={false} style={{ backgroundColor: c.bg }}>
          <BillCard bill={bill} shop={shop} showBreakdown={showBreakdown} />
        </View>

        {bill.deliveries.some((d) => d.status === 'delivered') ? (
          <SwitchRow
            label={showBreakdown ? t('bill.hideBreakdown') : t('bill.showBreakdown')}
            value={showBreakdown}
            onValueChange={setShowBreakdown}
            icon="calendar-text-outline"
          />
        ) : null}

        <View style={{ gap: spacing.md }}>
          <Button
            label={t('bill.sendText')}
            icon="whatsapp"
            size="xl"
            full
            loading={busy === 'text'}
            disabled={busy !== null}
            onPress={sendText}
          />
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Button
              label={t('bill.sendPdf')}
              icon="file-pdf-box"
              variant="tonal"
              size="lg"
              style={{ flex: 1 }}
              loading={busy === 'pdf'}
              disabled={busy !== null}
              onPress={sendPdf}
            />
            <Button
              label={t('bill.sendImage')}
              icon="image-outline"
              variant="tonal"
              size="lg"
              style={{ flex: 1 }}
              loading={busy === 'image'}
              disabled={busy !== null}
              onPress={sendImage}
            />
          </View>
          {bill.status !== 'sent' ? (
            <Button
              label={t('bill.markSent')}
              icon="check"
              variant="outline"
              full
              loading={busy === 'mark'}
              disabled={busy !== null}
              onPress={markSent}
            />
          ) : null}
        </View>
      </ScrollView>

      <FooterBar>
        <View style={styles.footRow}>
          <View>
            <Txt variant="micro" muted>
              {t('bill.totalDue')}
            </Txt>
            <Txt variant="amountLg" weight="800" color={bill.total > 0 ? c.due : c.success} role="numeric">
              {money(bill.total)}
            </Txt>
          </View>
          <Button
            label={t('pay.take')}
            icon="cash-plus"
            variant="success"
            onPress={() => router.push(`/payment/new?customerId=${customer.id}`)}
          />
        </View>
      </FooterBar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 14,
  },
  footRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
});
