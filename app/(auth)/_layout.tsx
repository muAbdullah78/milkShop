import { Stack } from 'expo-router';
import React from 'react';

import { useColors } from '@/theme';

export default function AuthLayout() {
  const c = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.bg },
      }}
    />
  );
}
