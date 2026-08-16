import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Linking from 'expo-linking';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Txt } from '@/components/ui';
import { brand, brandUrls } from '@/config/brand';
import { usePlatform } from '@/data/PlatformProvider';
import { useI18n } from '@/i18n';
import { spacing, useColors } from '@/theme';

/**
 * Full-screen block for the three states the super admin can put an install
 * into: too old to run, shop paused, platform in maintenance.
 *
 * Rendered above the navigator so it cannot be dismissed with the back
 * gesture, and deliberately never hides the shop's data — it is paused, not
 * deleted, and the copy says so.
 */
export function PlatformGate() {
  const c = useColors();
  const { t } = useI18n();
  const { needsUpdate, inMaintenance, shopSuspended, suspensionReason, config } = usePlatform();

  if (!needsUpdate && !inMaintenance && !shopSuspended) return null;

  const state = needsUpdate ? 'update' : shopSuspended ? 'suspended' : 'maintenance';

  const copy = {
    update: {
      icon: 'cellphone-arrow-down' as const,
      tint: c.primary,
      soft: c.primarySoft,
      title: t('plat.updateTitle'),
      body: t('plat.updateSub'),
    },
    suspended: {
      icon: 'pause-octagon-outline' as const,
      tint: c.warning,
      soft: c.warningSoft,
      title: t('plat.suspendedTitle'),
      body: suspensionReason || t('plat.suspendedSub'),
    },
    maintenance: {
      icon: 'wrench-clock-outline' as const,
      tint: c.info,
      soft: c.infoSoft,
      title: t('plat.maintenanceTitle'),
      body: config?.maintenanceMessage || t('plat.maintenanceSub'),
    },
  }[state];

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={[styles.icon, { backgroundColor: copy.soft }]}>
        <MaterialCommunityIcons name={copy.icon} size={40} color={copy.tint} />
      </View>

      <Txt variant="display" weight="700" align="center" style={{ marginTop: spacing.xl }}>
        {copy.title}
      </Txt>
      <Txt variant="body" muted align="center" style={{ marginTop: spacing.sm, maxWidth: 340 }}>
        {copy.body}
      </Txt>

      <View style={{ marginTop: spacing.xxl, alignSelf: 'stretch', gap: spacing.md }}>
        {state === 'update' ? (
          <Button
            label={t('plat.updateButton')}
            icon="google-play"
            size="lg"
            full
            onPress={() => Linking.openURL(brandUrls.play).catch(() => undefined)}
          />
        ) : null}
        <Button
          label={t('plat.contactSupport')}
          icon="email-outline"
          variant={state === 'update' ? 'outline' : 'primary'}
          size="lg"
          full
          onPress={() => Linking.openURL(`mailto:${brand.supportEmail}`).catch(() => undefined)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 90,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  icon: { width: 92, height: 92, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
});
