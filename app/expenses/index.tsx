import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';

import { ChartCard, DonutChart, RankedBars } from '@/components/charts';
import {
  AppHeader,
  Button,
  Card,
  EmptyState,
  FAB,
  ListRow,
  MonthStepper,
  Screen,
  SearchBar,
  StatTile,
  Txt,
} from '@/components/ui';
import { useExpenseCategories, useExpensesForMonth } from '@/data/hooks';
import { expenseBreakdown } from '@/features/stats';
import { useI18n } from '@/i18n';
import { formatDayLong, thisMonthKey } from '@/lib/dates';
import { spacing, useColors } from '@/theme';

export default function ExpensesScreen() {
  const c = useColors();
  const router = useRouter();
  const { t, money, num, lang } = useI18n();

  const [month, setMonth] = useState(thisMonthKey());
  const [search, setSearch] = useState('');

  const { data: expenses, loading } = useExpensesForMonth(month);
  const { data: categories } = useExpenseCategories();

  const catById = useMemo(() => new Map(categories.map((x) => [x.id, x])), [categories]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...expenses]
      .filter((e) => !q || e.title.toLowerCase().includes(q) || e.categoryName.toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }, [expenses, search]);

  const total = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const breakdown = useMemo(() => expenseBreakdown(expenses, categories), [expenses, categories]);
  const biggest = breakdown[0];

  return (
    <Screen padded={false} edges={['top']}>
      <AppHeader
        title={t('exp.title')}
        back
        actions={[{ icon: 'shape-outline', onPress: () => router.push('/expenses/categories') }]}
      />

      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
        <MonthStepper value={month} onChange={setMonth} />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <StatTile
            label={t('exp.thisMonthTotal')}
            value={money(total)}
            sub={`${num(expenses.length)} ${t('exp.title')}`}
            icon="cash-minus"
            tint={c.moneyOut}
            emphasis="solid"
          />
          {biggest ? (
            <StatTile
              label={t('rep.byExpense')}
              value={money(biggest.value)}
              sub={biggest.label}
              icon="chart-donut"
              tint={biggest.color}
            />
          ) : null}
        </View>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('common.searchHint')} />
      </View>

      <FlatList
        data={list}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          breakdown.length > 1 ? (
            <View style={{ gap: spacing.lg, marginBottom: spacing.lg }}>
              <ChartCard title={t('rep.byExpense')} subtitle={t('common.thisMonth')}>
                <DonutChart slices={breakdown} centerValue={money(total)} centerLabel={t('common.total')} />
              </ChartCard>
              <ChartCard title={t('rep.summary')}>
                <RankedBars
                  rows={breakdown.slice(0, 6).map((b) => ({ label: b.label, value: b.value, color: b.color }))}
                  formatValue={(v) => money(v)}
                />
              </ChartCard>
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="cash-minus"
              title={t('exp.emptyTitle')}
              subtitle={t('exp.emptySub')}
              action={
                <Button label={t('exp.add')} icon="plus" size="lg" onPress={() => router.push('/expenses/edit')} />
              }
            />
          )
        }
        renderItem={({ item, index }) => {
          const cat = catById.get(item.categoryId);
          return (
            <Card padded={false} style={index === 0 ? undefined : { marginTop: spacing.sm }}>
              <ListRow
                title={item.title || item.categoryName}
                subtitle={`${formatDayLong(item.date, lang)} · ${item.categoryName}`}
                icon={(cat?.icon as never) ?? 'cash'}
                iconColor={cat?.color ?? c.moneyOut}
                meta={money(item.amount)}
                metaColor={c.moneyOut}
                onPress={() => router.push(`/expenses/edit?id=${item.id}&date=${item.date}`)}
                chevron={false}
              />
            </Card>
          );
        }}
      />

      <FAB icon="plus" onPress={() => router.push('/expenses/edit')} />
    </Screen>
  );
}
