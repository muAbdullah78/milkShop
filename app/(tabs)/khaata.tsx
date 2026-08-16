import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import {
  Avatar,
  Badge,
  Button,
  Chip,
  ConfirmDialog,
  EmptyState,
  Screen,
  SearchBar,
  Segmented,
  StatTile,
  Txt,
  useToast,
} from '@/components/ui';
import { useCustomers, useKhaataEntriesForMonth, usePaymentsForMonth } from '@/data/hooks';
import { khaataRepo } from '@/data/repo';
import { useShopId } from '@/data/ShopProvider';
import { daysSince, isKhaataOpen, khaataOverLimit } from '@/features/khaata';
import { useMonthlyCatchUp } from '@/features/useMonthlyCatchUp';
import { useI18n } from '@/i18n';
import { thisMonthKey } from '@/lib/dates';
import { radius, spacing, useColors } from '@/theme';
import { withAlpha } from '@/theme/colors';
import type { Customer } from '@/types/models';

type Tab = 'open' | 'none';
type Sort = 'due' | 'name' | 'quiet';

export default function KhaataScreen() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const shopId = useShopId();
  const { t, money, num } = useI18n();

  const { data: customers, loading } = useCustomers();
  const { data: entries } = useKhaataEntriesForMonth(thisMonthKey());
  const { data: payments } = usePaymentsForMonth(thisMonthKey());

  const [tab, setTab] = useState<Tab>('open');
  const [sort, setSort] = useState<Sort>('due');
  const [search, setSearch] = useState('');
  const [confirmOpen, setConfirmOpen] = useState<Customer | null>(null);
  const [busy, setBusy] = useState(false);

  useMonthlyCatchUp(
    customers,
    useCallback(
      (count: number) => toast.show(t('khaata.autoPosted', { count: num(count) }), 'info'),
      [toast, t, num]
    )
  );

  const lastActivity = useMemo(() => {
    const map = new Map<string, number>();
    const bump = (id: string, ts: number) => {
      const prev = map.get(id) ?? 0;
      if (ts > prev) map.set(id, ts);
    };
    entries.forEach((e) => bump(e.customerId, e.ts || e.createdAt));
    payments.forEach((p) => bump(p.customerId, p.createdAt));
    return map;
  }, [entries, payments]);

  const withKhaata = useMemo(() => customers.filter((cu) => isKhaataOpen(cu)), [customers]);
  const withoutKhaata = useMemo(() => customers.filter((cu) => !isKhaataOpen(cu)), [customers]);

  const list = useMemo(() => {
    const base = tab === 'open' ? withKhaata : withoutKhaata;
    const q = search.trim().toLowerCase();
    const filtered = base.filter(
      (cu) =>
        !q ||
        cu.name.toLowerCase().includes(q) ||
        (cu.phone ?? '').includes(q) ||
        (cu.route ?? '').toLowerCase().includes(q)
    );
    return filtered.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'quiet') {
        return (lastActivity.get(a.id) ?? 0) - (lastActivity.get(b.id) ?? 0);
      }
      return b.balance - a.balance;
    });
  }, [tab, withKhaata, withoutKhaata, search, sort, lastActivity]);

  const totals = useMemo(
    () => ({
      out: withKhaata.reduce((s, cu) => s + Math.max(0, cu.balance), 0),
      people: withKhaata.filter((cu) => cu.balance >= 1).length,
      overLimit: withKhaata.filter(khaataOverLimit).length,
      collected: payments.reduce((s, p) => s + p.amount, 0),
    }),
    [withKhaata, payments]
  );

  const openKhaata = async () => {
    if (!shopId || !confirmOpen) return;
    setBusy(true);
    try {
      await khaataRepo.open(shopId, confirmOpen.id);
      toast.success(t('khaata.opened'));
      const id = confirmOpen.id;
      setConfirmOpen(null);
      router.push(`/khaata/${id}`);
    } catch {
      toast.error(t('err.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md }}>
        <View>
          <Txt variant="display" weight="700" role="heading">
            {t('khaata.title')}
          </Txt>
          <Txt variant="caption" muted>
            {t('khaata.subtitle')}
          </Txt>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <StatTile
            label={t('khaata.totalUdhaar')}
            value={money(totals.out)}
            sub={t('khaata.peopleCount', { count: num(totals.people) })}
            icon="notebook-outline"
            tint={c.due}
            emphasis="solid"
          />
          <StatTile
            label={t('khaata.totalPaid')}
            value={money(totals.collected)}
            sub={t('common.thisMonth')}
            icon="cash-check"
            tint={c.success}
          />
        </View>

        {totals.overLimit > 0 ? (
          <View style={[styles.alert, { backgroundColor: c.dangerSoft }]}>
            <MaterialCommunityIcons name="alert-outline" size={19} color={c.danger} />
            <Txt variant="caption" weight="700" color={c.danger} style={{ flex: 1 }}>
              {t('khaata.overLimit')} · {num(totals.overLimit)}
            </Txt>
          </View>
        ) : null}

        <Segmented
          value={tab}
          onChange={setTab}
          size="sm"
          options={[
            { value: 'open', label: t('khaata.filterOpen'), icon: 'notebook' },
            { value: 'none', label: t('khaata.filterNone'), icon: 'notebook-outline' },
          ]}
        />

        <SearchBar value={search} onChangeText={setSearch} placeholder={t('cust.searchHint')} />

        {tab === 'open' ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Chip
              label={t('cust.sortDue')}
              icon="sort-numeric-descending"
              active={sort === 'due'}
              onPress={() => setSort('due')}
            />
            <Chip
              label={t('cust.sortName')}
              icon="sort-alphabetical-ascending"
              active={sort === 'name'}
              onPress={() => setSort('name')}
            />
            <Chip
              label={t('khaata.lastActivity')}
              icon="clock-outline"
              active={sort === 'quiet'}
              onPress={() => setSort('quiet')}
            />
          </View>
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
            <EmptyState
              icon="notebook-outline"
              title={tab === 'open' ? t('khaata.emptyTitle') : t('common.noResults')}
              subtitle={tab === 'open' ? t('khaata.emptySub') : undefined}
            />
          )
        }
        renderItem={({ item }) =>
          tab === 'open' ? (
            <KhaataRow
              customer={item}
              lastTs={lastActivity.get(item.id) ?? null}
              onPress={() => router.push(`/khaata/${item.id}`)}
              onAdd={() => router.push(`/khaata/entry?customerId=${item.id}`)}
            />
          ) : (
            <NoKhaataRow customer={item} onOpen={() => setConfirmOpen(item)} />
          )
        }
      />

      <ConfirmDialog
        visible={confirmOpen !== null}
        title={t('khaata.openQ', { name: confirmOpen?.name ?? '' })}
        message={t('khaata.openInfo')}
        confirmLabel={t('khaata.open')}
        cancelLabel={t('common.cancel')}
        loading={busy}
        onConfirm={openKhaata}
        onCancel={() => setConfirmOpen(null)}
      />
    </Screen>
  );
}

function KhaataRow({
  customer,
  lastTs,
  onPress,
  onAdd,
}: {
  customer: Customer;
  lastTs: number | null;
  onPress: () => void;
  onAdd: () => void;
}) {
  const c = useColors();
  const { t, money, num } = useI18n();
  const owes = customer.balance >= 1;
  const quiet = daysSince(lastTs);
  const over = khaataOverLimit(customer);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: c.card,
          borderColor: over ? withAlpha(c.danger, 0.45) : c.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Avatar name={customer.name} size={46} />

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Txt variant="bodyLg" weight="600" numberOfLines={1} style={{ flexShrink: 1 }}>
            {customer.name}
          </Txt>
          {over ? <Badge label={t('khaata.overLimit')} color={c.danger} size="sm" /> : null}
        </View>
        <Txt variant="micro" faint numberOfLines={1} style={{ marginTop: 1 }}>
          {customer.route ? `${customer.route} · ` : ''}
          {quiet === null
            ? t('khaata.noEntries')
            : quiet === 0
              ? t('common.today')
              : t('khaata.quiet', { days: num(quiet) })}
        </Txt>
        <Txt
          variant="amount"
          weight="800"
          color={owes ? c.due : c.success}
          role="numeric"
          style={{ marginTop: 2 }}
        >
          {owes ? money(customer.balance) : t('cust.balanceClear')}
        </Txt>
      </View>

      <Pressable onPress={onAdd} hitSlop={6} style={[styles.addBtn, { backgroundColor: c.primarySoft }]}>
        <MaterialCommunityIcons name="basket-plus-outline" size={21} color={c.primary} />
      </Pressable>
    </Pressable>
  );
}

function NoKhaataRow({ customer, onOpen }: { customer: Customer; onOpen: () => void }) {
  const c = useColors();
  const { t } = useI18n();
  return (
    <View style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
      <Avatar name={customer.name} size={46} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt variant="bodyLg" weight="600" numberOfLines={1}>
          {customer.name}
        </Txt>
        <Txt variant="micro" faint numberOfLines={1}>
          {t('khaata.notOpenSub')}
        </Txt>
      </View>
      <Button label={t('khaata.open')} icon="notebook-plus-outline" size="sm" variant="tonal" onPress={onOpen} />
    </View>
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
  addBtn: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
});
