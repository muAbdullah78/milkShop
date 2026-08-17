/**
 * Subscription arithmetic, replayed.
 *
 * The ledger test caught a real windowing bug last time by simulating instead
 * of asserting, so the same approach is used here. This walks a shop through
 * years of trials, payments, lapses, early renewals and discounts, and after
 * every single step asserts the invariants that must never break:
 *
 *   1. A paid day is never lost. Renewing early always extends, never resets.
 *   2. Access is monotonic within a period — you cannot be locked out on a day
 *      you have paid for.
 *   3. readOnlyUntil is always exactly READ_ONLY_DAYS past activeUntil.
 *   4. A discount can never make a price negative, and never exceeds list.
 *   5. Calendar months land on sane dates (31 Jan + 1 month is not 3 March).
 *   6. Reminders never fire in the past and never after expiry.
 *
 * Run: node scripts/subscription-math-test.mjs
 *
 * The engine is TypeScript, so the handful of pure functions under test are
 * mirrored here rather than compiled. They are copied verbatim; if you change
 * src/features/subscription.ts, change them here and the test will tell you
 * whether the change was safe.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const READ_ONLY_DAYS = 7;
const TRIAL_DAYS = 7;

const PLANS = {
  monthly: { id: 'monthly', months: 1, price: 850 },
  quarterly: { id: 'quarterly', months: 3, price: 2250 },
  annual: { id: 'annual', months: 12, price: 8500 },
};

// ── mirrored from src/features/subscription.ts ────────────────────────────

function daysUntil(then, now) {
  return Math.ceil((then - now) / DAY_MS);
}

function nextPeriodEnd(months, now, currentEnd) {
  const base = currentEnd && currentEnd > now ? currentEnd : now;
  const d = new Date(base);
  const targetMonth = d.getMonth() + months;
  const dayOfMonth = d.getDate();

  const out = new Date(d.getTime());
  out.setDate(1);
  out.setMonth(targetMonth);
  const lastDay = new Date(out.getFullYear(), out.getMonth() + 1, 0).getDate();
  out.setDate(Math.min(dayOfMonth, lastDay));
  return out.getTime();
}

function startTrial(now, days = TRIAL_DAYS) {
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

function applyPayment({ plan, source, now, currentActiveUntil, bonusDays, months }) {
  const m = months ?? PLANS[plan].months;
  const end = nextPeriodEnd(m, now, currentActiveUntil) + (bonusDays ?? 0) * DAY_MS;
  return {
    subStatus: source === 'comp' ? 'comp' : 'active',
    subPlan: plan,
    subSource: source,
    activeUntil: end,
    readOnlyUntil: end + READ_ONLY_DAYS * DAY_MS,
    cancelAtPeriodEnd: false,
  };
}

function resolveEntitlement(billing, now) {
  const b = billing ?? {};
  const source = b.subSource ?? 'none';
  const plan = b.subPlan ?? null;
  const activeUntil = typeof b.activeUntil === 'number' ? b.activeUntil : null;
  const readOnlyUntil = typeof b.readOnlyUntil === 'number' ? b.readOnlyUntil : null;
  const cancelAtPeriodEnd = Boolean(b.cancelAtPeriodEnd);

  if (b.subStatus === 'comp' || source === 'comp') {
    return { level: 'full', status: 'comp', canWrite: true, canRead: true, activeUntil: null,
      readOnlyUntil: null, daysLeft: null, readOnlyDaysLeft: null, isTrial: false,
      shouldWarn: false, plan, source: 'comp', cancelAtPeriodEnd: false };
  }
  if (activeUntil === null) {
    return { level: 'full', status: b.subStatus ?? 'none', canWrite: true, canRead: true,
      activeUntil: null, readOnlyUntil: null, daysLeft: null, readOnlyDaysLeft: null,
      isTrial: false, shouldWarn: false, plan, source, cancelAtPeriodEnd };
  }

  const isTrial = source === 'trial';
  const roUntil = readOnlyUntil ?? activeUntil + READ_ONLY_DAYS * DAY_MS;
  const daysLeft = daysUntil(activeUntil, now);
  const readOnlyDaysLeft = daysUntil(roUntil, now);

  if (now <= activeUntil) {
    return { level: 'full', status: cancelAtPeriodEnd ? 'cancelled' : isTrial ? 'trialing' : 'active',
      canWrite: true, canRead: true, activeUntil, readOnlyUntil: roUntil, daysLeft,
      readOnlyDaysLeft, isTrial, shouldWarn: isTrial || daysLeft <= 7 || cancelAtPeriodEnd,
      plan, source, cancelAtPeriodEnd };
  }
  if (now <= roUntil) {
    return { level: 'readonly', status: 'readonly', canWrite: false, canRead: true, activeUntil,
      readOnlyUntil: roUntil, daysLeft, readOnlyDaysLeft, isTrial, shouldWarn: true, plan,
      source, cancelAtPeriodEnd };
  }
  return { level: 'locked', status: 'locked', canWrite: false, canRead: false, activeUntil,
    readOnlyUntil: roUntil, daysLeft, readOnlyDaysLeft, isTrial, shouldWarn: true, plan,
    source, cancelAtPeriodEnd };
}

function priceFor({ plan, discount }) {
  const p = PLANS[plan];
  const listPrice = p.price;
  const d = discount ?? null;
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
  return { plan, months: p.months, listPrice, discountAmount, bonusDays, payable,
    effectiveMonthly: Math.round(payable / p.months) };
}

function discountStillApplies({ scope, periods, timesAlreadyApplied }) {
  if (scope === 'forever') return true;
  if (scope === 'first') return timesAlreadyApplied < 1;
  return timesAlreadyApplied < Math.max(1, periods ?? 1);
}

const REMINDER_DAYS = [7, 3, 1];
function reminderSchedule(activeUntil, now) {
  const out = [];
  for (const d of REMINDER_DAYS) {
    const at = activeUntil - d * DAY_MS;
    if (at > now) out.push({ at, daysLeft: d });
  }
  if (activeUntil > now) out.push({ at: activeUntil, daysLeft: 0 });
  return out.sort((a, b) => a.at - b.at);
}

// ── harness ───────────────────────────────────────────────────────────────

let checks = 0;
const failures = [];

function assert(label, condition, detail) {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
}

function mulberry32(seed) {
  return function rand() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

// ── 1. calendar arithmetic ────────────────────────────────────────────────

function testCalendar() {
  const cases = [
    // [from, months, expected]
    ['2026-01-31', 1, '2026-02-28'], // clamps, does not spill into March
    ['2024-01-31', 1, '2024-02-29'], // leap year
    ['2026-01-15', 1, '2026-02-15'],
    ['2026-11-30', 3, '2027-02-28'], // crosses a year AND clamps
    ['2024-02-29', 12, '2025-02-28'], // leap day + a year lands on the 28th
    ['2026-03-31', 3, '2026-06-30'],
    ['2026-08-16', 12, '2027-08-16'],
    ['2026-12-31', 1, '2027-01-31'],
  ];
  for (const [from, months, expected] of cases) {
    const start = new Date(`${from}T09:00:00Z`).getTime();
    const got = nextPeriodEnd(months, start, null);
    assert(
      `calendar ${from} +${months}m`,
      iso(got) === expected,
      `expected ${expected}, got ${iso(got)}`
    );
  }

  // Adding N months one at a time must not drift away from adding N at once
  // by more than the clamping rule allows.
  let oneAtATime = new Date('2026-01-15T09:00:00Z').getTime();
  for (let i = 0; i < 12; i += 1) oneAtATime = nextPeriodEnd(1, oneAtATime - DAY_MS, oneAtATime);
  const allAtOnce = nextPeriodEnd(12, new Date('2026-01-15T09:00:00Z').getTime(), null);
  assert(
    'calendar no drift over 12 months',
    iso(oneAtATime) === iso(allAtOnce),
    `stepwise ${iso(oneAtATime)} vs direct ${iso(allAtOnce)}`
  );
}

// ── 2. discounts ──────────────────────────────────────────────────────────

function testDiscounts() {
  const plans = ['monthly', 'quarterly', 'annual'];

  // Never negative, never above list, whatever nonsense is thrown at it.
  const nasty = [
    { kind: 'percent', value: 500 },
    { kind: 'percent', value: -20 },
    { kind: 'flat', value: 999999 },
    { kind: 'flat', value: -100 },
    { kind: 'fixedPrice', value: -50 },
    { kind: 'fixedPrice', value: 999999 },
    { kind: 'freeDays', value: -5 },
    { kind: 'percent', value: 100 },
    { kind: 'fixedPrice', value: 0 },
  ];
  for (const plan of plans) {
    for (const d of nasty) {
      const r = priceFor({ plan, discount: { code: 'X', ...d } });
      assert(`discount ${plan} ${d.kind}:${d.value} not negative`, r.payable >= 0, `got ${r.payable}`);
      assert(
        `discount ${plan} ${d.kind}:${d.value} not above list`,
        r.payable <= r.listPrice,
        `got ${r.payable} > ${r.listPrice}`
      );
      assert(`discount ${plan} ${d.kind}:${d.value} bonus days sane`, r.bonusDays >= 0);
      assert(
        `discount ${plan} ${d.kind}:${d.value} arithmetic closes`,
        r.payable === r.listPrice - r.discountAmount
      );
    }
  }

  // The plan pitch has to be true, or the pricing page is a lie.
  const m = priceFor({ plan: 'monthly' });
  const q = priceFor({ plan: 'quarterly' });
  const a = priceFor({ plan: 'annual' });
  assert('monthly effective is 850', m.effectiveMonthly === 850, `got ${m.effectiveMonthly}`);
  assert('quarterly effective is 750', q.effectiveMonthly === 750, `got ${q.effectiveMonthly}`);
  assert('annual effective is 708', a.effectiveMonthly === 708, `got ${a.effectiveMonthly}`);
  assert(
    'quarterly saves 300 against monthly',
    m.listPrice * 3 - q.listPrice === 300,
    `saves ${m.listPrice * 3 - q.listPrice}`
  );
  assert(
    'annual saves 1700 against monthly',
    m.listPrice * 12 - a.listPrice === 1700,
    `saves ${m.listPrice * 12 - a.listPrice}`
  );
  assert(
    'annual is "2 months free" to the nearest rupee',
    Math.abs(a.listPrice - m.listPrice * 10) === 0,
    `annual ${a.listPrice} vs 10 months ${m.listPrice * 10}`
  );

  // Scope lifecycles.
  assert('first: applies once', discountStillApplies({ scope: 'first', timesAlreadyApplied: 0 }));
  assert('first: not twice', !discountStillApplies({ scope: 'first', timesAlreadyApplied: 1 }));
  assert('forever: always', discountStillApplies({ scope: 'forever', timesAlreadyApplied: 99 }));
  for (let n = 1; n <= 6; n += 1) {
    for (let used = 0; used <= 8; used += 1) {
      assert(
        `periods(${n}) after ${used}`,
        discountStillApplies({ scope: 'periods', periods: n, timesAlreadyApplied: used }) === used < n
      );
    }
  }
  // A malformed "periods: 0" must not become an infinite discount.
  assert(
    'periods(0) is treated as 1, not unlimited',
    discountStillApplies({ scope: 'periods', periods: 0, timesAlreadyApplied: 0 }) &&
      !discountStillApplies({ scope: 'periods', periods: 0, timesAlreadyApplied: 1 })
  );
}

// ── 3. the access ladder ──────────────────────────────────────────────────

function testLadder() {
  const now = new Date('2026-08-16T09:00:00Z').getTime();
  const b = applyPayment({ plan: 'monthly', source: 'manual', now, currentActiveUntil: null });

  const probes = [
    [now, 'full'],
    [b.activeUntil - 1000, 'full'],
    [b.activeUntil, 'full'], // the last second you paid for is still yours
    [b.activeUntil + 1000, 'readonly'],
    [b.readOnlyUntil, 'readonly'],
    [b.readOnlyUntil + 1000, 'locked'],
    [b.readOnlyUntil + 365 * DAY_MS, 'locked'],
  ];
  for (const [t, expected] of probes) {
    const e = resolveEntitlement(b, t);
    assert(`ladder at ${iso(t)}`, e.level === expected, `expected ${expected}, got ${e.level}`);
  }

  // read-only window is exactly the promised length
  assert(
    'read-only window is 7 days',
    b.readOnlyUntil - b.activeUntil === READ_ONLY_DAYS * DAY_MS,
    `${(b.readOnlyUntil - b.activeUntil) / DAY_MS} days`
  );

  // Missing billing must not lock an existing shop out.
  for (const empty of [null, undefined, {}, { subStatus: 'active' }]) {
    const e = resolveEntitlement(empty, now);
    assert('absent billing means full access', e.level === 'full' && e.canWrite);
  }

  // Comp never expires, however far in the future you look.
  const comp = resolveEntitlement({ subStatus: 'comp', subSource: 'comp' }, now + 50 * 365 * DAY_MS);
  assert('comp never expires', comp.level === 'full' && comp.canWrite && !comp.shouldWarn);

  // A cancelled subscription keeps working until the day it was paid to.
  const cancelled = { ...b, cancelAtPeriodEnd: true };
  const midCancel = resolveEntitlement(cancelled, b.activeUntil - DAY_MS);
  assert('cancelled still works to period end', midCancel.canWrite && midCancel.status === 'cancelled');
  assert('cancelled warns', midCancel.shouldWarn);

  // A trial always warns, even on day one — it is only a week long.
  const trial = startTrial(now);
  assert('trial warns from day one', resolveEntitlement(trial, now).shouldWarn);
  assert('trial is 7 days', trial.activeUntil - now === TRIAL_DAYS * DAY_MS);
  assert(
    'trial then locked after 14 days total',
    resolveEntitlement(trial, now + (TRIAL_DAYS + READ_ONLY_DAYS) * DAY_MS + 1000).level === 'locked'
  );
}

// ── 4. long random lifetimes ──────────────────────────────────────────────

function testLifetimes(seed) {
  const rand = mulberry32(seed);
  const planIds = ['monthly', 'quarterly', 'annual'];

  let now = new Date('2026-01-05T08:00:00Z').getTime();
  let billing = startTrial(now);
  let paidDaysGranted = TRIAL_DAYS;
  let lastActiveUntil = billing.activeUntil;

  // Days the shop was definitely entitled to write, collected as we go.
  const provenWritableDays = [];

  for (let step = 0; step < 60; step += 1) {
    // Jump forward somewhere between a day and four months.
    now += Math.floor(1 + rand() * 120) * DAY_MS;

    const before = resolveEntitlement(billing, now);

    // Invariant 3: the read-only window never changes shape.
    if (billing.activeUntil != null) {
      assert(
        `seed${seed}@${step} read-only window intact`,
        billing.readOnlyUntil - billing.activeUntil === READ_ONLY_DAYS * DAY_MS
      );
    }

    // Invariant 2: never locked out on a day already paid for.
    if (now <= lastActiveUntil) {
      assert(
        `seed${seed}@${step} paid day is writable`,
        before.canWrite,
        `now ${iso(now)} <= activeUntil ${iso(lastActiveUntil)} but level=${before.level}`
      );
    }

    // Reminders must never be scheduled into the past or past expiry.
    for (const r of reminderSchedule(billing.activeUntil, now)) {
      assert(`seed${seed}@${step} reminder in future`, r.at > now);
      assert(`seed${seed}@${step} reminder before expiry`, r.at <= billing.activeUntil);
    }

    const roll = rand();
    if (roll < 0.55) {
      // Pay for another period.
      const plan = planIds[Math.floor(rand() * planIds.length)];
      const bonus = rand() < 0.15 ? Math.floor(rand() * 30) : 0;
      const prevEnd = billing.activeUntil;

      billing = applyPayment({
        plan,
        source: rand() < 0.5 ? 'play' : 'manual',
        now,
        currentActiveUntil: prevEnd,
        bonusDays: bonus,
      });

      // Invariant 1: paying can only ever push the expiry later.
      assert(
        `seed${seed}@${step} payment never shortens`,
        billing.activeUntil > prevEnd,
        `prev ${iso(prevEnd)} → new ${iso(billing.activeUntil)}`
      );

      // Early renewal must stack, not reset.
      if (now < prevEnd) {
        const stackedFrom = nextPeriodEnd(PLANS[plan].months, now, prevEnd);
        assert(
          `seed${seed}@${step} early renewal stacks on old expiry`,
          billing.activeUntil === stackedFrom + bonus * DAY_MS,
          `expected ${iso(stackedFrom)}, got ${iso(billing.activeUntil)}`
        );
        // and it must be strictly better than starting from today
        const fromToday = nextPeriodEnd(PLANS[plan].months, now, null);
        assert(
          `seed${seed}@${step} early renewal beats restarting`,
          billing.activeUntil >= fromToday,
          `stacked ${iso(billing.activeUntil)} < restart ${iso(fromToday)}`
        );
      }

      paidDaysGranted += Math.round((billing.activeUntil - Math.max(now, prevEnd)) / DAY_MS);
      lastActiveUntil = billing.activeUntil;
      provenWritableDays.push(now);
    } else if (roll < 0.62) {
      billing = { ...billing, cancelAtPeriodEnd: true };
      const e = resolveEntitlement(billing, now);
      if (now <= billing.activeUntil) {
        assert(`seed${seed}@${step} cancel keeps paid access`, e.canWrite);
      }
    } else if (roll < 0.66) {
      // Admin comps them.
      billing = { ...billing, subStatus: 'comp', subSource: 'comp' };
      assert(
        `seed${seed}@${step} comp unlocks`,
        resolveEntitlement(billing, now + 1000 * DAY_MS).canWrite
      );
      // Revert so the rest of the run still exercises expiry.
      billing = { ...billing, subStatus: 'active', subSource: 'manual' };
    }

    const after = resolveEntitlement(billing, now);

    // Levels must be ordered: you can never read-write less than you can read.
    assert(
      `seed${seed}@${step} canWrite implies canRead`,
      !after.canWrite || after.canRead
    );
    assert(
      `seed${seed}@${step} level matches flags`,
      (after.level === 'full') === after.canWrite &&
        (after.level === 'locked') === !after.canRead
    );
  }

  assert(`seed${seed} accumulated some paid days`, paidDaysGranted > 0);
}

// ── 5. the early-renewal trap, explicitly ─────────────────────────────────

function testEarlyRenewalNeverLosesDays() {
  // The bug this exists to catch: a shopkeeper pays on the 25th for a period
  // that runs to the 30th. If the new period is measured from today rather
  // than from the current expiry, five paid days vanish. Silently.
  const start = new Date('2026-08-01T09:00:00Z').getTime();
  let billing = applyPayment({ plan: 'monthly', source: 'manual', now: start, currentActiveUntil: null });
  const firstEnd = billing.activeUntil;

  for (let earlyBy = 0; earlyBy <= 25; earlyBy += 1) {
    const payAt = firstEnd - earlyBy * DAY_MS;
    const next = applyPayment({
      plan: 'monthly',
      source: 'manual',
      now: payAt,
      currentActiveUntil: firstEnd,
    });
    const gained = Math.round((next.activeUntil - firstEnd) / DAY_MS);
    assert(
      `early renewal ${earlyBy}d before expiry grants a full month`,
      gained >= 28 && gained <= 31,
      `gained only ${gained} days`
    );
    assert(
      `early renewal ${earlyBy}d never loses paid time`,
      next.activeUntil > firstEnd,
      `${iso(next.activeUntil)} <= ${iso(firstEnd)}`
    );
  }

  // Late renewal: after a lapse the new period starts from today, not from the
  // stale expiry — otherwise someone who vanishes for a year and comes back
  // gets a period that is already over.
  const lateAt = firstEnd + 200 * DAY_MS;
  const late = applyPayment({
    plan: 'monthly',
    source: 'manual',
    now: lateAt,
    currentActiveUntil: firstEnd,
  });
  assert(
    'late renewal starts from today',
    late.activeUntil > lateAt && late.activeUntil < lateAt + 32 * DAY_MS,
    `paid at ${iso(lateAt)}, got ${iso(late.activeUntil)}`
  );
  assert('late renewal is immediately usable', resolveEntitlement(late, lateAt).canWrite);
}

// ── run ───────────────────────────────────────────────────────────────────

testCalendar();
testDiscounts();
testLadder();
testEarlyRenewalNeverLosesDays();
for (const seed of [1, 7, 42, 99, 2026, 31337]) testLifetimes(seed);

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checks} assertions failed:\n`);
  for (const f of failures.slice(0, 40)) console.error(`   ${f}`);
  if (failures.length > 40) console.error(`   … and ${failures.length - 40} more`);
  process.exit(1);
}

console.log(`✓ subscription math clean — ${checks} assertions across 6 simulated shop lifetimes`);
