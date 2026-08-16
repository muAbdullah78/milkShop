import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useI18n } from '@/i18n';
import { radius, spacing, useColors, useTheme } from '@/theme';
import { withAlpha } from '@/theme/colors';
import { Txt } from './Txt';

export function Card({
  children,
  style,
  level = 1,
  padded = true,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  level?: 0 | 1 | 2 | 3;
  padded?: boolean;
  onPress?: () => void;
}) {
  const c = useColors();
  const { elevation } = useTheme();
  const base: ViewStyle = {
    backgroundColor: c.card,
    borderRadius: radius.lg,
    padding: padded ? spacing.lg : 0,
    ...elevation(level),
  };
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [base, pressed && { opacity: 0.85 }, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

/** The deep-blue hero used on the dashboard and bill headers. */
export function BrandGradient({
  children,
  style,
  radiusOverride,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  radiusOverride?: number;
}) {
  const c = useColors();
  return (
    <LinearGradient
      colors={c.brandGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ borderRadius: radiusOverride ?? radius.xl, overflow: 'hidden' }, style]}
    >
      {children}
    </LinearGradient>
  );
}

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  icon,
  style,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const { isRTL } = useI18n();
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={styles.sectionTitleWrap}>
        {icon ? (
          <View style={[styles.sectionIcon, { backgroundColor: c.primarySoft }]}>
            <MaterialCommunityIcons name={icon} size={16} color={c.primary} />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Txt variant="subtitle" weight="700">
            {title}
          </Txt>
          {subtitle ? (
            <Txt variant="caption" muted style={{ marginTop: 1 }}>
              {subtitle}
            </Txt>
          ) : null}
        </View>
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={10} style={styles.sectionAction}>
          <Txt variant="label" weight="700" color={c.primary}>
            {actionLabel}
          </Txt>
          <MaterialCommunityIcons
            name={isRTL ? 'chevron-left' : 'chevron-right'}
            size={17}
            color={c.primary}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Divider({ style, inset = 0 }: { style?: StyleProp<ViewStyle>; inset?: number }) {
  const c = useColors();
  return (
    <View
      style={[{ height: StyleSheet.hairlineWidth * 2, backgroundColor: c.divider, marginStart: inset }, style]}
    />
  );
}

export function Badge({
  label,
  color,
  bg,
  icon,
  size = 'md',
  style,
}: {
  label: string;
  color?: string;
  bg?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const fg = color ?? c.primary;
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          alignSelf: 'flex-start',
          paddingHorizontal: size === 'sm' ? 7 : 10,
          paddingVertical: size === 'sm' ? 2 : 4,
          borderRadius: radius.pill,
          backgroundColor: bg ?? withAlpha(fg, 0.13),
        },
        style,
      ]}
    >
      {icon ? <MaterialCommunityIcons name={icon} size={size === 'sm' ? 11 : 13} color={fg} /> : null}
      <Txt variant={size === 'sm' ? 'micro' : 'caption'} weight="700" color={fg}>
        {label}
      </Txt>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
  compact,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  const c = useColors();
  return (
    <View style={[styles.empty, compact && { paddingVertical: spacing.xl }]}>
      <View style={[styles.emptyIcon, { backgroundColor: c.primarySoft }]}>
        <MaterialCommunityIcons name={icon} size={38} color={c.primary} />
      </View>
      <Txt variant="subtitle" weight="700" align="center" style={{ marginTop: spacing.lg }}>
        {title}
      </Txt>
      {subtitle ? (
        <Txt variant="body" muted align="center" style={{ marginTop: spacing.xs, maxWidth: 320 }}>
          {subtitle}
        </Txt>
      ) : null}
      {action ? <View style={{ marginTop: spacing.xl }}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
