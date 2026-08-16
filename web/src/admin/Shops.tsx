import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { db } from '../lib/firebase';
import { Badge, Button, Card, Empty, Field, Stat, inputClass } from './ui';
import { daysAgo, money, num, useAdmin, when } from './useAdmin';

type Shop = {
  id: string;
  name?: string;
  ownerName?: string;
  ownerUid?: string;
  phone?: string;
  address?: string;
  defaultMilkRate?: number;
  createdAt?: number;
  updatedAt?: number;
  suspended?: boolean;
  suspensionReason?: string;
  adminNote?: string;
  memberUids?: string[];
};

export function ShopsList() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'quiet' | 'suspended'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db(), 'shops'), orderBy('createdAt', 'desc'), limit(1000)))
      .then((snap) => setShops(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as Shop[]))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return shops.filter((s) => {
      const d = daysAgo(s.updatedAt);
      if (filter === 'suspended' && !s.suspended) return false;
      if (filter === 'active' && !(d !== null && d <= 7)) return false;
      if (filter === 'quiet' && !(d !== null && d > 30)) return false;
      if (!q) return true;
      return (
        (s.name ?? '').toLowerCase().includes(q) ||
        (s.ownerName ?? '').toLowerCase().includes(q) ||
        (s.phone ?? '').includes(q) ||
        s.id.toLowerCase().includes(q)
      );
    });
  }, [shops, search, filter]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Shops</h1>
        <p className="text-sm text-ink-muted">{num(shops.length)} total</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, owner, phone or ID"
          className="min-w-[240px] flex-1 rounded-xl border border-line bg-white px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
        {(['all', 'active', 'quiet', 'suspended'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-xl px-3.5 py-2.5 text-sm font-bold capitalize transition ${
              filter === f ? 'bg-primary text-white' : 'border border-line bg-white text-ink-muted hover:text-ink'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <Empty text="Loading…" />
        ) : rows.length === 0 ? (
          <Empty text="No shops match." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th className="pb-2 font-bold">Shop</th>
                  <th className="pb-2 font-bold">Owner</th>
                  <th className="pb-2 font-bold">Joined</th>
                  <th className="pb-2 font-bold">Last seen</th>
                  <th className="pb-2 font-bold" />
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const d = daysAgo(s.updatedAt);
                  return (
                    <tr key={s.id} className="border-b border-line/60 last:border-0">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">{s.name ?? 'Unnamed shop'}</span>
                          {s.suspended ? <Badge tone="danger">Suspended</Badge> : null}
                        </div>
                        <span className="text-xs text-ink-faint">{s.phone ?? s.id.slice(0, 10)}</span>
                      </td>
                      <td className="py-3 text-ink-muted">{s.ownerName ?? '—'}</td>
                      <td className="py-3 text-ink-muted">{when(s.createdAt)}</td>
                      <td className="py-3">
                        <span className={d !== null && d <= 7 ? 'text-money-in' : 'text-ink-muted'}>
                          {d === null ? '—' : d === 0 ? 'Today' : `${d} d ago`}
                        </span>
                      </td>
                      <td className="py-3 text-end">
                        <Link to={`/admin/shops/${s.id}`} className="font-bold text-primary">
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export function ShopDetail() {
  const { shopId } = useParams<{ shopId: string }>();
  const { audit, isOwner } = useAdmin();

  const [shop, setShop] = useState<Shop | null>(null);
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (!shopId) return;
    let cancelled = false;

    (async () => {
      const snap = await getDoc(doc(db(), 'shops', shopId)).catch(() => null);
      if (!cancelled && snap?.exists()) {
        const data = { id: snap.id, ...(snap.data() as object) } as Shop;
        setShop(data);
        setNote(data.adminNote ?? '');
        setReason(data.suspensionReason ?? '');
      }
      if (!cancelled) setLoading(false);

      const groups = ['customers', 'deliveries', 'sales', 'payments', 'khaataEntries', 'expenses'];
      const results = await Promise.all(
        groups.map((g) =>
          getCountFromServer(collection(db(), 'shops', shopId, g))
            .then((r) => r.data().count)
            .catch(() => null)
        )
      );
      if (!cancelled) setCounts(Object.fromEntries(groups.map((g, i) => [g, results[i]])));
    })();

    return () => {
      cancelled = true;
    };
  }, [shopId]);

  const setSuspended = async (next: boolean) => {
    if (!shopId || !shop) return;
    setBusy(true);
    try {
      await updateDoc(doc(db(), 'shops', shopId), {
        suspended: next,
        suspensionReason: next ? reason.trim() : '',
        suspendedAt: next ? Date.now() : 0,
        updatedAt: Date.now(),
      });
      setShop({ ...shop, suspended: next, suspensionReason: next ? reason.trim() : '' });
      await audit(next ? 'shop.suspend' : 'shop.unsuspend', { shopId, reason: reason.trim() });
      setSaved(next ? 'Shop suspended' : 'Shop restored');
    } catch {
      setSaved('Could not save — check your admin role');
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async () => {
    if (!shopId) return;
    setBusy(true);
    try {
      await updateDoc(doc(db(), 'shops', shopId), { adminNote: note.trim(), updatedAt: Date.now() });
      await audit('shop.note', { shopId });
      setSaved('Note saved');
    } catch {
      setSaved('Could not save');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Empty text="Loading…" />;
  if (!shop) return <Card><Empty text="Shop not found." /></Card>;

  return (
    <div className="space-y-5">
      <Link to="/admin/shops" className="text-sm font-semibold text-ink-muted hover:text-primary">
        ← All shops
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">{shop.name ?? 'Unnamed shop'}</h1>
          <p className="text-sm text-ink-muted">
            {shop.ownerName ? `${shop.ownerName} · ` : ''}
            {shop.phone ?? '—'}
          </p>
        </div>
        {shop.suspended ? <Badge tone="danger">Suspended</Badge> : <Badge tone="success">Active</Badge>}
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ['Customers', 'customers'],
          ['Deliveries', 'deliveries'],
          ['Sales', 'sales'],
          ['Payments', 'payments'],
          ['Khaata lines', 'khaataEntries'],
          ['Expenses', 'expenses'],
        ].map(([label, key]) => (
          <Stat
            key={key}
            label={label}
            value={counts[key] === undefined ? '…' : counts[key] === null ? '—' : num(counts[key]!)}
          />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Details">
          <dl className="space-y-2.5 text-sm">
            {[
              ['Shop ID', shop.id],
              ['Owner UID', shop.ownerUid ?? '—'],
              ['Members', String(shop.memberUids?.length ?? 0)],
              ['Address', shop.address ?? '—'],
              ['Default milk rate', shop.defaultMilkRate ? money(shop.defaultMilkRate) : '—'],
              ['Joined', when(shop.createdAt)],
              ['Last write', when(shop.updatedAt)],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-4 border-b border-line/60 pb-2.5 last:border-0">
                <dt className="w-36 shrink-0 text-ink-faint">{k}</dt>
                <dd className="min-w-0 break-all font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 rounded-xl bg-page p-3 text-xs leading-relaxed text-ink-muted">
            Admins can read a shop for support but the security rules stop them writing to its
            khaata. Support must never be able to change what a customer owes.
          </p>
        </Card>

        <div className="space-y-5">
          <Card title="Internal note" sub="Only visible to admins">
            <textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={inputClass}
              placeholder="Context for the next person who opens this shop…"
            />
            <div className="mt-3">
              <Button onClick={saveNote} disabled={busy} tone="ghost">
                Save note
              </Button>
            </div>
          </Card>

          <Card title={shop.suspended ? 'Restore access' : 'Suspend this shop'}>
            {shop.suspended ? (
              <>
                <p className="text-sm text-ink-muted">
                  The shopkeeper currently sees a &ldquo;shop is paused&rdquo; screen. Their data is
                  untouched.
                </p>
                {shop.suspensionReason ? (
                  <p className="mt-2 rounded-xl bg-page p-3 text-sm text-ink">
                    {shop.suspensionReason}
                  </p>
                ) : null}
                <div className="mt-4">
                  <Button tone="success" onClick={() => setSuspended(false)} disabled={busy}>
                    Restore access
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-ink-muted">
                  Blocks the app for this shop only. Nothing is deleted, and it can be undone at any
                  time.
                </p>
                <Field label="Reason shown to the shopkeeper">
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className={inputClass}
                    placeholder="Please contact support about your account."
                  />
                </Field>
                <div className="mt-4">
                  <Button tone="danger" onClick={() => setSuspended(true)} disabled={busy || !isOwner}>
                    Suspend shop
                  </Button>
                  {!isOwner ? (
                    <p className="mt-2 text-xs text-ink-faint">Owner role required.</p>
                  ) : null}
                </div>
              </>
            )}
            {saved ? <p className="mt-3 text-sm font-semibold text-primary">{saved}</p> : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
