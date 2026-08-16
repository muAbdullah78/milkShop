import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AreaChart, ChartCard, DonutChart, DualBarChart } from '@/components/charts';
import {
  Avatar,
  Badge,
  BrandGradient,
  Card,
  ListRow,
  ProgressBar,
  SectionHeader,
  StatTile,
  Txt,
} from '@/components/ui';
import {
  useActiveCustomers,
  useCategories,
  useCustomers,
  useDeliveriesForDay,
  useDeliveriesForMonth,
  useExpensesForMonth,
  useInvoicesForMonth,
  useKhaataEntriesForMonth,
  useLowStockProducts,
  usePaymentsForMonth,
  useProducts,
  usePurchasesForMonth,
  useSalesForMonth,
} from '@/data/hooks';
import { useShop } from '@/data/ShopProvider';
import {
  customersWithDues,
  milkTrend,
  moneyTrend,
  salesByCategory,
  statsForDay,
  statsForMonth,
  topCustomersByMilk,
} from '@/features/stats';
import { usePlatform } from '@/data/PlatformProvider';
import { useMonthlyCatchUp } from '@/features/useMonthlyCatchUp';
import { useI18n } from '@/i18n';
import { greetingKey, isScheduledOn, thisMonthKey, todayKey } from '@/lib/dates';
import { radius, spacing, useColors } from '@/theme';
import { withAlpha } from '@/theme/colors';
import { useToast } from '@/components/ui';

export default function Dashboard() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, money, moneyShort, qty, num, lang } = useI18n();
  const { shop } = useShop();

  const today = todayKey();
  const month = thisMonthKey();

  const { data: customers } = useCustomers();
  const { data: activeCustomers } = useActiveCustomers();
  const { data: todayDeliveries } = useDeliveriesForDay(today);
  const { data: monthDeliveries } = useDeliveriesForMonth(month);
  const { data: sales } = useSalesForMonth(month);
  const { data: payments } = usePaymentsForMonth(month);
  const { data: expenses } = useExpensesForMonth(month);
  const { data: purchases } = usePurchasesForMonth(month);
  const { data: products } = useProducts();
  const { data: categories } = useCategories();
  const { data: khaataEntries } = useKhaataEntriesForMonth(month);
  const { data: invoices } = useInvoicesForMonth(month);
  const lowStock = useLowStockProducts();
  const { config: platform } = usePlatform();

  const toast = useToast();
  useMonthlyCatchUp(
    customers,
    useCallback(
      (count: number) => toast.show(t('khaata.autoPosted', { count: num(count) }), 'info'),
      [toast, t, num]
    )
  );

  const scheduledToday = useMemo(
    () => activeCustomers.filter((cu) => isScheduledOn(cu, today)),
    [activeCustomers, today]
  );

  const day = useMemo(
    () => statsForDay({ date: today, deliveries: todayDeliveries, sales, payments, expenses }),
    [today, todayDeliveries, sales, payments, expenses]
  );

  const monthStats = useMemo(
    () =>
      statsForMonth({
        month,
        deliveries: monthDeliveries,
        sales,
        payments,
        expenses,
        purchases,
        customers,
        khaataEntries,
        invoices,
      }),
    [month, monthDeliveries, sales, payments, expenses, purchases, customers, khaataEntries, invoices]
  );

  const trendMilk = useMemo(() => milkTrend(monthDeliveries, 7), [monthDeliveries]);
  const trendMoney = useMemo(
    () => moneyTrend({ deliveries: monthDeliveries, sales, payments, expenses }, 7),
    [monthDeliveries, sales, payments, expenses]
  );
  const byCategory = useMemo(() => salesByCategory(sales, products, categories), [sales, products, categories]);
  const topCustomers = useMemo(() => topCustomersByMilk(monthDeliveries, 4), [monthDeliveries]);
  const dues = useMemo(() => customersWithDues(customers, 4), [customers]);

  const markedIds = useMemo(() => new Set(todayDeliveries.map((d) => d.customerId)), [todayDeliveries]);
  const doneCount = scheduledToday.filter((cu) => markedIds.has(cu.id)).length;
  const roundProgress = scheduledToday.length > 0 ? doneCount / scheduledToday.length : 0;
  const roundDone = scheduledToday.length > 0 && doneCount === scheduledToday.length;

  const quickActions = [
    { icon: 'cart-plus' as const, label: t('dash.addSale'), color: c.primary, href: '/sale/new' },
    { icon: 'cash-plus' as const, label: t('dash.takePayment'), color: c.moneyIn, href: '/payment/new' },
    { icon: 'cash-minus' as const, label: t('dash.addExpense'), color: c.moneyOut, href: '/expenses/edit' },
    { icon: 'account-plus' as const, label: t('dash.addCustomer'), color: c.accent, href: '/customer/edit' },
    { icon: 'notebook-outline' as const, label: t('khaata.title'), color: c.due, href: '/(tabs)/khaata' },
    { icon: 'receipt' as const, label: t('dash.sendBills'), color: '#7C3AED', href: '/bill' },
    { icon: 'chart-box' as const, label: t('dash.viewReports'), color: c.info, href: '/reports' },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingBottom: spacing.huge }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <BrandGradient radiusOverride={0} style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Txt variant="caption" color={withAlpha('#FFFFFF', 0.78)}>
              {t(greetingKey())}
            </Txt>
            <Txt variant="title" weight="700" color="#FFFFFF" numberOfLines={1}>
              {shop?.name ?? t('app.name')}
            </Txt>
          </View>
          <Pressable
            onPress={() => router.push('/settings')}
            style={[styles.heroBtn, { backgroundColor: withAlpha('#FFFFFF', 0.16) }]}
          >
            <MaterialCommunityIcons name="cog-outline" size={21} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.heroStats}>
          <HeroStat
            label={t('dash.todayMilk')}
            value={`${qty(day.milkQty)} ${t('unit.litre.short')}`}
            icon="cup"
          />
          <View style={[styles.heroDivider, { backgroundColor: withAlpha('#FFFFFF', 0.2) }]} />
          <HeroStat label={t('dash.moneyIn')} value={moneyShort(day.cashIn)} icon="arrow-down-circle" />
          <View style={[styles.heroDivider, { backgroundColor: withAlpha('#FFFFFF', 0.2) }]} />
          <HeroStat label={t('dash.toCollect')} value={moneyShort(monthStats.outstanding)} icon="wallet-outline" />
        </View>
      </BrandGradient>

      {/* ── Milk round card ──────────────────────────────────────────────── */}
      <View style={styles.body}>
        {/* Announcement pushed from the admin console */}
        {platform?.announcement?.active && platform.announcement.title ? (
          <View
            style={[
              styles.announce,
              {
                backgroundColor:
                  platform.announcement.tone === 'warning'
                    ? c.warningSoft
                    : platform.announcement.tone === 'success'
                      ? c.successSoft
                      : c.infoSoft,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={
                platform.announcement.tone === 'warning'
                  ? 'alert-outline'
                  : platform.announcement.tone === 'success'
                    ? 'party-popper'
                    : 'bullhorn-outline'
              }
              size={20}
              color={
                platform.announcement.tone === 'warning'
                  ? c.warning
                  : platform.announcement.tone === 'success'
                    ? c.success
                    : c.info
              }
            />
            <View style={{ flex: 1 }}>
              <Txt variant="body" weight="700">
                {lang === 'ur' && platform.announcement.titleUr
                  ? platform.announcement.titleUr
                  : platform.announcement.title}
              </Txt>
              {platform.announcement.body || platform.announcement.bodyUr ? (
                <Txt variant="caption" muted style={{ marginTop: 1 }}>
                  {lang === 'ur' && platform.announcement.bodyUr
                    ? platform.announcement.bodyUr
                    : platform.announcement.body}
                </Txt>
              ) : null}
            </View>
          </View>
        ) : null}

        <Pressable onPress={() => router.push('/delivery')}>
          <Card style={[styles.roundCard, { borderColor: roundDone ? c.success : c.primary }]} level={2}>
            <View style={styles.roundTop}>
              <View
                style={[
                  styles.roundIcon,
                  { backgroundColor: roundDone ? c.successSoft : c.primarySoft },
                ]}
              >
                <MaterialCommunityIcons
                  name={roundDone ? 'check-decagram' : 'truck-fast-outline'}
                  size={26}
                  color={roundDone ? c.success : c.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="subtitle" weight="700">
                  {roundDone
                    ? t('dash.allDone')
                    : doneCount === 0
                      ? t('dash.notStarted')
                      : t('dash.deliveredToday', { done: num(doneCount), total: num(scheduledToday.length) })}
                </Txt>
                <Txt variant="caption" muted style={{ marginTop: 1 }}>
                  {roundDone
                    ? t('del.summary', { litres: qty(day.milkQty), count: num(day.deliveredCount) })
                    : t('del.pendingCount', { pending: num(scheduledToday.length - doneCount) })}
                </Txt>
              </View>
              <MaterialCommunityIcons
                name={lang === 'ur' ? 'chevron-left' : 'chevron-right'}
                size={24}
                color={c.textFaint}
              />
            </View>
            <ProgressBar
              progress={roundProgress}
              color={roundDone ? c.success : c.primary}
              height={9}
              style={{ marginTop: spacing.lg }}
            />
          </Card>
        </Pressable>

        {/* ── Month tiles ────────────────────────────────────────────────── */}
        <SectionHeader title={t('dash.thisMonth')} icon="calendar-month" style={{ marginTop: spacing.xxl }} />
        <View style={styles.tileRow}>
          <StatTile
            label={t('dash.moneyIn')}
            value={moneyShort(monthStats.collected)}
            sub={t('rep.collected')}
            icon="arrow-down-bold-circle"
            tint={c.moneyIn}
          />
          <StatTile
            label={t('dash.moneyOut')}
            value={moneyShort(monthStats.expenses + monthStats.purchases)}
            sub={t('rep.expense')}
            icon="arrow-up-bold-circle"
            tint={c.moneyOut}
          />
        </View>
        <View style={[styles.tileRow, { marginTop: spacing.md }]}>
          <StatTile
            label={monthStats.profit >= 0 ? t('dash.profit') : t('dash.loss')}
            value={moneyShort(Math.abs(monthStats.profit))}
            sub={t('rep.profitNote')}
            icon={monthStats.profit >= 0 ? 'trending-up' : 'trending-down'}
            tint={monthStats.profit >= 0 ? c.success : c.danger}
            emphasis="solid"
          />
          <StatTile
            label={t('rep.milkSold')}
            value={`${qty(monthStats.milkQty)} ${t('unit.litre.short')}`}
            sub={t('rep.avgDailyMilk') + ` · ${qty(monthStats.avgDailyMilk)}`}
            icon="cup"
            tint={c.primary}
          />
        </View>

        {/* ── Quick actions ──────────────────────────────────────────────── */}
        <SectionHeader title={t('dash.quickActions')} icon="lightning-bolt" style={{ marginTop: spacing.xxl }} />
        <View style={styles.actionGrid}>
          {quickActions.map((a) => (
            <Pressable
              key={a.label}
              onPress={() => router.push(a.href as never)}
              style={({ pressed }) => [
                styles.action,
                { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={[styles.actionIcon, { backgroundColor: withAlpha(a.color, 0.14) }]}>
                <MaterialCommunityIcons name={a.icon} size={23} color={a.color} />
              </View>
              <Txt variant="caption" weight="600" align="center" numberOfLines={2}>
                {a.label}
              </Txt>
            </Pressable>
          ))}
        </View>

        {/* ── Charts ─────────────────────────────────────────────────────── */}
        <ChartCard
          title={t('dash.milkTrend')}
          subtitle={t('dash.last7Days')}
          style={{ marginTop: spacing.xxl }}
          right={
            <Badge
              label={`${qty(trendMilk.reduce((s, p) => s + p.value, 0))} ${t('unit.litre.short')}`}
              color={c.primary}
            />
          }
        >
          <AreaChart data={trendMilk} height={150} />
        </ChartCard>

        <ChartCard
          title={t('dash.moneyTrend')}
          subtitle={t('dash.last7Days')}
          style={{ marginTop: spacing.lg }}
          right={
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Badge label={t('dash.moneyIn')} color={c.moneyIn} size="sm" />
              <Badge label={t('dash.moneyOut')} color={c.moneyOut} size="sm" />
            </View>
          }
        >
          <DualBarChart data={trendMoney} height={150} formatValue={(v) => moneyShort(v)} />
        </ChartCard>

        {byCategory.length > 0 ? (
          <ChartCard title={t('dash.salesByCategory')} subtitle={t('common.thisMonth')} style={{ marginTop: spacing.lg }}>
            <DonutChart
              slices={byCategory}
              centerValue={moneyShort(byCategory.reduce((s, x) => s + x.value, 0))}
              centerLabel={t('common.total')}
            />
          </ChartCard>
        ) : null}

        {/* ── Dues ───────────────────────────────────────────────────────── */}
        <SectionHeader
          title={t('dash.duesTitle')}
          subtitle={dues.length > 0 ? t('dash.duesSub') : undefined}
          icon="account-clock"
          actionLabel={dues.length > 0 ? t('common.viewAll') : undefined}
          onAction={() => router.push('/(tabs)/customers?filter=due')}
          style={{ marginTop: spacing.xxl }}
        />
        {dues.length === 0 ? (
          <Card style={styles.goodNews}>
            <MaterialCommunityIcons name="emoticon-happy-outline" size={26} color={c.success} />
            <Txt variant="body" weight="600" color={c.success} style={{ flex: 1 }}>
              {t('dash.noDues')}
            </Txt>
          </Card>
        ) : (
          <Card padded={false}>
            {dues.map((cu, i) => (
              <View key={cu.id}>
                {i > 0 ? <View style={[styles.sep, { backgroundColor: c.divider }]} /> : null}
                <ListRow
                  title={cu.name}
                  subtitle={cu.route || cu.address}
                  left={<Avatar name={cu.name} />}
                  meta={money(cu.balance)}
                  metaColor={c.due}
                  onPress={() => router.push(`/customer/${cu.id}`)}
                  chevron={false}
                />
              </View>
            ))}
          </Card>
        )}

        {/* ── Top customers ──────────────────────────────────────────────── */}
        {topCustomers.length > 0 ? (
          <>
            <SectionHeader
              title={t('dash.topCustomers')}
              subtitle={t('dash.topCustomersSub')}
              icon="trophy-outline"
              style={{ marginTop: spacing.xxl }}
            />
            <Card padded={false}>
              {topCustomers.map((tc, i) => (
                <View key={tc.customerId}>
                  {i > 0 ? <View style={[styles.sep, { backgroundColor: c.divider }]} /> : null}
                  <ListRow
                    title={tc.name}
                    subtitle={`${qty(tc.qty)} ${t('unit.litre.short')}`}
                    left={
                      <View style={[styles.rankBadge, { backgroundColor: i === 0 ? c.warningSoft : c.primarySoft }]}>
                        <Txt variant="body" weight="800" color={i === 0 ? c.warning : c.primary} role="numeric">
                          {num(i + 1)}
                        </Txt>
                      </View>
                    }
                    meta={money(tc.amount)}
                    onPress={() => router.push(`/customer/${tc.customerId}`)}
                    chevron={false}
                  />
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {/* ── Low stock ──────────────────────────────────────────────────── */}
        {lowStock.length > 0 ? (
          <>
            <SectionHeader
              title={t('dash.lowStock')}
              subtitle={t('dash.lowStockSub')}
              icon="alert-outline"
              style={{ marginTop: spacing.xxl }}
            />
            <Card padded={false}>
              {lowStock.slice(0, 4).map((p, i) => (
                <View key={p.id}>
                  {i > 0 ? <View style={[styles.sep, { backgroundColor: c.divider }]} /> : null}
                  <ListRow
                    title={p.name}
                    subtitle={p.stock <= 0 ? t('prod.outOfStock') : t('prod.lowStock')}
                    icon="package-variant"
                    iconColor={p.stock <= 0 ? c.danger : c.warning}
                    meta={`${qty(p.stock)} ${t(`unit.${p.unit}.short` as never)}`}
                    metaColor={p.stock <= 0 ? c.danger : c.warning}
                    onPress={() => router.push(`/products/edit?id=${p.id}`)}
                    chevron={false}
                  />
                </View>
              ))}
            </Card>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

function HeroStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <MaterialCommunityIcons name={icon} size={13} color={withAlpha('#FFFFFF', 0.7)} />
        <Txt variant="micro" color={withAlpha('#FFFFFF', 0.75)} numberOfLines={1}>
          {label}
        </Txt>
      </View>
      <Txt variant="amount" weight="800" color="#FFFFFF" numberOfLines={1} adjustsFontSizeToFit role="numeric">
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  heroDivider: { width: StyleSheet.hairlineWidth * 2, height: 30 },
  body: { paddingHorizontal: spacing.lg, marginTop: -spacing.md },
  announce: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.xl,
  },
  roundCard: { borderWidth: 1.5, marginTop: spacing.xl },
  roundTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  roundIcon: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  tileRow: { flexDirection: 'row', gap: spacing.md },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  action: {
    width: '30.5%',
    flexGrow: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  actionIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  goodNews: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sep: { height: StyleSheet.hairlineWidth, marginStart: spacing.lg + 58 },
  rankBadge: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
