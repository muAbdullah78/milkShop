import React, { useMemo } from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { useI18n } from '@/i18n';
import { useColors } from '@/theme';
import { fontFamilyFor, type FontRole, type FontWeightKey } from '@/theme/fonts';
import { naskhLineGapBoost, typeScale, urduLineGapBoost, type TypeVariant } from '@/theme/tokens';

export type TxtProps = Omit<TextProps, 'style' | 'role'> & {
  variant?: TypeVariant;
  weight?: FontWeightKey;
  color?: string;
  /** `start`/`end` resolve to left/right based on the current language. */
  align?: 'start' | 'end' | 'center';
  muted?: boolean;
  faint?: boolean;
  /** Force a role — e.g. keep a heading in Naskh where Nastaliq would crowd. */
  role?: FontRole;
  style?: TextStyle | TextStyle[];
  children?: React.ReactNode;
};

const HEADING_VARIANTS: TypeVariant[] = ['hero', 'display', 'title', 'subtitle'];
const NUMERIC_VARIANTS: TypeVariant[] = ['amount', 'amountLg', 'amountXl'];

function roleFor(variant: TypeVariant): FontRole {
  if (NUMERIC_VARIANTS.includes(variant)) return 'numeric';
  if (HEADING_VARIANTS.includes(variant)) return 'heading';
  return 'ui';
}

/**
 * Every piece of text in the app goes through here.
 *
 * It picks the right family for the active language (Inter / Nastaliq /
 * Naskh), gives Urdu the extra line height its glyphs need, and flips
 * start/end alignment so nothing has to think about RTL.
 */
export function Txt({
  variant = 'body',
  weight = '400',
  color,
  align = 'start',
  muted,
  faint,
  role,
  style,
  children,
  ...rest
}: TxtProps) {
  const { lang, isRTL, urduDigits } = useI18n();
  const c = useColors();

  const computed = useMemo<TextStyle>(() => {
    const spec = typeScale[variant];
    const resolvedRole = role ?? roleFor(variant);
    const family = fontFamilyFor(lang, resolvedRole, weight, urduDigits);

    let gap = spec.lineGap;
    if (lang === 'ur') {
      gap *= resolvedRole === 'heading' ? urduLineGapBoost : naskhLineGapBoost;
    }

    const textAlign: TextStyle['textAlign'] =
      align === 'center' ? 'center' : align === 'start' ? (isRTL ? 'right' : 'left') : isRTL ? 'left' : 'right';

    return {
      fontFamily: family,
      fontSize: spec.size,
      lineHeight: Math.round(spec.size * gap),
      letterSpacing: lang === 'ur' ? 0 : spec.letterSpacing,
      color: color ?? (faint ? c.textFaint : muted ? c.textMuted : c.text),
      textAlign,
      writingDirection: isRTL ? 'rtl' : 'ltr',
      includeFontPadding: false,
    };
  }, [variant, weight, role, lang, urduDigits, align, isRTL, color, muted, faint, c]);

  return (
    <Text {...rest} style={StyleSheet.flatten([computed, style])}>
      {children}
    </Text>
  );
}

/** Money/quantity text: always tabular so columns line up. */
export function NumTxt(props: TxtProps) {
  return <Txt {...props} role="numeric" style={StyleSheet.flatten([{ fontVariant: ['tabular-nums'] }, props.style])} />;
}
