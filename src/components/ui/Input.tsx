import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useI18n } from '@/i18n';
import { parseNumberInput } from '@/lib/format';
import { hit, radius, spacing, useColors } from '@/theme';
import { withAlpha } from '@/theme/colors';
import { fontFamilyFor } from '@/theme/fonts';
import { Txt } from './Txt';

export function Field({
  label,
  hint,
  error,
  required,
  children,
  style,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? (
        <View style={styles.labelRow}>
          <Txt variant="label" weight="600" muted>
            {label}
          </Txt>
          {required ? (
            <Txt variant="label" weight="700" color={c.danger}>
              *
            </Txt>
          ) : null}
        </View>
      ) : null}
      {children}
      {error ? (
        <Txt variant="caption" color={c.danger}>
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="caption" faint>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

export type TextFieldProps = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  keyboardType?: KeyboardTypeOptions;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  prefix?: string;
  suffix?: string;
  multiline?: boolean;
  autoFocus?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  maxLength?: number;
  onSubmitEditing?: () => void;
  big?: boolean;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  testID?: string;
};

export function TextField({
  value,
  onChangeText,
  placeholder,
  label,
  hint,
  error,
  required,
  keyboardType,
  icon,
  prefix,
  suffix,
  multiline,
  autoFocus,
  secureTextEntry,
  autoCapitalize = 'sentences',
  maxLength,
  onSubmitEditing,
  big,
  style,
  inputStyle,
  testID,
}: TextFieldProps) {
  const c = useColors();
  const { lang, isRTL, urduDigits } = useI18n();
  const [focused, setFocused] = useState(false);

  const isNumeric = keyboardType === 'numeric' || keyboardType === 'decimal-pad' || keyboardType === 'phone-pad';
  const family = fontFamilyFor(lang, isNumeric ? 'numeric' : 'ui', big ? '700' : '500', urduDigits && !isNumeric);

  return (
    <Field label={label} hint={hint} error={error} required={required} style={style}>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: c.cardAlt,
            borderColor: error ? c.danger : focused ? c.primary : c.border,
            minHeight: big ? 66 : hit.min,
            paddingVertical: multiline ? spacing.md : 0,
            alignItems: multiline ? 'flex-start' : 'center',
          },
          focused && !error ? { backgroundColor: c.card } : null,
        ]}
      >
        {icon ? (
          <MaterialCommunityIcons name={icon} size={20} color={focused ? c.primary : c.textFaint} />
        ) : null}
        {prefix ? (
          <Txt variant={big ? 'subtitle' : 'body'} weight="600" muted>
            {prefix}
          </Txt>
        ) : null}
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.textFaint}
          keyboardType={keyboardType}
          multiline={multiline}
          autoFocus={autoFocus}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          maxLength={maxLength}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          cursorColor={c.primary}
          selectionColor={withAlpha(c.primary, 0.3)}
          style={[
            styles.input,
            {
              color: c.text,
              fontFamily: family,
              fontSize: big ? 24 : 16,
              textAlign: isNumeric ? (isRTL ? 'right' : 'left') : isRTL ? 'right' : 'left',
              writingDirection: isNumeric ? 'ltr' : isRTL ? 'rtl' : 'ltr',
              minHeight: multiline ? 84 : undefined,
              textAlignVertical: multiline ? 'top' : 'center',
            },
            inputStyle,
          ]}
        />
        {suffix ? (
          <Txt variant={big ? 'subtitle' : 'body'} weight="600" muted>
            {suffix}
          </Txt>
        ) : null}
      </View>
    </Field>
  );
}

export type NumberFieldProps = Omit<TextFieldProps, 'value' | 'onChangeText' | 'keyboardType'> & {
  value: number;
  onChangeValue: (v: number) => void;
  allowDecimal?: boolean;
  min?: number;
  max?: number;
};

/** Numeric input that keeps its own draft string so typing "1." works. */
export function NumberField({
  value,
  onChangeValue,
  allowDecimal = true,
  min,
  max,
  ...rest
}: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value === 0 ? '' : String(value));

  const commit = (text: string) => {
    setDraft(text);
    let parsed = parseNumberInput(text);
    if (!allowDecimal) parsed = Math.round(parsed);
    if (min !== undefined) parsed = Math.max(min, parsed);
    if (max !== undefined) parsed = Math.min(max, parsed);
    onChangeValue(parsed);
  };

  return (
    <TextField
      {...rest}
      value={shown}
      onChangeText={commit}
      keyboardType={allowDecimal ? 'decimal-pad' : 'number-pad'}
    />
  );
}

/** Big +/− stepper — the fastest control for litres on a doorstep. */
export function Stepper({
  value,
  onChange,
  step = 0.5,
  min = 0,
  max = 999,
  suffix,
  size = 'md',
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  size?: 'md' | 'lg';
}) {
  const c = useColors();
  const { qty } = useI18n();
  const btn = size === 'lg' ? 54 : 44;

  const bump = (delta: number) => {
    const next = Math.min(max, Math.max(min, Math.round((value + delta) * 100) / 100));
    if (next !== value) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      onChange(next);
    }
  };

  return (
    <View style={[styles.stepper, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
      <Pressable
        onPress={() => bump(-step)}
        disabled={value <= min}
        style={({ pressed }) => [
          styles.stepBtn,
          { width: btn, height: btn, opacity: value <= min ? 0.3 : pressed ? 0.6 : 1 },
        ]}
      >
        <MaterialCommunityIcons name="minus" size={size === 'lg' ? 26 : 22} color={c.text} />
      </Pressable>
      <View style={styles.stepValue}>
        <Txt variant={size === 'lg' ? 'amountLg' : 'amount'} weight="700" align="center" role="numeric">
          {qty(value)}
          {suffix ? <Txt variant="caption" muted>{` ${suffix}`}</Txt> : null}
        </Txt>
      </View>
      <Pressable
        onPress={() => bump(step)}
        disabled={value >= max}
        style={({ pressed }) => [
          styles.stepBtn,
          { width: btn, height: btn, opacity: value >= max ? 0.3 : pressed ? 0.6 : 1 },
        ]}
      >
        <MaterialCommunityIcons name="plus" size={size === 'lg' ? 26 : 22} color={c.primary} />
      </Pressable>
    </View>
  );
}

export function SwitchRow({
  label,
  sublabel,
  value,
  onValueChange,
  icon,
  iconColor,
  disabled,
}: {
  label: string;
  sublabel?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      style={[styles.switchRow, disabled && { opacity: 0.5 }]}
    >
      {icon ? (
        <View style={[styles.switchIcon, { backgroundColor: withAlpha(iconColor ?? c.primary, 0.13) }]}>
          <MaterialCommunityIcons name={icon} size={19} color={iconColor ?? c.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Txt variant="body" weight="600">
          {label}
        </Txt>
        {sublabel ? (
          <Txt variant="caption" muted style={{ marginTop: 1 }}>
            {sublabel}
          </Txt>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: c.borderStrong, true: withAlpha(c.primary, 0.45) }}
        thumbColor={value ? c.primary : c.card}
      />
    </Pressable>
  );
}

export function SearchBar({
  value,
  onChangeText,
  placeholder,
  autoFocus,
  style,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const { lang, isRTL, urduDigits } = useI18n();
  return (
    <View style={[styles.search, { backgroundColor: c.cardAlt, borderColor: c.border }, style]}>
      <MaterialCommunityIcons name="magnify" size={21} color={c.textFaint} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textFaint}
        autoFocus={autoFocus}
        autoCorrect={false}
        cursorColor={c.primary}
        style={[
          styles.input,
          {
            color: c.text,
            fontFamily: fontFamilyFor(lang, 'ui', '500', urduDigits),
            fontSize: 15.5,
            textAlign: isRTL ? 'right' : 'left',
          },
        ]}
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10}>
          <MaterialCommunityIcons name="close-circle" size={19} color={c.textFaint} />
        </Pressable>
      ) : null}
    </View>
  );
}

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
};

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  style,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  return (
    <View style={[styles.segmented, { backgroundColor: c.bgSunken, padding: 3 }, style]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              Haptics.selectionAsync().catch(() => undefined);
              onChange(o.value);
            }}
            style={[
              styles.segment,
              {
                height: size === 'sm' ? 34 : 42,
                backgroundColor: active ? c.card : 'transparent',
              },
              active && { shadowColor: c.shadow, shadowOpacity: 0.08, shadowRadius: 5, elevation: 2 },
            ]}
          >
            {o.icon ? (
              <MaterialCommunityIcons
                name={o.icon}
                size={size === 'sm' ? 15 : 17}
                color={active ? c.primary : c.textMuted}
              />
            ) : null}
            <Txt
              variant={size === 'sm' ? 'caption' : 'label'}
              weight={active ? '700' : '500'}
              color={active ? c.text : c.textMuted}
              numberOfLines={1}
            >
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  icon,
  color,
  count,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  color?: string;
  count?: number;
}) {
  const c = useColors();
  const tint = color ?? c.primary;
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? tint : c.card,
          borderColor: active ? tint : c.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      {icon ? (
        <MaterialCommunityIcons name={icon} size={15} color={active ? '#fff' : tint} />
      ) : null}
      <Txt variant="label" weight="600" color={active ? '#fff' : c.text} numberOfLines={1}>
        {label}
      </Txt>
      {count !== undefined ? (
        <View
          style={[
            styles.chipCount,
            { backgroundColor: active ? withAlpha('#ffffff', 0.25) : c.bgSunken },
          ]}
        >
          <Txt variant="micro" weight="700" color={active ? '#fff' : c.textMuted} role="numeric">
            {String(count)}
          </Txt>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    padding: 0,
    includeFontPadding: false,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  stepBtn: { alignItems: 'center', justifyContent: 'center' },
  stepValue: { flex: 1, minWidth: 60, paddingHorizontal: spacing.xs },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: hit.min,
  },
  switchIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: radius.md,
    gap: 3,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: radius.sm + 1,
    paddingHorizontal: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  chipCount: {
    minWidth: 20,
    paddingHorizontal: 5,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
