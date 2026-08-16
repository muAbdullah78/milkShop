import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useI18n } from '@/i18n';
import { initialsOf } from '@/lib/format';
import { hit, radius, spacing, useColors } from '@/theme';
import { avatarColorFor, withAlpha } from '@/theme/colors';
import { Txt } from './Txt';

export function Avatar({
  name,
  size = 46,
  color,
  icon,
  style,
}: {
  name: string;
  size?: number;
  color?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  style?: StyleProp<ViewStyle>;
}) {
  const tint = color ?? avatarColorFor(name || '?');
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size * 0.34,
          backgroundColor: withAlpha(tint, 0.16),
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {icon ? (
        <MaterialCommunityIcons name={icon} size={size * 0.48} color={tint} />
      ) : (
        <Txt variant={size > 40 ? 'body' : 'caption'} weight="700" color={tint} role="ui">
          {initialsOf(name)}
        </Txt>
      )}
    </View>
  );
}

export function ListRow({
  title,
  subtitle,
  meta,
  metaSub,
  metaColor,
  left,
  icon,
  iconColor,
  onPress,
  onLongPress,
  right,
  chevron = true,
  danger,
  style,
  compact,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  metaSub?: string;
  metaColor?: string;
  left?: React.ReactNode;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  right?: React.ReactNode;
  chevron?: boolean;
  danger?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const c = useColors();
  const { isRTL } = useI18n();

  const body = (
    <>
      {left ??
        (icon ? (
          <View
            style={[
              styles.iconBox,
              { backgroundColor: withAlpha(iconColor ?? c.primary, 0.13) },
            ]}
          >
            <MaterialCommunityIcons name={icon} size={21} color={iconColor ?? c.primary} />
          </View>
        ) : null)}

      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt
          variant={compact ? 'body' : 'bodyLg'}
          weight="600"
          numberOfLines={1}
          color={danger ? c.danger : undefined}
        >
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="caption" muted numberOfLines={1} style={{ marginTop: 1 }}>
            {subtitle}
          </Txt>
        ) : null}
      </View>

      {meta ? (
        <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
          <Txt variant="amount" weight="700" color={metaColor} role="numeric">
            {meta}
          </Txt>
          {metaSub ? (
            <Txt variant="micro" faint style={{ marginTop: 1 }}>
              {metaSub}
            </Txt>
          ) : null}
        </View>
      ) : null}

      {right}

      {onPress && chevron && !right && !meta ? (
        <MaterialCommunityIcons
          name={isRTL ? 'chevron-left' : 'chevron-right'}
          size={22}
          color={c.textFaint}
        />
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={[styles.row, compact && styles.rowCompact, style]}>{body}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        compact && styles.rowCompact,
        pressed && { backgroundColor: c.bgSunken },
        style,
      ]}
    >
      {body}
    </Pressable>
  );
}

/** Groups rows into a single rounded card with hairline separators. */
export function ListCard({
  children,
  style,
  title,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  title?: string;
}) {
  const c = useColors();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={style}>
      {title ? (
        <Txt variant="label" weight="700" muted style={{ marginBottom: spacing.sm, marginStart: spacing.xs }}>
          {title}
        </Txt>
      ) : null}
      <View
        style={{
          backgroundColor: c.card,
          borderRadius: radius.lg,
          overflow: 'hidden',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.border,
        }}
      >
        {items.map((child, i) => (
          <View key={i}>
            {i > 0 ? (
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: c.divider,
                  marginStart: spacing.lg + 38,
                }}
              />
            ) : null}
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: hit.chunky,
  },
  rowCompact: {
    minHeight: hit.min,
    paddingVertical: spacing.sm + 2,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
