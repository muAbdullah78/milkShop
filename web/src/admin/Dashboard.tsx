import {
  collection,
  collectionGroup,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { db } from '../lib/firebase';
import { Card, Stat } from './ui';
import { daysAgo, num, when } from './useAdmin';

type ShopRow = {
  id: string;
  name?: string;
  ownerName?: string;
  phone?: string;
  createdAt?: number;
  updatedAt?: number;
  suspended?: boolean;
};

/**
 * Platform overview.
 *
 * Totals use Firestore's server-side count aggregation across collection
 * groups — one billed read each, rather than downloading every shop's data.
 * Growth and activity are derived from the shop documents themselves, which
 * are small and few.
 */
export default function Dashboard() {
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const snap = await getDocs(query(collection(db(), 'shops'), orderBy('createdAt', 'desc'), limit(500)));
        if (!cancelled) {
          setShops(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as ShopRow[]);
        }

        const groups = ['customers', 'deliveries', 'sales', 'payments', 'khaataEntries'];
        const results = await Promise.all(
          groups.map((g) =>
            getCountFromServer(collectionGroup(db(), g))
              .then((r) => r.data().count)
              .catch(() => null)
          )
        );
        if (!cancelled) {
          setCounts(Object.fromEntries(groups.map((g, i) => [g, results[i]])));
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const active = shops.filter((s) => {
      const d = daysAgo(s.updatedAt);
      return d !== null && d <= 7;
    });
    const suspended = shops.filter((s) => s.suspended);
    const newThisMonth = shops.filter((s) => {
      const d = daysAgo(s.createdAt);
      return d !== null && d <= 30;
    });
    return { active, suspended, newThisMonth };
  }, [shops]);

  const growth = useMemo(() => {
    // Shops created per month for the last 12 months.
    const buckets = new Map<string, number>();
    const now = new Date();
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, 0);
    }
    shops.forEach((s) => {
      if (!s.createdAt) return;
      const d = new Date(s.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });
    return [...buckets.entries()].map(([month, count]) => ({
      month: month.slice(5),
      count,
    }));
  }, [shops]);

  const activity = useMemo(() => {
    const bands = [
      { label: 'Today', min: 0, max: 0 },
      { label: '1–7 d', min: 1, max: 7 },
      { label: '8–30 d', min: 8, max: 30 },
      { label: '31–90 d', min: 31, max: 90 },
      { label: '90 d +', min: 91, max: Infinity },
    ];
    return bands.map((b) => ({
      label: b.label,
      shops: shops.filter((s) => {
        const d = daysAgo(s.updatedAt);
        return d !== null && d >= b.min && d <= b.max;
      }).length,
    }));
  }, [shops]);

  if (error) {
    return (
      <Card>
        <p className="font-bold text-danger">Could not load platform data</p>
        <p className="mt-1 text-sm text-ink-muted">{error}</p>
        <p className="mt-3 text-sm text-ink-muted">
          If this mentions permissions, deploy the Firestore rules from the repo root:{' '}
          <code className="rounded bg-page px-1.5 py-0.5">firebase deploy --only firestore:rules</code>
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Overview</h1>
        <p className="text-sm text-ink-muted">Every shop using MilkBook.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Shops" value={loading ? '…' : num(shops.length)} tone="primary" />
        <Stat
          label="Active this week"
          value={loading ? '…' : num(stats.active.length)}
          sub={shops.length ? `${Math.round((stats.active.length / shops.length) * 100)}% of all` : undefined}
          tone="success"
        />
        <Stat label="New in 30 days" value={loading ? '…' : num(stats.newThisMonth.length)} tone="accent" />
        <Stat
          label="Suspended"
          value={loading ? '…' : num(stats.suspended.length)}
          tone={stats.suspended.length > 0 ? 'danger' : 'muted'}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Customers', 'customers'],
          ['Deliveries', 'deliveries'],
          ['Sales', 'sales'],
          ['Payments', 'payments'],
          ['Khaata lines', 'khaataEntries'],
        ].map(([label, key]) => (
          <Stat
            key={key}
            label={label}
            value={counts[key] === undefined ? '…' : counts[key] === null ? '—' : num(counts[key]!)}
            tone="muted"
          />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="New shops per month" sub="Last 12 months">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growth} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1B3FCB" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#1B3FCB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="#E2E9F5" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#93A2BE' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#93A2BE' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E9F5', fontSize: 13 }} />
                <Area type="monotone" dataKey="count" stroke="#1B3FCB" strokeWidth={2.5} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Last seen" sub="How recently each shop wrote something">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activity} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 6" stroke="#E2E9F5" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#93A2BE' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#93A2BE' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E9F5', fontSize: 13 }} />
                <Bar dataKey="shops" fill="#0FB5A5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Newest shops" action={<Link to="/admin/shops" className="text-sm font-bold text-primary">View all →</Link>}>
        {loading ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : shops.length === 0 ? (
          <p className="text-sm text-ink-muted">No shops yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th className="pb-2 font-bold">Shop</th>
                  <th className="pb-2 font-bold">Joined</th>
                  <th className="pb-2 font-bold">Last seen</th>
                  <th className="pb-2 font-bold" />
                </tr>
              </thead>
              <tbody>
                {shops.slice(0, 8).map((s) => (
                  <tr key={s.id} className="border-b border-line/60 last:border-0">
                    <td className="py-3">
                      <span className="font-semibold text-ink">{s.name ?? 'Unnamed shop'}</span>
                      {s.suspended ? (
                        <span className="ms-2 rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-bold text-danger">
                          Suspended
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 text-ink-muted">{when(s.createdAt)}</td>
                    <td className="py-3 text-ink-muted">
                      {daysAgo(s.updatedAt) === 0 ? 'Today' : `${daysAgo(s.updatedAt) ?? '—'} d ago`}
                    </td>
                    <td className="py-3 text-end">
                      <Link to={`/admin/shops/${s.id}`} className="font-bold text-primary">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
