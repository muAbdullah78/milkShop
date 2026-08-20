/**
 * Subscription engine.
 *
 * Deliberately pure: no Firebase, no React, no clock of its own. Every
 * function takes `now` as an argument so the same code can be replayed
 * thousands of times in `scripts/subscription-math-test.mjs` without a
 * device, and so a test can jump forward a year in one line.
 *
 * ── The one rule ────────────────────────────────────────────────────────
 *
 * Access is decided by two timestamps stored on the shop document, and
 * nothing else:
 *
 *   now <= activeUntil                        → full access (read + write)
 *   activeUntil < now <= readOnlyUntil        → read-only (see everything, change nothing)
 *   now > readOnlyUntil                       → locked (only export and pay)
 *
 * Both fields are written **only** by an admin or by the billing server. The
 * Firestore rules refuse a write from a shop member that touches either of
 * them, and refuse *any* data write once `activeUntil` has passed. That is
 * the real gate — it is enforced by Firestore against the server's own clock,
 * so a rooted phone with a patched APK and a forged system time still cannot
 * write a single delivery.
 *
 * What this file does is decide what the *interface* should say. It is not
 * the security boundary and must never be mistaken for one.
 */

// ── Plans ─────────────────────────────────────────────────────────────────

export type PlanId = 'monthly' | 'quarterly' | 'annual';

export type Plan = {
  id: PlanId;
  months: number;
  /** Rupees for the whole period. */
  price: number;
  /** Google Play base plan id — must match what you create in Play Console. */
  playBasePlanId: string;
};

/**
 * Prices in rupees. These are the fallback; the live values come from
 * `platform/config.plans` so a price change does not need an app update.
 * Keep the two in step — the app shows this, and the admin charges it.
 */
export const PLANS: Record<PlanId, Plan> = {
  monthly: { id: 'monthly', months: 1, price: 850, playBasePlanId: 'monthly' },
  quarterly: { id: 'quarterly', months: 3, price: 2250, playBasePlanId: 'quarterly' },
  annual: { id: 'annual', months: 12, price: 8500, playBasePlanId: 'annual' },
};

export const PLAN_ORDER: PlanId[] = ['monthly', 'quarterly', 'annual'];

/** The single Play subscription product every base plan hangs off. */
export const PLAY_SUBSCRIPTION_ID = 'milkbook_pro';

export const TRIAL_DAYS = 7;

/**
 * How long after expiry the shop can still look at its own records.
 *
 * A shopkeeper who is three days late paying should not open the app to find
 * two years of khaata gone. Read-only keeps the pressure on — the app is
 * useless for the day's work — without ever feeling like theft.
 */
export const READ_ONLY_DAYS = 7;

export const DAY_MS = 24 * 60 * 60 * 1000;

// ── Stored shape ──────────────────────────────────────────────────────────

export type SubStatus =
  | 'none' // never subscribed, no trial taken
  | 'trialing'
  | 'active'
  | 'readonly' // past activeUntil, inside the read-only window
  | 'locked' // past readOnlyUntil
  | 'cancelled' // will not renew, but paid up to activeUntil
  | 'comp'; // free forever — staff, testers, the odd goodwill account

export type SubSource = 'none' | 'trial' | 'manual' | 'play' | 'comp';

/**
 * The billing fields kept on `shops/{shopId}`.
 *
 * They live on the shop rather than in their own collection for one specific
 * reason: the Firestore rules already read the shop document to check
 * membership, so gating a write on the subscription costs **zero extra
 * document reads**. A separate collection would double the read cost of every
 * single write in the app.
 *
 * The full billing record — payments, refunds, notes, Play tokens — lives in
 * `subscriptions/{shopId}` where only admins can see it.
 */
export type ShopBilling = {
  subStatus?: SubStatus;
  subPlan?: PlanId | null;
  subSource?: SubSource;
  /** Epoch ms. Write access dies the instant the clock passes this. */
  activeUntil?: number;
  /** Epoch ms. Read access in the app dies here. Normally activeUntil + 7d. */
  readOnlyUntil?: number;
  trialUsed?: boolean;
  trialStartedAt?: number;
  /** Set when the shopkeeper has asked not to renew. Access runs to activeUntil. */
  cancelAtPeriodEnd?: boolean;
};

export type AccessLevel = 'full' | 'readonly' | 'locked';

export type Entitlement = {
  level: AccessLevel;
  status: SubStatus;
  plan: PlanId | null;
  source: SubSource;
  /** True while they can add, edit or delete anything. */
  canWrite: boolean;
  /** True while the app will show their records. Export ignores this. */
  canRead: boolean;
  activeUntil: number | null;
  readOnlyUntil: number | null;
  /** Whole days left of full access. Negative once expired. 0 = today. */
  daysLeft: number | null;
  /** Whole days left before the read-only window slams shut. */
  readOnlyDaysLeft: number | null;
  isTrial: boolean;
  /** Show a nag banner: 7 days or fewer remain, or it has already lapsed. */
  shouldWarn: boolean;
  cancelAtPeriodEnd: boolean;
};

// ── Resolution ────────────────────────────────────────────────────────────

/** Whole days from `now` to `then`, rounded up. 0 means "some of today left". */
export function daysUntil(then: number, now: number): number {
  return Math.ceil((then - now) / DAY_MS);
}

/**
 * Turns the stored fields into what the interface should do.
 *
 * `null` billing (an old shop written before subscriptions existed, or a
 * document that has not loaded yet) resolves to **full access**, not locked.
 * Erring the other way would brick every existing shop the moment this
 * shipped, and would brick every shop on a slow connection while the document
 * was still in flight. Firestore's rules are the real gate and they fail
 * closed, so being generous here is safe.
 */
export function resolveEntitlement(billing: ShopBilling | null | undefined, now: number): Entitlement {
  const b = billing ?? {};

  const source: SubSource = b.subSource ?? 'none';
  const plan = b.subPlan ?? null;
  const activeUntil = typeof b.activeUntil === 'number' ? b.activeUntil : null;
  const readOnlyUntil = typeof b.readOnlyUntil === 'number' ? b.readOnlyUntil : null;
  const cancelAtPeriodEnd = Boolean(b.cancelAtPeriodEnd);

  // Complimentary accounts never expire and never nag.
  if (b.subStatus === 'comp' || source === 'comp') {
    return {
      level: 'full',
      status: 'comp',
      plan,
      source: 'comp',
      canWrite: true,
      canRead: true,
      activeUntil: null,
      readOnlyUntil: null,
      daysLeft: null,
      readOnlyDaysLeft: null,
      isTrial: false,
      shouldWarn: false,
      cancelAtPeriodEnd: false,
    };
  }

  // No billing fields at all — a shop from before this feature, or a document
  // still loading. Let them work; the rules decide the truth.
  if (activeUntil === null) {
    return {
      level: 'full',
      status: b.subStatus ?? 'none',
      plan,
      source,
      canWrite: true,
      canRead: true,
      activeUntil: null,
      readOnlyUntil: null,
      daysLeft: null,
      readOnlyDaysLeft: null,
      isTrial: false,
      shouldWarn: false,
      cancelAtPeriodEnd,
    };
  }

  const isTrial = source === 'trial';
  const roUntil = readOnlyUntil ?? activeUntil + READ_ONLY_DAYS * DAY_MS;
  const daysLeft = daysUntil(activeUntil, now);
  const readOnlyDaysLeft = daysUntil(roUntil, now);

  if (now <= activeUntil) {
    return {
      level: 'full',
      status: cancelAtPeriodEnd ? 'cancelled' : isTrial ? 'trialing' : 'active',
      plan,
      source,
      canWrite: true,
      canRead: true,
      activeUntil,
      readOnlyUntil: roUntil,
      daysLeft,
      readOnlyDaysLeft,
      isTrial,
      // A trial is short, so warn from the start; a paid period warns at a week.
      shouldWarn: isTrial || daysLeft <= 7 || cancelAtPeriodEnd,
      cancelAtPeriodEnd,
    };
  }

  if (now <= roUntil) {
    return {
      level: 'readonly',
      status: 'readonly',
      plan,
      source,
      canWrite: false,
      canRead: true,
      activeUntil,
      readOnlyUntil: roUntil,
      daysLeft,
      readOnlyDaysLeft,
      isTrial,
      shouldWarn: true,
      cancelAtPeriodEnd,
    };
  }

  return {
    level: 'locked',
    status: 'locked',
    plan,
    source,
    canWrite: false,
    canRead: false,
    activeUntil,
    readOnlyUntil: roUntil,
    daysLeft,
    readOnlyDaysLeft,
    isTrial,
    shouldWarn: true,
    cancelAtPeriodEnd,
  };
}

// ── Starting and extending ────────────────────────────────────────────────

/** The billing fields a brand-new shop is created with. */
export function startTrial(now: number, days = TRIAL_DAYS): Required<Omit<ShopBilling, 'subPlan'>> & {
  subPlan: null;
} {
  const activeUntil = now + days * DAY_MS;
  return {
    subStatus: 'trialing',
    subPlan: null,
    subSource: 'trial',
    activeUntil,
    readOnlyUntil: activeUntil + READ_ONLY_DAYS * DAY_MS,
    trialUsed: true,
    trialStartedAt: now,
    cancelAtPeriodEnd: false,
  };
}

/**
 * Billing for a shop created without a trial — because the account has already
 * used its one trial, or the claim write failed. The shop exists and is safe,
 * but nothing can be written to it until an admin activates it.
 *
 * Refusing to create the shop at all would be worse: the shopkeeper would be
 * stuck on the onboarding screen with no way forward.
 */
export const NO_TRIAL_BILLING: ShopBilling = {
  subStatus: 'none',
  subPlan: null,
  subSource: 'none',
  activeUntil: 0,
  readOnlyUntil: 0,
  trialUsed: true,
  cancelAtPeriodEnd: false,
};

/**
 * Rebuilds trial billing from an existing claim.
 *
 * Used when onboarding is retried after a failure. The claim already recorded
 * exactly when this account's trial ends, so the retry reuses that instant
 * rather than starting a fresh seven days — which is what stops "delete the
 * shop and sign up again" from being an unlimited trial, while still letting a
 * genuine retry five minutes later succeed.
 */
export function trialFromClaim(trialEndsAt: number, claimedAt: number): ShopBilling {
  return {
    subStatus: 'trialing',
    subPlan: null,
    subSource: 'trial',
    activeUntil: trialEndsAt,
    readOnlyUntil: trialEndsAt + READ_ONLY_DAYS * DAY_MS,
    trialUsed: true,
    trialStartedAt: claimedAt,
    cancelAtPeriodEnd: false,
  };
}

/**
 * Where a new period should end.
 *
 * Renewing early must not throw away the days already paid for, so the new
 * period is stacked on whichever is later: today, or the current expiry. A
 * shopkeeper who pays on the 25th for a month that ends on the 30th gets
 * until the 30th of *next* month, not the 25th. Getting this backwards is
 * quietly stealing five days from every early payer.
 *
 * Months are added by calendar, not by 30-day blocks, so a renewal on the
 * 31st of January lands on the 28th of February rather than drifting.
 */
export function nextPeriodEnd(months: number, now: number, currentEnd?: number | null): number {
  const base = currentEnd && currentEnd > now ? currentEnd : now;
  const d = new Date(base);
  const targetMonth = d.getMonth() + months;
  const dayOfMonth = d.getDate();

  const out = new Date(d.getTime());
  out.setDate(1);
  out.setMonth(targetMonth);
  // Clamp to the last day of the target month (31 Jan + 1 month → 28/29 Feb).
  const lastDay = new Date(out.getFullYear(), out.getMonth() + 1, 0).getDate();
  out.setDate(Math.min(dayOfMonth, lastDay));
  return out.getTime();
}

/** The billing fields after a successful payment. */
export function applyPayment(input: {
  plan: PlanId;
  source: Exclude<SubSource, 'none' | 'trial'>;
  now: number;
  currentActiveUntil?: number | null;
  /** Extra days from a `freeDays` discount. */
  bonusDays?: number;
  months?: number;
}): ShopBilling {
  const months = input.months ?? PLANS[input.plan].months;
  const end = nextPeriodEnd(months, input.now, input.currentActiveUntil) + (input.bonusDays ?? 0) * DAY_MS;
  return {
    subStatus: input.source === 'comp' ? 'comp' : 'active',
    subPlan: input.plan,
    subSource: input.source,
    activeUntil: end,
    readOnlyUntil: end + READ_ONLY_DAYS * DAY_MS,
    cancelAtPeriodEnd: false,
  };
}

// ── Discounts ─────────────────────────────────────────────────────────────

export type DiscountKind =
  /** Take a percentage off the list price. */
  | 'percent'
  /** Take a flat number of rupees off. */
  | 'flat'
  /** Charge exactly this, whatever the plan costs. */
  | 'fixedPrice'
  /** Charge full price but add free days on top. */
  | 'freeDays';

export type DiscountScope =
  /** Only the first payment this shop makes. */
  | 'first'
  /** The next N payments. */
  | 'periods'
  /** Every payment, for as long as they stay subscribed. */
  | 'forever';

export type Discount = {
  /** The code the shopkeeper types. Stored uppercase; compared uppercase. */
  code: string;
  kind: DiscountKind;
  /** Percent (1–100), rupees, fixed rupee price, or number of days. */
  value: number;
  scope: DiscountScope;
  /** Only meaningful when scope === 'periods'. */
  periods?: number;
  /** Empty or missing means every plan. */
  plans?: PlanId[];
  active: boolean;
  validFrom?: number | null;
  validUntil?: number | null;
  /** 0 or missing means unlimited. */
  maxRedemptions?: number;
  redemptions?: number;
  /** Stop the same shop using it twice. */
  oncePerShop?: boolean;
  label?: string;
  note?: string;
  createdAt?: number;
  createdBy?: string;
};

export type DiscountCheck =
  | { ok: true; discount: Discount }
  | {
      ok: false;
      reason: 'notFound' | 'inactive' | 'notStarted' | 'expired' | 'usedUp' | 'wrongPlan' | 'alreadyUsed';
    };

export function validateDiscount(input: {
  discount: Discount | null | undefined;
  plan: PlanId;
  now: number;
  alreadyRedeemedByShop?: boolean;
}): DiscountCheck {
  const d = input.discount;
  if (!d) return { ok: false, reason: 'notFound' };
  if (!d.active) return { ok: false, reason: 'inactive' };
  if (d.validFrom && input.now < d.validFrom) return { ok: false, reason: 'notStarted' };
  if (d.validUntil && input.now > d.validUntil) return { ok: false, reason: 'expired' };
  if (d.maxRedemptions && (d.redemptions ?? 0) >= d.maxRedemptions) return { ok: false, reason: 'usedUp' };
  if (d.plans && d.plans.length > 0 && !d.plans.includes(input.plan)) {
    return { ok: false, reason: 'wrongPlan' };
  }
  if (d.oncePerShop && input.alreadyRedeemedByShop) return { ok: false, reason: 'alreadyUsed' };
  return { ok: true, discount: d };
}

export type PriceBreakdown = {
  plan: PlanId;
  months: number;
  listPrice: number;
  discountCode: string | null;
  discountLabel: string | null;
  /** Rupees taken off. Never more than the list price. */
  discountAmount: number;
  /** Free days added on top of the period. */
  bonusDays: number;
  payable: number;
  /** Rounded, for the "Rs 750/month" line under each plan. */
  effectiveMonthly: number;
};

/**
 * Works out what the shopkeeper actually pays.
 *
 * Clamped so a discount can never produce a negative price or a refund —
 * "Rs 1,000 off" on the Rs 850 monthly plan makes it free, not minus 150.
 */
export function priceFor(input: {
  plan: PlanId;
  discount?: Discount | null;
  plans?: Record<PlanId, Plan>;
}): PriceBreakdown {
  const table = input.plans ?? PLANS;
  const p = table[input.plan];
  const listPrice = p.price;
  const d = input.discount ?? null;

  let discountAmount = 0;
  let bonusDays = 0;

  if (d) {
    switch (d.kind) {
      case 'percent':
        discountAmount = Math.round((listPrice * Math.min(100, Math.max(0, d.value))) / 100);
        break;
      case 'flat':
        discountAmount = Math.max(0, Math.round(d.value));
        break;
      case 'fixedPrice':
        discountAmount = Math.max(0, listPrice - Math.max(0, Math.round(d.value)));
        break;
      case 'freeDays':
        bonusDays = Math.max(0, Math.round(d.value));
        break;
    }
  }

  discountAmount = Math.min(discountAmount, listPrice);
  const payable = listPrice - discountAmount;

  return {
    plan: input.plan,
    months: p.months,
    listPrice,
    discountCode: d ? d.code : null,
    discountLabel: d?.label ?? null,
    discountAmount,
    bonusDays,
    payable,
    effectiveMonthly: Math.round(payable / p.months),
  };
}

/**
 * Does this discount still apply to the *next* payment?
 *
 * `first` dies after one use, `periods` after N, `forever` never does. Called
 * when an admin renews a shop that has a discount attached, so a "20% off for
 * life" promise is actually kept and a "first month only" one is not honoured
 * by accident twelve months running.
 */
export function discountStillApplies(input: {
  scope: DiscountScope;
  periods?: number;
  timesAlreadyApplied: number;
}): boolean {
  if (input.scope === 'forever') return true;
  if (input.scope === 'first') return input.timesAlreadyApplied < 1;
  return input.timesAlreadyApplied < Math.max(1, input.periods ?? 1);
}

// ── Reminders ─────────────────────────────────────────────────────────────

/** Days before expiry on which the app nudges. Plus one on the day itself. */
export const REMINDER_DAYS = [7, 3, 1] as const;

export type Reminder = { at: number; daysLeft: number };

/**
 * When to fire local renewal reminders.
 *
 * Local notifications, not push — they cost nothing, need no server, and keep
 * working when the phone has been offline for a week. Anything already in the
 * past is dropped so a shop that installs late is not hit with four
 * notifications at once.
 */
export function reminderSchedule(activeUntil: number, now: number): Reminder[] {
  const out: Reminder[] = [];
  for (const d of REMINDER_DAYS) {
    const at = activeUntil - d * DAY_MS;
    if (at > now) out.push({ at, daysLeft: d });
  }
  if (activeUntil > now) out.push({ at: activeUntil, daysLeft: 0 });
  return out.sort((a, b) => a.at - b.at);
}
