import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui';
import { useI18n } from '@/i18n';
import { spacing, useColors } from '@/theme';

type TabDef = {
  name: string;
  labelKey: 'nav.home' | 'nav.delivery' | 'nav.customers' | 'nav.shop' | 'nav.more';
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconActive: keyof typeof MaterialCommunityIcons.glyphMap;
};

const TABS: TabDef[] = [
  { name: 'index', labelKey: 'nav.home', icon: 'view-dashboard-outline', iconActive: 'view-dashboard' },
  { name: 'delivery', labelKey: 'nav.delivery', icon: 'truck-outline', iconActive: 'truck' },
  { name: 'customers', labelKey: 'nav.customers', icon: 'account-group-outline', iconActive: 'account-group' },
  { name: 'shop', labelKey: 'nav.shop', icon: 'storefront-outline', iconActive: 'storefront' },
  { name: 'more', labelKey: 'nav.more', icon: 'dots-grid', iconActive: 'dots-grid' },
];

export default function TabsLayout() {
  const c = useColors();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textFaint,
        tabBarShowLabel: false,
        sceneStyle: { backgroundColor: c.bg },
        tabBarStyle: {
          backgroundColor: c.tabBar,
          borderTopColor: c.tabBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth * 2,
          height: 62 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom,
          ...Platform.select({ android: { elevation: 14 }, default: {} }),
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            tabBarAccessibilityLabel: t(tab.labelKey),
            tabBarIcon: ({ focused, color }) => (
              <View style={styles.item}>
                <View
                  style={[
                    styles.pill,
                    focused && { backgroundColor: c.primarySoft },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={focused ? tab.iconActive : tab.icon}
                    size={23}
                    color={color as string}
                  />
                </View>
                <Txt
                  variant="micro"
                  weight={focused ? '700' : '500'}
                  color={color as string}
                  numberOfLines={1}
                  align="center"
                  style={styles.label}
                >
                  {t(tab.labelKey)}
                </Txt>
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  item: { alignItems: 'center', justifyContent: 'center', width: 72, gap: 1 },
  pill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 3,
    borderRadius: 999,
  },
  label: { fontSize: 10.5, lineHeight: 14 },
});
