import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { useLock } from '@/data/LockProvider';
import { useI18n } from '@/i18n';
import { radius, spacing, useColors } from '@/theme';
import { withAlpha } from '@/theme/colors';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

/**
 * Full-screen PIN pad. Rendered above the navigator (not as a route) so it
 * cannot be dismissed with the back gesture and never loses the user's place.
 */
export function LockScreen() {
  const c = useColors();
  const { t, digits } = useI18n();
  const { unlock } = useLock();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  const fail = useCallback(() => {
    setError(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start(() => setPin(''));
  }, [shake]);

  useEffect(() => {
    if (pin.length !== 4) return;
    let cancelled = false;
    unlock(pin).then((ok) => {
      if (cancelled) return;
      if (ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        setPin('');
        setError(false);
      } else {
        fail();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pin, unlock, fail]);

  const press = (key: string) => {
    Haptics.selectionAsync().catch(() => undefined);
    setError(false);
    if (key === 'del') setPin((p) => p.slice(0, -1));
    else if (pin.length < 4) setPin((p) => p + key);
  };

  const translateX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-9, 9] });

  return (
    <View style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: c.bg }]}>
      <View style={[styles.badge, { backgroundColor: c.primarySoft }]}>
        <MaterialCommunityIcons name="lock" size={34} color={c.primary} />
      </View>

      <Txt variant="title" weight="700" align="center" style={{ marginTop: spacing.xl }}>
        {t('app.name')}
      </Txt>
      <Txt variant="body" muted align="center" style={{ marginTop: spacing.xs }}>
        {error ? t('set.pinWrong') : t('set.pinEnter')}
      </Txt>

      <Animated.View style={[styles.dots, { transform: [{ translateX }] }]}>
        {[0, 1, 2, 3].map((i) => {
          const filled = i < pin.length;
          return (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: error
                    ? c.danger
                    : filled
                      ? c.primary
                      : withAlpha(c.textFaint, 0.28),
                  transform: [{ scale: filled ? 1.12 : 1 }],
                },
              ]}
            />
          );
        })}
      </Animated.View>

      <View style={styles.pad}>
        {KEYS.map((key, i) =>
          key === '' ? (
            <View key={`sp-${i}`} style={styles.key} />
          ) : (
            <Pressable
              key={key}
              onPress={() => press(key)}
              style={({ pressed }) => [
                styles.key,
                {
                  backgroundColor: key === 'del' ? 'transparent' : c.card,
                  borderColor: key === 'del' ? 'transparent' : c.border,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              {key === 'del' ? (
                <MaterialCommunityIcons name="backspace-outline" size={25} color={c.textMuted} />
              ) : (
                <Txt variant="display" weight="600" align="center" role="numeric">
                  {digits(key)}
                </Txt>
              )}
            </Pressable>
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, zIndex: 100 },
  badge: { width: 76, height: 76, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xxl, marginBottom: spacing.xxxl },
  dot: { width: 15, height: 15, borderRadius: 8 },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    maxWidth: 300,
  },
  key: {
    width: 82,
    height: 68,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
