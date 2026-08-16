import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme, type ViewStyle } from 'react-native';

import { darkColors, lightColors, type ThemeColors } from './colors';
import { elevation as elevationFor, radius, spacing, type ElevationLevel } from './tokens';

export * from './colors';
export * from './tokens';

const THEME_KEY = 'milkbook.theme';

export type ThemePref = 'light' | 'dark' | 'system';

type ThemeValue = {
  colors: ThemeColors;
  isDark: boolean;
  pref: ThemePref;
  setPref: (pref: ThemePref) => Promise<void>;
  spacing: typeof spacing;
  radius: typeof radius;
  elevation: (level: ElevationLevel) => ViewStyle;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setPrefState(v);
      })
      .catch(() => undefined);
  }, []);

  const setPref = useCallback(async (next: ThemePref) => {
    setPrefState(next);
    await AsyncStorage.setItem(THEME_KEY, next);
  }, []);

  const isDark = pref === 'system' ? system === 'dark' : pref === 'dark';

  const value = useMemo<ThemeValue>(() => {
    const colors = isDark ? darkColors : lightColors;
    return {
      colors,
      isDark,
      pref,
      setPref,
      spacing,
      radius,
      elevation: (level: ElevationLevel) => elevationFor(level, colors),
    };
  }, [isDark, pref, setPref]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

/** Most components only need the palette. */
export function useColors(): ThemeColors {
  return useTheme().colors;
}
