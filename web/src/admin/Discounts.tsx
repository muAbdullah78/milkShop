import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

import { db } from '../lib/firebase';
import {
  PLANS,
  PLAN_IDS,
  describeDiscount,
  priceFor,
  type Discount,
  type DiscountKind,
  type DiscountScope,
  type PlanId,
} from './billing';
import { Badge, Button, Card, Empty, Field, Stat, inputClass } from './ui';
import { money, num, useAdmin, when } from './useAdmin';

type Redemption = {
  id: string;
  code?: string;
  shopId?: string;
  plan?: string;
  amount?: number;
  at?: number;
};

/**
 * Discount codes.
 *
 * Built to cover the cases that actually come up when you are signing up milk
 * shops one street at a time:
 *
 *  • **First month half price** — percent, first payment only.
 *  • **Rs 200 off every renewal, for life** — flat, forever. The promise you
 *    make to the first ten shops who take a chance on you.
 *  • **Pay Rs 500 whatever the plan** — fixed price, useful for a shop you are
 *    negotiating with individually.
 *  • **30 extra days free** — free days, which adds time instead of cutting
 *    price, so the shop still pays full rate afterwards.
 *
 * Scoped to specific plans, time-limited, capped by number of redemptions, and
 * optionally once per shop. Codes are never enumerable from a phone: the rules
 * allow reading one document by exact code, but only an admin can list the
 * collection. Somebody who guesses LAUNCH50 gets it; somebody who wants to see
 * every code you have does not.
 */
export default function Discounts() {
  const { audit, isOwner, user } = useAdmin();

  const [codes, setCodes] = useState<Discount[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Draft
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<DiscountKind>('percent');
  const [value, setValue] = useState('50');
  const [scope, setScope] = useState<DiscountScope>('first');
  const [periods, setPeriods] = useState('3');
  const [plans, setPlans] = useState<PlanId[]>([]);
  const [validUntil, setValidUntil] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [oncePerShop, setOncePerShop] = useState(true);
  const [note, setNote] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db(), 'discounts'), limit(300)),
      (snap) => {
        setCodes(snap.docs.map((d) => ({ ...(d.data() as Discount), code: d.id })));
        setLoading(false);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      }
    );
    getDocs(query(collection(db(), 'discountRedemptions'), orderBy('at', 'desc'), limit(100)))
      .then((s) => setRedemptions(s.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as Redemption[]))
      .catch(() => undefined);
    return unsub;
  }, []);

  const draft: Discount = useMemo(
    () => ({
      code: code.trim().toUpperCase(),
      kind,
      value: Number(value || 0),
      scope,
      periods: Number(periods || 1),
      plans,
      active: true,
      oncePerShop,
      label: label.trim(),
      note: note.trim(),
    }),
    [code, kind, value, scope, periods, plans, oncePerShop, label, note]
  );

  const preview = PLAN_IDS.map((id) => ({ id, ...priceFor(id, draft) }));

  const valid =
    draft.code.length >= 3 &&
    /^[A-Z0-9]+$/.test(draft.code) &&
    draft.value > 0 &&
    (kind !== 'percent' || draft.value <= 100);

  const save = async () => {
    if (!valid) return;
    setBusy(true);
    setMsg(null);
    try {
      const existing = codes.find((c) => c.code === draft.code);
      await setDoc(
        doc(db(), 'discounts', draft.code),
        {
          ...draft,
          plans: plans.length ? plans : [],
          periods: scope === 'periods' ? Math.max(1, Number(periods || 1)) : 1,
          validUntil: validUntil ? new Date(`${validUntil}T23:59:59`).getTime() : null,
          maxRedemptions: maxRedemptions ? Number(maxRedemptions) : 0,
          // Never reset a live counter by re-saving a code.
          redemptions: existing?.redemptions ?? 0,
          createdAt: existing?.createdAt ?? Date.now(),
          createdBy: existing?.createdBy ?? user?.email ?? '',
        },
        { merge: true }
      );
      await audit(existing ? 'discount.update' : 'discount.create', { code: draft.code, kind, value: draft.value });
      setMsg(`${draft.code} saved`);
      setShowForm(false);
      setCode('');
      setLabel('');
      setNote('');
    } catch {
      setMsg('Could not save — check your admin role');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (d: Discount) => {
    setBusy(true);
    try {
      await setDoc(doc(db(), 'discounts', d.code), { active: !d.active }, { merge: true });
      await audit(d.active ? 'discount.disable' : 'discount.enable', { code: d.code });
    } catch {
      setMsg('Could not change that code');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (d: Discount) => {
    if (!window.confirm(`Delete ${d.code}? Shops already given this discount keep it.`)) return;
    setBusy(true);
    try {
      await deleteDoc(doc(db(), 'discounts', d.code));
      await audit('discount.delete', { code: d.code });
      setMsg(`${d.code} deleted`);
    } catch {
      setMsg('Could not delete');
    } finally {
      setBusy(false);
    }
  };

  const totalRedemptions = codes.reduce((n, c) => n + (c.redemptions ?? 0), 0);
  const given = redemptions.reduce((n, r) => n + (r.amount ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Discounts</h1>
          <p className="text-sm text-ink-muted">Codes a shopkeeper types, or that you apply yourself.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Close' : 'New code'}</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Codes" value={loading ? '…' : num(codes.length)} tone="primary" />
        <Stat label="Times used" value={num(totalRedemptions)} tone="accent" />
        <Stat label="Charged with a code" value={money(given)} sub="Last 100 uses" />
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {msg ? <p className="text-sm font-semibold text-primary">{msg}</p> : null}

      {showForm ? (
        <Card title="New or updated code" sub="Saving an existing code edits it — the use count is kept">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code" hint="Letters and numbers only. This is what the shopkeeper types.">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                className={inputClass}
                placeholder="LAUNCH50"
              />
            </Field>
            <Field label="Name" hint="For your own reference in this list.">
              <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputClass} placeholder="Launch offer" />
            </Field>

            <Field label="What it does">
              <select value={kind} onChange={(e) => setKind(e.target.value as DiscountKind)} className={inputClass}>
                <option value="percent">Percentage off</option>
                <option value="flat">Rupees off</option>
                <option value="fixedPrice">Fixed price — pay exactly this</option>
                <option value="freeDays">Extra free days (full price still charged)</option>
              </select>
            </Field>
            <Field
              label={
                kind === 'percent'
                  ? 'Percent off (1–100)'
                  : kind === 'freeDays'
                    ? 'Number of free days'
                    : 'Rupees'
              }
            >
              <input
                inputMode="numeric"
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ''))}
                className={inputClass}
              />
            </Field>

            <Field label="How long it lasts">
              <select value={scope} onChange={(e) => setScope(e.target.value as DiscountScope)} className={inputClass}>
                <option value="first">First payment only</option>
                <option value="periods">The first few payments</option>
                <option value="forever">Every payment, for life</option>
              </select>
            </Field>
            {scope === 'periods' ? (
              <Field label="How many payments">
                <input
                  inputMode="numeric"
                  value={periods}
                  onChange={(e) => setPeriods(e.target.value.replace(/[^0-9]/g, ''))}
                  className={inputClass}
                />
              </Field>
            ) : (
              <div />
            )}

            <Field label="Which plans" hint="Leave all unticked to allow every plan.">
              <div className="mt-1.5 flex flex-wrap gap-2">
                {PLAN_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      setPlans((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
                    }
                    className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                      plans.includes(id)
                        ? 'border-primary bg-primary-soft text-primary'
                        : 'border-line bg-white text-ink-muted'
                    }`}
                  >
                    {PLANS[id].label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Stops working after" hint="Leave blank for no end date.">
              <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={inputClass} />
            </Field>

            <Field label="Maximum uses" hint="Blank or 0 means unlimited.">
              <input
                inputMode="numeric"
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value.replace(/[^0-9]/g, ''))}
                className={inputClass}
                placeholder="Unlimited"
              />
            </Field>

            <Field label="One use per shop">
              <label className="mt-2 flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={oncePerShop} onChange={(e) => setOncePerShop(e.target.checked)} />
                Stop the same shop using it twice
              </label>
            </Field>
          </div>

          <Field label="Internal note">
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} placeholder="Why this exists, who it is for…" />
          </Field>

          {/* Preview, because a discount you got wrong is money you never see. */}
          <div className="mt-5 rounded-xl bg-page p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-faint">
              What the shopkeeper would pay
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {preview.map((p) => (
                <div key={p.id} className="rounded-lg bg-white p-3">
                  <p className="text-xs text-ink-faint">{PLANS[p.id].label}</p>
                  <p className="font-bold text-ink">
                    {p.discountAmount ? (
                      <>
                        <span className="text-ink-faint line-through">{money(p.listPrice)}</span>{' '}
                        <span className="text-money-in">{money(p.payable)}</span>
                      </>
                    ) : (
                      money(p.payable)
                    )}
                  </p>
                  {p.bonusDays ? <p className="text-xs text-money-in">+{p.bonusDays} free days</p> : null}
                  <p className="text-xs text-ink-faint">{money(p.effectiveMonthly)}/mo</p>
                </div>
              ))}
            </div>
            {!valid && code ? (
              <p className="mt-3 text-sm text-danger">
                {draft.code.length < 3
                  ? 'Code must be at least 3 characters.'
                  : kind === 'percent' && draft.value > 100
                    ? 'A percentage cannot be more than 100.'
                    : 'Enter a value greater than zero.'}
              </p>
            ) : null}
          </div>

          <div className="mt-4">
            <Button onClick={save} disabled={busy || !valid}>
              Save code
            </Button>
          </div>
        </Card>
      ) : null}

      <Card title={`Codes (${codes.length})`}>
        {loading ? (
          <Empty text="Loading…" />
        ) : codes.length === 0 ? (
          <Empty text="No codes yet. Create one above." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th className="pb-2 font-bold">Code</th>
                  <th className="pb-2 font-bold">What it does</th>
                  <th className="pb-2 font-bold">Plans</th>
                  <th className="pb-2 font-bold">Used</th>
                  <th className="pb-2 font-bold">Ends</th>
                  <th className="pb-2 font-bold" />
                </tr>
              </thead>
              <tbody>
                {codes.map((d) => {
                  const usedUp = Boolean(d.maxRedemptions && (d.redemptions ?? 0) >= d.maxRedemptions);
                  const expired = Boolean(d.validUntil && Date.now() > d.validUntil);
                  return (
                    <tr key={d.code} className="border-b border-line/60 last:border-0">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-page px-2 py-0.5 font-bold text-ink">{d.code}</code>
                          {!d.active ? <Badge tone="muted">off</Badge> : expired ? <Badge tone="danger">expired</Badge> : usedUp ? <Badge tone="warning">used up</Badge> : <Badge tone="success">live</Badge>}
                        </div>
                        {d.label ? <span className="text-xs text-ink-faint">{d.label}</span> : null}
                      </td>
                      <td className="py-3 text-ink-muted">{describeDiscount(d)}</td>
                      <td className="py-3 text-ink-muted">
                        {d.plans && d.plans.length ? d.plans.map((p) => PLANS[p].label).join(', ') : 'All'}
                      </td>
                      <td className="py-3 num text-ink">
                        {num(d.redemptions ?? 0)}
                        {d.maxRedemptions ? <span className="text-ink-faint"> / {num(d.maxRedemptions)}</span> : null}
                      </td>
                      <td className="py-3 text-ink-muted">{d.validUntil ? when(d.validUntil) : '—'}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => toggle(d)}
                            className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-bold text-ink hover:bg-page disabled:opacity-50"
                          >
                            {d.active ? 'Switch off' : 'Switch on'}
                          </button>
                          {isOwner ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => remove(d)}
                              className="rounded-lg border border-danger/30 px-2.5 py-1.5 text-xs font-bold text-danger hover:bg-danger/5 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Recent uses">
        {redemptions.length === 0 ? (
          <Empty text="No code has been used yet." />
        ) : (
          <ul className="space-y-0">
            {redemptions.slice(0, 25).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 border-b border-line/60 py-2.5 last:border-0">
                <code className="rounded bg-page px-2 py-0.5 text-xs font-bold text-ink">{r.code}</code>
                <span className="text-sm text-ink-muted">{r.plan}</span>
                <span className="num text-sm text-ink">{money(r.amount ?? 0)}</span>
                <span className="ms-auto text-xs text-ink-faint">{when(r.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Worked examples">
        <ul className="space-y-2.5 text-sm leading-relaxed text-ink-muted">
          <li>
            <strong className="text-ink">Half price for the first month.</strong> Percentage off, 50,
            first payment only, plan Monthly. They pay Rs 425 once, then Rs 850.
          </li>
          <li>
            <strong className="text-ink">Rs 200 off every renewal, for life.</strong> Rupees off, 200,
            every payment for life. This is the one to give the first shops who take a chance on
            you — and the console keeps the promise automatically at each renewal.
          </li>
          <li>
            <strong className="text-ink">A free month when they sign up.</strong> Extra free days, 30,
            first payment only. They still pay full price, so your monthly revenue figure stays
            honest — the cost shows up as a month of runway instead of a discount.
          </li>
          <li>
            <strong className="text-ink">A special price for one shop.</strong> Fixed price, whatever
            you agreed, every payment for life, maximum uses 1. Then hand them the code privately.
          </li>
        </ul>
      </Card>
    </div>
  );
}
