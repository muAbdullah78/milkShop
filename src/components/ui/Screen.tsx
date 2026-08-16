import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/i18n';
import { hit, radius, spacing, useColors, useTheme } from '@/theme';
import { Txt } from './Txt';

export function Screen({
  children,
  scroll,
  padded = true,
  style,
  contentStyle,
  bg,
  refreshControl,
  edges = ['top'],
  keyboardShouldPersistTaps,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  bg?: string;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  edges?: ('top' | 'bottom')[];
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
}) {
  const c = useColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const paddingTop = edges.includes('top') ? insets.top : 0;
  const paddingBottom = edges.includes('bottom') ? insets.bottom : 0;

  const inner = (
    <View
      style={[
        { flex: scroll ? 0 : 1 },
        padded && { paddingHorizontal: spacing.lg },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <View style={[{ flex: 1, backgroundColor: bg ?? c.bg, paddingTop, paddingBottom }, style]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps ?? 'handled'}
          refreshControl={refreshControl}
          contentContainerStyle={{ paddingBottom: spacing.huge }}
        >
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </View>
  );
}

export type HeaderAction = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  label?: string;
  tint?: string;
};

export function AppHeader({
  title,
  subtitle,
  back,
  onBack,
  actions,
  variant = 'plain',
  large,
  style,
  children,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  onBack?: () => void;
  actions?: HeaderAction[];
  variant?: 'plain' | 'transparent';
  large?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const c = useColors();
  const router = useRouter();
  const { isRTL } = useI18n();

  return (
    <View
      style={[
        styles.header,
        variant === 'plain' && { backgroundColor: c.bg },
        style,
      ]}
    >
      <View style={styles.headerRow}>
        {back ? (
          <Pressable
            onPress={() => (onBack ? onBack() : router.back())}
            hitSlop={12}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.backBtn,
              { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <MaterialCommunityIcons
              name={isRTL ? 'chevron-right' : 'chevron-left'}
              size={24}
              color={c.text}
            />
          </Pressable>
        ) : null}

        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt variant={large ? 'display' : 'title'} weight="700" numberOfLines={1}>
            {title}
          </Txt>
          {subtitle ? (
            <Txt variant="caption" muted numberOfLines={1} style={{ marginTop: 1 }}>
              {subtitle}
            </Txt>
          ) : null}
        </View>

        {actions?.length ? (
          <View style={styles.actions}>
            {actions.map((a, i) => (
              <Pressable
                key={`${a.icon}-${i}`}
                onPress={a.onPress}
                hitSlop={10}
                accessibilityLabel={a.label ?? a.icon}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <MaterialCommunityIcons name={a.icon} size={21} color={a.tint ?? c.text} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Sticky footer for primary actions — sits above the gesture bar. */
export function FooterBar({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.footer,
        {
          backgroundColor: c.card,
          borderTopColor: c.border,
          paddingBottom: Math.max(insets.bottom, spacing.md),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function FAB({
  icon,
  label,
  onPress,
  bottom = spacing.xl,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label?: string;
  onPress: () => void;
  bottom?: number;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label ?? icon}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: c.primary,
          bottom: bottom + insets.bottom,
          transform: [{ scale: pressed ? 0.95 : 1 }],
          shadowColor: c.primary,
        },
        label ? { paddingHorizontal: spacing.xl, borderRadius: radius.pill } : null,
      ]}
    >
      <MaterialCommunityIcons name={icon} size={26} color={c.onPrimary} />
      {label ? (
        <Txt variant="body" weight="700" color={c.onPrimary}>
          {label}
        </Txt>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    gap: spacing.sm,
    ...Platform.select({ android: { elevation: 12 }, default: {} }),
  },
  fab: {
    position: 'absolute',
    end: spacing.lg,
    minWidth: hit.chunky,
    height: hit.chunky,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
