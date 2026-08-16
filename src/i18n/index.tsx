import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import * as Updates from 'expo-updates';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, I18nManager, NativeModules } from 'react-native';

import { formatMoney, formatMoneyShort, formatNumber, formatQty, localizeDigits } from '@/lib/format';
import type { Lang } from '@/theme/fonts';
import en, { type TranslationKey } from './en';
import ur from './ur';

const dictionaries: Record<Lang, Record<TranslationKey, string>> = { en, ur };

const LANG_KEY = 'milkbook.lang';
const DIGITS_KEY = 'milkbook.urduDigits';

export type TParams = Record<string, string | number>;

type I18nValue = {
  lang: Lang;
  isRTL: boolean;
  ready: boolean;
  urduDigits: boolean;
  t: (key: TranslationKey, params?: TParams) => string;
  /** Same as `t` but never throws for dynamic keys built at runtime. */
  tx: (key: string, fallback: string, params?: TParams) => string;
  setLang: (lang: Lang) => Promise<void>;
  setUrduDigits: (on: boolean) => Promise<void>;
  money: (v: number) => string;
  moneyShort: (v: number) => string;
  num: (v: number, fractionDigits?: number) => string;
  qty: (v: number) => string;
  digits: (s: string) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function interpolate(template: string, params?: TParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match
  );
}

function detectDeviceLang(): Lang {
  try {
    const codes = Localization.getLocales();
    const first = codes?.[0]?.languageCode?.toLowerCase();
    return first === 'ur' ? 'ur' : 'en';
  } catch {
    return 'en';
  }
}

async function applyDirection(lang: Lang, { restart }: { restart: boolean }) {
  const shouldBeRTL = lang === 'ur';
  I18nManager.allowRTL(shouldBeRTL);

  if (I18nManager.isRTL === shouldBeRTL) return false;

  I18nManager.forceRTL(shouldBeRTL);
  if (!restart) return true;

  // Layout direction is a native-level flag; the tree has to be rebuilt.
  try {
    if (__DEV__ && NativeModules.DevSettings?.reload) {
      NativeModules.DevSettings.reload();
    } else {
      await Updates.reloadAsync();
    }
  } catch {
    // Reload is best-effort — worst case the user restarts the app manually.
  }
  return true;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');
  const [urduDigits, setUrduDigitsState] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [storedLang, storedDigits] = await Promise.all([
          AsyncStorage.getItem(LANG_KEY),
          AsyncStorage.getItem(DIGITS_KEY),
        ]);
        const resolved: Lang = storedLang === 'ur' || storedLang === 'en' ? storedLang : detectDeviceLang();
        setLangState(resolved);
        setUrduDigitsState(storedDigits === '1');
        // Align the native flag with the stored choice without a reload loop:
        // on a cold start the tree has not rendered yet.
        await applyDirection(resolved, { restart: false });
      } catch {
        setLangState('en');
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setLang = useCallback(
    async (next: Lang) => {
      if (next === lang) return;
      setLangState(next);
      await AsyncStorage.setItem(LANG_KEY, next);
      const needsRestart = I18nManager.isRTL !== (next === 'ur');
      if (needsRestart) {
        // Give React one frame to paint the new strings before we reload,
        // so the switch feels intentional rather than like a crash.
        setTimeout(() => {
          applyDirection(next, { restart: true }).catch(() => {
            Alert.alert(
              next === 'ur' ? 'زبان بدل گئی' : 'Language changed',
              next === 'ur'
                ? 'براہ کرم ایپ بند کر کے دوبارہ کھولیں۔'
                : 'Please close and open the app once.'
            );
          });
        }, 220);
      }
    },
    [lang]
  );

  const setUrduDigits = useCallback(async (on: boolean) => {
    setUrduDigitsState(on);
    await AsyncStorage.setItem(DIGITS_KEY, on ? '1' : '0');
  }, []);

  const value = useMemo<I18nValue>(() => {
    const dict = dictionaries[lang];
    const fmt = { lang, urduDigits };

    const t = (key: TranslationKey, params?: TParams) =>
      interpolate(dict[key] ?? en[key] ?? key, params);

    return {
      lang,
      isRTL: lang === 'ur',
      ready,
      urduDigits,
      t,
      tx: (key, fallback, params) =>
        interpolate((dict as Record<string, string>)[key] ?? fallback, params),
      setLang,
      setUrduDigits,
      money: (v) => formatMoney(v, fmt),
      moneyShort: (v) => formatMoneyShort(v, fmt),
      num: (v, fractionDigits) => formatNumber(v, fmt, fractionDigits),
      qty: (v) => formatQty(v, fmt),
      digits: (s) => localizeDigits(s, urduDigits),
    };
  }, [lang, urduDigits, ready, setLang, setUrduDigits]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

/** Shorthand used by most components. */
export function useT() {
  return useI18n().t;
}

export type { TranslationKey };
