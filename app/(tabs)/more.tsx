import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Avatar, Badge, Card, ListCard, ListRow, SectionHeader, Txt } from '@/components/ui';
import { useCustomers, useExpensesForMonth, useSuppliers } from '@/data/hooks';
import { useAuth } from '@/data/AuthProvider';
import { useShop } from '@/data/ShopProvider';
import { useI18n } from '@/i18n';
import { thisMonthKey } from '@/lib/dates';
import { spacing, useColors } from '@/theme';

export default function MoreScreen() {
  const c = useColors();
  const router = useRouter();
  const { t, money, num } = useI18n();
  const { shop } = useShop();
  const { user } = useAuth();

  const { data: customers } = useCustomers();
  const { data: suppliers } = useSuppliers();
  const { data: expenses } = useExpensesForMonth(thisMonthKey());

  const spent = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const owedToSuppliers = useMemo(
    () => suppliers.reduce((s, x) => s + Math.max(0, x.balance), 0),
    [suppliers]
  );
  const toCollect = useMemo(
    () => customers.reduce((s, x) => s + Math.max(0, x.balance), 0),
    [customers]
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.huge }}
      showsVerticalScrollIndicator={false}
    >
      <Txt variant="display" weight="700">
        {t('nav.more')}
      </Txt>

      {/* Shop identity */}
      <Card style={[styles.shopCard, { marginTop: spacing.lg }]} onPress={() => router.push('/settings/shop')}>
        <Avatar name={shop?.name ?? 'MB'} size={52} icon="storefront" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt variant="subtitle" weight="700" numberOfLines={1}>
            {shop?.name ?? t('app.name')}
          </Txt>
          <Txt variant="caption" muted numberOfLines={1}>
            {shop?.phone || user?.email || t('set.shopSub')}
          </Txt>
        </View>
        <MaterialCommunityIcons name="pencil-outline" size={20} color={c.textFaint} />
      </Card>

      {/* Money */}
      <SectionHeader title={t('rep.summary')} icon="cash-multiple" style={{ marginTop: spacing.xxl }} />
      <ListCard>
        <ListRow
          title={t('khaata.title')}
          subtitle={t('khaata.subtitle')}
          icon="notebook-outline"
          iconColor={c.due}
          meta={money(toCollect)}
          metaColor={toCollect > 0 ? c.due : undefined}
          onPress={() => router.push('/(tabs)/khaata')}
        />
        <ListRow
          title={t('bill.title')}
          subtitle={t('bill.subtitle')}
          icon="receipt"
          iconColor="#7C3AED"
          onPress={() => router.push('/bill')}
        />
        <ListRow
          title={t('exp.title')}
          subtitle={t('exp.thisMonthTotal')}
          icon="cash-minus"
          iconColor={c.moneyOut}
          meta={money(spent)}
          onPress={() => router.push('/expenses')}
        />
        <ListRow
          title={t('sup.title')}
          subtitle={t('sup.subtitle')}
          icon="truck-delivery-outline"
          iconColor={c.accent}
          meta={owedToSuppliers > 0 ? money(owedToSuppliers) : undefined}
          metaColor={owedToSuppliers > 0 ? c.danger : undefined}
          onPress={() => router.push('/suppliers')}
        />
        <ListRow
          title={t('pur.title')}
          subtitle={t('pur.emptySub')}
          icon="cart-arrow-down"
          iconColor={c.info}
          onPress={() => router.push('/purchases/new')}
        />
        <ListRow
          title={t('rep.title')}
          subtitle={t('rep.summary')}
          icon="chart-box-outline"
          iconColor={c.primary}
          onPress={() => router.push('/reports')}
        />
      </ListCard>

      {/* Catalogue */}
      <SectionHeader title={t('set.categories')} icon="shape-outline" style={{ marginTop: spacing.xxl }} />
      <ListCard>
        <ListRow
          title={t('cat.title')}
          subtitle={t('cat.emptySub')}
          icon="shape"
          iconColor={c.accent}
          onPress={() => router.push('/categories')}
        />
        <ListRow
          title={t('prod.title')}
          subtitle={t('prod.emptySub')}
          icon="package-variant"
          iconColor={c.warning}
          onPress={() => router.push('/shop')}
        />
      </ListCard>

      {/* App */}
      <SectionHeader title={t('set.title')} icon="cog-outline" style={{ marginTop: spacing.xxl }} />
      <ListCard>
        <ListRow
          title={t('set.language')}
          subtitle={t('set.languageSub')}
          icon="translate"
          iconColor={c.primary}
          onPress={() => router.push('/settings/language')}
        />
        <ListRow
          title={t('set.security')}
          subtitle={t('set.pinSub')}
          icon="lock-outline"
          iconColor={c.danger}
          onPress={() => router.push('/settings/security')}
        />
        <ListRow
          title={t('set.backup')}
          subtitle={t('set.backupSub')}
          icon="cloud-download-outline"
          iconColor={c.info}
          onPress={() => router.push('/settings/backup')}
        />
        <ListRow
          title={t('set.title')}
          subtitle={t('set.appearance')}
          icon="cog"
          iconColor={c.textMuted}
          onPress={() => router.push('/settings')}
        />
      </ListCard>

      <View style={styles.tipRow}>
        <MaterialCommunityIcons name="lightbulb-on-outline" size={17} color={c.warning} />
        <Txt variant="caption" muted style={{ flex: 1 }}>
          {t('set.staffTip')}
        </Txt>
      </View>

      <View style={{ alignItems: 'center', marginTop: spacing.xxl, gap: 4 }}>
        <Badge label={`${t('set.version')} 1.0.0`} color={c.textMuted} />
        <Txt variant="micro" faint>
          {num(customers.length)} · {t('nav.customers')}
        </Txt>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  shopCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
});
