import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getDocs, limit, orderBy, query, updateDoc, where } from '@react-native-firebase/firestore';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  AppHeader,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  ListCard,
  ListRow,
  Screen,
  SectionHeader,
  Txt,
  useToast,
} from '@/components/ui';
import { useAuth } from '@/data/AuthProvider';
import { paymentClaimsCol, shopDoc, subscriptionPaymentsCol } from '@/data/refs';
import { useShop, useShopId } from '@/data/ShopProvider';
import { useSubscription } from '@/data/SubscriptionProvider';
import { useI18n } from '@/i18n';
import { radius, spacing, useColors } from '@/theme';

type Payment = {
  id: string;
  amount?: number;
  method?: string;
  at?: number;
  plan?: string;
  note?: string;
};

type Claim = { id: string; amount?: number; status?: string; method?: string };

/**
 * The shopkeeper's own view of their subscription.
 *
 * Play policy requires a subscriber to be able to see what they are paying
 * for and get to the cancel flow without hunting. For a Play-billed
 * subscription that flow lives in the Play Store app — we cannot cancel it for
 * them and must not pretend to, so the button opens Play directly.
 */
export default function ManageSubscription() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const { t, money } = useI18n();
  const shopId = useShopId();
  const { shop } = useShop();
  const { user } = useAuth();
  const sub = useSubscription();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [pending, setPending] = useState<Claim | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!shopId || !user) return;
    let cancelled = false;

    (async () => {
      const paid = await getDocs(
        query(subscriptionPaymentsCol(shopId), orderBy('at', 'desc'), limit(50))
      ).catch(() => null);
      if (!cancelled && paid) {
        setPayments(paid.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as Payment[]);
      }

      // An unconfirmed manual payment is the most common reason someone opens
      // this screen — "I paid yesterday, why am I still locked?"
      const claims = await getDocs(
        query(paymentClaimsCol(), where('uid', '==', user.uid), where('status', '==', 'pending'), limit(1))
      ).catch(() => null);
      if (!cancelled && claims && !claims.empty) {
        const d = claims.docs[0];
        setPending({ id: d.id, ...(d.data() as object) } as Claim);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shopId, user]);

  const statusLabel =
    sub.status === 'comp'
      ? t('sub.statusComp')
      : sub.level === 'locked'
        ? t('sub.statusLocked')
        : sub.level === 'readonly'
          ? t('sub.statusReadOnly')
          : sub.cancelAtPeriodEnd
            ? t('sub.statusCancelled')
            : sub.isTrial
              ? t('sub.statusTrial')
              : t('sub.statusActive');

  const statusTone =
    sub.status === 'comp'
      ? c.success
      : sub.level === 'full'
        ? sub.shouldWarn
          ? c.warning
          : c.success
        : c.danger;

  const setRenewal = async (cancel: boolean) => {
    if (!shopId) return;
    setBusy(true);
    try {
      // `cancelAtPeriodEnd` is the one billing field a member is allowed to
      // write, because setting it can only ever reduce their own access.
      await updateDoc(shopDoc(shopId), { cancelAtPeriodEnd: cancel, updatedAt: Date.now() });
      toast.success(cancel ? t('sub.cancelDone') : t('sub.resumeDone'));
      setConfirmCancel(false);
    } catch {
      toast.error(t('err.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const methodLabel = (m: string | undefined) => {
    const key = `sub.method${(m ?? 'cash')[0].toUpperCase()}${(m ?? 'cash').slice(1)}`;
    return t(key as never);
  };

  const fmtDate = (ms: number | undefined) =>
    ms ? new Date(ms).toLocaleDateString() : '—';

  return (
    <Screen padded={false} edges={['top']}>
      <AppHeader title={t('sub.manage')} back />

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status */}
        <Card style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={[styles.icon, { backgroundColor: statusTone + '22' }]}>
              <MaterialCommunityIcons
                name={sub.level === 'full' ? 'shield-check' : 'shield-alert-outline'}
                size={24}
                color={statusTone}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt variant="subtitle" weight="700">
                {statusLabel}
              </Txt>
              {sub.status === 'comp' ? (
                <Txt variant="caption" muted>
                  {t('sub.freeAccount')}
                </Txt>
              ) : sub.activeUntil ? (
                <Txt variant="caption" muted>
                  {sub.cancelAtPeriodEnd
                    ? t('sub.willEnd', { date: fmtDate(sub.activeUntil) })
                    : sub.level === 'full'
                      ? (sub.isTrial ? t('sub.trialUntil') : t('sub.until')).replace(
                          '{date}',
                          fmtDate(sub.activeUntil)
                        )
                      : t('sub.endedOn', { date: fmtDate(sub.activeUntil) })}
                </Txt>
              ) : null}
            </View>
            {sub.plan ? (
              <Badge
                label={t(`sub.plan${sub.plan[0].toUpperCase()}${sub.plan.slice(1)}` as never)}
                color={c.primary}
              />
            ) : null}
          </View>

          {sub.level === 'full' && !sub.shouldWarn ? null : (
            <Button
              label={sub.level === 'full' ? t('sub.renew') : t('sub.subscribe')}
              icon="refresh"
              size="lg"
              full
              onPress={() => router.push('/subscribe')}
            />
          )}
        </Card>

        {/* A manual payment we have not confirmed yet */}
        {pending ? (
          <Card style={{ backgroundColor: c.warningSoft, gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <MaterialCommunityIcons name="clock-outline" size={20} color={c.warning} />
              <Txt variant="body" weight="700" style={{ flex: 1 }}>
                {t('sub.claimPending', { amount: money(pending.amount ?? 0) })}
              </Txt>
            </View>
          </Card>
        ) : null}

        {/* Renewal control */}
        {sub.status !== 'comp' && sub.level !== 'locked' ? (
          <Card style={{ gap: spacing.md }}>
            {sub.source === 'play' ? (
              <>
                <Txt variant="caption" muted>
                  {t('sub.cancelPlay')}
                </Txt>
                <Button
                  label={t('sub.openPlaySubs')}
                  icon="google-play"
                  variant="outline"
                  full
                  onPress={() =>
                    Linking.openURL('https://play.google.com/store/account/subscriptions').catch(
                      () => undefined
                    )
                  }
                />
              </>
            ) : sub.cancelAtPeriodEnd ? (
              <Button
                label={t('sub.resume')}
                icon="autorenew"
                variant="tonal"
                full
                loading={busy}
                onPress={() => setRenewal(false)}
              />
            ) : (
              <Button
                label={t('sub.cancelRenewal')}
                icon="close-circle-outline"
                variant="outline"
                full
                onPress={() => setConfirmCancel(true)}
              />
            )}
          </Card>
        ) : null}

        {/* Their own records, always */}
        <ListCard>
          <ListRow
            title={t('dl.title')}
            subtitle={t('dl.sub')}
            icon="download-outline"
            iconColor={c.info}
            onPress={() => router.push('/settings/export')}
          />
          <ListRow
            title={t('help.row')}
            subtitle={t('help.rowSub')}
            icon="lifebuoy"
            iconColor={c.primary}
            onPress={() => router.push('/settings/help')}
          />
        </ListCard>

        {/* History */}
        <SectionHeader title={t('sub.history')} icon="receipt" />
        <Card>
          {payments.length === 0 ? (
            <Txt variant="body" muted align="center" style={{ paddingVertical: spacing.lg }}>
              {t('sub.noHistory')}
            </Txt>
          ) : (
            <View style={{ gap: spacing.md }}>
              {payments.map((p) => (
                <View key={p.id} style={styles.payRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt variant="body" weight="700">
                      {money(p.amount ?? 0)}
                    </Txt>
                    <Txt variant="caption" muted>
                      {t('sub.paidOn', { date: fmtDate(p.at) })} · {methodLabel(p.method)}
                    </Txt>
                  </View>
                  <MaterialCommunityIcons name="check-circle" size={19} color={c.success} />
                </View>
              ))}
            </View>
          )}
        </Card>

        <Txt variant="micro" faint align="center">
          {shop?.name ?? ''}
        </Txt>
      </ScrollView>

      <ConfirmDialog
        visible={confirmCancel}
        title={t('sub.cancelQ')}
        message={t('sub.cancelBody', {
          date: fmtDate(sub.activeUntil ?? undefined),
        })}
        confirmLabel={t('sub.cancelConfirm')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => setRenewal(true)}
        onCancel={() => setConfirmCancel(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 48, height: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
