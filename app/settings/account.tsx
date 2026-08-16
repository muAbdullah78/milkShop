import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import {
  AppHeader,
  Avatar,
  Button,
  Card,
  ProgressBar,
  Screen,
  Sheet,
  TextField,
  Txt,
  useToast,
} from '@/components/ui';
import { useAuth } from '@/data/AuthProvider';
import { usePlatform } from '@/data/PlatformProvider';
import { useShop, useShopId } from '@/data/ShopProvider';
import {
  ReauthRequiredError,
  deleteAccountAndData,
  reauthenticate,
  signInMethod,
  type DeletionProgress,
} from '@/features/accountDeletion';
import { useI18n } from '@/i18n';
import { radius, spacing, useColors } from '@/theme';

export default function AccountSettings() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const shopId = useShopId();
  const { shop } = useShop();
  const { user } = useAuth();
  const { isEnabled } = usePlatform();
  const { t, num } = useI18n();

  const [confirmWord, setConfirmWord] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState<DeletionProgress | null>(null);
  const [reauthOpen, setReauthOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [reauthBusy, setReauthBusy] = useState(false);
  const [reauthError, setReauthError] = useState<string | undefined>();

  const armed = confirmWord.trim().toUpperCase() === t('acct.deleteConfirmWord');

  const stepLabel = (p: DeletionProgress | null) => {
    if (!p) return t('acct.deleting');
    if (p.step === 'data') return t('acct.deletingData');
    if (p.step === 'shop') return t('acct.deletingShop');
    if (p.step === 'profile') return t('acct.deletingProfile');
    return t('acct.deletingAccount');
  };

  const runDeletion = async () => {
    setDeleting(true);
    setProgress(null);
    try {
      await deleteAccountAndData(shopId, setProgress);
      toast.success(t('acct.deleted'));
      router.replace('/');
    } catch (e) {
      if (e instanceof ReauthRequiredError) {
        setReauthOpen(true);
        return;
      }
      toast.error(t('acct.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  const confirmReauth = async () => {
    setReauthBusy(true);
    setReauthError(undefined);
    try {
      const method = signInMethod();
      if (method === 'password') {
        await reauthenticate({ method: 'password', password });
      } else {
        await reauthenticate({ method: 'google' });
      }
      setReauthOpen(false);
      setPassword('');
      await runDeletion();
    } catch {
      setReauthError(t('acct.reauthFailed'));
    } finally {
      setReauthBusy(false);
    }
  };

  return (
    <Screen padded={false} edges={['top']}>
      <AppHeader title={t('acct.title')} back />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Avatar name={shop?.name ?? user?.email ?? 'MB'} size={52} icon="account-circle" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt variant="caption" muted>
                {t('acct.signedInAs')}
              </Txt>
              <Txt variant="body" weight="700" numberOfLines={1}>
                {user?.email ?? user?.displayName ?? '—'}
              </Txt>
              {shop?.name ? (
                <Txt variant="caption" muted numberOfLines={1}>
                  {shop.name}
                </Txt>
              ) : null}
            </View>
          </Card>

          {/* Backup nudge — the last chance to keep anything */}
          {isEnabled('backup') ? (
          <Card style={{ gap: spacing.md, borderWidth: 1.5, borderColor: c.warning }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={[styles.icon, { backgroundColor: c.warningSoft }]}>
                <MaterialCommunityIcons name="content-save-alert-outline" size={23} color={c.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="body" weight="700">
                  {t('acct.deleteBackupFirst')}
                </Txt>
                <Txt variant="caption" muted>
                  {t('acct.deleteBackupFirstSub')}
                </Txt>
              </View>
            </View>
            <Button
              label={t('set.backupNow')}
              icon="download-outline"
              variant="tonal"
              full
              onPress={() => router.push('/settings/backup')}
            />
          </Card>
          ) : null}

          {/* Danger zone */}
          <Card style={{ gap: spacing.lg, borderWidth: 1.5, borderColor: c.danger }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={[styles.icon, { backgroundColor: c.dangerSoft }]}>
                <MaterialCommunityIcons name="alert-octagon-outline" size={23} color={c.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="subtitle" weight="700" color={c.danger}>
                  {t('acct.deleteTitle')}
                </Txt>
                <Txt variant="caption" muted>
                  {t('acct.deleteSub')}
                </Txt>
              </View>
            </View>

            <View style={[styles.listBox, { backgroundColor: c.dangerSoft }]}>
              <Txt variant="label" weight="700" color={c.danger}>
                {t('acct.deleteWhat')}
              </Txt>
              <Txt variant="caption" color={c.danger} style={{ marginTop: 4 }}>
                {t('acct.deleteList')}
              </Txt>
            </View>

            {deleting ? (
              <View style={{ gap: spacing.sm }}>
                <Txt variant="body" weight="600" align="center">
                  {stepLabel(progress)}
                </Txt>
                <ProgressBar progress={progress?.progress ?? 0.05} color={c.danger} height={10} />
                {progress?.deletedDocs ? (
                  <Txt variant="micro" faint align="center">
                    {t('acct.docsCount', { count: num(progress.deletedDocs) })}
                  </Txt>
                ) : null}
              </View>
            ) : (
              <>
                <TextField
                  label={t('acct.deleteConfirmType')}
                  value={confirmWord}
                  onChangeText={setConfirmWord}
                  placeholder={t('acct.deleteConfirmWord')}
                  autoCapitalize="none"
                  icon="keyboard-outline"
                />
                <Button
                  label={t('acct.deleteButton')}
                  icon="trash-can-outline"
                  variant="danger"
                  size="lg"
                  full
                  disabled={!armed}
                  onPress={runDeletion}
                />
              </>
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <Sheet
        visible={reauthOpen}
        onClose={() => setReauthOpen(false)}
        title={t('acct.reauthTitle')}
        subtitle={t('acct.reauthSub')}
        scrollable={false}
        footer={
          <Button
            label={t('acct.reauthContinue')}
            icon="shield-check-outline"
            variant="danger"
            size="lg"
            full
            loading={reauthBusy}
            onPress={confirmReauth}
          />
        }
      >
        <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
          {signInMethod() === 'password' ? (
            <TextField
              label={t('acct.reauthPassword')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              icon="lock-outline"
              error={reauthError}
              autoFocus
            />
          ) : (
            <View style={[styles.listBox, { backgroundColor: c.primarySoft }]}>
              <Txt variant="body" weight="600" color={c.primary}>
                {t('acct.reauthGoogle')}
              </Txt>
              {reauthError ? (
                <Txt variant="caption" color={c.danger} style={{ marginTop: 4 }}>
                  {reauthError}
                </Txt>
              ) : null}
            </View>
          )}
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  listBox: { padding: spacing.md, borderRadius: radius.md },
});
