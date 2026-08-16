import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { duration, radius, spacing, useColors } from '@/theme';
import { Button } from './Button';
import { Txt } from './Txt';

export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  scrollable = true,
  maxHeightRatio = 0.9,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  scrollable?: boolean;
  maxHeightRatio?: number;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: visible ? duration.base : duration.fast,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });


  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: c.card,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
              maxHeight: height * maxHeightRatio,
              transform: [{ translateY }],
              opacity: slide,
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: c.borderStrong }]} />

          {title ? (
            <View style={styles.head}>
              <View style={{ flex: 1 }}>
                <Txt variant="title" weight="700" numberOfLines={2}>
                  {title}
                </Txt>
                {subtitle ? (
                  <Txt variant="caption" muted style={{ marginTop: 2 }}>
                    {subtitle}
                  </Txt>
                ) : null}
              </View>
              <Pressable onPress={onClose} hitSlop={12} style={[styles.close, { backgroundColor: c.bgSunken }]}>
                <MaterialCommunityIcons name="close" size={19} color={c.textMuted} />
              </Pressable>
            </View>
          ) : null}

          {scrollable ? (
            <ScrollView
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={{ paddingHorizontal: spacing.lg }}>{children}</View>
          )}

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive,
  loading,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const c = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={[styles.backdrop, styles.center, { backgroundColor: c.overlay }]}>
        <View style={[styles.dialog, { backgroundColor: c.card }]}>
          <View
            style={[
              styles.dialogIcon,
              { backgroundColor: destructive ? c.dangerSoft : c.primarySoft },
            ]}
          >
            <MaterialCommunityIcons
              name={destructive ? 'alert-outline' : 'help-circle-outline'}
              size={28}
              color={destructive ? c.danger : c.primary}
            />
          </View>
          <Txt variant="subtitle" weight="700" align="center" style={{ marginTop: spacing.md }}>
            {title}
          </Txt>
          {message ? (
            <Txt variant="body" muted align="center" style={{ marginTop: spacing.xs }}>
              {message}
            </Txt>
          ) : null}
          <View style={styles.dialogActions}>
            <Button label={cancelLabel} variant="outline" onPress={onCancel} style={{ flex: 1 }} />
            <Button
              label={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              loading={loading}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  kav: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingTop: spacing.sm,
  },
  grabber: {
    width: 42,
    height: 4.5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  dialogIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    alignSelf: 'stretch',
  },
});
