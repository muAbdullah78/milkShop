import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';

import { AppHeader, ListCard, ListRow, Screen, Txt, useToast } from '@/components/ui';
import { brand, brandUrls } from '@/config/brand';
import { useI18n } from '@/i18n';
import { spacing, useColors } from '@/theme';

/**
 * Play Store policy requires the privacy policy to be reachable from inside
 * the app as well as from the store listing, so this screen exists and is
 * linked from Settings.
 */
export default function LegalSettings() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const { t } = useI18n();

  const open = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      toast.error(t('legal.openFailed'));
    }
  };

  return (
    <Screen padded={false} edges={['top']}>
      <AppHeader title={t('legal.title')} back />

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <ListCard>
          <ListRow
            title={t('legal.privacy')}
            subtitle={t('legal.privacySub')}
            icon="shield-lock-outline"
            iconColor={c.primary}
            onPress={() => open(brandUrls.privacy)}
          />
          <ListRow
            title={t('legal.terms')}
            icon="file-document-outline"
            iconColor={c.accent}
            onPress={() => open(brandUrls.terms)}
          />
          <ListRow
            title={t('legal.support')}
            subtitle={t('legal.supportSub')}
            icon="lifebuoy"
            iconColor={c.info}
            onPress={() => router.push('/settings/help')}
          />
          <ListRow
            title={t('legal.website')}
            subtitle={brand.siteUrl.replace('https://', '')}
            icon="web"
            iconColor={c.textMuted}
            onPress={() => open(brandUrls.home)}
          />
        </ListCard>

        <View style={{ alignItems: 'center', gap: 4, marginTop: spacing.lg }}>
          <MaterialCommunityIcons name="cup" size={26} color={c.textFaint} />
          <Txt variant="caption" faint align="center">
            {brand.appName} · {t('set.version')} 1.0.0
          </Txt>
          <Txt variant="micro" faint align="center">
            © {new Date().getFullYear()} {brand.publisher}
          </Txt>
        </View>
      </ScrollView>
    </Screen>
  );
}
