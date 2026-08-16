import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  AppHeader,
  Button,
  Card,
  ConfirmDialog,
  Screen,
  Sheet,
  SwitchRow,
  Txt,
  useToast,
} from '@/components/ui';
import { useLock } from '@/data/LockProvider';
import { useI18n } from '@/i18n';
import { radius, spacing, useColors } from '@/theme';
import { withAlpha } from '@/theme/colors';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

export default function SecuritySettings() {
  const c = useColors();
  const toast = useToast();
  const { t, digits } = useI18n();
  const { enabled, enable, disable } = useLock();

  const [setting, setSetting] = useState(false);
  const [stage, setStage] = useState<'create' | 'confirm'>('create');
  const [first, setFirst] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);
  const [busy, setBusy] = useState(false);

  const startSet = () => {
    setStage('create');
    setFirst('');
    setPin('');
    setError(null);
    setSetting(true);
  };

  const press = async (key: string) => {
    Haptics.selectionAsync().catch(() => undefined);
    setError(null);

    if (key === 'del') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (pin.length >= 4) return;

    const next = pin + key;
    setPin(next);
    if (next.length < 4) return;

    if (stage === 'create') {
      setFirst(next);
      setStage('confirm');
      setPin('');
      return;
    }

    if (next !== first) {
      setError(t('set.pinMismatch'));
      setStage('create');
      setFirst('');
      setPin('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      return;
    }

    setBusy(true);
    try {
      await enable(next);
      toast.success(t('set.pinOn'));
      setSetting(false);
    } catch {
      toast.error(t('err.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      await disable();
      toast.success(t('set.pinOff'));
    } catch {
      toast.error(t('err.saveFailed'));
    } finally {
      setBusy(false);
      setConfirmOff(false);
    }
  };

  return (
    <Screen padded={false} edges={['top']}>
      <AppHeader title={t('set.security')} back />

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <Card style={{ alignItems: 'center', gap: spacing.md }}>
          <View style={[styles.icon, { backgroundColor: enabled ? c.successSoft : c.bgSunken }]}>
            <MaterialCommunityIcons
              name={enabled ? 'lock-check' : 'lock-open-variant-outline'}
              size={34}
              color={enabled ? c.success : c.textMuted}
            />
          </View>
          <Txt variant="subtitle" weight="700" align="center">
            {enabled ? t('set.pinOn') : t('set.pinOff')}
          </Txt>
          <Txt variant="body" muted align="center">
            {t('set.pinSub')}
          </Txt>
        </Card>

        <Card>
          <SwitchRow
            label={t('set.pin')}
            sublabel={t('set.pinSub')}
            value={enabled}
            onValueChange={(v) => (v ? startSet() : setConfirmOff(true))}
            icon="lock-outline"
            iconColor={c.primary}
          />
        </Card>

        {enabled ? (
          <Button label={t('set.pinChange')} icon="lock-reset" variant="tonal" size="lg" full onPress={startSet} />
        ) : null}
      </ScrollView>

      <Sheet
        visible={setting}
        onClose={() => setSetting(false)}
        title={stage === 'create' ? t('set.pinCreate') : t('set.pinConfirm')}
        subtitle={error ?? undefined}
        scrollable={false}
      >
        <View style={{ alignItems: 'center', paddingBottom: spacing.lg }}>
          <View style={styles.dots}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: error
                      ? c.danger
                      : i < pin.length
                        ? c.primary
                        : withAlpha(c.textFaint, 0.28),
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.pad}>
            {KEYS.map((key, i) =>
              key === '' ? (
                <View key={`sp-${i}`} style={styles.key} />
              ) : (
                <Pressable
                  key={key}
                  onPress={() => press(key)}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.key,
                    {
                      backgroundColor: key === 'del' ? 'transparent' : c.cardAlt,
                      borderColor: key === 'del' ? 'transparent' : c.border,
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}
                >
                  {key === 'del' ? (
                    <MaterialCommunityIcons name="backspace-outline" size={23} color={c.textMuted} />
                  ) : (
                    <Txt variant="title" weight="600" align="center" role="numeric">
                      {digits(key)}
                    </Txt>
                  )}
                </Pressable>
              )
            )}
          </View>
        </View>
      </Sheet>

      <ConfirmDialog
        visible={confirmOff}
        title={t('set.pinRemove')}
        message={t('set.pinSub')}
        confirmLabel={t('set.pinRemove')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={busy}
        onConfirm={turnOff}
        onCancel={() => setConfirmOff(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 76, height: 76, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.xl },
  dot: { width: 14, height: 14, borderRadius: 7 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, maxWidth: 280 },
  key: {
    width: 78,
    height: 60,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
