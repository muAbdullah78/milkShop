/**
 * MilkBook palette — Deep Blue + White.
 *
 * Rules of the system:
 *  - `brand*` is the deep navy identity (headers, hero cards, splash, bills).
 *  - `primary` is the interactive blue (buttons, links, active tabs).
 *  - every semantic colour has a `*Soft` background pair that passes contrast
 *    with its own foreground in BOTH themes, so chips/badges never need tuning.
 */

export const swatches = {
  blue: '#1B3FCB',
  navy: '#12246B',
  sky: '#0E9BEF',
  teal: '#0FB5A5',
  green: '#12A150',
  lime: '#7CB518',
  amber: '#E8A317',
  orange: '#F1741C',
  red: '#E0393E',
  pink: '#DB2777',
  purple: '#7C3AED',
  brown: '#8B5E34',
  slate: '#64748B',
  cyan: '#0891B2',
} as const;

export type SwatchName = keyof typeof swatches;

/** Ordered list used by the "pick a colour" grid for custom categories. */
export const swatchOrder: SwatchName[] = [
  'blue',
  'sky',
  'teal',
  'green',
  'lime',
  'amber',
  'orange',
  'red',
  'pink',
  'purple',
  'brown',
  'cyan',
  'slate',
  'navy',
];

export type ThemeColors = {
  mode: 'light' | 'dark';

  bg: string;
  bgSunken: string;
  card: string;
  cardAlt: string;
  overlay: string;

  border: string;
  borderStrong: string;
  divider: string;

  text: string;
  textMuted: string;
  textFaint: string;
  textOnBrand: string;

  brand: string;
  brandDeep: string;
  brandGradient: [string, string, string];

  primary: string;
  primaryPressed: string;
  primarySoft: string;
  onPrimary: string;

  accent: string;
  accentSoft: string;

  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;

  /** Money semantics — used consistently everywhere in the app. */
  moneyIn: string;
  moneyInSoft: string;
  moneyOut: string;
  moneyOutSoft: string;
  due: string;
  dueSoft: string;

  skeleton: string;
  shadow: string;

  tabBar: string;
  tabBarBorder: string;
};

export const lightColors: ThemeColors = {
  mode: 'light',

  bg: '#F2F6FC',
  bgSunken: '#E8EFF9',
  card: '#FFFFFF',
  cardAlt: '#F7FAFF',
  overlay: 'rgba(9, 20, 46, 0.45)',

  border: '#E2E9F5',
  borderStrong: '#C9D7EC',
  divider: '#EDF2FA',

  text: '#0B1B3A',
  textMuted: '#5A6B8C',
  textFaint: '#93A2BE',
  textOnBrand: '#FFFFFF',

  brand: '#12246B',
  brandDeep: '#0B1740',
  brandGradient: ['#0E1B52', '#1B3FCB', '#2F72E8'],

  primary: '#1B3FCB',
  primaryPressed: '#152F9B',
  primarySoft: '#E7EDFF',
  onPrimary: '#FFFFFF',

  accent: '#0FB5A5',
  accentSoft: '#DEF7F4',

  success: '#0E8F47',
  successSoft: '#E1F6EA',
  warning: '#B97A06',
  warningSoft: '#FDF1D9',
  danger: '#CC2E33',
  dangerSoft: '#FDE7E8',
  info: '#0B7FC4',
  infoSoft: '#E0F1FD',

  moneyIn: '#0E8F47',
  moneyInSoft: '#E1F6EA',
  moneyOut: '#CC2E33',
  moneyOutSoft: '#FDE7E8',
  due: '#B45309',
  dueSoft: '#FDF1D9',

  skeleton: '#E6ECF6',
  shadow: '#0B1B3A',

  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E9F5',
};

export const darkColors: ThemeColors = {
  mode: 'dark',

  bg: '#070D1C',
  bgSunken: '#050912',
  card: '#101A31',
  cardAlt: '#16223E',
  overlay: 'rgba(2, 6, 16, 0.66)',

  border: '#223050',
  borderStrong: '#33456B',
  divider: '#1A263F',

  text: '#EAF0FB',
  textMuted: '#9BAAC8',
  textFaint: '#6B7B9C',
  textOnBrand: '#FFFFFF',

  brand: '#16255C',
  brandDeep: '#0A1230',
  brandGradient: ['#0A1230', '#15296E', '#2453B8'],

  primary: '#5B8CFF',
  primaryPressed: '#4877E0',
  primarySoft: '#17244C',
  onPrimary: '#050C1F',

  accent: '#2AD3C3',
  accentSoft: '#0E3330',

  success: '#3DD07E',
  successSoft: '#0E2E1E',
  warning: '#F0B93F',
  warningSoft: '#33270A',
  danger: '#FF6B70',
  dangerSoft: '#3A1416',
  info: '#4CB8F5',
  infoSoft: '#0C2739',

  moneyIn: '#3DD07E',
  moneyInSoft: '#0E2E1E',
  moneyOut: '#FF6B70',
  moneyOutSoft: '#3A1416',
  due: '#F0B93F',
  dueSoft: '#33270A',

  skeleton: '#18243E',
  shadow: '#000000',

  tabBar: '#0C1526',
  tabBarBorder: '#1C2842',
};

/** Soft background for an arbitrary swatch, tuned per theme. */
export function softOf(hex: string, mode: 'light' | 'dark'): string {
  return mode === 'light' ? withAlpha(hex, 0.12) : withAlpha(hex, 0.2);
}

export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Stable per-name avatar colour so a customer always looks the same. */
export function avatarColorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const names = swatchOrder;
  return swatches[names[hash % names.length]];
}
