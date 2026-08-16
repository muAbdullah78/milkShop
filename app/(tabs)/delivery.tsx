import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import {
  Avatar,
  Button,
  Chip,
  ConfirmDialog,
  EmptyState,
  FooterBar,
  Screen,
  SearchBar,
  Sheet,
  Stepper,
  SwitchRow,
  Txt,
  useToast,
  DayStepper,
} from '@/components/ui';
import { useActiveCustomers, useDeliveriesForDay, useRoutes } from '@/data/hooks';
import { deliveryRepo } from '@/data/repo';
import { useShopId } from '@/data/ShopProvider';
import { useI18n } from '@/i18n';
import { isScheduledOn, todayKey } from '@/lib/dates';
import { radius, spacing, useColors } from '@/theme';
import { withAlpha } from '@/theme/colors';
import type { Customer, Delivery } from '@/types/models';

type RowState = { customer: Customer; delivery?: Delivery; scheduled: boolean };

export default function DeliveryScreen() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const shopId = useShopId();
  const { t, money, qty, num } = useI18n();

  const [date, setDate] = useState(todayKey());
  const [route, setRoute] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showUnscheduled, setShowUnscheduled] = useState(false);
  const [editing, setEditing] = useState<RowState | null>(null);
  const [draftQty, setDraftQty] = useState(0);
  const [confirmUndo, setConfirmUndo] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: customers, loading } = useActiveCustomers();
  const { data: deliveries } = useDeliveriesForDay(date);
  const routes = useRoutes();

  const byCustomer = useMemo(() => {
    const map = new Map<string, Delivery>();
    deliveries.forEach((d) => map.set(d.customerId, d));
    return map;
  }, [deliveries]);

  const rows = useMemo<RowState[]>(() => {
    const q = search.trim().toLowerCase();
    return customers
      .map((customer) => ({
        customer,
        delivery: byCustomer.get(customer.id),
        scheduled: isScheduledOn(customer, date),
      }))
      .filter((r) => {
        if (route && (r.customer.route ?? '') !== route) return false;
        if (!r.scheduled && !r.delivery && !showUnscheduled) return false;
        if (!q) return true;
        return (
          r.customer.name.toLowerCase().includes(q) ||
          (r.customer.phone ?? '').includes(q) ||
          (r.customer.route ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const aDone = a.delivery ? 1 : 0;
        const bDone = b.delivery ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        return a.customer.name.localeCompare(b.customer.name);
      });
  }, [customers, byCustomer, route, search, showUnscheduled, date]);

  const scheduled = useMemo(
    () => customers.filter((cu) => isScheduledOn(cu, date) && (!route || (cu.route ?? '') === route)),
    [customers, date, route]
  );
  const pending = scheduled.filter((cu) => !byCustomer.has(cu.id));

  const totals = useMemo(() => {
    const delivered = deliveries.filter((d) => d.status === 'delivered');
    return {
      litres: delivered.reduce((s, d) => s + d.qty, 0),
      amount: delivered.reduce((s, d) => s + d.amount, 0),
      count: delivered.length,
    };
  }, [deliveries]);

  const markAll = useCallback(async () => {
    if (!shopId || pending.length === 0) return;
    setBusy(true);
    try {
      const marked = await deliveryRepo.markAllUsual(shopId, pending, date, new Set(byCustomer.keys()));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      toast.success(t('del.doneCount', { done: num(marked) }));
    } catch {
      toast.error(t('err.saveFailed'));
    } finally {
      setBusy(false);
    }
  }, [shopId, pending, date, byCustomer, toast, t, num]);

  const quickMark = useCallback(
    async (row: RowState, status: 'delivered' | 'skipped') => {
      if (!shopId) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      try {
        await deliveryRepo.set(shopId, row.customer, date, {
          qty: status === 'delivered' ? row.customer.defaultQty : 0,
          status,
        });
      } catch {
        toast.error(t('err.saveFailed'));
      }
    },
    [shopId, date, toast, t]
  );

  const clearRow = useCallback(
    async (row: RowState) => {
      if (!shopId) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      try {
        await deliveryRepo.clear(shopId, row.customer.id, date);
      } catch {
        toast.error(t('err.saveFailed'));
      }
    },
    [shopId, date, toast, t]
  );

  const saveEdit = useCallback(async () => {
    if (!shopId || !editing) return;
    setBusy(true);
    try {
      await deliveryRepo.set(shopId, editing.customer, date, {
        qty: draftQty,
        status: draftQty > 0 ? 'delivered' : 'skipped',
      });
      setEditing(null);
    } catch {
      toast.error(t('err.saveFailed'));
    } finally {
      setBusy(false);
    }
  }, [shopId, editing, draftQty, date, toast, t]);

  const undoAll = useCallback(async () => {
    if (!shopId) return;
    setBusy(true);
    try {
      await deliveryRepo.clearDay(shopId, deliveries);
      toast.success(t('ok.updated'));
    } catch {
      toast.error(t('err.saveFailed'));
    } finally {
      setBusy(false);
      setConfirmUndo(false);
    }
  }, [shopId, deliveries, toast, t]);

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md }}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Txt variant="display" weight="700">
              {t('del.title')}
            </Txt>
            <Txt variant="caption" muted>
              {t('del.summary', { litres: qty(totals.litres), count: num(totals.count) })}
            </Txt>
          </View>
          {deliveries.length > 0 ? (
            <Pressable
              onPress={() => setConfirmUndo(true)}
              hitSlop={8}
              style={[styles.undoBtn, { backgroundColor: c.dangerSoft }]}
            >
              <MaterialCommunityIcons name="undo-variant" size={18} color={c.danger} />
              <Txt variant="caption" weight="700" color={c.danger}>
                {t('del.undoAll')}
              </Txt>
            </Pressable>
          ) : null}
        </View>

        <DayStepper value={date} onChange={setDate} />
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('del.searchCustomer')} />

        {routes.length > 0 ? (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[null, ...routes]}
            keyExtractor={(r) => r ?? '__all__'}
            contentContainerStyle={{ gap: spacing.sm, paddingVertical: 2 }}
            renderItem={({ item }) => (
              <Chip
                label={item ?? t('del.allRoutes')}
                active={route === item}
                onPress={() => setRoute(item)}
                icon={item ? 'map-marker-outline' : 'earth'}
                count={
                  item
                    ? customers.filter((cu) => (cu.route ?? '') === item && isScheduledOn(cu, date)).length
                    : undefined
                }
              />
            )}
          />
        ) : null}
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.customer.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 190, gap: spacing.sm }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          loading ? null : customers.length === 0 ? (
            <EmptyState
              icon="account-group-outline"
              title={t('del.emptyTitle')}
              subtitle={t('del.emptySub')}
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
            <EmptyState icon="map-marker-off-outline" title={t('del.emptyRoute')} compact />
          )
        }
        ListFooterComponent={
          customers.length > 0 ? (
            <View style={{ marginTop: spacing.lg }}>
              <SwitchRow
                label={t('del.showNotScheduled')}
                value={showUnscheduled}
                onValueChange={setShowUnscheduled}
                icon="calendar-remove-outline"
              />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <DeliveryRow
            row={item}
            onQuick={quickMark}
            onClear={clearRow}
            onEdit={() => {
              setEditing(item);
              setDraftQty(item.delivery?.qty ?? item.customer.defaultQty);
            }}
          />
        )}
      />

      {/* Sticky action */}
      {customers.length > 0 ? (
        <FooterBar>
          <View style={styles.footerStats}>
            <FooterStat label={t('dash.litresToday')} value={`${qty(totals.litres)} ${t('unit.litre.short')}`} />
            <View style={[styles.footerDivider, { backgroundColor: c.border }]} />
            <FooterStat label={t('del.moneyToday')} value={money(totals.amount)} />
            <View style={[styles.footerDivider, { backgroundColor: c.border }]} />
            <FooterStat label={t('del.pending')} value={num(pending.length)} tint={pending.length > 0 ? c.warning : c.success} />
          </View>
          <Button
            label={t('del.markAllUsual')}
            icon="check-all"
            size="xl"
            full
            variant={pending.length === 0 ? 'success' : 'primary'}
            disabled={pending.length === 0 || busy}
            loading={busy}
            onPress={markAll}
          />
          {pending.length > 0 ? (
            <Txt variant="micro" muted align="center">
              {t('del.markAllUsualSub', { count: num(pending.length) })}
            </Txt>
          ) : null}
        </FooterBar>
      ) : null}

      {/* Per-customer quantity sheet */}
      <Sheet
        visible={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? t('del.qtyFor', { name: editing.customer.name }) : ''}
        subtitle={editing ? t('del.usualQty', { qty: qty(editing.customer.defaultQty) }) : undefined}
        scrollable={false}
        footer={
          <>
            <Button
              label={t('common.save')}
              size="lg"
              full
              loading={busy}
              onPress={saveEdit}
              icon="check"
            />
            {editing?.delivery ? (
              <Button
                label={t('common.clear')}
                variant="ghost"
                full
                onPress={() => {
                  if (editing) clearRow(editing);
                  setEditing(null);
                }}
              />
            ) : null}
          </>
        }
      >
        <View style={{ gap: spacing.lg, paddingBottom: spacing.md }}>
          <Stepper value={draftQty} onChange={setDraftQty} step={0.25} size="lg" suffix={t('unit.litre.short')} />
          <View style={styles.presetRow}>
            {[0.5, 1, 1.5, 2, 3].map((preset) => (
              <Chip
                key={preset}
                label={`${qty(preset)} ${t('unit.litre.short')}`}
                active={draftQty === preset}
                onPress={() => setDraftQty(preset)}
              />
            ))}
          </View>
          {editing?.customer.billingType === 'daily' ? (
            <View style={[styles.calcRow, { backgroundColor: c.primarySoft }]}>
              <Txt variant="body" weight="600" color={c.primary}>
                {qty(draftQty)} × {money(editing.customer.rate)}
              </Txt>
              <Txt variant="amount" weight="800" color={c.primary} role="numeric">
                {money(draftQty * editing.customer.rate)}
              </Txt>
            </View>
          ) : (
            <View style={[styles.calcRow, { backgroundColor: c.accentSoft }]}>
              <MaterialCommunityIcons name="calendar-check" size={18} color={c.accent} />
              <Txt variant="caption" weight="600" color={c.accent} style={{ flex: 1 }}>
                {t('cust.billingMonthlySub')}
              </Txt>
            </View>
          )}
        </View>
      </Sheet>

      <ConfirmDialog
        visible={confirmUndo}
        title={t('del.confirmUndoAll')}
        message={t('common.deleteWarn')}
        confirmLabel={t('del.undoAll')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={busy}
        onConfirm={undoAll}
        onCancel={() => setConfirmUndo(false)}
      />
    </Screen>
  );
}

function DeliveryRow({
  row,
  onQuick,
  onClear,
  onEdit,
}: {
  row: RowState;
  onQuick: (row: RowState, status: 'delivered' | 'skipped') => void;
  onClear: (row: RowState) => void;
  onEdit: () => void;
}) {
  const c = useColors();
  const { t, qty, money } = useI18n();
  const status = row.delivery?.status;
  const isDelivered = status === 'delivered';
  const isSkipped = status === 'skipped';

  const tint = isDelivered ? c.success : isSkipped ? c.textFaint : c.primary;

  return (
    <Pressable
      onPress={onEdit}
      onLongPress={() => (status ? onClear(row) : undefined)}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: c.card,
          borderColor: isDelivered ? withAlpha(c.success, 0.4) : isSkipped ? c.border : c.border,
          opacity: pressed ? 0.85 : isSkipped ? 0.65 : 1,
        },
      ]}
    >
      <Avatar name={row.customer.name} size={44} />

      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt variant="bodyLg" weight="600" numberOfLines={1}>
          {row.customer.name}
        </Txt>
        <View style={styles.rowMeta}>
          {row.customer.route ? (
            <>
              <MaterialCommunityIcons name="map-marker-outline" size={12} color={c.textFaint} />
              <Txt variant="micro" faint numberOfLines={1}>
                {row.customer.route}
              </Txt>
              <Txt variant="micro" faint>
                ·
              </Txt>
            </>
          ) : null}
          <Txt variant="micro" faint numberOfLines={1}>
            {row.scheduled
              ? `${qty(row.customer.defaultQty)} ${t('unit.litre.short')} · ${money(row.customer.rate)}`
              : t('del.notScheduled')}
          </Txt>
        </View>
      </View>

      {status ? (
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <View style={[styles.statusPill, { backgroundColor: withAlpha(tint, 0.14) }]}>
            <MaterialCommunityIcons name={isDelivered ? 'check-bold' : 'close'} size={13} color={tint} />
            <Txt variant="micro" weight="700" color={tint}>
              {isDelivered ? `${qty(row.delivery!.qty)} ${t('unit.litre.short')}` : t('del.skipped')}
            </Txt>
          </View>
          {isDelivered && row.delivery!.amount > 0 ? (
            <Txt variant="micro" faint role="numeric">
              {money(row.delivery!.amount)}
            </Txt>
          ) : null}
        </View>
      ) : (
        <View style={styles.quickRow}>
          <Pressable
            onPress={() => onQuick(row, 'skipped')}
            hitSlop={6}
            style={[styles.quickBtn, { backgroundColor: c.bgSunken }]}
          >
            <MaterialCommunityIcons name="close" size={20} color={c.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => onQuick(row, 'delivered')}
            hitSlop={6}
            style={[styles.quickBtn, { backgroundColor: c.success }]}
          >
            <MaterialCommunityIcons name="check-bold" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

function FooterStat({ label, value, tint }: { label: string; value: string; tint?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Txt variant="micro" muted numberOfLines={1}>
        {label}
      </Txt>
      <Txt variant="body" weight="800" color={tint} numberOfLines={1} role="numeric">
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  quickRow: { flexDirection: 'row', gap: spacing.sm },
  quickBtn: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  footerStats: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  footerDivider: { width: StyleSheet.hairlineWidth * 2, height: 26 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  calcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
});
