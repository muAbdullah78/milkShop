import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LockScreen } from '@/components/LockScreen';
import { PlatformGate } from '@/components/PlatformGate';
import { SubscriptionGate } from '@/components/SubscriptionGate';
import { ToastProvider } from '@/components/ui';
import { AuthProvider } from '@/data/AuthProvider';
import { LockProvider, useLock } from '@/data/LockProvider';
import { PlatformProvider } from '@/data/PlatformProvider';
import { ShopProvider } from '@/data/ShopProvider';
import { SubscriptionProvider } from '@/data/SubscriptionProvider';
import { I18nProvider, useI18n } from '@/i18n';
import { ThemeProvider, useColors, useTheme } from '@/theme';
import { fontAssets } from '@/theme/fonts';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>
              <ShopProvider>
                <PlatformProvider>
                  <SubscriptionProvider>
                    <LockProvider>
                      <ToastProvider>
                        <AppChrome />
                      </ToastProvider>
                    </LockProvider>
                  </SubscriptionProvider>
                </PlatformProvider>
              </ShopProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppChrome() {
  const c = useColors();
  const { isDark } = useTheme();
  const { ready: i18nReady } = useI18n();
  const { locked, enabled, ready: lockReady } = useLock();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.bg).catch(() => undefined);
    if (Platform.OS === 'android') {
      try {
        NavigationBar.setStyle(isDark ? 'light' : 'dark');
      } catch {
        // navigation bar styling is best-effort
      }
    }
  }, [c.bg, isDark]);

  if (!i18nReady || !lockReady) {
    return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="customer/edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="khaata/entry" options={{ presentation: 'modal' }} />
        <Stack.Screen name="sale/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="payment/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="expenses/edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="products/edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="suppliers/edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="purchases/new" options={{ presentation: 'modal' }} />
      </Stack>

      {/* Order matters: the PIN sits above everything, then platform blocks. */}
      <PlatformGate />
      <SubscriptionGate />
      {enabled && locked ? <LockScreen /> : null}
    </View>
  );
}
