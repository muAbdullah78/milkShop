import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui';
import { useAuth } from '@/data/AuthProvider';
import { useShop } from '@/data/ShopProvider';
import { useI18n } from '@/i18n';
import { spacing, useColors } from '@/theme';

/** Decides where a cold start lands: setup problem → login → onboarding → app. */
export default function Gate() {
  const c = useColors();
  const { t } = useI18n();
  const { user, initializing, firebaseReady } = useAuth();
  const { loading, needsOnboarding, shopId } = useShop();

  if (!firebaseReady) return <SetupNeeded />;
  if (initializing || loading) return <Splash />;
  if (!user) return <Redirect href="/(auth)/sign-in" />;
  if (needsOnboarding || !shopId) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;

  function Splash() {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <View style={[styles.logo, { backgroundColor: c.primarySoft }]}>
          <MaterialCommunityIcons name="cup" size={40} color={c.primary} />
        </View>
        <Txt variant="title" weight="700" style={{ marginTop: spacing.lg }}>
          {t('app.name')}
        </Txt>
        <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xl }} />
      </View>
    );
  }
}

function SetupNeeded() {
  const c = useColors();
  const { t } = useI18n();
  return (
    <View style={[styles.center, { backgroundColor: c.bg, padding: spacing.xl }]}>
      <View style={[styles.logo, { backgroundColor: c.warningSoft }]}>
        <MaterialCommunityIcons name="wrench-outline" size={38} color={c.warning} />
      </View>
      <Txt variant="title" weight="700" align="center" style={{ marginTop: spacing.lg }}>
        {t('err.permission')}
      </Txt>
      <Txt variant="body" muted align="center" style={{ marginTop: spacing.sm, maxWidth: 340 }}>
        {t('err.firebaseMissing')}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 84, height: 84, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
