import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useColors, radius, spacing } from '@/theme';
import { withAlpha } from '@/theme/colors';
import { Txt } from './Txt';

export type ButtonVariant = 'primary' | 'tonal' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconRight?: keyof typeof MaterialCommunityIcons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const SIZES: Record<ButtonSize, { h: number; px: number; icon: number; variant: 'label' | 'body' | 'bodyLg' | 'subtitle' }> = {
  sm: { h: 38, px: 14, icon: 17, variant: 'label' },
  md: { h: 50, px: 18, icon: 19, variant: 'body' },
  lg: { h: 58, px: 22, icon: 22, variant: 'bodyLg' },
  xl: { h: 68, px: 24, icon: 26, variant: 'subtitle' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  disabled,
  full,
  haptic = true,
  style,
  testID,
}: ButtonProps) {
  const c = useColors();
  const s = SIZES[size];
  const isDisabled = disabled || loading;

  const palette: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: c.primary, fg: c.onPrimary },
    tonal: { bg: c.primarySoft, fg: c.primary },
    outline: { bg: 'transparent', fg: c.text, border: c.borderStrong },
    ghost: { bg: 'transparent', fg: c.primary },
    danger: { bg: c.danger, fg: '#FFFFFF' },
    success: { bg: c.success, fg: '#FFFFFF' },
  };
  const p = palette[variant];

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(isDisabled), busy: Boolean(loading) }}
      disabled={isDisabled}
      onPress={() => {
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          height: s.h,
          paddingHorizontal: s.px,
          borderRadius: size === 'xl' ? radius.lg : radius.md,
          backgroundColor: p.bg,
          borderWidth: p.border ? 1.5 : 0,
          borderColor: p.border,
          opacity: isDisabled ? 0.5 : 1,
          alignSelf: full ? 'stretch' : 'flex-start',
          transform: [{ scale: pressed && !isDisabled ? 0.975 : 1 }],
        },
        pressed && !isDisabled && variant !== 'primary' ? { backgroundColor: withAlpha(p.fg, 0.1) } : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} size="small" />
      ) : (
        <View style={styles.row}>
          {icon ? <MaterialCommunityIcons name={icon} size={s.icon} color={p.fg} /> : null}
          <Txt variant={s.variant} weight="700" color={p.fg} numberOfLines={1} align="center">
            {label}
          </Txt>
          {iconRight ? <MaterialCommunityIcons name={iconRight} size={s.icon} color={p.fg} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});

export type IconButtonProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress?: () => void;
  size?: number;
  color?: string;
  bg?: string;
  disabled?: boolean;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  icon,
  onPress,
  size = 44,
  color,
  bg,
  disabled,
  label,
  style,
}: IconButtonProps) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? icon}
      disabled={disabled}
      onPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        onPress?.();
      }}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg ?? 'transparent',
          opacity: disabled ? 0.4 : pressed ? 0.65 : 1,
        },
        style,
      ]}
    >
      <MaterialCommunityIcons name={icon} size={size * 0.5} color={color ?? c.text} />
    </Pressable>
  );
}
