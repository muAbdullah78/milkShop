import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  AppHeader,
  Button,
  Card,
  ConfirmDialog,
  Screen,
  Txt,
  useToast,
} from '@/components/ui';
import { useCustomers } from '@/data/hooks';
import { useLock } from '@/data/LockProvider';
import { useShop, useShopId } from '@/data/ShopProvider';
import { customersToCsv, exportBackup, importBackup, shareCsv } from '@/features/backup';
import { useI18n } from '@/i18n';
import { todayKey } from '@/lib/dates';
import { radius, spacing, useColors } from '@/theme';

export default function BackupSettings() {
  const c = useColors();
  const toast = useToast();
  const shopId = useShopId();
  const { shop } = useShop();
  const { beginExternalAction } = useLock();
  const { t, num } = useI18n();
  const { data: customers } = useCustomers();

  const [busy, setBusy] = useState<'export' | 'import' | 'csv' | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const doExport = async () => {
    if (!shopId) return;
    setBusy('export');
    try {
      beginExternalAction();
      await exportBackup(shopId, shop, t('set.backupNow'), todayKey());
      toast.success(t('set.backupDone'));
    } catch {
      toast.error(t('err.somethingWrong'));
    } finally {
      setBusy(null);
    }
  };

  const doImport = async () => {
    if (!shopId) return;
    setConfirmRestore(false);
    setBusy('import');
    try {
      beginExternalAction();
      const result = await importBackup(shopId);
      if (!result) return;
      toast.success(`${t('set.restoreDone')} · ${num(result.restored)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('err.somethingWrong'));
    } finally {
      setBusy(null);
    }
  };

  const doCsv = async () => {
    setBusy('csv');
    try {
      beginExternalAction();
      const csv = customersToCsv(
        customers.map((cu) => ({
          name: cu.name,
          phone: cu.phone ?? '',
          route: cu.route ?? '',
          qty: cu.defaultQty,
          rate: cu.rate,
          balance: cu.balance,
        }))
      );
      await shareCsv(csv, `MilkBook-Customers-${todayKey()}.csv`, t('set.exportCsv'));
      toast.success(t('ok.sent'));
    } catch {
      toast.error(t('err.somethingWrong'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen padded={false} edges={['top']}>
      <AppHeader title={t('set.backup')} subtitle={t('set.backupSub')} back />

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.note, { backgroundColor: c.infoSoft }]}>
          <MaterialCommunityIcons name="cloud-check-outline" size={22} color={c.info} />
          <Txt variant="caption" color={c.info} style={{ flex: 1 }}>
            {t('common.synced')} — {t('common.offline')}
          </Txt>
        </View>

        <Card style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={[styles.icon, { backgroundColor: c.primarySoft }]}>
              <MaterialCommunityIcons name="download-outline" size={24} color={c.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="subtitle" weight="700">
                {t('set.backupNow')}
              </Txt>
              <Txt variant="caption" muted>
                {t('set.backupSub')}
              </Txt>
            </View>
          </View>
          <Button
            label={t('set.backupNow')}
            icon="content-save-outline"
            size="lg"
            full
            loading={busy === 'export'}
            disabled={busy !== null}
            onPress={doExport}
          />
        </Card>

        <Card style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={[styles.icon, { backgroundColor: c.warningSoft }]}>
              <MaterialCommunityIcons name="upload-outline" size={24} color={c.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="subtitle" weight="700">
                {t('set.restore')}
              </Txt>
              <Txt variant="caption" muted>
                {t('set.restoreWarn')}
              </Txt>
            </View>
          </View>
          <Button
            label={t('set.restore')}
            icon="folder-open-outline"
            variant="outline"
            size="lg"
            full
            loading={busy === 'import'}
            disabled={busy !== null}
            onPress={() => setConfirmRestore(true)}
          />
        </Card>

        <Card style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={[styles.icon, { backgroundColor: c.successSoft }]}>
              <MaterialCommunityIcons name="file-delimited-outline" size={24} color={c.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="subtitle" weight="700">
                {t('set.exportCsv')}
              </Txt>
              <Txt variant="caption" muted>
                {t('rep.customerLedger')}
              </Txt>
            </View>
          </View>
          <Button
            label={t('rep.exportCsv')}
            icon="table-arrow-down"
            variant="tonal"
            size="lg"
            full
            loading={busy === 'csv'}
            disabled={busy !== null || customers.length === 0}
            onPress={doCsv}
          />
        </Card>
      </ScrollView>

      <ConfirmDialog
        visible={confirmRestore}
        title={t('set.restore')}
        message={t('set.restoreWarn')}
        confirmLabel={t('set.restore')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={doImport}
        onCancel={() => setConfirmRestore(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.md },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
