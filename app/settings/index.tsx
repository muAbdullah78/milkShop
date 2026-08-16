import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import {
  AppHeader,
  Avatar,
  Badge,
  Card,
  ConfirmDialog,
  ListCard,
  ListRow,
  Screen,
  SectionHeader,
  Segmented,
  SwitchRow,
  Txt,
  useToast,
} from '@/components/ui';
import { useAuth } from '@/data/AuthProvider';
import { useLock } from '@/data/LockProvider';
import { useShop } from '@/data/ShopProvider';
import { useI18n } from '@/i18n';
import { spacing, useColors, useTheme, type ThemePref } from '@/theme';

export default function SettingsScreen() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const { t, lang, urduDigits, setUrduDigits } = useI18n();
  const { pref, setPref } = useTheme();
  const { shop } = useShop();
  const { user, signOut } = useAuth();
  const { enabled: pinOn } = useLock();

  const [confirmOut, setConfirmOut] = useState(false);

  return (
    <Screen padded={false} edges={['top']}>
      <AppHeader title={t('set.title')} back />

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge }}
        showsVerticalScrollIndicator={false}
      >
        <Card
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
          onPress={() => router.push('/settings/shop')}
        >
          <Avatar name={shop?.name ?? 'MB'} size={54} icon="storefront" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt variant="subtitle" weight="700" numberOfLines={1}>
              {shop?.name ?? t('app.name')}
            </Txt>
            <Txt variant="caption" muted numberOfLines={1}>
              {user?.email ?? shop?.phone ?? ''}
            </Txt>
          </View>
          <Badge label={t('common.edit')} color={c.primary} />
        </Card>

        {/* Appearance */}
        <SectionHeader title={t('set.appearance')} icon="palette-outline" style={{ marginTop: spacing.xxl }} />
        <Card style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.sm }}>
            <Txt variant="label" weight="600" muted>
              {t('set.theme')}
            </Txt>
            <Segmented
              value={pref}
              onChange={(v) => setPref(v as ThemePref)}
              options={[
                { value: 'light', label: t('set.themeLight'), icon: 'white-balance-sunny' },
                { value: 'dark', label: t('set.themeDark'), icon: 'weather-night' },
                { value: 'system', label: t('set.themeSystem'), icon: 'cellphone' },
              ]}
            />
          </View>

          {lang === 'ur' ? (
            <SwitchRow
              label={t('set.urduNumerals')}
              sublabel={t('set.urduNumeralsSub')}
              value={urduDigits}
              onValueChange={setUrduDigits}
              icon="numeric"
              iconColor={c.accent}
            />
          ) : null}
        </Card>

        {/* Core settings */}
        <SectionHeader title={t('set.title')} icon="cog-outline" style={{ marginTop: spacing.xxl }} />
        <ListCard>
          <ListRow
            title={t('set.shop')}
            subtitle={t('set.shopSub')}
            icon="storefront-outline"
            iconColor={c.primary}
            onPress={() => router.push('/settings/shop')}
          />
          <ListRow
            title={t('set.language')}
            subtitle={lang === 'ur' ? 'اردو' : 'English'}
            icon="translate"
            iconColor={c.accent}
            onPress={() => router.push('/settings/language')}
          />
          <ListRow
            title={t('set.pin')}
            subtitle={pinOn ? t('set.pinOn') : t('set.pinOff')}
            icon="lock-outline"
            iconColor={pinOn ? c.success : c.textMuted}
            onPress={() => router.push('/settings/security')}
          />
          <ListRow
            title={t('set.reminders')}
            subtitle={t('set.reminderDailySub')}
            icon="bell-outline"
            iconColor={c.warning}
            onPress={() => router.push('/settings/reminders')}
          />
          <ListRow
            title={t('set.backup')}
            subtitle={t('set.backupSub')}
            icon="cloud-download-outline"
            iconColor={c.info}
            onPress={() => router.push('/settings/backup')}
          />
        </ListCard>

        {/* Data */}
        <SectionHeader title={t('set.categories')} icon="shape-outline" style={{ marginTop: spacing.xxl }} />
        <ListCard>
          <ListRow
            title={t('cat.title')}
            icon="shape"
            iconColor={c.accent}
            onPress={() => router.push('/categories')}
          />
          <ListRow
            title={t('exp.manageCats')}
            icon="cash-multiple"
            iconColor={c.moneyOut}
            onPress={() => router.push('/expenses/categories')}
          />
          <ListRow
            title={t('sup.title')}
            icon="truck-delivery-outline"
            iconColor={c.info}
            onPress={() => router.push('/suppliers')}
          />
        </ListCard>

        {/* Account */}
        <SectionHeader title={t('set.account')} icon="account-circle-outline" style={{ marginTop: spacing.xxl }} />
        <ListCard>
          <ListRow
            title={t('auth.signOut')}
            subtitle={user?.email ?? undefined}
            icon="logout"
            iconColor={c.danger}
            danger
            onPress={() => setConfirmOut(true)}
            chevron={false}
          />
        </ListCard>

        <View style={{ alignItems: 'center', marginTop: spacing.xxl, gap: 4 }}>
          <Txt variant="caption" faint>
            {t('app.name')} · {t('set.version')} 1.0.0
          </Txt>
          <Txt variant="micro" faint>
            {t('app.tagline')}
          </Txt>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirmOut}
        title={t('auth.signOutQ')}
        confirmLabel={t('auth.signOut')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={async () => {
          setConfirmOut(false);
          try {
            await signOut();
            router.replace('/');
          } catch {
            toast.error(t('err.somethingWrong'));
          }
        }}
        onCancel={() => setConfirmOut(false)}
      />
    </Screen>
  );
}
