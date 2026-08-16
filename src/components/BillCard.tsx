import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BrandGradient, Txt } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatDayShort, formatMonthLong } from '@/lib/dates';
import { radius, spacing, useColors } from '@/theme';
import { withAlpha } from '@/theme/colors';
import type { BillSummary, Shop } from '@/types/models';

/**
 * On-screen bill. This exact view is what gets captured for
 * "send the bill as a picture", so it has to look finished on its own —
 * shop header, line items, total, and a thank-you.
 */
export function BillCard({
  bill,
  shop,
  showBreakdown,
}: {
  bill: BillSummary;
  shop: Shop | null;
  showBreakdown?: boolean;
}) {
  const c = useColors();
  const { t, money, qty, num, lang } = useI18n();

  const delivered = bill.deliveries.filter((d) => d.status === 'delivered' && d.qty > 0);

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <BrandGradient radiusOverride={0} style={styles.head}>
        <Txt variant="title" weight="800" color="#FFFFFF" numberOfLines={2}>
          {shop?.name ?? t('app.name')}
        </Txt>
        {shop?.address ? (
          <Txt variant="micro" color={withAlpha('#FFFFFF', 0.82)} numberOfLines={2}>
            {shop.address}
          </Txt>
        ) : null}
        {shop?.phone ? (
          <Txt variant="micro" color={withAlpha('#FFFFFF', 0.82)}>
            {shop.phone}
          </Txt>
        ) : null}
        <View style={[styles.tag, { backgroundColor: withAlpha('#FFFFFF', 0.2) }]}>
          <MaterialCommunityIcons name="receipt" size={12} color="#FFFFFF" />
          <Txt variant="micro" weight="800" color="#FFFFFF">
            {t('bill.title')}
          </Txt>
        </View>
      </BrandGradient>

      <View style={styles.who}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt variant="subtitle" weight="700" numberOfLines={1}>
            {bill.customer.name}
          </Txt>
          {bill.customer.route ? (
            <Txt variant="micro" muted numberOfLines={1}>
              {bill.customer.route}
            </Txt>
          ) : null}
          {bill.customer.phone ? (
            <Txt variant="micro" muted numberOfLines={1}>
              {bill.customer.phone}
            </Txt>
          ) : null}
        </View>
        <View style={{ alignItems: lang === 'ur' ? 'flex-start' : 'flex-end' }}>
          <Txt variant="micro" faint>
            {t('bill.month')}
          </Txt>
          <Txt variant="body" weight="700">
            {formatMonthLong(bill.month, lang)}
          </Txt>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: c.divider }]} />

      <View style={{ paddingHorizontal: spacing.lg }}>
        {bill.customer.billingType === 'monthly' ? (
          <Line
            label={t('bill.fixedLine')}
            sub={
              bill.milkQty > 0
                ? `${qty(bill.milkQty)} ${t('unit.litre.short')} · ${t('bill.days', { count: num(bill.milkDays) })}`
                : undefined
            }
            value={money(bill.fixedAmount)}
          />
        ) : bill.milkQty > 0 ? (
          <Line
            label={t('bill.milkLine', { qty: qty(bill.milkQty), rate: money(bill.customer.rate) })}
            sub={`${t('bill.days', { count: num(bill.milkDays) })} · ${t('bill.avgPerDay', { qty: qty(bill.avgQty) })}`}
            value={money(bill.milkAmount)}
          />
        ) : null}

        {bill.itemLines.map((l, i) => (
          <Line key={`${l.name}-${i}`} label={l.name} sub={`× ${qty(l.qty)}`} value={money(l.total)} />
        ))}

        {Math.abs(bill.previousBalance) >= 1 ? (
          <Line label={t('bill.previousDue')} value={money(bill.previousBalance)} />
        ) : null}

        {bill.paidInMonth > 0 ? (
          <Line label={t('bill.paidThisMonth')} value={`− ${money(bill.paidInMonth)}`} valueColor={c.success} />
        ) : null}
      </View>

      <View
        style={[
          styles.total,
          { backgroundColor: bill.total <= 0 ? c.successSoft : c.primarySoft },
        ]}
      >
        <Txt
          variant="label"
          weight="700"
          color={bill.total <= 0 ? c.success : c.primary}
          style={{ flex: 1 }}
        >
          {bill.total <= 0 ? t('bill.noDue') : t('bill.totalDue')}
        </Txt>
        {bill.total > 0 ? (
          <Txt variant="amountLg" weight="800" color={c.primary} role="numeric">
            {money(bill.total)}
          </Txt>
        ) : (
          <MaterialCommunityIcons name="check-decagram" size={26} color={c.success} />
        )}
      </View>

      {showBreakdown && delivered.length > 0 ? (
        <View style={styles.breakdown}>
          <Txt variant="micro" weight="700" muted style={{ marginBottom: spacing.sm }}>
            {t('bill.dailyBreakdown')}
          </Txt>
          <View style={styles.dayGrid}>
            {delivered.map((d) => (
              <View key={d.id} style={[styles.dayCell, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
                <Txt variant="micro" faint>
                  {formatDayShort(d.date)}
                </Txt>
                <Txt variant="caption" weight="700" role="numeric">
                  {qty(d.qty)}
                </Txt>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.foot}>
        <Txt variant="caption" weight="600" align="center">
          {t('bill.thankYou')}
        </Txt>
        <Txt variant="micro" faint align="center" style={{ marginTop: 2 }}>
          {t('app.name')}
        </Txt>
      </View>
    </View>
  );
}

function Line({
  label,
  sub,
  value,
  valueColor,
}: {
  label: string;
  sub?: string;
  value: string;
  valueColor?: string;
}) {
  const c = useColors();
  return (
    <View style={[styles.line, { borderTopColor: c.divider }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt variant="body" weight="600">
          {label}
        </Txt>
        {sub ? (
          <Txt variant="micro" faint>
            {sub}
          </Txt>
        ) : null}
      </View>
      <Txt variant="body" weight="700" color={valueColor} role="numeric" align="end">
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden' },
  head: { padding: spacing.lg, gap: 1 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
  },
  who: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.md },
  divider: { height: StyleSheet.hairlineWidth },
  line: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.md,
  },
  breakdown: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayCell: {
    minWidth: 58,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: radius.xs,
    borderWidth: StyleSheet.hairlineWidth,
  },
  foot: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
});
