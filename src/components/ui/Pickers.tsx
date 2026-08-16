import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useI18n } from '@/i18n';
import {
  dayKey,
  formatDayLong,
  formatMonthLong,
  isFuture,
  isToday,
  parseDay,
  shiftDay,
  shiftMonth,
  thisMonthKey,
} from '@/lib/dates';
import { hit, radius, spacing, useColors } from '@/theme';
import { swatchOrder, swatches, withAlpha } from '@/theme/colors';
import { Txt } from './Txt';
import { Sheet } from './Sheet';

/** ◀ Today ▶ — the control at the top of the milk round. */
export function DayStepper({
  value,
  onChange,
  style,
}: {
  value: string;
  onChange: (day: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const { t, lang, isRTL } = useI18n();
  const [picking, setPicking] = useState(false);
  const atToday = isToday(value);

  return (
    <>
      <View style={[styles.stepperBar, { backgroundColor: c.card, borderColor: c.border }, style]}>
        <Pressable
          onPress={() => onChange(shiftDay(value, -1))}
          hitSlop={8}
          style={({ pressed }) => [styles.stepperArrow, pressed && { opacity: 0.5 }]}
        >
          <MaterialCommunityIcons name={isRTL ? 'chevron-right' : 'chevron-left'} size={24} color={c.text} />
        </Pressable>

        <Pressable onPress={() => setPicking(true)} style={styles.stepperLabel}>
          <Txt variant="body" weight="700" align="center" numberOfLines={1}>
            {atToday ? t('common.today') : formatDayLong(value, lang)}
          </Txt>
          {atToday ? (
            <Txt variant="micro" muted align="center">
              {formatDayLong(value, lang)}
            </Txt>
          ) : null}
        </Pressable>

        <Pressable
          onPress={() => !isFuture(shiftDay(value, 1)) && onChange(shiftDay(value, 1))}
          hitSlop={8}
          disabled={isFuture(shiftDay(value, 1))}
          style={({ pressed }) => [
            styles.stepperArrow,
            { opacity: isFuture(shiftDay(value, 1)) ? 0.25 : pressed ? 0.5 : 1 },
          ]}
        >
          <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={24} color={c.text} />
        </Pressable>
      </View>

      {picking ? (
        <DateTimePicker
          value={parseDay(value)}
          mode="date"
          maximumDate={new Date()}
          onChange={(event, date) => {
            setPicking(false);
            if (event.type === 'set' && date) onChange(dayKey(date));
          }}
        />
      ) : null}
    </>
  );
}

export function MonthStepper({
  value,
  onChange,
  style,
}: {
  value: string;
  onChange: (month: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const { lang, isRTL } = useI18n();
  const atLatest = value >= thisMonthKey();

  return (
    <View style={[styles.stepperBar, { backgroundColor: c.card, borderColor: c.border }, style]}>
      <Pressable
        onPress={() => onChange(shiftMonth(value, -1))}
        hitSlop={8}
        style={({ pressed }) => [styles.stepperArrow, pressed && { opacity: 0.5 }]}
      >
        <MaterialCommunityIcons name={isRTL ? 'chevron-right' : 'chevron-left'} size={24} color={c.text} />
      </Pressable>
      <View style={styles.stepperLabel}>
        <Txt variant="body" weight="700" align="center" numberOfLines={1}>
          {formatMonthLong(value, lang)}
        </Txt>
      </View>
      <Pressable
        onPress={() => !atLatest && onChange(shiftMonth(value, 1))}
        hitSlop={8}
        disabled={atLatest}
        style={({ pressed }) => [styles.stepperArrow, { opacity: atLatest ? 0.25 : pressed ? 0.5 : 1 }]}
      >
        <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={24} color={c.text} />
      </Pressable>
    </View>
  );
}

export function DateRow({
  label,
  value,
  onChange,
  maximumDate,
}: {
  label: string;
  value: string;
  onChange: (day: string) => void;
  maximumDate?: Date;
}) {
  const c = useColors();
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.dateRow, { backgroundColor: c.cardAlt, borderColor: c.border }]}
      >
        <MaterialCommunityIcons name="calendar-month-outline" size={20} color={c.primary} />
        <View style={{ flex: 1 }}>
          <Txt variant="micro" muted>
            {label}
          </Txt>
          <Txt variant="body" weight="600">
            {isToday(value) ? formatDayLong(value, lang) : formatDayLong(value, lang)}
          </Txt>
        </View>
        <MaterialCommunityIcons name="chevron-down" size={20} color={c.textFaint} />
      </Pressable>
      {open ? (
        <DateTimePicker
          value={parseDay(value)}
          mode="date"
          maximumDate={maximumDate ?? new Date()}
          onChange={(event, date) => {
            setOpen(false);
            if (event.type === 'set' && date) onChange(dayKey(date));
          }}
        />
      ) : null}
    </>
  );
}

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <View style={styles.swatchGrid}>
      {swatchOrder.map((name) => {
        const hex = swatches[name];
        const active = hex.toLowerCase() === value.toLowerCase();
        return (
          <Pressable
            key={name}
            onPress={() => onChange(hex)}
            style={[
              styles.swatch,
              { backgroundColor: hex, borderWidth: active ? 3 : 0, borderColor: '#FFFFFF' },
              active && { transform: [{ scale: 1.08 }] },
            ]}
          >
            {active ? <MaterialCommunityIcons name="check-bold" size={18} color="#FFFFFF" /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function IconPicker({
  icons,
  value,
  onChange,
  color,
}: {
  icons: string[];
  value: string;
  onChange: (icon: string) => void;
  color: string;
}) {
  const c = useColors();
  return (
    <ScrollView style={{ maxHeight: 230 }} showsVerticalScrollIndicator={false}>
      <View style={styles.iconGrid}>
        {icons.map((icon) => {
          const active = icon === value;
          return (
            <Pressable
              key={icon}
              onPress={() => onChange(icon)}
              style={[
                styles.iconCell,
                {
                  backgroundColor: active ? withAlpha(color, 0.18) : c.cardAlt,
                  borderColor: active ? color : 'transparent',
                },
              ]}
            >
              <MaterialCommunityIcons
                name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
                size={24}
                color={active ? color : c.textMuted}
              />
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

export type PickOption = {
  value: string;
  label: string;
  sublabel?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  color?: string;
};

/** Generic "choose one" bottom sheet — used for categories, modes, units. */
export function OptionSheet({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
  footer,
}: {
  visible: boolean;
  title: string;
  options: PickOption[];
  value?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  const c = useColors();
  return (
    <Sheet visible={visible} onClose={onClose} title={title} footer={footer}>
      <View style={{ gap: 2 }}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => {
                onSelect(o.value);
                onClose();
              }}
              style={({ pressed }) => [
                styles.optionRow,
                {
                  backgroundColor: active ? c.primarySoft : pressed ? c.bgSunken : 'transparent',
                },
              ]}
            >
              {o.icon ? (
                <View
                  style={[
                    styles.optionIcon,
                    { backgroundColor: withAlpha(o.color ?? c.primary, 0.14) },
                  ]}
                >
                  <MaterialCommunityIcons name={o.icon} size={19} color={o.color ?? c.primary} />
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                <Txt variant="body" weight={active ? '700' : '500'}>
                  {o.label}
                </Txt>
                {o.sublabel ? (
                  <Txt variant="caption" muted>
                    {o.sublabel}
                  </Txt>
                ) : null}
              </View>
              {active ? <MaterialCommunityIcons name="check-circle" size={21} color={c.primary} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

/** Field-looking button that opens an OptionSheet. */
export function SelectRow({
  label,
  value,
  placeholder,
  icon,
  color,
  onPress,
  error,
}: {
  label?: string;
  value?: string;
  placeholder: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  color?: string;
  onPress: () => void;
  error?: string;
}) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Txt variant="label" weight="600" muted>
          {label}
        </Txt>
      ) : null}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.selectRow,
          {
            backgroundColor: pressed ? c.bgSunken : c.cardAlt,
            borderColor: error ? c.danger : c.border,
          },
        ]}
      >
        {icon ? (
          <View style={[styles.optionIcon, { backgroundColor: withAlpha(color ?? c.primary, 0.14) }]}>
            <MaterialCommunityIcons name={icon} size={18} color={color ?? c.primary} />
          </View>
        ) : null}
        <Txt variant="body" weight={value ? '600' : '400'} color={value ? undefined : c.textFaint} style={{ flex: 1 }}>
          {value ?? placeholder}
        </Txt>
        <MaterialCommunityIcons name="chevron-down" size={20} color={c.textFaint} />
      </Pressable>
      {error ? (
        <Txt variant="caption" color={c.danger}>
          {error}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stepperBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    height: 52,
    paddingHorizontal: spacing.xs,
  },
  stepperArrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepperLabel: { flex: 1, justifyContent: 'center' },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: hit.min,
  },
  swatchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconCell: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    minHeight: hit.min,
  },
  optionIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: hit.min,
  },
});
