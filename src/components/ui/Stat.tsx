import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing, useColors, useTheme } from '@/theme';
import { withAlpha } from '@/theme/colors';
import { Txt } from './Txt';

export function StatTile({
  label,
  value,
  sub,
  icon,
  tint,
  onPress,
  style,
  emphasis = 'soft',
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  tint?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** `soft` = tinted card, `plain` = neutral card, `solid` = filled. */
  emphasis?: 'soft' | 'plain' | 'solid';
}) {
  const c = useColors();
  const { elevation } = useTheme();
  const color = tint ?? c.primary;

  const bg =
    emphasis === 'solid' ? color : emphasis === 'soft' ? withAlpha(color, c.mode === 'dark' ? 0.16 : 0.1) : c.card;
  const fg = emphasis === 'solid' ? '#FFFFFF' : c.text;
  const labelColor = emphasis === 'solid' ? withAlpha('#FFFFFF', 0.82) : c.textMuted;

  const inner = (
    <>
      <View style={styles.tileTop}>
        {icon ? (
          <View
            style={[
              styles.tileIcon,
              {
                backgroundColor:
                  emphasis === 'solid' ? withAlpha('#FFFFFF', 0.2) : withAlpha(color, 0.16),
              },
            ]}
          >
            <MaterialCommunityIcons
              name={icon}
              size={16}
              color={emphasis === 'solid' ? '#FFFFFF' : color}
            />
          </View>
        ) : null}
        <Txt variant="caption" weight="600" color={labelColor} numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </Txt>
      </View>
      <Txt
        variant="amountLg"
        weight="800"
        color={emphasis === 'plain' ? color : fg}
        numberOfLines={1}
        adjustsFontSizeToFit
        role="numeric"
        style={{ marginTop: spacing.xs }}
      >
        {value}
      </Txt>
      {sub ? (
        <Txt variant="micro" color={emphasis === 'solid' ? withAlpha('#FFFFFF', 0.75) : c.textFaint} numberOfLines={1}>
          {sub}
        </Txt>
      ) : null}
    </>
  );

  const boxStyle: ViewStyle = {
    flex: 1,
    minWidth: 0,
    backgroundColor: bg,
    borderRadius: radius.lg,
    padding: spacing.md + 2,
    ...(emphasis === 'plain' ? elevation(1) : {}),
  };

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [boxStyle, pressed && { opacity: 0.85 }, style]}>
        {inner}
      </Pressable>
    );
  }
  return <View style={[boxStyle, style]}>{inner}</View>;
}

/** Compact label/value pair used inside cards. */
export function MiniStat({
  label,
  value,
  color,
  align = 'start',
}: {
  label: string;
  value: string;
  color?: string;
  align?: 'start' | 'center' | 'end';
}) {
  return (
    <View style={{ flex: 1, alignItems: align === 'center' ? 'center' : align === 'end' ? 'flex-end' : 'flex-start' }}>
      <Txt variant="micro" muted numberOfLines={1}>
        {label}
      </Txt>
      <Txt variant="amount" weight="700" color={color} numberOfLines={1} role="numeric" style={{ marginTop: 1 }}>
        {value}
      </Txt>
    </View>
  );
}

export function ProgressBar({
  progress,
  color,
  height = 8,
  track,
  style,
}: {
  progress: number;
  color?: string;
  height?: number;
  track?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const pct = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  return (
    <View
      style={[
        { height, borderRadius: height / 2, backgroundColor: track ?? c.bgSunken, overflow: 'hidden' },
        style,
      ]}
    >
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color ?? c.primary,
        }}
      />
    </View>
  );
}

export function Skeleton({
  width,
  height = 16,
  round = radius.sm,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  round?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  return (
    <View
      style={[
        { width: width ?? '100%', height, borderRadius: round, backgroundColor: c.skeleton },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  tileTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tileIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
