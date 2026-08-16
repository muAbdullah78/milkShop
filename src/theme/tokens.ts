import { Platform, type TextStyle, type ViewStyle } from 'react-native';
import type { ThemeColors } from './colors';

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 44,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  pill: 999,
} as const;

/** Minimum tap target — deliberately generous, users often have wet hands. */
export const hit = {
  min: 52,
  chunky: 62,
  big: 76,
} as const;

export const duration = {
  fast: 140,
  base: 220,
  slow: 340,
} as const;

export type ElevationLevel = 0 | 1 | 2 | 3;

export function elevation(level: ElevationLevel, c: ThemeColors): ViewStyle {
  if (level === 0) return {};
  if (c.mode === 'dark') {
    // Shadows read as mud on dark; use a lifted surface + hairline instead.
    return {
      borderWidth: 1,
      borderColor: c.border,
    };
  }
  const map: Record<Exclude<ElevationLevel, 0>, ViewStyle> = {
    1: {
      shadowColor: c.shadow,
      shadowOpacity: 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    2: {
      shadowColor: c.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 5 },
      elevation: 3,
    },
    3: {
      shadowColor: c.shadow,
      shadowOpacity: 0.13,
      shadowRadius: 26,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
    },
  };
  return map[level];
}

export type TypeVariant =
  | 'hero'
  | 'display'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'bodyLg'
  | 'label'
  | 'caption'
  | 'micro'
  | 'amount'
  | 'amountLg'
  | 'amountXl';

type VariantSpec = { size: number; lineGap: number; letterSpacing?: number };

export const typeScale: Record<TypeVariant, VariantSpec> = {
  hero: { size: 34, lineGap: 1.16, letterSpacing: -0.8 },
  display: { size: 27, lineGap: 1.22, letterSpacing: -0.5 },
  title: { size: 20, lineGap: 1.3, letterSpacing: -0.2 },
  subtitle: { size: 17, lineGap: 1.34, letterSpacing: -0.1 },
  bodyLg: { size: 16, lineGap: 1.45 },
  body: { size: 15, lineGap: 1.45 },
  label: { size: 13.5, lineGap: 1.35, letterSpacing: 0.1 },
  caption: { size: 12.5, lineGap: 1.35, letterSpacing: 0.1 },
  micro: { size: 11, lineGap: 1.3, letterSpacing: 0.4 },
  amount: { size: 18, lineGap: 1.2, letterSpacing: -0.3 },
  amountLg: { size: 24, lineGap: 1.18, letterSpacing: -0.6 },
  amountXl: { size: 34, lineGap: 1.1, letterSpacing: -1 },
};

/**
 * Nastaliq needs far more vertical room than Latin — glyphs cascade downward.
 * Everything Urdu gets a taller line box so lists never look cramped.
 */
export const urduLineGapBoost = 1.55;
export const naskhLineGapBoost = 1.18;

export const fontVariantNumeric: TextStyle = Platform.select({
  android: { fontVariant: ['tabular-nums'] },
  default: { fontVariant: ['tabular-nums'] },
}) as TextStyle;
