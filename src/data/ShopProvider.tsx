import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useI18n } from '@/i18n';
import type { Shop } from '@/types/models';
import { useAuth } from './AuthProvider';
import { shopDoc } from './refs';
import { shopRepo } from './repo';
import { useLiveDoc } from './useQuery';

type ShopValue = {
  shopId: string | null;
  shop: Shop | null;
  loading: boolean;
  /** Signed in but no shop yet → send them through onboarding. */
  needsOnboarding: boolean;
  createShop: (input: {
    name: string;
    ownerName?: string;
    phone?: string;
    address?: string;
    defaultMilkRate: number;
    defaultMilkQty: number;
  }) => Promise<string>;
  updateShop: (patch: Partial<Shop>) => Promise<void>;
  refresh: () => void;
};

const ShopContext = createContext<ShopValue | null>(null);

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const { user, initializing, firebaseReady } = useAuth();
  const { t } = useI18n();

  const [shopId, setShopId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (initializing) return;
    if (!user || !firebaseReady) {
      setShopId(null);
      setResolving(false);
      return;
    }
    setResolving(true);
    shopRepo
      .findForUser(user.uid)
      .then((id) => {
        if (!cancelled) setShopId(id);
      })
      .catch(() => {
        if (!cancelled) setShopId(null);
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, initializing, firebaseReady, nonce]);

  const { data: shop, loading: shopLoading } = useLiveDoc<Shop>(
    () => (shopId ? shopDoc(shopId) : null),
    [shopId]
  );

  const createShop = useCallback<ShopValue['createShop']>(
    async (input) => {
      if (!user) throw new Error('Not signed in');
      const id = await shopRepo.create(
        user.uid,
        {
          ...input,
          ownerName: input.ownerName || user.displayName || undefined,
          email: user.email || undefined,
        },
        (key, params) => t(key as never, params)
      );
      setShopId(id);
      return id;
    },
    [user, t]
  );

  const updateShop = useCallback(
    async (patch: Partial<Shop>) => {
      if (!shopId) return;
      await shopRepo.update(shopId, patch);
    },
    [shopId]
  );

  const loading = initializing || resolving || (Boolean(shopId) && shopLoading);

  const value = useMemo<ShopValue>(
    () => ({
      shopId,
      shop,
      loading,
      needsOnboarding: Boolean(user) && !resolving && !shopId,
      createShop,
      updateShop,
      refresh: () => setNonce((n) => n + 1),
    }),
    [shopId, shop, loading, user, resolving, createShop, updateShop]
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopValue {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used inside <ShopProvider>');
  return ctx;
}

/** Convenience: most data hooks only need the id. */
export function useShopId(): string | null {
  return useShop().shopId;
}
