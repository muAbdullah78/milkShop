import { doc } from '@react-native-firebase/firestore';
import Constants from 'expo-constants';
import React, { createContext, useContext, useEffect, useMemo } from 'react';

import { setWhatsAppDirectScheme } from '@/features/whatsapp';
import { db } from '@/lib/firebase';
import { useLiveDoc } from './useQuery';
import { useShop } from './ShopProvider';

/**
 * Platform-wide controls the super admin drives from the web console.
 *
 * Lives in a single world-readable document so every install picks changes up
 * live. Nothing here can leak shop data — it is only flags and copy.
 */
export type PlatformConfig = {
  /** Builds below this are blocked with an update prompt. */
  minVersionCode?: number;
  /** Blocks everyone. Use only for a real outage. */
  maintenance?: boolean;
  maintenanceMessage?: string;
  /** Banner shown at the top of the dashboard. */
  announcement?: {
    id: string;
    title: string;
    titleUr?: string;
    body?: string;
    bodyUr?: string;
    tone?: 'info' | 'warning' | 'success';
    active?: boolean;
  };
  /** Turn individual features off remotely if one starts misbehaving. */
  features?: Record<string, boolean>;
  updatedAt?: number;
};

type PlatformValue = {
  config: PlatformConfig | null;
  loading: boolean;
  /** This build's Android versionCode. */
  versionCode: number;
  needsUpdate: boolean;
  inMaintenance: boolean;
  shopSuspended: boolean;
  suspensionReason?: string;
  /** Defaults to enabled — a missing flag must never disable a feature. */
  isEnabled: (feature: string) => boolean;
};

const PlatformContext = createContext<PlatformValue | null>(null);

function currentVersionCode(): number {
  const fromConfig = Constants.expoConfig?.android?.versionCode;
  return typeof fromConfig === 'number' ? fromConfig : 1;
}

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const { shop } = useShop();

  const { data: config, loading } = useLiveDoc<PlatformConfig & { id: string }>(
    () => doc(db(), 'platform', 'config'),
    []
  );

  const value = useMemo<PlatformValue>(() => {
    const versionCode = currentVersionCode();
    const min = config?.minVersionCode ?? 0;

    return {
      config,
      loading,
      versionCode,
      needsUpdate: min > versionCode,
      inMaintenance: Boolean(config?.maintenance),
      shopSuspended: Boolean((shop as { suspended?: boolean } | null)?.suspended),
      suspensionReason: (shop as { suspensionReason?: string } | null)?.suspensionReason,
      isEnabled: (feature: string) => config?.features?.[feature] !== false,
    };
  }, [config, loading, shop]);

  // WhatsApp is opened from seven screens through a plain module, not a hook,
  // so the flag is pushed into it here rather than read there.
  useEffect(() => {
    setWhatsAppDirectScheme(value.isEnabled('whatsappDirect'));
  }, [value]);

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform(): PlatformValue {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('usePlatform must be used inside <PlatformProvider>');
  return ctx;
}
