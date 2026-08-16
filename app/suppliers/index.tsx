import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';

import {
  AppHeader,
  Avatar,
  Button,
  Card,
  EmptyState,
  FAB,
  ListRow,
  Screen,
  SearchBar,
  StatTile,
  Txt,
} from '@/components/ui';
import { usePurchasesForMonth, useSuppliers } from '@/data/hooks';
import { useI18n } from '@/i18n';
import { thisMonthKey } from '@/lib/dates';
import { spacing, useColors } from '@/theme';

export default function SuppliersScreen() {
  const c = useColors();
  const router = useRouter();
  const { t, money, num } = useI18n();

  const [search, setSearch] = useState('');
  const { data: suppliers, loading } = useSuppliers();
  const { data: purchases } = usePurchasesForMonth(thisMonthKey());

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers.filter(
      (s) => !q || s.name.toLowerCase().includes(q) || (s.phone ?? '').includes(q)
    );
  }, [suppliers, search]);

  const owed = useMemo(() => suppliers.reduce((s, x) => s + Math.max(0, x.balance), 0), [suppliers]);
  const bought = useMemo(() => purchases.reduce((s, p) => s + p.amount, 0), [purchases]);

  return (
    <Screen padded={false} edges={['top']}>
      <AppHeader title={t('sup.title')} subtitle={t('sup.subtitle')} back />

      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <StatTile
            label={t('sup.youOwe')}
            value={money(owed)}
            sub={`${num(suppliers.length)} ${t('sup.title')}`}
            icon="wallet-outline"
            tint={owed > 0 ? c.danger : c.success}
            emphasis="solid"
          />
          <StatTile
            label={t('pur.title')}
            value={money(bought)}
            sub={t('common.thisMonth')}
            icon="cart-arrow-down"
            tint={c.info}
          />
        </View>

        <Button
          label={t('pur.new')}
          icon="cart-plus"
          size="lg"
          full
          variant="tonal"
          onPress={() => router.push('/purchases/new')}
        />

        <SearchBar value={search} onChangeText={setSearch} placeholder={t('common.searchHint')} />
      </View>

      <FlatList
        data={list}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: spacing.sm }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="truck-delivery-outline"
              title={t('sup.emptyTitle')}
              subtitle={t('sup.emptySub')}
              action={
                <Button
                  label={t('sup.add')}
                  icon="plus"
                  size="lg"
                  onPress={() => router.push('/suppliers/edit')}
                />
              }
            />
          )
        }
        renderItem={({ item }) => (
          <Card padded={false}>
            <ListRow
              title={item.name}
              subtitle={item.phone || item.address}
              left={<Avatar name={item.name} size={46} icon="truck-delivery" />}
              meta={item.balance >= 1 ? money(item.balance) : t('sup.clear')}
              metaColor={item.balance >= 1 ? c.danger : c.success}
              metaSub={item.balance >= 1 ? t('sup.youOwe') : undefined}
              onPress={() => router.push(`/suppliers/${item.id}`)}
              chevron={false}
            />
          </Card>
        )}
      />

      <FAB icon="plus" onPress={() => router.push('/suppliers/edit')} />
    </Screen>
  );
}
