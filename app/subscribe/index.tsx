import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { addDoc, getDoc, serverTimestamp } from '@react-native-firebase/firestore';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  AppHeader,
  Badge,
  Button,
  Card,
  Screen,
  SectionHeader,
  Sheet,
  TextField,
  Txt,
  useToast,
} from '@/components/ui';
import { brand } from '@/config/brand';
import { useAuth } from '@/data/AuthProvider';
import { discountDoc, paymentClaimsCol } from '@/data/refs';
import { useShop } from '@/data/ShopProvider';
import { useSubscription } from '@/data/SubscriptionProvider';
import {
  PLAN_ORDER,
  priceFor,
  validateDiscount,
  type Discount,
  type DiscountCheck,
  type PlanId,
} from '@/features/subscription';
import { useI18n } from '@/i18n';
import { radius, spacing, useColors } from '@/theme';

const CODE_ERROR: Record<Exclude<DiscountCheck, { ok: true }>['reason'], string> = {
  notFound: 'sub.errCodeNotFound',
  inactive: 'sub.errCodeInactive',
  notStarted: 'sub.errCodeNotStarted',
  expired: 'sub.errCodeExpired',
  usedUp: 'sub.errCodeUsedUp',
  wrongPlan: 'sub.errCodeWrongPlan',
  alreadyUsed: 'sub.errCodeAlreadyUsed',
};

/**
 * Choose a plan and pay.
 *
 * Two routes to the same place, because half the target market cannot use the
 * first one:
 *
 *  • **Google Play** — one tap, renews on its own, and the only route Play
 *    policy permits for a purchase made inside an app distributed on Play.
 *  • **Everything else** — JazzCash, Easypaisa, bank, cash. The shopkeeper
 *    pays outside the app and tells us; an admin checks the money arrived and
 *    switches the shop on.
 *
 * The second route deliberately shows no in-app payment form and takes no card
 * details. It records a claim, nothing more. That distinction is what keeps it
 * on the right side of Play's payments policy — the transaction happens
 * outside the app entirely.
 */
export default function SubscribeScreen() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const { t, money, lang } = useI18n();
  const { shop, shopId } = useShop();
  const { user } = useAuth();
  const { plans, status, isTrial, activeUntil, daysLeft, plan: currentPlan } = useSubscription();

  const [selected, setSelected] = useState<PlanId>('quarterly');
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState<Discount | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const [payOpen, setPayOpen] = useState(false);
  const [claimMethod, setClaimMethod] = useState<'jazzcash' | 'easypaisa' | 'bank' | 'cash'>('jazzcash');
  const [claimRef, setClaimRef] = useState('');
  const [sending, setSending] = useState(false);

  const breakdown = useMemo(
    () => priceFor({ plan: selected, discount, plans }),
    [selected, discount, plans]
  );

  const monthlyList = plans.monthly.price;

  const applyCode = async () => {
    const raw = code.trim().toUpperCase();
    if (!raw) return;
    setChecking(true);
    setCodeError(null);
    try {
      const snap = await getDoc(discountDoc(raw));
      const found = snap.exists() ? ({ ...snap.data(), code: raw } as Discount) : null;
      const result = validateDiscount({ discount: found, plan: selected, now: Date.now() });
      if (result.ok) {
        setDiscount(result.discount);
        toast.success(t('sub.codeApplied'));
      } else {
        setDiscount(null);
        setCodeError(t(CODE_ERROR[result.reason] as never));
      }
    } catch {
      setDiscount(null);
      setCodeError(t('sub.errCodeNotFound'));
    } finally {
      setChecking(false);
    }
  };

  const sendClaim = async () => {
    if (!user || !shopId) return;
    setSending(true);
    try {
      await addDoc(paymentClaimsCol(), {
        uid: user.uid,
        shopId,
        shopName: shop?.name ?? '',
        phone: shop?.phone ?? '',
        plan: selected,
        amount: breakdown.payable,
        discountCode: breakdown.discountCode ?? '',
        method: claimMethod,
        reference: claimRef.trim(),
        // The rules refuse any other value here. A claim can never arrive
        // pre-approved.
        status: 'pending',
        lang,
        createdAt: serverTimestamp(),
      });
      setPayOpen(false);
      setClaimRef('');
      toast.success(t('sub.claimSent'));
      router.back();
    } catch {
      toast.error(t('sub.claimFailed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen padded={false} edges={['top']}>
      <AppHeader title={t('sub.title')} back />

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Where they stand right now */}
        {status === 'comp' ? (
          <Card style={{ backgroundColor: c.successSoft, gap: spacing.xs }}>
            <Txt variant="body" weight="700">
              {t('sub.statusComp')}
            </Txt>
            <Txt variant="caption" muted>
              {t('sub.freeAccount')}
            </Txt>
          </Card>
        ) : activeUntil ? (
          <Card style={{ gap: spacing.xs }}>
            <Txt variant="caption" muted>
              {isTrial ? t('sub.statusTrial') : t('sub.statusActive')}
            </Txt>
            <Txt variant="subtitle" weight="700">
              {(daysLeft ?? 0) <= 0
                ? t('sub.endsToday')
                : (daysLeft ?? 0) === 1
                  ? t('sub.oneDayLeft')
                  : t('sub.daysLeft', { n: daysLeft ?? 0 })}
            </Txt>
            <Txt variant="caption" muted>
              {isTrial
                ? t('sub.trialUntil', { date: new Date(activeUntil).toLocaleDateString() })
                : t('sub.until', { date: new Date(activeUntil).toLocaleDateString() })}
            </Txt>
          </Card>
        ) : null}

        {/* Plans */}
        <SectionHeader title={t('sub.choosePlan')} icon="tag-outline" />
        <View style={{ gap: spacing.md }}>
          {PLAN_ORDER.map((id) => {
            const p = plans[id];
            const b = priceFor({ plan: id, discount, plans });
            const chosen = selected === id;
            const savings = monthlyList * p.months - p.price;
            return (
              <Pressable
                key={id}
                onPress={() => {
                  setSelected(id);
                  // A code restricted to another plan must not silently linger.
                  if (discount) {
                    const recheck = validateDiscount({ discount, plan: id, now: Date.now() });
                    if (!recheck.ok) {
                      setDiscount(null);
                      setCodeError(t(CODE_ERROR[recheck.reason] as never));
                    }
                  }
                }}
              >
                <Card
                  style={[
                    styles.plan,
                    { borderColor: chosen ? c.primary : c.border, borderWidth: chosen ? 2 : 1 },
                  ]}
                >
                  <View style={styles.planTop}>
                    <View
                      style={[
                        styles.radio,
                        { borderColor: chosen ? c.primary : c.borderStrong },
                        chosen && { backgroundColor: c.primary },
                      ]}
                    >
                      {chosen ? (
                        <MaterialCommunityIcons name="check" size={14} color={c.onPrimary} />
                      ) : null}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                        <Txt variant="subtitle" weight="700">
                          {t(`sub.plan${id[0].toUpperCase()}${id.slice(1)}` as never)}
                        </Txt>
                        {id === 'annual' ? (
                          <Badge label={t('sub.bestValue')} color={c.success} />
                        ) : id === 'quarterly' ? (
                          <Badge label={t('sub.popular')} color={c.primary} />
                        ) : null}
                        {currentPlan === id ? (
                          <Badge label={t('sub.currentPlan')} color={c.textMuted} />
                        ) : null}
                      </View>
                      <Txt variant="caption" muted>
                        {t('sub.perMonth', { amount: money(b.effectiveMonthly) })}
                      </Txt>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      {b.discountAmount > 0 ? (
                        <Txt variant="caption" faint style={styles.strike}>
                          {money(b.listPrice)}
                        </Txt>
                      ) : null}
                      <Txt variant="subtitle" weight="800" color={c.primary}>
                        {money(b.payable)}
                      </Txt>
                    </View>
                  </View>
                  {savings > 0 ? (
                    <Txt variant="caption" style={{ color: c.success, marginTop: spacing.xs }}>
                      {id === 'annual'
                        ? `${t('sub.twoMonthsFree')} · ${t('sub.saveAmount', { amount: money(savings) })}`
                        : t('sub.saveAmount', { amount: money(savings) })}
                    </Txt>
                  ) : null}
                  {b.bonusDays > 0 ? (
                    <Txt variant="caption" style={{ color: c.success, marginTop: spacing.xs }}>
                      {t('sub.codeFreeDays', { n: b.bonusDays })}
                    </Txt>
                  ) : null}
                </Card>
              </Pressable>
            );
          })}
        </View>

        {/* Discount code */}
        <Card style={{ gap: spacing.sm }}>
          <Txt variant="label" weight="700">
            {t('sub.haveCode')}
          </Txt>
          {discount ? (
            <View style={styles.codeRow}>
              <MaterialCommunityIcons name="ticket-percent-outline" size={20} color={c.success} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt variant="body" weight="700">
                  {discount.code}
                </Txt>
                <Txt variant="caption" muted>
                  {breakdown.bonusDays > 0
                    ? t('sub.codeFreeDays', { n: breakdown.bonusDays })
                    : t('sub.codeOff', { amount: money(breakdown.discountAmount) })}
                </Txt>
              </View>
              <Button
                label={t('sub.codeRemove')}
                variant="ghost"
                size="sm"
                onPress={() => {
                  setDiscount(null);
                  setCode('');
                  setCodeError(null);
                }}
              />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <TextField
                  value={code}
                  onChangeText={(v) => {
                    setCode(v.toUpperCase());
                    setCodeError(null);
                  }}
                  placeholder={t('sub.enterCode')}
                  autoCapitalize="none"
                  error={codeError ?? undefined}
                />
              </View>
              <Button
                label={t('sub.applyCode')}
                variant="tonal"
                onPress={applyCode}
                loading={checking}
                disabled={!code.trim()}
              />
            </View>
          )}
        </Card>

        {/* Pay */}
        <View style={{ gap: spacing.md }}>
          <Button
            label={t('sub.payGoogle')}
            icon="google-play"
            size="xl"
            full
            onPress={() => toast.error(t('sub.payNotReady'))}
          />
          <Button
            label={t('sub.payOther')}
            icon="cash-multiple"
            variant="outline"
            size="lg"
            full
            onPress={() => setPayOpen(true)}
          />
          <Txt variant="micro" faint align="center">
            {t('sub.priceNote')}
          </Txt>
        </View>

        {/* Why it is worth paying for */}
        <SectionHeader title={t('sub.whyPay')} icon="check-decagram-outline" />
        <Card style={{ gap: spacing.md }}>
          {(['sub.benefit1', 'sub.benefit2', 'sub.benefit3', 'sub.benefit4', 'sub.benefit5'] as const).map(
            (k) => (
              <View key={k} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
                <MaterialCommunityIcons name="check-circle" size={19} color={c.success} />
                <Txt variant="body" style={{ flex: 1 }}>
                  {t(k)}
                </Txt>
              </View>
            )
          )}
        </Card>
      </ScrollView>

      {/* Paying another way */}
      <Sheet visible={payOpen} onClose={() => setPayOpen(false)} title={t('sub.howToPay')}>
        <View style={{ gap: spacing.lg }}>
          <Txt variant="body" muted>
            {t('sub.howToPayBody')}
          </Txt>

          <Card style={{ gap: spacing.sm, backgroundColor: c.cardAlt }}>
            <Txt variant="caption" muted>
              {t('sub.claimAmount')}
            </Txt>
            <Txt variant="display" weight="800" color={c.primary}>
              {money(breakdown.payable)}
            </Txt>
            <Txt variant="caption" muted>
              {t(`sub.plan${selected[0].toUpperCase()}${selected.slice(1)}` as never)}
            </Txt>
          </Card>

          <View style={{ gap: spacing.sm }}>
            <Txt variant="label" weight="700">
              {t('sub.claimMethod')}
            </Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {(['jazzcash', 'easypaisa', 'bank', 'cash'] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setClaimMethod(m)}
                  style={[
                    styles.method,
                    {
                      borderColor: claimMethod === m ? c.primary : c.border,
                      backgroundColor: claimMethod === m ? c.primarySoft : 'transparent',
                    },
                  ]}
                >
                  <Txt variant="caption" weight="700">
                    {t(`sub.method${m[0].toUpperCase()}${m.slice(1)}` as never)}
                  </Txt>
                </Pressable>
              ))}
            </View>
          </View>

          <TextField
            label={t('sub.claimRef')}
            hint={t('sub.claimRefHint')}
            value={claimRef}
            onChangeText={setClaimRef}
          />

          <Button
            label={t('sub.claimSend')}
            icon="send"
            size="lg"
            full
            loading={sending}
            onPress={sendClaim}
          />

          <Button
            label={t('legal.support')}
            icon="whatsapp"
            variant="ghost"
            full
            onPress={() =>
              Linking.openURL(`mailto:${brand.supportEmail}`).catch(() => undefined)
            }
          />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  plan: { gap: 0 },
  planTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  strike: { textDecorationLine: 'line-through' },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  method: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
