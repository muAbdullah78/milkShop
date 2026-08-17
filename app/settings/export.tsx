import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppHeader, Card, ListCard, ListRow, Screen, Txt, useToast } from '@/components/ui';
import { useShop, useShopId } from '@/data/ShopProvider';
import { exportBackup } from '@/features/backup';
import { exportReadable, exportSpreadsheet, type ExportStrings } from '@/features/dataExport';
import { useI18n } from '@/i18n';
import { radius, spacing, useColors } from '@/theme';

/**
 * "Give me my records."
 *
 * Reachable from Settings, from the read-only banner, and from behind the
 * lock screen when the subscription has fully lapsed. That last one is the
 * point: a shopkeeper who has stopped paying still owns everything they typed
 * in, and the app says so by handing it over without argument.
 */
export default function ExportScreen() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const { t, money, lang, isRTL } = useI18n();
  const shopId = useShopId();
  const { shop } = useShop();

  const [busy, setBusy] = useState<'html' | 'csv' | 'json' | null>(null);

  const stamp = () => new Date().toISOString().slice(0, 10);

  const strings: ExportStrings = {
    lang,
    isRTL,
    t: (key, params) => t(key as never, params),
    money,
    date: (ms) =>
      new Date(ms).toLocaleDateString(lang === 'ur' ? 'ur-PK' : 'en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
  };

  const run = async (kind: 'html' | 'csv' | 'json') => {
    // Two exports at once would fight over the same cache directory, and the
    // rows stay tappable while one is running.
    if (!shopId || busy) return;
    setBusy(kind);
    try {
      if (kind === 'html') {
        await exportReadable(shopId, shop, strings, stamp(), t('dl.readable'));
      } else if (kind === 'csv') {
        await exportSpreadsheet(shopId, shop, strings, stamp(), t('dl.sheet'));
      } else {
        await exportBackup(shopId, shop, t('dl.backup'), stamp());
      }
      toast.success(t('sub.exportDone'));
    } catch {
      toast.error(t('sub.exportFailed'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen padded={false} edges={['top']}>
      <AppHeader title={t('dl.title')} back onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <Card style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
          <View style={[styles.icon, { backgroundColor: c.primarySoft }]}>
            <MaterialCommunityIcons name="download-outline" size={24} color={c.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt variant="body" weight="700">
              {t('dl.title')}
            </Txt>
            <Txt variant="caption" muted>
              {t('dl.sub')}
            </Txt>
          </View>
        </Card>

        <ListCard>
          <ListRow
            title={t('dl.readable')}
            subtitle={busy === 'html' ? t('dl.building') : t('dl.readableSub')}
            icon="file-document-outline"
            iconColor={c.primary}
            onPress={() => run('html')}
          />
          <ListRow
            title={t('dl.sheet')}
            subtitle={busy === 'csv' ? t('dl.building') : t('dl.sheetSub')}
            icon="file-table-outline"
            iconColor={c.success}
            onPress={() => run('csv')}
          />
          <ListRow
            title={t('dl.backup')}
            subtitle={busy === 'json' ? t('dl.building') : t('dl.backupSub')}
            icon="database-outline"
            iconColor={c.info}
            onPress={() => run('json')}
          />
        </ListCard>

        <Txt variant="caption" faint align="center">
          {t('dl.pageNote')}
        </Txt>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 48, height: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
});
