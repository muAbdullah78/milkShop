import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { clearPin, isPinEnabled, setPin as persistPin, verifyPin } from '@/lib/security';

/** Re-lock only after a real absence, not when a share sheet steals focus. */
const RELOCK_AFTER_MS = 25_000;

type LockValue = {
  enabled: boolean;
  locked: boolean;
  ready: boolean;
  unlock: (pin: string) => Promise<boolean>;
  enable: (pin: string) => Promise<void>;
  disable: () => Promise<void>;
  lockNow: () => void;
  /** Suppress the auto-lock for an intentional trip out of the app. */
  beginExternalAction: () => void;
};

const LockContext = createContext<LockValue | null>(null);

export function LockProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);
  const backgroundedAt = useRef<number | null>(null);
  const externalUntil = useRef(0);

  useEffect(() => {
    isPinEnabled()
      .then((on) => {
        setEnabled(on);
        setLocked(on);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        backgroundedAt.current = Date.now();
        return;
      }
      if (state === 'active') {
        const since = backgroundedAt.current;
        backgroundedAt.current = null;
        if (!enabled || since === null) return;
        if (Date.now() < externalUntil.current) return;
        if (Date.now() - since > RELOCK_AFTER_MS) setLocked(true);
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [enabled]);

  const unlock = useCallback(async (pin: string) => {
    const ok = await verifyPin(pin);
    if (ok) setLocked(false);
    return ok;
  }, []);

  const enable = useCallback(async (pin: string) => {
    await persistPin(pin);
    setEnabled(true);
    setLocked(false);
  }, []);

  const disable = useCallback(async () => {
    await clearPin();
    setEnabled(false);
    setLocked(false);
  }, []);

  const value = useMemo<LockValue>(
    () => ({
      enabled,
      locked,
      ready,
      unlock,
      enable,
      disable,
      lockNow: () => enabled && setLocked(true),
      beginExternalAction: () => {
        externalUntil.current = Date.now() + 120_000;
      },
    }),
    [enabled, locked, ready, unlock, enable, disable]
  );

  return <LockContext.Provider value={value}>{children}</LockContext.Provider>;
}

export function useLock(): LockValue {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error('useLock must be used inside <LockProvider>');
  return ctx;
}
