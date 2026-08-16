import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  Avatar,
  Badge,
  BrandGradient,
  Button,
  Card,
  EmptyState,
  ListRow,
  MiniStat,
  Screen,
  SectionHeader,
  Segmented,
  Txt,
  useToast,
} from '@/components/ui';
import {
  useCustomer,
  useCustomerDeliveries,
  useCustomerPayments,
  useCustomerSales,
} from '@/data/hooks';
import { useShop } from '@/data/ShopProvider';
import { buildReminderMessage } from '@/features/billText';
import { callNumber, openWhatsApp } from '@/features/whatsapp';
import { useI18n } from '@/i18n';
import { formatDayLong, formatMonthLong, thisMonthKey } from '@/lib/dates';
import { radius, spacing, useColors } from '@/theme';
import { withAlpha } from '@/theme/colors';

type Tab = 'milk' | 'items' | 'payments';

export default function CustomerDetail() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, money, qty, num, lang } = useI18n();
  const { shop } = useShop();

  const { customer, loading } = useCustomer(id);
  const { data: deliveries } = useCustomerDeliveries(id);
  const { data: sales } = useCustomerSales(id);
  const { data: payments } = useCustomerPayments(id);

  const [tab, setTab] = useState<Tab>('milk');
  const month = thisMonthKey();

  const monthStats = useMemo(() => {
    const md = deliveries.filter((d) => d.month === month && d.status === 'delivered');
    const ms = sales.filter((s) => s.month === month);
    const mp = payments.filter((p) => p.month === month);
    return {
      milkQty: md.reduce((s, d) => s + d.qty, 0),
      milkAmount: md.reduce((s, d) => s + d.amount, 0),
      days: md.length,
      items: ms.reduce((s, x) => s + x.total, 0),
      paid: mp.reduce((s, p) => s + p.amount, 0),
    };
  }, [deliveries, sales, payments, month]);

  const lastPayment = useMemo(
    () => [...payments].sort((a, b) => b.createdAt - a.createdAt)[0],
    [payments]
  );

  const history = useMemo(() => {
    if (tab === 'milk') {
      return [...deliveries]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 60)
        .map((d) => ({
          key: d.id,
          title: formatDayLong(d.date, lang),
          subtitle:
            d.status === 'delivered'
              ? `${qty(d.qty)} ${t('unit.litre.short')} × ${money(d.rate)}`
              : t('del.skipped'),
          meta: d.status === 'delivered' && d.amount > 0 ? money(d.amount) : '—',
          metaColor: d.status === 'delivered' ? undefined : c.textFaint,
          icon: d.status === 'delivered' ? ('cup' as const) : ('cup-off-outline' as const),
          iconColor: d.status === 'delivered' ? c.primary : c.textFaint,
        }));
    }
    if (tab === 'items') {
      return [...sales]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 60)
        .map((s) => ({
          key: s.id,
          title: s.items.map((i) => i.name).join(', ') || t('sale.title'),
          subtitle: `${formatDayLong(s.date, lang)} · ${s.onCredit ? t('sale.credit') : t('sale.payNow')}`,
          meta: money(s.total),
          metaColor: undefined,
          icon: 'basket-outline' as const,
          iconColor: c.accent,
        }));
    }
    return [...payments]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 60)
      .map((p) => ({
        key: p.id,
        title: money(p.amount),
        subtitle: `${formatDayLong(p.date, lang)} · ${t(`sale.${p.mode}` as never)}`,
        meta: '',
        metaColor: undefined,
        icon: 'cash-check' as const,
        iconColor: c.success,
      }));
  }, [tab, deliveries, sales, payments, lang, qty, money, t, c]);

  if (!customer) {
    return (
      <Screen>
        {loading ? null : <EmptyState icon="account-question-outline" title={t('common.noResults')} />}
      </Screen>
    );
  }

  const owes = customer.balance >= 1;
  const advance = customer.balance <= -1;

  const nudge = async () => {
    const message = buildReminderMessage(
      {
        customer,
        month,
        milkQty: monthStats.milkQty,
        milkAmount: monthStats.milkAmount,
        milkDays: monthStats.days,
        avgQty: 0,
        fixedAmount: 0,
        itemsAmount: monthStats.items,
        itemLines: [],
        previousBalance: 0,
        paidInMonth: monthStats.paid,
        monthCharges: 0,
        total: customer.balance,
        deliveries: [],
        status: 'draft',
      },
      { lang, t: t as never, money, qty, shop }
    );
    const res = await openWhatsApp(customer.phone, message);
    if (res === 'no-number') toast.error(t('cust.addPhoneToWhatsapp'));
    if (res === 'not-installed') toast.error(t('bill.noWhatsapp'));
  };

  return (
    <Screen padded={false} edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.huge }}>
        <BrandGradient radiusOverride={0} style={styles.hero}>
          <View style={styles.heroNav}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.heroBtn}>
              <MaterialCommunityIcons name={lang === 'ur' ? 'chevron-right' : 'chevron-left'} size={24} color="#FFF" />
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={() => router.push(`/customer/edit?id=${customer.id}`)}
              hitSlop={10}
              style={styles.heroBtn}
            >
              <MaterialCommunityIcons name="pencil-outline" size={20} color="#FFF" />
            </Pressable>
          </View>

          <View style={{ alignItems: 'center', marginTop: spacing.md }}>
            <Avatar name={customer.name} size={74} color="#FFFFFF" style={{ backgroundColor: withAlpha('#FFFFFF', 0.2) }} />
            <Txt variant="title" weight="700" color="#FFFFFF" align="center" style={{ marginTop: spacing.md }}>
              {customer.name}
            </Txt>
            <View style={styles.heroMeta}>
              {customer.route ? (
                <Badge label={customer.route} color="#FFFFFF" bg={withAlpha('#FFFFFF', 0.2)} icon="map-marker" size="sm" />
              ) : null}
              <Badge
                label={customer.billingType === 'monthly' ? t('cust.billingMonthly') : t('cust.billingDaily')}
                color="#FFFFFF"
                bg={withAlpha('#FFFFFF', 0.2)}
                size="sm"
              />
            </View>
          </View>
        </BrandGradient>

        <View style={{ paddingHorizontal: spacing.lg, marginTop: -spacing.xxl }}>
          {/* Balance */}
          <Card level={2} style={{ alignItems: 'center' }}>
            <Txt variant="caption" muted>
              {owes ? t('cust.balanceDue') : advance ? t('cust.balanceAdvance') : t('cust.balanceClear')}
            </Txt>
            <Txt
              variant="amountXl"
              weight="800"
              color={owes ? c.due : advance ? c.success : c.text}
              role="numeric"
              style={{ marginTop: 2 }}
            >
              {money(Math.abs(customer.balance))}
            </Txt>

            <View style={styles.actionRow}>
              <QuickAction
                icon="whatsapp"
                label={t('common.whatsapp')}
                color="#25D366"
                onPress={nudge}
                disabled={!customer.phone}
              />
              <QuickAction
                icon="phone"
                label={t('common.call')}
                color={c.info}
                onPress={() => callNumber(customer.phone)}
                disabled={!customer.phone}
              />
              <QuickAction
                icon="cash-plus"
                label={t('pay.take')}
                color={c.success}
                onPress={() => router.push(`/payment/new?customerId=${customer.id}`)}
              />
              <QuickAction
                icon="cart-plus"
                label={t('sale.new')}
                color={c.primary}
                onPress={() => router.push(`/sale/new?customerId=${customer.id}`)}
              />
              <QuickAction
                icon="receipt"
                label={t('bill.title')}
                color="#7C3AED"
                onPress={() => router.push(`/bill/${customer.id}`)}
              />
            </View>
          </Card>

          {/* This month */}
          <SectionHeader
            title={formatMonthLong(month, lang)}
            icon="calendar-month"
            style={{ marginTop: spacing.xxl }}
          />
          <Card>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <MiniStat
                label={t('cust.thisMonthMilk')}
                value={`${qty(monthStats.milkQty)} ${t('unit.litre.short')}`}
              />
              <MiniStat label={t('bill.days')} value={num(monthStats.days)} />
              <MiniStat label={t('bill.paidThisMonth')} value={money(monthStats.paid)} color={c.success} />
            </View>
            <View style={[styles.hr, { backgroundColor: c.divider }]} />
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <MiniStat label={t('bill.milkLine').split(':')[0]} value={money(monthStats.milkAmount)} />
              <MiniStat label={t('bill.itemsLine')} value={money(monthStats.items)} />
              <MiniStat
                label={t('cust.lastPayment')}
                value={lastPayment ? money(lastPayment.amount) : t('cust.noPayments')}
              />
            </View>
          </Card>

          {/* Contact */}
          {customer.phone || customer.address || customer.notes ? (
            <Card style={{ marginTop: spacing.lg, gap: spacing.md }}>
              {customer.phone ? <InfoLine icon="phone-outline" text={customer.phone} /> : null}
              {customer.address ? <InfoLine icon="home-outline" text={customer.address} /> : null}
              {customer.notes ? <InfoLine icon="note-outline" text={customer.notes} /> : null}
              <InfoLine
                icon="calendar-plus"
                text={t('cust.since', { date: formatDayLong(new Date(customer.createdAt).toISOString().slice(0, 10), lang) })}
              />
            </Card>
          ) : null}

          {/* History */}
          <SectionHeader title={t('cust.detailHistory')} icon="history" style={{ marginTop: spacing.xxl }} />
          <Segmented
            value={tab}
            onChange={setTab}
            size="sm"
            options={[
              { value: 'milk', label: t('cust.detailMilk'), icon: 'cup' },
              { value: 'items', label: t('cust.detailItems'), icon: 'basket-outline' },
              { value: 'payments', label: t('cust.detailPayments'), icon: 'cash-check' },
            ]}
          />

          <Card padded={false} style={{ marginTop: spacing.md }}>
            {history.length === 0 ? (
              <EmptyState icon="clipboard-text-outline" title={t('rep.noData')} compact />
            ) : (
              history.map((h, i) => (
                <View key={h.key}>
                  {i > 0 ? <View style={[styles.sep, { backgroundColor: c.divider }]} /> : null}
                  <ListRow
                    title={h.title}
                    subtitle={h.subtitle}
                    icon={h.icon}
                    iconColor={h.iconColor}
                    meta={h.meta || undefined}
                    metaColor={h.metaColor}
                    compact
                    chevron={false}
                  />
                </View>
              ))
            )}
          </Card>

          <Button
            label={t('bill.sendWhatsapp')}
            icon="whatsapp"
            size="lg"
            full
            variant="tonal"
            onPress={() => router.push(`/bill/${customer.id}`)}
            style={{ marginTop: spacing.xl }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function QuickAction({
  icon,
  label,
  color,
  onPress,
  disabled,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.quickAction, { opacity: disabled ? 0.35 : pressed ? 0.6 : 1 }]}
    >
      <View style={[styles.quickIcon, { backgroundColor: withAlpha(color, 0.14) }]}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>
      <Txt variant="micro" weight="600" align="center" numberOfLines={1}>
        {label}
      </Txt>
    </Pressable>
  );
}

function InfoLine({ icon, text }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <MaterialCommunityIcons name={icon} size={18} color={c.textFaint} />
      <Txt variant="body" style={{ flex: 1 }}>
        {text}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: 52, paddingHorizontal: spacing.lg, paddingBottom: spacing.huge },
  heroNav: { flexDirection: 'row', alignItems: 'center' },
  heroBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMeta: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xl,
    alignSelf: 'stretch',
  },
  quickAction: { flex: 1, alignItems: 'center', gap: 5 },
  quickIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  hr: { height: StyleSheet.hairlineWidth, marginVertical: spacing.lg },
  sep: { height: StyleSheet.hairlineWidth, marginStart: spacing.lg + 50 },
});
