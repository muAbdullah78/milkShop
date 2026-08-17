import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { db } from '../lib/firebase';
import {
  DAY_MS,
  PLANS,
  PLAN_IDS,
  activationPatch,
  adjustPatch,
  compPatch,
  daysLeft,
  levelOf,
  monthlyValue,
  priceFor,
  revokePatch,
  type Discount,
  type PayMethod,
  type PlanId,
  type ShopBilling,
} from './billing';
import { Badge, Button, Card, Empty, Field, Stat, inputClass, type Tone } from './ui';
import { money, num, useAdmin, when } from './useAdmin';

type Shop = ShopBilling & {
  id: string;
  name?: string;
  ownerName?: string;
  phone?: string;
  suspended?: boolean;
  createdAt?: number;
};

type Claim = {
  id: string;
  uid?: string;
  shopId?: string;
  shopName?: string;
  phone?: string;
  plan?: PlanId;
  amount?: number;
  method?: PayMethod;
  reference?: string;
  discountCode?: string;
  status?: string;
  createdAt?: unknown;
};

const LEVEL_TONE: Record<string, Tone> = {
  full: 'success',
  readonly: 'warning',
  locked: 'danger',
};

/**
 * Money.
 *
 * Two jobs on one screen, because in practice they are the same job: work
 * through the shops that reported a payment, and keep an eye on who is about
 * to lapse.
 *
 * Every activation here writes two things: the gate fields on the shop
 * document, and an immutable receipt under `subscriptions/{shopId}/payments`.
 * The receipt is what makes a disagreement about "I paid in March" answerable,
 * and the rules refuse to let anyone — including an owner admin — delete one.
 */
export default function Subscriptions() {
  const { audit, isOwner, user } = useAdmin();

  const [shops, setShops] = useState<Shop[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [tab, setTab] = useState<'claims' | 'expiring' | 'all'>('claims');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const now = Date.now();

  useEffect(() => {
    getDocs(query(collection(db(), 'shops'), orderBy('createdAt', 'desc'), limit(1000)))
      .then((s) => setShops(s.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as Shop[]))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    getDocs(query(collection(db(), 'discounts'), limit(200)))
      .then((s) => setDiscounts(s.docs.map((d) => d.data() as Discount)))
      .catch(() => undefined);

    // Live, because this is a work queue — a shopkeeper sitting on a locked
    // app is waiting on whoever is looking at this screen.
    return onSnapshot(
      query(collection(db(), 'paymentClaims'), orderBy('createdAt', 'desc'), limit(200)),
      (s) => setClaims(s.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as Claim[]),
      (e) => setError(e.message)
    );
  }, []);

  const stats = useMemo(() => {
    const paying = shops.filter((s) => monthlyValue(s) > 0 && levelOf(s, now) === 'full');
    const mrr = paying.reduce((n, s) => n + monthlyValue(s), 0);
    const trialing = shops.filter((s) => s.subSource === 'trial' && levelOf(s, now) === 'full');
    const lapsed = shops.filter((s) => levelOf(s, now) !== 'full');
    const comp = shops.filter((s) => s.subStatus === 'comp' || s.subSource === 'comp');
    const expiring = shops.filter((s) => {
      const d = daysLeft(s, now);
      return d !== null && d >= 0 && d <= 7 && levelOf(s, now) === 'full';
    });
    return { paying, mrr, trialing, lapsed, comp, expiring };
  }, [shops, now]);

  const openClaims = claims.filter((c) => c.status === 'pending');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base =
      tab === 'expiring'
        ? [...stats.expiring, ...stats.lapsed]
        : tab === 'all'
          ? shops
          : [];
    if (!q) return base;
    return base.filter(
      (s) =>
        (s.name ?? '').toLowerCase().includes(q) ||
        (s.ownerName ?? '').toLowerCase().includes(q) ||
        (s.phone ?? '').includes(q) ||
        s.id.toLowerCase().includes(q)
    );
  }, [tab, shops, stats, search]);

  /** Activates a shop and files the receipt. */
  const activate = async (input: {
    shop: Shop;
    plan: PlanId;
    method: PayMethod;
    amount: number;
    reference?: string;
    discountCode?: string;
    bonusDays?: number;
    claimId?: string;
  }) => {
    const { shop, plan, method, amount } = input;
    setBusy(shop.id);
    setMsg(null);
    try {
      const patch = activationPatch({
        plan,
        source: method === 'play' ? 'play' : method === 'comp' ? 'comp' : 'manual',
        now: Date.now(),
        currentActiveUntil: shop.activeUntil,
        bonusDays: input.bonusDays,
      });

      await updateDoc(doc(db(), 'shops', shop.id), { ...patch, updatedAt: Date.now() });

      // The receipt. Create-only in the rules — it can never be edited away.
      await setDoc(doc(collection(db(), 'subscriptions', shop.id, 'payments')), {
        amount,
        plan,
        method,
        reference: input.reference ?? '',
        discountCode: input.discountCode ?? '',
        at: Date.now(),
        recordedBy: user?.email ?? user?.uid ?? '',
        periodEnd: patch.activeUntil,
      });

      await setDoc(
        doc(db(), 'subscriptions', shop.id),
        {
          shopId: shop.id,
          plan,
          source: patch.subSource,
          activeUntil: patch.activeUntil,
          lastPaymentAmount: amount,
          lastPaymentAt: Date.now(),
          lastPaymentMethod: method,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (input.claimId) {
        await updateDoc(doc(db(), 'paymentClaims', input.claimId), {
          status: 'approved',
          resolvedAt: Date.now(),
          resolvedBy: user?.email ?? '',
        });
      }

      // Redemption counters are admin-written so they cannot be inflated from
      // a phone.
      if (input.discountCode) {
        const d = discounts.find((x) => x.code === input.discountCode);
        if (d) {
          await updateDoc(doc(db(), 'discounts', input.discountCode), {
            redemptions: (d.redemptions ?? 0) + 1,
          }).catch(() => undefined);
          await setDoc(doc(collection(db(), 'discountRedemptions')), {
            uid: shop.id,
            shopId: shop.id,
            code: input.discountCode,
            plan,
            amount,
            at: Date.now(),
          }).catch(() => undefined);
        }
      }

      setShops((prev) => prev.map((s) => (s.id === shop.id ? { ...s, ...patch } : s)));
      await audit('sub.activate', { shopId: shop.id, plan, method, amount });
      setMsg(`${shop.name ?? shop.id} is active until ${new Date(patch.activeUntil).toLocaleDateString()}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not activate');
    } finally {
      setBusy(null);
    }
  };

  const adjust = async (shop: Shop, days: number) => {
    setBusy(shop.id);
    try {
      const patch = adjustPatch(days, shop.activeUntil, Date.now());
      await updateDoc(doc(db(), 'shops', shop.id), {
        ...patch,
        subStatus: 'active',
        updatedAt: Date.now(),
      });
      setShops((prev) => prev.map((s) => (s.id === shop.id ? { ...s, ...patch, subStatus: 'active' } : s)));
      await audit(days >= 0 ? 'sub.extend' : 'sub.shorten', { shopId: shop.id, days });
      setMsg(`${days >= 0 ? 'Added' : 'Removed'} ${Math.abs(days)} days`);
    } catch {
      setMsg('Could not change the date');
    } finally {
      setBusy(null);
    }
  };

  const setComp = async (shop: Shop, on: boolean) => {
    setBusy(shop.id);
    try {
      const patch = on ? compPatch : revokePatch(Date.now());
      await updateDoc(doc(db(), 'shops', shop.id), { ...patch, updatedAt: Date.now() });
      setShops((prev) => prev.map((s) => (s.id === shop.id ? { ...s, ...patch } : s)));
      await audit(on ? 'sub.comp' : 'sub.uncomp', { shopId: shop.id });
      setMsg(on ? 'Free access granted' : 'Free access removed');
    } catch {
      setMsg('Could not change access — owner role required');
    } finally {
      setBusy(null);
    }
  };

  const rejectClaim = async (claim: Claim) => {
    if (!window.confirm('Reject this payment report? The shop stays locked.')) return;
    setBusy(claim.id);
    try {
      await updateDoc(doc(db(), 'paymentClaims', claim.id), {
        status: 'rejected',
        resolvedAt: Date.now(),
        resolvedBy: user?.email ?? '',
      });
      await audit('sub.claimReject', { claimId: claim.id, shopId: claim.shopId });
    } catch {
      setMsg('Could not reject');
    } finally {
      setBusy(null);
    }
  };

  if (error) {
    return (
      <Card>
        <p className="font-bold text-danger">Could not load billing</p>
        <p className="mt-1 text-sm text-ink-muted">{error}</p>
        <p className="mt-3 text-sm text-ink-muted">
          If this mentions permissions, deploy the rules:{' '}
          <code className="rounded bg-page px-1.5 py-0.5">firebase deploy --only firestore:rules</code>
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Subscriptions</h1>
        <p className="text-sm text-ink-muted">Who is paying, who is about to lapse, who is waiting on you.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Monthly revenue" value={loading ? '…' : money(stats.mrr)} tone="success" sub="Paying shops only" />
        <Stat label="Paying" value={loading ? '…' : num(stats.paying.length)} tone="primary" />
        <Stat label="On trial" value={loading ? '…' : num(stats.trialing.length)} tone="accent" />
        <Stat
          label="Expiring in 7 days"
          value={loading ? '…' : num(stats.expiring.length)}
          tone={stats.expiring.length ? 'warning' : 'muted'}
        />
        <Stat
          label="Lapsed"
          value={loading ? '…' : num(stats.lapsed.length)}
          tone={stats.lapsed.length ? 'danger' : 'muted'}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ['claims', `Payments to confirm (${openClaims.length})`],
            ['expiring', `Expiring & lapsed (${stats.expiring.length + stats.lapsed.length})`],
            ['all', `All shops (${shops.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-xl px-3.5 py-2.5 text-sm font-bold transition ${
              tab === key ? 'bg-primary text-white' : 'border border-line bg-white text-ink-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
        {tab !== 'claims' ? (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shop, owner or phone"
            className="ms-auto min-w-[220px] flex-1 rounded-xl border border-line bg-white px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
        ) : null}
      </div>

      {msg ? (
        <div className="rounded-2xl border border-primary/30 bg-primary-soft p-4 text-sm font-semibold text-primary">
          {msg}
        </div>
      ) : null}

      {tab === 'claims' ? (
        openClaims.length === 0 ? (
          <Card>
            <Empty text="Nothing waiting. Every reported payment has been dealt with." />
          </Card>
        ) : (
          <div className="space-y-4">
            {openClaims.map((claim) => {
              const shop = shops.find((s) => s.id === claim.shopId);
              return (
                <ClaimCard
                  key={claim.id}
                  claim={claim}
                  shop={shop}
                  busy={busy === claim.id || busy === shop?.id}
                  discounts={discounts}
                  onApprove={(plan, bonusDays) =>
                    shop &&
                    activate({
                      shop,
                      plan,
                      method: claim.method ?? 'cash',
                      amount: claim.amount ?? 0,
                      reference: claim.reference,
                      discountCode: claim.discountCode,
                      bonusDays,
                      claimId: claim.id,
                    })
                  }
                  onReject={() => rejectClaim(claim)}
                />
              );
            })}
          </div>
        )
      ) : (
        <Card>
          {loading ? (
            <Empty text="Loading…" />
          ) : rows.length === 0 ? (
            <Empty text="No shops here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                    <th className="pb-2 font-bold">Shop</th>
                    <th className="pb-2 font-bold">Plan</th>
                    <th className="pb-2 font-bold">Status</th>
                    <th className="pb-2 font-bold">Paid until</th>
                    <th className="pb-2 font-bold">Value / mo</th>
                    <th className="pb-2 font-bold" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => {
                    const level = levelOf(s, now);
                    const d = daysLeft(s, now);
                    const isComp = s.subStatus === 'comp' || s.subSource === 'comp';
                    return (
                      <tr key={s.id} className="border-b border-line/60 last:border-0">
                        <td className="py-3">
                          <Link to={`/admin/shops/${s.id}`} className="font-semibold text-ink hover:text-primary">
                            {s.name ?? 'Unnamed shop'}
                          </Link>
                          <span className="block text-xs text-ink-faint">{s.phone ?? s.ownerName ?? s.id.slice(0, 10)}</span>
                        </td>
                        <td className="py-3 text-ink-muted">
                          {isComp ? 'Free' : s.subPlan ? PLANS[s.subPlan].label : s.subSource === 'trial' ? 'Trial' : '—'}
                        </td>
                        <td className="py-3">
                          <Badge tone={isComp ? 'accent' : LEVEL_TONE[level]}>
                            {isComp ? 'comp' : level === 'full' ? (s.subSource === 'trial' ? 'trial' : 'active') : level}
                          </Badge>
                        </td>
                        <td className="py-3 text-ink-muted">
                          {isComp ? '—' : s.activeUntil ? new Date(s.activeUntil).toLocaleDateString('en-GB') : '—'}
                          {!isComp && d !== null ? (
                            <span className={`ms-2 text-xs ${d < 0 ? 'text-danger' : d <= 7 ? 'text-due' : 'text-ink-faint'}`}>
                              {d < 0 ? `${Math.abs(d)}d ago` : `${d}d`}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3 num text-ink">{monthlyValue(s) ? money(monthlyValue(s)) : '—'}</td>
                        <td className="py-3">
                          <ShopBillingActions
                            shop={s}
                            busy={busy === s.id}
                            isOwner={isOwner}
                            discounts={discounts}
                            onActivate={(plan, method, amount, code, bonus) =>
                              activate({ shop: s, plan, method, amount, discountCode: code, bonusDays: bonus })
                            }
                            onAdjust={(days) => adjust(s, days)}
                            onComp={(on) => setComp(s, on)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Card title="How activation works">
        <ul className="space-y-2 text-sm leading-relaxed text-ink-muted">
          <li>
            <strong className="text-ink">Renewing early never costs the shop days.</strong> A new
            period stacks on top of the current expiry, so a shopkeeper who pays on the 25th for a
            month ending on the 30th gets until the 30th of next month.
          </li>
          <li>
            <strong className="text-ink">Every activation files a receipt</strong> under the shop&apos;s
            billing record. Receipts cannot be edited or deleted by anyone, including you — a
            correction is a new entry.
          </li>
          <li>
            <strong className="text-ink">The app cannot be tricked.</strong> Access is decided by a
            date on the shop document that only this console can write, compared against Google&apos;s
            clock inside the security rules. A modified app on a rooted phone still cannot save a
            single delivery.
          </li>
        </ul>
      </Card>
    </div>
  );
}

// ── one pending payment report ────────────────────────────────────────────

function ClaimCard({
  claim,
  shop,
  busy,
  discounts,
  onApprove,
  onReject,
}: {
  claim: Claim;
  shop: Shop | undefined;
  busy: boolean;
  discounts: Discount[];
  onApprove: (plan: PlanId, bonusDays?: number) => void;
  onReject: () => void;
}) {
  const [plan, setPlan] = useState<PlanId>(claim.plan ?? 'monthly');
  const discount = claim.discountCode ? discounts.find((d) => d.code === claim.discountCode) : null;
  const expected = priceFor(plan, discount ?? null);
  const paid = claim.amount ?? 0;
  const mismatch = Math.abs(paid - expected.payable) > 1;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-ink">{claim.shopName || shop?.name || 'Unknown shop'}</p>
          <p className="text-xs text-ink-faint">
            {claim.phone ? `${claim.phone} · ` : ''}
            {when(claim.createdAt)}
          </p>
        </div>
        <Badge tone="warning">Pending</Badge>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-4">
        {[
          ['They say they paid', money(paid)],
          ['Method', claim.method ?? '—'],
          ['Reference', claim.reference || '—'],
          ['Code', claim.discountCode || '—'],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-page p-3">
            <dt className="text-xs text-ink-faint">{k}</dt>
            <dd className="break-all font-semibold text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Field label="Activate which plan?">
          <select value={plan} onChange={(e) => setPlan(e.target.value as PlanId)} className={inputClass}>
            {PLAN_IDS.map((id) => (
              <option key={id} value={id}>
                {PLANS[id].label} — {money(PLANS[id].price)}
              </option>
            ))}
          </select>
        </Field>
        <div className="rounded-xl bg-page px-4 py-2.5 text-sm">
          <span className="text-ink-faint">Expected </span>
          <strong className="text-ink">{money(expected.payable)}</strong>
          {expected.bonusDays ? <span className="text-ink-faint"> + {expected.bonusDays}d</span> : null}
        </div>
      </div>

      {mismatch ? (
        <p className="mt-3 rounded-xl bg-warning-soft p-3 text-sm text-ink">
          <strong className="font-bold">Amount does not match.</strong> They report{' '}
          {money(paid)}, this plan costs {money(expected.payable)}. Check your JazzCash or bank
          statement before approving — the reference number is the only thing that proves the money
          arrived.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => onApprove(plan, expected.bonusDays)} disabled={busy || !shop}>
          Confirm payment &amp; activate
        </Button>
        <Button tone="ghost" onClick={onReject} disabled={busy}>
          Reject
        </Button>
        {shop ? (
          <Link
            to={`/admin/shops/${shop.id}`}
            className="rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-ink hover:bg-page"
          >
            Open shop
          </Link>
        ) : (
          <span className="self-center text-xs text-danger">Shop not found — cannot activate.</span>
        )}
        {claim.phone ? (
          <a
            href={`https://wa.me/${claim.phone.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="self-center text-sm font-bold text-money-in"
          >
            WhatsApp them →
          </a>
        ) : null}
      </div>
    </Card>
  );
}

// ── per-row controls ──────────────────────────────────────────────────────

function ShopBillingActions({
  shop,
  busy,
  isOwner,
  discounts,
  onActivate,
  onAdjust,
  onComp,
}: {
  shop: Shop;
  busy: boolean;
  isOwner: boolean;
  discounts: Discount[];
  onActivate: (plan: PlanId, method: PayMethod, amount: number, code?: string, bonus?: number) => void;
  onAdjust: (days: number) => void;
  onComp: (on: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<PlanId>('monthly');
  const [method, setMethod] = useState<PayMethod>('jazzcash');
  const [code, setCode] = useState('');

  const discount = code ? discounts.find((d) => d.code === code.trim().toUpperCase()) : null;
  const price = priceFor(plan, discount ?? null);
  const isComp = shop.subStatus === 'comp' || shop.subSource === 'comp';

  if (!open) {
    return (
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-bold text-ink hover:bg-page"
        >
          Manage
        </button>
      </div>
    );
  }

  return (
    <div className="min-w-[300px] rounded-xl border border-line bg-page p-3">
      <div className="grid gap-2">
        <select value={plan} onChange={(e) => setPlan(e.target.value as PlanId)} className="rounded-lg border border-line bg-white px-2.5 py-2 text-xs">
          {PLAN_IDS.map((id) => (
            <option key={id} value={id}>
              {PLANS[id].label} — {money(PLANS[id].price)}
            </option>
          ))}
        </select>
        <select value={method} onChange={(e) => setMethod(e.target.value as PayMethod)} className="rounded-lg border border-line bg-white px-2.5 py-2 text-xs">
          {(['jazzcash', 'easypaisa', 'bank', 'cash', 'play'] as PayMethod[]).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Discount code (optional)"
          className="rounded-lg border border-line bg-white px-2.5 py-2 text-xs"
        />
        <p className="text-xs text-ink-muted">
          Charge <strong className="text-ink">{money(price.payable)}</strong>
          {price.discountAmount ? ` (was ${money(price.listPrice)})` : ''}
          {price.bonusDays ? ` + ${price.bonusDays} free days` : ''}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => onActivate(plan, method, price.payable, discount?.code, price.bonusDays)}
            className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          >
            Activate
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onAdjust(7)}
            className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-bold text-ink disabled:opacity-50"
          >
            +7d
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onAdjust(30)}
            className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-bold text-ink disabled:opacity-50"
          >
            +30d
          </button>
          {isOwner ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onComp(!isComp)}
              className="rounded-lg border border-accent/40 bg-white px-2.5 py-1.5 text-xs font-bold text-accent disabled:opacity-50"
            >
              {isComp ? 'End free' : 'Free forever'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-ink-faint"
          >
            Close
          </button>
        </div>
        {shop.activeUntil ? (
          <p className="text-[11px] text-ink-faint">
            New expiry would be{' '}
            {new Date(
              Math.max(shop.activeUntil, Date.now()) + PLANS[plan].months * 30 * DAY_MS
            ).toLocaleDateString('en-GB')}{' '}
            (approx — exact date uses calendar months)
          </p>
        ) : null}
      </div>
    </div>
  );
}
