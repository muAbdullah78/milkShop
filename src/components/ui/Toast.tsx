import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { duration, radius, spacing, useColors } from '@/theme';
import { Txt } from './Txt';

type ToastKind = 'success' | 'error' | 'info';

type ToastItem = { id: number; message: string; kind: ToastKind; action?: { label: string; onPress: () => void } };

type ToastValue = {
  show: (message: string, kind?: ToastKind, action?: ToastItem['action']) => void;
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [item, setItem] = useState<ToastItem | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);

  const hide = useCallback(() => {
    Animated.timing(anim, {
      toValue: 0,
      duration: duration.fast,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setItem(null));
  }, [anim]);

  const show = useCallback<ToastValue['show']>(
    (message, kind = 'info', action) => {
      counter.current += 1;
      setItem({ id: counter.current, message, kind, action });
      if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      if (kind === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    },
    []
  );

  useEffect(() => {
    if (!item) return;
    Animated.timing(anim, {
      toValue: 1,
      duration: duration.base,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(hide, item.action ? 5200 : 3000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [item, anim, hide]);

  const value = useMemo<ToastValue>(
    () => ({
      show,
      success: (m) => show(m, 'success'),
      error: (m) => show(m, 'error'),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastHost item={item} anim={anim} onHide={hide} />
    </ToastContext.Provider>
  );
}

function ToastHost({
  item,
  anim,
  onHide,
}: {
  item: ToastItem | null;
  anim: Animated.Value;
  onHide: () => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  if (!item) return null;

  const tint = item.kind === 'success' ? c.success : item.kind === 'error' ? c.danger : c.primary;
  const icon = item.kind === 'success' ? 'check-circle' : item.kind === 'error' ? 'alert-circle' : 'information';

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.host,
        {
          bottom: insets.bottom + 88,
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
            { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
          ],
        },
      ]}
    >
      <Pressable
        onPress={onHide}
        style={[styles.toast, { backgroundColor: c.mode === 'dark' ? c.cardAlt : '#0B1B3A' }]}
      >
        <MaterialCommunityIcons name={icon} size={20} color={tint} />
        <Txt variant="body" weight="600" color="#FFFFFF" style={{ flex: 1 }} numberOfLines={3}>
          {item.message}
        </Txt>
        {item.action ? (
          <Pressable
            onPress={() => {
              item.action?.onPress();
              onHide();
            }}
            hitSlop={8}
          >
            <Txt variant="label" weight="700" color={tint}>
              {item.action.label}
            </Txt>
          </Pressable>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    start: spacing.lg,
    end: spacing.lg,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    maxWidth: 520,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
});
