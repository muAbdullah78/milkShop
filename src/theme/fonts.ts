import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { NotoNaskhArabic_400Regular } from '@expo-google-fonts/noto-naskh-arabic/400Regular';
import { NotoNaskhArabic_500Medium } from '@expo-google-fonts/noto-naskh-arabic/500Medium';
import { NotoNaskhArabic_600SemiBold } from '@expo-google-fonts/noto-naskh-arabic/600SemiBold';
import { NotoNaskhArabic_700Bold } from '@expo-google-fonts/noto-naskh-arabic/700Bold';
import { NotoNastaliqUrdu_400Regular } from '@expo-google-fonts/noto-nastaliq-urdu/400Regular';
import { NotoNastaliqUrdu_600SemiBold } from '@expo-google-fonts/noto-nastaliq-urdu/600SemiBold';

/**
 * Font strategy (decided with the shop owners in mind):
 *
 *   English  → Inter everywhere. Excellent numerals, very legible small.
 *   Urdu     → Nastaliq for headings, buttons and bill titles (the warm,
 *              traditional look Urdu readers expect) and Naskh for lists,
 *              tables, small labels and anything dense — Nastaliq becomes
 *              unreadable below ~15px on cheap phones.
 *   Numbers  → Inter by default (tabular, unambiguous) and Naskh when the
 *              shopkeeper turns on Urdu digits (۰۱۲۳), which Inter lacks.
 */
export const fontAssets = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  NotoNaskhArabic_400Regular,
  NotoNaskhArabic_500Medium,
  NotoNaskhArabic_600SemiBold,
  NotoNaskhArabic_700Bold,
  NotoNastaliqUrdu_400Regular,
  NotoNastaliqUrdu_600SemiBold,
};

export type FontWeightKey = '400' | '500' | '600' | '700' | '800';
export type FontRole = 'ui' | 'heading' | 'numeric';
export type Lang = 'en' | 'ur';

const inter: Record<FontWeightKey, string> = {
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
  '800': 'Inter_800ExtraBold',
};

const naskh: Record<FontWeightKey, string> = {
  '400': 'NotoNaskhArabic_400Regular',
  '500': 'NotoNaskhArabic_500Medium',
  '600': 'NotoNaskhArabic_600SemiBold',
  '700': 'NotoNaskhArabic_700Bold',
  '800': 'NotoNaskhArabic_700Bold',
};

const nastaliq: Record<FontWeightKey, string> = {
  '400': 'NotoNastaliqUrdu_400Regular',
  '500': 'NotoNastaliqUrdu_400Regular',
  '600': 'NotoNastaliqUrdu_600SemiBold',
  '700': 'NotoNastaliqUrdu_600SemiBold',
  '800': 'NotoNastaliqUrdu_600SemiBold',
};

export function fontFamilyFor(
  lang: Lang,
  role: FontRole,
  weight: FontWeightKey,
  urduDigits = false
): string {
  if (lang === 'en') return inter[weight];
  if (role === 'numeric') return urduDigits ? naskh[weight] : inter[weight];
  if (role === 'heading') return nastaliq[weight];
  return naskh[weight];
}

/** Font families usable inside generated invoice HTML (system fallbacks). */
export const printFontStack = {
  en: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  ur: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Noto Naskh Arabic', serif",
};
