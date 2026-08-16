import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import {
  Avatar,
  Badge,
  Button,
  Chip,
  EmptyState,
  FAB,
  Screen,
  SearchBar,
  Segmented,
  Txt,
  useToast,
} from '@/components/ui';
import { useCustomers, useRoutes } from '@/data/hooks';
import { useShop } from '@/data/ShopProvider';
import { useI18n } from '@/i18n';
import { openWhatsApp } from '@/features/whatsapp';
import { buildReminderMessage } from '@/features/billText';
import { thisMonthKey } from '@/lib/dates';
import { radius, spacing, useColors } from '@/theme';
import { withAlpha } from '@/theme/colors';
import type { Customer } from '@/types/models';

type Filter = 'all' | 'due' | 'inactive';
type Sort = 'name' | 'due' | 'new';

export default function CustomersScreen() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ filter?: string }>();
  const { t, money, num, qty, lang } = useI18n();
  const { shop } = useShop();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>((params.filter as Filter) || 'all');
  const [sort, setSort] = useState<Sort>('name');
  const [route, setRoute] = useState<string | null>(null);

  const { data: customers, loading } = useCustomers();
  const routes = useRoutes();

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = customers.filter((cu) => {
      if (filter === 'due' && cu.balance < 1) return false;
      if (filter === 'inactive' && cu.active) return false;
      if (filter === 'all' && !cu.active) return false;
      if (route && (cu.route ?? '') !== route) return false;
      if (!q) return true;
      return (
        cu.name.toLowerCase().includes(q) ||
        (cu.phone ?? '').includes(q) ||
        (cu.route ?? '').toLowerCase().includes(q) ||
        (cu.address ?? '').toLowerCase().includes(q)
      );
    });

    return filtered.sort((a, b) => {
      if (sort === 'due') return b.balance - a.balance;
      if (sort === 'new') return b.createdAt - a.createdAt;
      return a.name.localeCompare(b.name);
    });
  }, [customers, search, filter, sort, route]);

  const totals = useMemo(
    () => ({
      count: customers.filter((cu) => cu.active).length,
      due: customers.reduce((s, cu) => s + Math.max(0, cu.balance), 0),
      dueCount: customers.filter((cu) => cu.balance >= 1).length,
    }),
    [customers]
  );

  const nudge = async (customer: Customer) => {
    if (!customer.phone) {
      toast.error(t('cust.addPhoneToWhatsapp'));
      return;
    }
    const message = buildReminderMessage(
      {
        customer,
        month: thisMonthKey(),
        milkQty: 0,
        milkAmount: 0,
        milkDays: 0,
        avgQty: 0,
        fixedAmount: 0,
        itemsAmount: 0,
        itemLines: [],
        previousBalance: 0,
        paidInMonth: 0,
        monthCharges: 0,
        total: customer.balance,
        deliveries: [],
        status: 'draft',
      },
      { lang, t: t as never, money, qty, shop }
    );
    const result = await openWhatsApp(customer.phone, message);
    if (result === 'no-number') toast.error(t('err.invalidPhone'));
    if (result === 'not-installed') toast.error(t('bill.noWhatsapp'));
  };

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md }}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Txt variant="display" weight="700">
              {t('cust.title')}
            </Txt>
            <Txt variant="caption" muted>
              {t(totals.count === 1 ? 'cust.count_one' : 'cust.count_other', { count: num(totals.count) })}
            </Txt>
          </View>
          <Pressable
            onPress={() => router.push('/bill')}
            style={[styles.headBtn, { backgroundColor: c.primarySoft }]}
          >
            <MaterialCommunityIcons name="receipt" size={20} color={c.primary} />
          </Pressable>
        </View>

        {totals.due > 0 ? (
          <Pressable
            onPress={() => setFilter(filter === 'due' ? 'all' : 'due')}
            style={[styles.dueBanner, { backgroundColor: c.dueSoft, borderColor: withAlpha(c.due, 0.3) }]}
          >
            <MaterialCommunityIcons name="wallet-outline" size={22} color={c.due} />
            <View style={{ flex: 1 }}>
              <Txt variant="caption" weight="600" color={c.due}>
                {t('dash.toCollect')}
              </Txt>
              <Txt variant="amount" weight="800" color={c.due} role="numeric">
                {money(totals.due)}
              </Txt>
            </View>
            <Badge label={num(totals.dueCount)} color={c.due} />
          </Pressable>
        ) : null}

        <SearchBar value={search} onChangeText={setSearch} placeholder={t('cust.searchHint')} />

        <Segmented
          value={filter}
          onChange={setFilter}
          size="sm"
          options={[
            { value: 'all', label: t('cust.filterAll'), icon: 'account-group-outline' },
            { value: 'due', label: t('cust.filterDue'), icon: 'wallet-outline' },
            { value: 'inactive', label: t('cust.filterInactive'), icon: 'account-off-outline' },
          ]}
        />

        <View style={styles.sortRow}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={
              [
                { key: 'name' as Sort, label: t('cust.sortName'), icon: 'sort-alphabetical-ascending' as const },
                { key: 'due' as Sort, label: t('cust.sortDue'), icon: 'sort-numeric-descending' as const },
                { key: 'new' as Sort, label: t('cust.sortNew'), icon: 'clock-outline' as const },
              ]
            }
            keyExtractor={(s) => s.key}
            contentContainerStyle={{ gap: spacing.sm }}
            renderItem={({ item }) => (
              <Chip label={item.label} icon={item.icon} active={sort === item.key} onPress={() => setSort(item.key)} />
            )}
          />
        </View>

        {routes.length > 0 ? (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[null, ...routes]}
            keyExtractor={(r) => r ?? '__all__'}
            contentContainerStyle={{ gap: spacing.sm, paddingBottom: 2 }}
            renderItem={({ item }) => (
              <Chip
                label={item ?? t('del.allRoutes')}
                icon={item ? 'map-marker-outline' : 'earth'}
                active={route === item}
                onPress={() => setRoute(route === item ? null : item)}
              />
            )}
          />
        ) : null}
      </View>

      <FlatList
        data={list}
        keyExtractor={(cu) => cu.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: spacing.sm }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          loading ? null : customers.length === 0 ? (
            <EmptyState
              icon="account-group-outline"
              title={t('cust.emptyTitle')}
              subtitle={t('cust.emptySub')}
              action={
                <Button
                  label={t('cust.addFirst')}
                  icon="account-plus"
                  size="lg"
                  onPress={() => router.push('/customer/edit')}
                />
              }
            />
          ) : (
            <EmptyState icon="magnify-close" title={t('common.noResults')} compact />
          )
        }
        renderItem={({ item }) => (
          <CustomerCard customer={item} onOpen={() => router.push(`/customer/${item.id}`)} onNudge={() => nudge(item)} />
        )}
      />

      <FAB icon="account-plus" onPress={() => router.push('/customer/edit')} />
    </Screen>
  );
}

function CustomerCard({
  customer,
  onOpen,
  onNudge,
}: {
  customer: Customer;
  onOpen: () => void;
  onNudge: () => void;
}) {
  const c = useColors();
  const { t, money, qty } = useI18n();

  const owes = customer.balance >= 1;
  const advance = customer.balance <= -1;
  const balanceColor = owes ? c.due : advance ? c.success : c.textFaint;

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.85 : customer.active ? 1 : 0.6 },
      ]}
    >
      <Avatar name={customer.name} size={48} />

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Txt variant="bodyLg" weight="600" numberOfLines={1} style={{ flexShrink: 1 }}>
            {customer.name}
          </Txt>
          {!customer.active ? <Badge label={t('common.inactive')} color={c.textMuted} size="sm" /> : null}
          {customer.billingType === 'monthly' ? (
            <Badge label={t('cust.billingMonthly')} color={c.accent} size="sm" />
          ) : null}
        </View>

        <View style={styles.metaRow}>
          {customer.route ? (
            <>
              <MaterialCommunityIcons name="map-marker-outline" size={12} color={c.textFaint} />
              <Txt variant="micro" faint numberOfLines={1}>
                {customer.route}
              </Txt>
              <Txt variant="micro" faint>
                ·
              </Txt>
            </>
          ) : null}
          <MaterialCommunityIcons name="cup-outline" size={12} color={c.textFaint} />
          <Txt variant="micro" faint numberOfLines={1}>
            {customer.billingType === 'monthly'
              ? money(customer.monthlyAmount)
              : `${qty(customer.defaultQty)} ${t('unit.litre.short')} · ${money(customer.rate)}`}
          </Txt>
        </View>

        <Txt variant="caption" weight="700" color={balanceColor} style={{ marginTop: 3 }} role="numeric">
          {owes
            ? `${t('cust.balanceDue')}: ${money(customer.balance)}`
            : advance
              ? `${t('cust.balanceAdvance')}: ${money(-customer.balance)}`
              : t('cust.balanceClear')}
        </Txt>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Pressable
          onPress={onNudge}
          hitSlop={6}
          style={[styles.waBtn, { backgroundColor: customer.phone ? '#25D366' : c.bgSunken }]}
        >
          <MaterialCommunityIcons
            name="whatsapp"
            size={21}
            color={customer.phone ? '#FFFFFF' : c.textFaint}
          />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headBtn: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  sortRow: { flexDirection: 'row' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  waBtn: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
