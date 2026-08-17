import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';

import {
  PLANS,
  reminderSchedule,
  resolveEntitlement,
  type Entitlement,
  type Plan,
  type PlanId,
} from '@/features/subscription';
import { scheduleRenewalReminders } from '@/lib/notifications';
import { usePlatform } from './PlatformProvider';
import { useShop } from './ShopProvider';

/**
 * What the app is allowed to do right now.
 *
 * Reads the billing fields off the shop document — the same fields the
 * Firestore rules read — and turns them into an answer the interface can act
 * on. This is presentation only. If this component were deleted entirely, an
 * unsubscribed shop would still be unable to write a single record, because
 * the rules are the gate and they run on Google's servers.
 *
 * Keeping it in step with the rules matters for one reason: a shopkeeper
 * should be told "your subscription ended" by a clear screen, not by every
 * button silently failing.
 */
type SubscriptionValue = Entitlement & {
  loading: boolean;
  /** Live prices from platform config, falling back to the built-in table. */
  plans: Record<PlanId, Plan>;
  /** Convenience for the dozens of call sites that only care about writing. */
  requireWrite: () => boolean;
};

const SubscriptionContext = createContext<SubscriptionValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { shop, loading } = useShop();
  const { config } = usePlatform();
  const scheduledFor = useRef<number | null>(null);

  // Prices can be changed from the admin console without an app update. A
  // malformed remote value must never break the paywall, so anything that is
  // not a positive number falls back to the compiled-in price.
  const plans = useMemo<Record<PlanId, Plan>>(() => {
    const remote = (config as { plans?: Partial<Record<PlanId, { price?: number }>> } | null)?.plans;
    if (!remote) return PLANS;
    const out = { ...PLANS };
    (Object.keys(PLANS) as PlanId[]).forEach((id) => {
      const price = remote[id]?.price;
      if (typeof price === 'number' && price > 0 && Number.isFinite(price)) {
        out[id] = { ...PLANS[id], price: Math.round(price) };
      }
    });
    return out;
  }, [config]);

  const entitlement = useMemo(() => resolveEntitlement(shop, Date.now()), [shop]);

  /*
   * Renewal reminders.
   *
   * Local notifications rather than push: they cost nothing, need no server,
   * and still fire when the phone has had no signal for a week — which for a
   * shop on the edge of a village is most weeks.
   *
   * Rescheduled only when the expiry date actually moves, so re-renders do not
   * churn through the notification queue.
   */
  useEffect(() => {
    const until = entitlement.activeUntil;
    if (!until || entitlement.status === 'comp') return;
    if (scheduledFor.current === until) return;
    scheduledFor.current = until;
    void scheduleRenewalReminders(reminderSchedule(until, Date.now()));
  }, [entitlement.activeUntil, entitlement.status]);

  const value = useMemo<SubscriptionValue>(
    () => ({
      ...entitlement,
      loading,
      plans,
      requireWrite: () => entitlement.canWrite,
    }),
    [entitlement, loading, plans]
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): SubscriptionValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used inside <SubscriptionProvider>');
  return ctx;
}
