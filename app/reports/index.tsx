import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AreaChart, ChartCard, DonutChart, DualBarChart, RankedBars, SplitBar } from '@/components/charts';
import {
  AppHeader,
  Avatar,
  Badge,
  Card,
  EmptyState,
  ListRow,
  MiniStat,
  MonthStepper,
  Screen,
  SectionHeader,
  StatTile,
  Txt,
} from '@/components/ui';
import {
  useCategories,
  useCustomers,
  useDeliveriesForMonth,
  useExpenseCategories,
  useExpensesForMonth,
  useInvoicesForMonth,
  useKhaataEntriesForMonth,
  usePaymentsForMonth,
  useProducts,
  usePurchasesForMonth,
  useSalesForMonth,
} from '@/data/hooks';
import {
  customersWithDues,
  expenseBreakdown,
  milkTrend,
  moneyTrend,
  salesByCategory,
  statsForMonth,
  topCustomersByMilk,
  topProducts,
} from '@/features/stats';
import { useI18n } from '@/i18n';
import { formatMonthLong, monthRange, thisMonthKey } from '@/lib/dates';
import { spacing, useColors } from '@/theme';

export default function ReportsScreen() {
  const c = useColors();
  const router = useRouter();
  const { t, money, moneyShort, qty, num, lang } = useI18n();

  const [month, setMonth] = useState(thisMonthKey());

  const { data: customers } = useCustomers();
  const { data: deliveries } = useDeliveriesForMonth(month);
  const { data: sales } = useSalesForMonth(month);
  const { data: payments } = usePaymentsForMonth(month);
  const { data: expenses } = useExpensesForMonth(month);
  const { data: purchases } = usePurchasesForMonth(month);
  const { data: products } = useProducts();
  const { data: categories } = useCategories();
  const { data: expenseCats } = useExpenseCategories();
  const { data: khaataEntries } = useKhaataEntriesForMonth(month);
  const { data: invoices } = useInvoicesForMonth(month);

  const stats = useMemo(
    () =>
      statsForMonth({
        month,
        deliveries,
        sales,
        payments,
        expenses,
        purchases,
        customers,
        khaataEntries,
        invoices,
      }),
    [month, deliveries, sales, payments, expenses, purchases, customers, khaataEntries, invoices]
  );

  const trendMilk = useMemo(() => {
    const { days } = monthRange(month);
    const byDate = new Map<string, number>();
    deliveries.forEach((d) => {
      if (d.status !== 'delivered') return;
      byDate.set(d.date, (byDate.get(d.date) ?? 0) + d.qty);
    });
    return Array.from({ length: days }, (_, i) => {
      const key = `${month}-${String(i + 1).padStart(2, '0')}`;
      return { label: String(i + 1), value: Math.round((byDate.get(key) ?? 0) * 100) / 100 };
    });
  }, [deliveries, month]);

  const recentMoney = useMemo(
    () => moneyTrend({ deliveries, sales, payments, expenses }, 7),
    [deliveries, sales, payments, expenses]
  );
  const byCategory = useMemo(() => salesByCategory(sales, products, categories), [sales, products, categories]);
  const byExpense = useMemo(() => expenseBreakdown(expenses, expenseCats), [expenses, expenseCats]);
  const bestCustomers = useMemo(() => topCustomersByMilk(deliveries, 6), [deliveries]);
  const bestProducts = useMemo(() => topProducts(sales, 6), [sales]);
  const dues = useMemo(() => customersWithDues(customers, 6), [customers]);

  const hasData =
    deliveries.length > 0 || sales.length > 0 || expenses.length > 0 || payments.length > 0;

  return (
    <Screen padded={false} edges={['top']}>
      <AppHeader title={t('rep.title')} subtitle={formatMonthLong(month, lang)} back />

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <MonthStepper value={month} onChange={setMonth} />

        {!hasData ? (
          <EmptyState icon="chart-box-outline" title={t('rep.noData')} />
        ) : (
          <>
            {/* Headline */}
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <StatTile
                label={t('rep.income')}
                value={moneyShort(stats.earned)}
                sub={t('rep.collected') + ` ${moneyShort(stats.collected)}`}
                icon="arrow-down-bold-circle"
                tint={c.moneyIn}
              />
              <StatTile
                label={t('rep.expense')}
                value={moneyShort(stats.expenses + stats.purchases)}
                sub={`${t('pur.title')} ${moneyShort(stats.purchases)}`}
                icon="arrow-up-bold-circle"
                tint={c.moneyOut}
              />
            </View>

            <Card level={2}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View
                  style={[
                    styles.profitIcon,
                    { backgroundColor: stats.profit >= 0 ? c.successSoft : c.dangerSoft },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={stats.profit >= 0 ? 'trending-up' : 'trending-down'}
                    size={28}
                    color={stats.profit >= 0 ? c.success : c.danger}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="caption" muted>
                    {stats.profit >= 0 ? t('rep.netProfit') : t('rep.netLoss')}
                  </Txt>
                  <Txt
                    variant="amountXl"
                    weight="800"
                    color={stats.profit >= 0 ? c.success : c.danger}
                    role="numeric"
                  >
                    {money(Math.abs(stats.profit))}
                  </Txt>
                  <Txt variant="micro" faint>
                    {t('rep.profitNote')}
                  </Txt>
                </View>
              </View>

              <SplitBar
                parts={[
                  { value: Math.max(0, stats.earned - stats.expenses - stats.purchases), color: c.success },
                  { value: stats.expenses, color: c.moneyOut },
                  { value: stats.purchases, color: c.warning },
                ]}
                height={10}
                style={{ marginTop: spacing.lg }}
              />
              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
                <MiniStat label={t('rep.milkSold')} value={`${qty(stats.milkQty)} ${t('unit.litre.short')}`} />
                <MiniStat label={t('rep.avgDailyMilk')} value={`${qty(stats.avgDailyMilk)}`} />
                <MiniStat label={t('rep.outstanding')} value={money(stats.outstanding)} color={c.due} />
              </View>
            </Card>

            {/* Trends */}
            <ChartCard title={t('rep.dailyTrend')} subtitle={t('rep.milkSold')}>
              <AreaChart data={trendMilk} height={160} />
            </ChartCard>

            <ChartCard
              title={t('dash.moneyTrend')}
              subtitle={t('dash.last7Days')}
              right={
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Badge label={t('dash.moneyIn')} color={c.moneyIn} size="sm" />
                  <Badge label={t('dash.moneyOut')} color={c.moneyOut} size="sm" />
                </View>
              }
            >
              <DualBarChart data={recentMoney} height={150} formatValue={(v) => moneyShort(v)} />
            </ChartCard>

            {/* Breakdowns */}
            {byCategory.length > 0 ? (
              <ChartCard title={t('rep.byCategory')}>
                <DonutChart
                  slices={byCategory}
                  centerValue={moneyShort(byCategory.reduce((s, x) => s + x.value, 0))}
                  centerLabel={t('common.total')}
                />
              </ChartCard>
            ) : null}

            {byExpense.length > 0 ? (
              <ChartCard title={t('rep.byExpense')}>
                <RankedBars
                  rows={byExpense.map((b) => ({ label: b.label, value: b.value, color: b.color }))}
                  formatValue={(v) => money(v)}
                />
              </ChartCard>
            ) : null}

            {/* Best customers */}
            {bestCustomers.length > 0 ? (
              <>
                <SectionHeader title={t('rep.topCustomers')} icon="trophy-outline" />
                <Card padded={false}>
                  {bestCustomers.map((tc, i) => (
                    <View key={tc.customerId}>
                      {i > 0 ? <View style={[styles.sep, { backgroundColor: c.divider }]} /> : null}
                      <ListRow
                        title={tc.name}
                        subtitle={`${qty(tc.qty)} ${t('unit.litre.short')}`}
                        left={<Avatar name={tc.name} size={42} />}
                        meta={money(tc.amount)}
                        compact
                        chevron={false}
                        onPress={() => router.push(`/customer/${tc.customerId}`)}
                      />
                    </View>
                  ))}
                </Card>
              </>
            ) : null}

            {/* Best products */}
            {bestProducts.length > 0 ? (
              <>
                <SectionHeader title={t('rep.topProducts')} icon="package-variant" />
                <Card>
                  <RankedBars
                    rows={bestProducts.map((p) => ({
                      label: p.name,
                      value: p.total,
                      sub: `${qty(p.qty)}`,
                      color: c.primary,
                    }))}
                    formatValue={(v) => money(v)}
                  />
                </Card>
              </>
            ) : null}

            {/* Outstanding */}
            {dues.length > 0 ? (
              <>
                <SectionHeader
                  title={t('rep.outstanding')}
                  icon="wallet-outline"
                  actionLabel={t('common.viewAll')}
                  onAction={() => router.push('/(tabs)/customers?filter=due')}
                />
                <Card padded={false}>
                  {dues.map((cu, i) => (
                    <View key={cu.id}>
                      {i > 0 ? <View style={[styles.sep, { backgroundColor: c.divider }]} /> : null}
                      <ListRow
                        title={cu.name}
                        subtitle={cu.route}
                        left={<Avatar name={cu.name} size={42} />}
                        meta={money(cu.balance)}
                        metaColor={c.due}
                        compact
                        chevron={false}
                        onPress={() => router.push(`/customer/${cu.id}`)}
                      />
                    </View>
                  ))}
                </Card>
              </>
            ) : null}

            <Card style={{ gap: spacing.sm }}>
              <Txt variant="label" weight="700" muted>
                {t('rep.summary')}
              </Txt>
              <SummaryLine label={t('rep.milkSold')} value={`${qty(stats.milkQty)} ${t('unit.litre.short')}`} />
              <SummaryLine label={t('dash.todaySales')} value={money(stats.itemSales)} />
              <SummaryLine label={t('rep.collected')} value={money(stats.collected)} color={c.success} />
              <SummaryLine label={t('exp.title')} value={money(stats.expenses)} color={c.moneyOut} />
              <SummaryLine label={t('pur.title')} value={money(stats.purchases)} color={c.warning} />
              <SummaryLine
                label={t('rep.outstanding')}
                value={money(stats.outstanding)}
                color={c.due}
              />
              <SummaryLine
                label={`${num(customers.filter((x) => x.active).length)} ${t('nav.customers')}`}
                value={`${num(stats.milkDays)} ${t('bill.days', { count: '' }).trim()}`}
              />
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function SummaryLine({ label, value, color }: { label: string; value: string; color?: string }) {
  const c = useColors();
  return (
    <View style={[styles.summaryLine, { borderTopColor: c.divider }]}>
      <Txt variant="body" muted style={{ flex: 1 }} numberOfLines={1}>
        {label}
      </Txt>
      <Txt variant="body" weight="700" color={color} role="numeric">
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  profitIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sep: { height: StyleSheet.hairlineWidth, marginStart: spacing.lg + 54 },
  summaryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
