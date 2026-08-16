import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import {
  AppHeader,
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  FooterBar,
  MiniStat,
  Screen,
  Segmented,
  Sheet,
  Txt,
  useToast,
} from '@/components/ui';
import {
  useCustomer,
  useCustomerDeliveries,
  useCustomerPayments,
  useCustomerSales,
  useKhaataEntries,
} from '@/data/hooks';
import { useLock } from '@/data/LockProvider';
import { khaataRepo } from '@/data/repo';
import { useShop, useShopId } from '@/data/ShopProvider';
import { useInvoicesForCustomer } from '@/data/hooks';
import {
  buildLedger,
  buildStatementMessage,
  daysSince,
  isKhaataOpen,
  khaataOverLimit,
  summariseLedger,
} from '@/features/khaata';
import { applyReconciliation, reconcileCustomer, type Reconciliation } from '@/features/reconcile';
import { openWhatsApp } from '@/features/whatsapp';
import { useI18n } from '@/i18n';
import { formatDayLong, formatStamp, shiftMonth, thisMonthKey } from '@/lib/dates';
import { radius, spacing, useColors } from '@/theme';
import { withAlpha } from '@/theme/colors';
import type { KhaataEntry, LedgerRow } from '@/types/models';

type Window = 'recent' | 'all';

export default function KhaataLedger() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const shopId = useShopId();
  const { shop } = useShop();
  const { beginExternalAction } = useLock();
  const { t, money, qty, num, lang } = useI18n();
  const { customerId } = useLocalSearchParams<{ customerId: string }>();

  const { customer, loading } = useCustomer(customerId);
  const { data: deliveries } = useCustomerDeliveries(customerId);
  const { data: sales } = useCustomerSales(customerId);
  const { data: payments } = useCustomerPayments(customerId);
  const { data: entries } = useKhaataEntries(customerId);
  const { data: invoices } = useInvoicesForCustomer(customerId);

  const [window, setWindow] = useState<Window>('recent');
  const [selected, setSelected] = useState<LedgerRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<KhaataEntry | null>(null);
  const [recon, setRecon] = useState<Reconciliation | null>(null);
  const [busy, setBusy] = useState<'send' | 'check' | 'fix' | 'delete' | null>(null);

  // "Recent" is the last three months — enough for any normal argument,
  // small enough to render instantly on a cheap phone.
  const since = window === 'recent' ? `${shiftMonth(thisMonthKey(), -2)}-01` : undefined;

  const rows = useMemo(() => {
    if (!customer) return [];
    return buildLedger({ customer, deliveries, sales, payments, entries, invoices, since });
  }, [customer, deliveries, sales, payments, entries, invoices, since]);

  const summary = useMemo(() => summariseLedger(rows), [rows]);
  const quietDays = daysSince(summary.lastActivityTs);

  const sourceLabel = useCallback(
    (source: LedgerRow['source']) =>
      source === 'milk'
        ? t('khaata.srcMilk')
        : source === 'sale'
          ? t('khaata.srcSale')
          : source === 'payment'
            ? t('khaata.srcPayment')
            : source === 'monthly'
              ? t('khaata.srcMonthly')
              : source === 'opening'
                ? t('khaata.srcOpening')
                : t('khaata.srcKhaata'),
    [t]
  );

  if (!customer) {
    return (
      <Screen padded={false} edges={['top']}>
        <AppHeader title={t('khaata.title')} back />
        {loading ? null : <EmptyState icon="account-question-outline" title={t('common.noResults')} />}
      </Screen>
    );
  }

  const open = isKhaataOpen(customer);
  const overLimit = khaataOverLimit(customer);

  const sendStatement = async () => {
    setBusy('send');
    try {
      beginExternalAction();
      const message = buildStatementMessage(customer, rows, {
        lang,
        money,
        qty,
        num,
        stamp: (ts) => formatStamp(ts, lang),
        sourceLabel,
        shopName: shop?.name ?? t('app.name'),
        shopPhone: shop?.phone,
      });
      const result = await openWhatsApp(customer.phone, message);
      if (result === 'no-number') toast.error(t('cust.addPhoneToWhatsapp'));
      if (result === 'not-installed') toast.error(t('bill.noWhatsapp'));
    } finally {
      setBusy(null);
    }
  };

  const check = async () => {
    if (!shopId) return;
    setBusy('check');
    try {
      const result = await reconcileCustomer(shopId, customer);
      setRecon(result);
      if (result.matches) toast.success(t('khaata.balanceOk'));
    } catch {
      toast.error(t('err.somethingWrong'));
    } finally {
      setBusy(null);
    }
  };

  const fix = async () => {
    if (!shopId || !recon) return;
    setBusy('fix');
    try {
      await applyReconciliation(shopId, customer.id, recon.computed);
      toast.success(t('khaata.balanceFixed', { from: money(recon.stored), to: money(recon.computed) }));
      setRecon(null);
    } catch {
      toast.error(t('err.saveFailed'));
    } finally {
      setBusy(null);
    }
  };

  const removeEntry = async () => {
    if (!shopId || !confirmDelete) return;
    setBusy('delete');
    try {
      await khaataRepo.removeEntry(shopId, confirmDelete);
      toast.success(t('ok.deleted'));
      setSelected(null);
    } catch {
      toast.error(t('err.saveFailed'));
    } finally {
      setBusy(null);
      setConfirmDelete(null);
    }
  };

  const selectedEntry =
    selected?.source === 'khaata' ? entries.find((e) => e.id === selected.refId) ?? null : null;

  return (
    <Screen padded={false} edges={['top']}>
      <AppHeader
        title={t('khaata.statementFor', { name: customer.name })}
        subtitle={
          customer.khaataOpenedAt
            ? t('khaata.openedOn', {
                date: formatDayLong(new Date(customer.khaataOpenedAt).toISOString().slice(0, 10), lang),
              })
            : undefined
        }
        back
        actions={[
          { icon: 'account-details-outline', onPress: () => router.push(`/customer/${customer.id}`) },
        ]}
      />

      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 220, gap: spacing.sm }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg, marginBottom: spacing.md }}>
            {/* Balance */}
            <Card level={2} style={{ alignItems: 'center' }}>
              <Avatar name={customer.name} size={54} />
              <Txt variant="caption" muted style={{ marginTop: spacing.md }}>
                {customer.balance >= 1
                  ? t('cust.balanceDue')
                  : customer.balance <= -1
                    ? t('cust.balanceAdvance')
                    : t('cust.balanceClear')}
              </Txt>
              <Txt
                variant="amountXl"
                weight="800"
                color={customer.balance >= 1 ? c.due : customer.balance <= -1 ? c.success : c.text}
                role="numeric"
              >
                {money(Math.abs(customer.balance))}
              </Txt>

              {overLimit ? (
                <Badge
                  label={t('khaata.overLimitBy', {
                    amount: money(customer.balance - (customer.khaataLimit ?? 0)),
                  })}
                  color={c.danger}
                  icon="alert"
                  style={{ marginTop: spacing.sm }}
                />
              ) : null}
              {!open ? (
                <Badge label={t('khaata.closed')} color={c.textMuted} icon="lock" style={{ marginTop: spacing.sm }} />
              ) : null}

              <View style={styles.statRow}>
                <MiniStat label={t('khaata.totalTaken')} value={money(summary.totalTaken)} align="center" />
                <MiniStat
                  label={t('khaata.totalPaid')}
                  value={money(summary.totalPaid)}
                  color={c.success}
                  align="center"
                />
                <MiniStat
                  label={t('khaata.lastActivity')}
                  value={
                    quietDays === null
                      ? '—'
                      : quietDays === 0
                        ? t('common.today')
                        : `${num(quietDays)}d`
                  }
                  align="center"
                />
              </View>
            </Card>

            {/* Reconciliation result */}
            {recon && !recon.matches ? (
              <Card style={{ gap: spacing.md, borderWidth: 1.5, borderColor: c.warning }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <MaterialCommunityIcons name="scale-balance" size={24} color={c.warning} />
                  <Txt variant="body" weight="700" color={c.warning} style={{ flex: 1 }}>
                    {t('khaata.balanceFixed', {
                      from: money(recon.stored),
                      to: money(recon.computed),
                    })}
                  </Txt>
                </View>
                <Button label={t('khaata.checkBalance')} icon="check" full loading={busy === 'fix'} onPress={fix} />
              </Card>
            ) : null}

            <Segmented
              value={window}
              onChange={setWindow}
              size="sm"
              options={[
                { value: 'recent', label: t('khaata.showRecent'), icon: 'clock-outline' },
                { value: 'all', label: t('khaata.showAll'), icon: 'format-list-bulleted' },
              ]}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="notebook-outline"
            title={t('khaata.noEntries')}
            subtitle={t('khaata.noEntriesSub')}
          />
        }
        renderItem={({ item }) => (
          <LedgerLine
            row={item}
            label={sourceLabel(item.source)}
            onPress={() => setSelected(item)}
          />
        )}
        ListFooterComponent={
          rows.length > 0 ? (
            <Pressable
              onPress={check}
              disabled={busy !== null}
              style={[styles.checkRow, { borderColor: c.border }]}
            >
              <MaterialCommunityIcons name="scale-balance" size={18} color={c.textMuted} />
              <View style={{ flex: 1 }}>
                <Txt variant="caption" weight="600">
                  {busy === 'check' ? t('khaata.balanceChecking') : t('khaata.checkBalance')}
                </Txt>
                <Txt variant="micro" faint>
                  {t('khaata.checkBalanceSub')}
                </Txt>
              </View>
            </Pressable>
          ) : null
        }
      />

      <FooterBar>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Button
            label={t('khaata.tookSomething')}
            icon="basket-plus-outline"
            size="lg"
            style={{ flex: 1 }}
            disabled={!open}
            onPress={() => router.push(`/khaata/entry?customerId=${customer.id}`)}
          />
          <Button
            label={t('khaata.theyPaid')}
            icon="cash-plus"
            variant="success"
            size="lg"
            style={{ flex: 1 }}
            onPress={() => router.push(`/payment/new?customerId=${customer.id}`)}
          />
        </View>
        <Button
          label={t('khaata.sendStatement')}
          icon="whatsapp"
          variant="tonal"
          full
          loading={busy === 'send'}
          onPress={sendStatement}
        />
      </FooterBar>

      {/* Row detail */}
      <Sheet
        visible={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? sourceLabel(selected.source) : ''}
        subtitle={selected ? formatStamp(selected.ts, lang) : undefined}
        scrollable={false}
        footer={
          selectedEntry ? (
            <>
              <Button
                label={t('khaata.editEntry')}
                icon="pencil"
                variant="tonal"
                full
                onPress={() => {
                  const id = selectedEntry.id;
                  setSelected(null);
                  router.push(`/khaata/entry?customerId=${customer.id}&entryId=${id}`);
                }}
              />
              <Button
                label={t('common.delete')}
                variant="ghost"
                full
                onPress={() => setConfirmDelete(selectedEntry)}
              />
            </>
          ) : selected?.source === 'payment' ? (
            <Txt variant="caption" muted align="center">
              {t('cust.detailPayments')}
            </Txt>
          ) : null
        }
      >
        {selected ? (
          <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
            <DetailLine label={t('common.type')} value={sourceLabel(selected.source)} />
            {selected.source !== 'opening' ? (
              <DetailLine
                label={selected.delta >= 0 ? t('khaata.took') : t('khaata.paid')}
                value={money(Math.abs(selected.delta))}
                color={selected.delta >= 0 ? c.due : c.success}
              />
            ) : null}
            <DetailLine label={t('khaata.running')} value={money(selected.balanceAfter)} />
            <DetailLine label={t('khaata.entryTime')} value={formatStamp(selected.ts, lang)} />
            {selectedEntry?.note ? (
              <DetailLine label={t('common.note')} value={selectedEntry.note} />
            ) : null}
          </View>
        ) : null}
      </Sheet>

      <ConfirmDialog
        visible={confirmDelete !== null}
        title={t('khaata.deleteEntryQ')}
        message={t('khaata.deleteEntryWarn')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={busy === 'delete'}
        onConfirm={removeEntry}
        onCancel={() => setConfirmDelete(null)}
      />
    </Screen>
  );
}

function LedgerLine({
  row,
  label,
  onPress,
}: {
  row: LedgerRow;
  label: string;
  onPress: () => void;
}) {
  const c = useColors();
  const { money, lang, t } = useI18n();

  if (row.source === 'opening') {
    return (
      <View style={[styles.opening, { backgroundColor: c.bgSunken }]}>
        <MaterialCommunityIcons name="history" size={16} color={c.textMuted} />
        <Txt variant="caption" weight="600" muted style={{ flex: 1 }}>
          {t('khaata.srcOpening')}
        </Txt>
        <Txt variant="caption" weight="700" role="numeric">
          {money(row.balanceAfter)}
        </Txt>
      </View>
    );
  }

  const isDebit = row.delta >= 0;
  const tint = isDebit ? c.due : c.success;
  const icon =
    row.source === 'milk'
      ? 'cup'
      : row.source === 'sale'
        ? 'basket-outline'
        : row.source === 'payment'
          ? 'cash-check'
          : row.source === 'monthly'
            ? 'calendar-month'
            : 'notebook-outline';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.line,
        { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.lineIcon, { backgroundColor: withAlpha(tint, 0.13) }]}>
        <MaterialCommunityIcons name={icon} size={19} color={tint} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt variant="body" weight="600" numberOfLines={1}>
          {row.source === 'milk' || row.source === 'payment' || row.source === 'monthly'
            ? label
            : row.title || label}
        </Txt>
        <Txt variant="micro" faint numberOfLines={1}>
          {formatStamp(row.ts, lang)}
        </Txt>
      </View>

      <View style={{ alignItems: lang === 'ur' ? 'flex-start' : 'flex-end' }}>
        <Txt variant="amount" weight="800" color={tint} role="numeric">
          {isDebit ? '+' : '−'}
          {money(Math.abs(row.delta))}
        </Txt>
        <Txt variant="micro" faint role="numeric">
          {money(row.balanceAfter)}
        </Txt>
      </View>
    </Pressable>
  );
}

function DetailLine({ label, value, color }: { label: string; value: string; color?: string }) {
  const c = useColors();
  return (
    <View style={[styles.detailLine, { borderTopColor: c.divider }]}>
      <Txt variant="body" muted style={{ flex: 1 }}>
        {label}
      </Txt>
      <Txt variant="body" weight="700" color={color} role="numeric">
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, alignSelf: 'stretch' },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  lineIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  opening: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  detailLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
