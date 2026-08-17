import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Txt } from '@/components/ui';
import { useSubscription } from '@/data/SubscriptionProvider';
import { useI18n } from '@/i18n';
import { radius, spacing, useColors } from '@/theme';

/**
 * The wall.
 *
 * Shown when the subscription has lapsed past the read-only window. It covers
 * the app, but it deliberately does **not** cover the two things a person is
 * always entitled to: paying, and taking their own records with them.
 *
 * A locked shopkeeper is still a customer. The copy says nothing has been
 * deleted, because nothing has, and says it in the first sentence — that is
 * the difference between "renew" and "give me my khaata back".
 *
 * Rendered above the navigator, so the back gesture cannot dismiss it. It
 * lifts on the subscribe screens themselves, or the person would have no way
 * to get out.
 */
export function SubscriptionGate() {
  const c = useColors();
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const { level, readOnlyDaysLeft, loading } = useSubscription();

  // Never flash the wall while the shop document is still in flight.
  if (loading || level !== 'locked') return null;
  // The escape hatches must stay reachable.
  if (pathname?.startsWith('/subscribe') || pathname?.startsWith('/settings/export')) return null;

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={[styles.icon, { backgroundColor: c.primarySoft }]}>
        <MaterialCommunityIcons name="lock-open-outline" size={40} color={c.primary} />
      </View>

      <Txt variant="display" weight="700" align="center" style={{ marginTop: spacing.xl }}>
        {t('sub.lockedTitle')}
      </Txt>
      <Txt variant="body" muted align="center" style={{ marginTop: spacing.sm, maxWidth: 340 }}>
        {t('sub.lockedBody')}
      </Txt>

      <View style={{ marginTop: spacing.xxl, alignSelf: 'stretch', gap: spacing.md }}>
        <Button
          label={t('sub.renew')}
          icon="refresh"
          size="xl"
          full
          onPress={() => router.push('/subscribe')}
        />
        <Button
          label={t('sub.exportData')}
          icon="download-outline"
          variant="outline"
          size="lg"
          full
          onPress={() => router.push('/settings/export')}
        />
      </View>

      <Txt variant="caption" faint align="center" style={{ marginTop: spacing.lg, maxWidth: 320 }}>
        {t('sub.lockedExport')}
      </Txt>

      {readOnlyDaysLeft !== null ? null : null}
    </View>
  );
}

/**
 * The nag.
 *
 * One line at the top of the dashboard while the clock is running down, and a
 * firmer one once the shop has dropped to read-only. Tapping it goes straight
 * to the plans — a warning the shopkeeper cannot act on is just noise.
 */
export function SubscriptionBanner() {
  const c = useColors();
  const { t } = useI18n();
  const router = useRouter();
  const { level, shouldWarn, isTrial, daysLeft, readOnlyDaysLeft, status } = useSubscription();

  if (status === 'comp') return null;
  if (!shouldWarn && level === 'full') return null;

  const readOnly = level === 'readonly';
  const days = daysLeft ?? 0;

  const tone = readOnly
    ? { bg: c.dangerSoft, fg: c.danger, icon: 'lock-outline' as const }
    : days <= 1
      ? { bg: c.warningSoft, fg: c.warning, icon: 'clock-alert-outline' as const }
      : { bg: c.primarySoft, fg: c.primary, icon: 'calendar-clock' as const };

  const title = readOnly
    ? t('sub.readOnlyBanner')
    : isTrial
      ? days <= 0
        ? t('sub.trialBannerLast')
        : t('sub.trialBanner', { n: days })
      : days <= 0
        ? t('sub.warnBannerLast')
        : t('sub.warnBanner', { n: days });

  const sub = readOnly
    ? readOnlyDaysLeft !== null && readOnlyDaysLeft > 1
      ? t('sub.readOnlyDays', { n: readOnlyDaysLeft })
      : t('sub.readOnlyLastDay')
    : t('sub.tapToRenew');

  return (
    <Pressable
      onPress={() => router.push('/subscribe')}
      style={[styles.banner, { backgroundColor: tone.bg }]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <MaterialCommunityIcons name={tone.icon} size={20} color={tone.fg} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt variant="body" weight="700" numberOfLines={1}>
          {title}
        </Txt>
        <Txt variant="caption" muted numberOfLines={1}>
          {sub}
        </Txt>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={tone.fg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  icon: { width: 92, height: 92, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
});
