/**
 * The subscription engine, shared with the app.
 *
 * Mirrored rather than imported because the app and the console are separate
 * builds with separate module graphs. The functions the admin console actually
 * needs are the write-side ones — the app owns the read side — so this is a
 * deliberately small surface, not a duplicate of the whole file.
 *
 * If you change the arithmetic in `src/features/subscription.ts`, change it
 * here too. `scripts/subscription-math-test.mjs` is the arbiter of whether the
 * change is correct.
 */

export type PlanId = 'monthly' | 'quarterly' | 'annual';
export type SubStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'readonly'
  | 'locked'
  | 'cancelled'
  | 'comp';
export type SubSource = 'none' | 'trial' | 'manual' | 'play' | 'comp';
export type PayMethod = 'cash' | 'jazzcash' | 'easypaisa' | 'bank' | 'play' | 'comp';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const READ_ONLY_DAYS = 7;

export const PLANS: Record<PlanId, { months: number; price: number; label: string }> = {
  monthly: { months: 1, price: 850, label: 'Monthly' },
  quarterly: { months: 3, price: 2250, label: '3 months' },
  annual: { months: 12, price: 8500, label: '1 year' },
};

export const PLAN_IDS: PlanId[] = ['monthly', 'quarterly', 'annual'];

/**
 * Where a new period ends.
 *
 * Stacks on the current expiry when it is still in the future, so renewing
 * early never destroys days the shop already paid for. Calendar months, not
 * 30-day blocks, clamped to the last day of the target month.
 */
export function nextPeriodEnd(months: number, now: number, currentEnd?: number | null): number {
  const base = currentEnd && currentEnd > now ? currentEnd : now;
  const d = new Date(base);
  const dayOfMonth = d.getDate();
  const out = new Date(d.getTime());
  out.setDate(1);
  out.setMonth(d.getMonth() + months);
  const lastDay = new Date(out.getFullYear(), out.getMonth() + 1, 0).getDate();
  out.setDate(Math.min(dayOfMonth, lastDay));
  return out.getTime();
}

export type ShopBilling = {
  subStatus?: SubStatus;
  subPlan?: PlanId | null;
  subSource?: SubSource;
  activeUntil?: number;
  readOnlyUntil?: number;
  trialUsed?: boolean;
  cancelAtPeriodEnd?: boolean;
};

/** The exact field set to write on a shop when a payment lands. */
export function activationPatch(input: {
  plan: PlanId;
  source: Exclude<SubSource, 'none' | 'trial'>;
  now: number;
  currentActiveUntil?: number | null;
  bonusDays?: number;
  months?: number;
}): Required<Pick<ShopBilling, 'subStatus' | 'subPlan' | 'subSource' | 'activeUntil' | 'readOnlyUntil' | 'cancelAtPeriodEnd'>> {
  const months = input.months ?? PLANS[input.plan].months;
  const end =
    nextPeriodEnd(months, input.now, input.currentActiveUntil) + (input.bonusDays ?? 0) * DAY_MS;
  return {
    subStatus: input.source === 'comp' ? 'comp' : 'active',
    subPlan: input.plan,
    subSource: input.source,
    activeUntil: end,
    readOnlyUntil: end + READ_ONLY_DAYS * DAY_MS,
    cancelAtPeriodEnd: false,
  };
}

/** Add or remove a fixed number of days without touching the plan. */
export function adjustPatch(days: number, currentActiveUntil: number | null | undefined, now: number) {
  const base = currentActiveUntil && currentActiveUntil > now ? currentActiveUntil : now;
  const end = base + days * DAY_MS;
  return {
    activeUntil: end,
    readOnlyUntil: end + READ_ONLY_DAYS * DAY_MS,
  };
}

export const compPatch = {
  subStatus: 'comp' as const,
  subSource: 'comp' as const,
  cancelAtPeriodEnd: false,
};

/** Ends access at the end of today. Used to correct a mistaken activation. */
export function revokePatch(now: number) {
  return {
    subStatus: 'readonly' as const,
    subSource: 'manual' as const,
    activeUntil: now,
    readOnlyUntil: now + READ_ONLY_DAYS * DAY_MS,
  };
}

export type Level = 'full' | 'readonly' | 'locked';

export function levelOf(b: ShopBilling | null | undefined, now: number): Level {
  if (!b) return 'full';
  if (b.subStatus === 'comp' || b.subSource === 'comp') return 'full';
  if (typeof b.activeUntil !== 'number') return 'full';
  if (now <= b.activeUntil) return 'full';
  const ro = b.readOnlyUntil ?? b.activeUntil + READ_ONLY_DAYS * DAY_MS;
  return now <= ro ? 'readonly' : 'locked';
}

export function daysLeft(b: ShopBilling | null | undefined, now: number): number | null {
  if (!b || typeof b.activeUntil !== 'number') return null;
  return Math.ceil((b.activeUntil - now) / DAY_MS);
}

/**
 * What a shop is worth per month, for the revenue figures on the dashboard.
 *
 * Trials and comps count as zero — counting a trial as revenue is how a
 * dashboard starts lying to you about the business.
 */
export function monthlyValue(b: ShopBilling | null | undefined): number {
  if (!b || !b.subPlan) return 0;
  if (b.subSource === 'trial' || b.subSource === 'comp' || b.subStatus === 'comp') return 0;
  const p = PLANS[b.subPlan];
  return p ? Math.round(p.price / p.months) : 0;
}

// ── Discounts ─────────────────────────────────────────────────────────────

export type DiscountKind = 'percent' | 'flat' | 'fixedPrice' | 'freeDays';
export type DiscountScope = 'first' | 'periods' | 'forever';

export type Discount = {
  code: string;
  kind: DiscountKind;
  value: number;
  scope: DiscountScope;
  periods?: number;
  plans?: PlanId[];
  active: boolean;
  validFrom?: number | null;
  validUntil?: number | null;
  maxRedemptions?: number;
  redemptions?: number;
  oncePerShop?: boolean;
  label?: string;
  note?: string;
  createdAt?: number;
  createdBy?: string;
};

export type PriceBreakdown = {
  listPrice: number;
  discountAmount: number;
  bonusDays: number;
  payable: number;
  effectiveMonthly: number;
};

export function priceFor(plan: PlanId, discount?: Discount | null): PriceBreakdown {
  const p = PLANS[plan];
  const listPrice = p.price;
  let discountAmount = 0;
  let bonusDays = 0;

  if (discount) {
    switch (discount.kind) {
      case 'percent':
        discountAmount = Math.round((listPrice * Math.min(100, Math.max(0, discount.value))) / 100);
        break;
      case 'flat':
        discountAmount = Math.max(0, Math.round(discount.value));
        break;
      case 'fixedPrice':
        discountAmount = Math.max(0, listPrice - Math.max(0, Math.round(discount.value)));
        break;
      case 'freeDays':
        bonusDays = Math.max(0, Math.round(discount.value));
        break;
    }
  }

  // Clamped, so "Rs 1,000 off" on an Rs 850 plan makes it free rather than
  // owing the shopkeeper money.
  discountAmount = Math.min(discountAmount, listPrice);
  const payable = listPrice - discountAmount;
  return {
    listPrice,
    discountAmount,
    bonusDays,
    payable,
    effectiveMonthly: Math.round(payable / p.months),
  };
}

export function describeDiscount(d: Discount): string {
  const value =
    d.kind === 'percent'
      ? `${d.value}% off`
      : d.kind === 'flat'
        ? `Rs ${d.value} off`
        : d.kind === 'fixedPrice'
          ? `pay Rs ${d.value}`
          : `${d.value} free days`;
  const scope =
    d.scope === 'forever'
      ? 'every renewal'
      : d.scope === 'first'
        ? 'first payment only'
        : `first ${Math.max(1, d.periods ?? 1)} payments`;
  return `${value} · ${scope}`;
}
