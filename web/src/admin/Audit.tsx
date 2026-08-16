import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

import { db } from '../lib/firebase';
import { Badge, Card, Empty, type Tone } from './ui';
import { when } from './useAdmin';

type Entry = {
  id: string;
  actorUid?: string;
  actorEmail?: string;
  action?: string;
  detail?: Record<string, unknown>;
  at?: unknown;
};

/** Colour by what the action does, not by which page it came from. */
function toneFor(action: string): Tone {
  if (action.includes('unsuspend') || action.includes('maintenance.off')) return 'success';
  if (action.includes('suspend') || action.includes('remove') || action.includes('purge')) return 'danger';
  if (action.includes('maintenance.on') || action.includes('feature.off')) return 'warning';
  if (action.includes('add') || action.includes('publish') || action.includes('resolve')) return 'success';
  return 'muted';
}

const LABELS: Record<string, string> = {
  'shop.suspend': 'Suspended a shop',
  'shop.unsuspend': 'Restored a shop',
  'shop.note': 'Edited a shop note',
  'platform.announcement.publish': 'Published the dashboard banner',
  'platform.announcement.hide': 'Took the banner down',
  'platform.minVersion': 'Changed the minimum app version',
  'platform.maintenance.on': 'Turned maintenance ON',
  'platform.maintenance.off': 'Turned maintenance off',
  'platform.maintenance.message': 'Changed the maintenance message',
  'platform.feature.on': 'Turned a feature on',
  'platform.feature.off': 'Turned a feature off',
  'admin.add': 'Added an admin',
  'admin.role': 'Changed an admin role',
  'admin.remove': 'Removed an admin',
  'ticket.close': 'Closed a support message',
  'ticket.reopen': 'Reopened a support message',
  'ticket.note': 'Noted a support message',
  'deletion.resolve': 'Handled a deletion request',
  'deletion.purge': 'Deleted a request record',
};

/**
 * Append-only record of everything an admin did.
 *
 * The rules allow create but never update or delete, so this cannot be tidied
 * up after the fact — which is the entire point of keeping it.
 */
export default function Audit() {
  const [rows, setRows] = useState<Entry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db(), 'adminAudit'), orderBy('at', 'desc'), limit(400)),
      (snap) => {
        setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as Entry[]);
        setLoading(false);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.action ?? '').toLowerCase().includes(q) ||
        (r.actorEmail ?? '').toLowerCase().includes(q) ||
        JSON.stringify(r.detail ?? {}).toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Audit log</h1>
        <p className="text-sm text-ink-muted">
          Every admin action, newest first. Entries can be written but never changed or deleted.
        </p>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search action, person or shop ID"
        className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm outline-none focus:border-primary"
      />

      <Card>
        {error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : loading ? (
          <Empty text="Loading…" />
        ) : visible.length === 0 ? (
          <Empty text="Nothing logged yet." />
        ) : (
          <ol className="space-y-0">
            {visible.map((r) => {
              const action = r.action ?? 'unknown';
              const detail = Object.entries(r.detail ?? {}).filter(
                ([, v]) => v !== '' && v !== null && v !== undefined
              );
              return (
                <li key={r.id} className="border-b border-line/60 py-3.5 last:border-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={toneFor(action)}>{action}</Badge>
                    <span className="text-sm font-semibold text-ink">{LABELS[action] ?? action}</span>
                    <span className="ms-auto text-xs text-ink-faint">{when(r.at)}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    {r.actorEmail || r.actorUid || 'unknown account'}
                  </p>
                  {detail.length ? (
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-faint">
                      {detail.map(([k, v]) => (
                        <span key={k} className="break-all">
                          <span className="font-semibold">{k}:</span> {String(v)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      <p className="text-xs leading-relaxed text-ink-faint">
        Only the last 400 entries are shown. Firestore keeps the rest — export the{' '}
        <code className="rounded bg-white px-1.5 py-0.5">adminAudit</code> collection if you ever need
        the full history.
      </p>
    </div>
  );
}
