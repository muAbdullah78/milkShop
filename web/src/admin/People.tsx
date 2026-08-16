import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { Badge, Button, Card, Empty, Field, inputClass } from './ui';
import { db } from '../lib/firebase';
import { useAdmin, when, type AdminRole } from './useAdmin';

type Row = {
  uid: string;
  role?: AdminRole;
  name?: string;
  email?: string;
  createdAt?: unknown;
  addedBy?: string;
};

/**
 * The admin roster.
 *
 * Membership of this collection *is* the permission — the Firestore rules ask
 * `exists(/admins/$(uid))`, so anything added here can read every shop in the
 * country. There is no invite email and no magic: the person signs in once
 * with Google or a password, the console shows them their uid, and an owner
 * pastes it in here.
 */
export default function People() {
  const { isOwner, audit, user } = useAdmin();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [uid, setUid] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminRole>('staff');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db(), 'admins'),
      (snap) => {
        setRows(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as object) })) as Row[]);
        setLoading(false);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const owners = rows.filter((r) => r.role === 'owner');

  const add = async () => {
    const id = uid.trim();
    if (!id) return;
    setBusy(true);
    setMsg(null);
    try {
      await setDoc(doc(db(), 'admins', id), {
        role,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        createdAt: serverTimestamp(),
        addedBy: user?.email ?? user?.uid ?? '',
      });
      await audit('admin.add', { uid: id, role });
      setUid('');
      setName('');
      setEmail('');
      setRole('staff');
      setMsg('Added. They can reload the console now.');
    } catch {
      setMsg('Could not add — owner role required.');
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (row: Row, next: AdminRole) => {
    // Losing the last owner would leave nobody able to change platform config
    // or the roster itself, and the rules give no way back in from the app.
    if (row.role === 'owner' && next !== 'owner' && owners.length <= 1) {
      setMsg('This is the only owner. Promote someone else first.');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await setDoc(doc(db(), 'admins', row.uid), { role: next }, { merge: true });
      await audit('admin.role', { uid: row.uid, role: next });
      setMsg('Role updated.');
    } catch {
      setMsg('Could not update — owner role required.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: Row) => {
    if (row.role === 'owner' && owners.length <= 1) {
      setMsg('This is the only owner. You would lock everyone out.');
      return;
    }
    if (!window.confirm(`Remove admin access for ${row.email || row.uid}?`)) return;
    setBusy(true);
    setMsg(null);
    try {
      await deleteDoc(doc(db(), 'admins', row.uid));
      await audit('admin.remove', { uid: row.uid });
      setMsg('Removed.');
    } catch {
      setMsg('Could not remove — owner role required.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Admins</h1>
        <p className="text-sm text-ink-muted">Who can open this console.</p>
      </div>

      <div className="rounded-2xl border border-line bg-white p-4 text-sm leading-relaxed text-ink-muted">
        <p>
          <strong className="text-ink">Owner</strong> can do everything: platform switches, suspending
          a shop, and this page. <strong className="text-ink">Staff</strong> can look at shops and
          answer requests, but cannot change anything that reaches the app.
        </p>
        <p className="mt-2">
          Neither role can write to a shop&apos;s khaata. That is enforced in the Firestore rules, not
          in this interface, so it holds even if someone bypasses the console.
        </p>
      </div>

      {isOwner ? (
        <Card title="Add an admin" sub="Ask them to sign in first — the console shows them their user ID">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Firebase user ID (uid)" hint="28 characters, from their sign-in screen.">
              <input
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                className={inputClass}
                placeholder="kJ3nP…"
              />
            </Field>
            <Field label="Name">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Email" hint="For your reference only — access is by uid.">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Role">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AdminRole)}
                className={inputClass}
              >
                <option value="staff">Staff — read and support</option>
                <option value="owner">Owner — full control</option>
              </select>
            </Field>
          </div>
          <div className="mt-4">
            <Button onClick={add} disabled={busy || !uid.trim()}>
              Add admin
            </Button>
          </div>
        </Card>
      ) : null}

      <Card title={`Roster (${rows.length})`}>
        {error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : loading ? (
          <Empty text="Loading…" />
        ) : rows.length === 0 ? (
          <Empty text="No admins yet. Add the first uid directly in Firebase Console." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th className="pb-2 font-bold">Person</th>
                  <th className="pb-2 font-bold">Role</th>
                  <th className="pb-2 font-bold">Added</th>
                  <th className="pb-2 font-bold" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.uid} className="border-b border-line/60 last:border-0">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink">{r.name || r.email || 'Unnamed'}</span>
                        {r.uid === user?.uid ? <Badge tone="primary">You</Badge> : null}
                      </div>
                      <span className="break-all text-xs text-ink-faint">{r.uid}</span>
                    </td>
                    <td className="py-3">
                      <Badge tone={r.role === 'owner' ? 'accent' : 'muted'}>{r.role ?? 'staff'}</Badge>
                    </td>
                    <td className="py-3 text-ink-muted">{when(r.createdAt)}</td>
                    <td className="py-3">
                      {isOwner ? (
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => changeRole(r, r.role === 'owner' ? 'staff' : 'owner')}
                            className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-bold text-ink hover:bg-page disabled:opacity-50"
                          >
                            {r.role === 'owner' ? 'Make staff' : 'Make owner'}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => remove(r)}
                            className="rounded-lg border border-danger/30 px-2.5 py-1.5 text-xs font-bold text-danger hover:bg-danger/5 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <span className="block text-end text-xs text-ink-faint">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {msg ? <p className="mt-4 text-sm font-semibold text-primary">{msg}</p> : null}
      </Card>

      <Card title="Bootstrapping the very first owner">
        <p className="text-sm leading-relaxed text-ink-muted">
          The rules only let an owner write to <code className="rounded bg-page px-1.5 py-0.5">admins</code>,
          so the first one cannot be created from here. Do it once by hand:
        </p>
        <ol className="mt-3 list-decimal space-y-1.5 ps-5 text-sm text-ink-muted">
          <li>Sign in to this console with the account you want as owner.</li>
          <li>Copy the user ID it shows you on the “no admin access” screen.</li>
          <li>
            In Firebase Console → Firestore, create collection{' '}
            <code className="rounded bg-page px-1.5 py-0.5">admins</code>, document ID = that uid,
            with a field <code className="rounded bg-page px-1.5 py-0.5">role</code> (string) ={' '}
            <code className="rounded bg-page px-1.5 py-0.5">owner</code>.
          </li>
          <li>Reload this page. Everyone after that can be added above.</li>
        </ol>
      </Card>
    </div>
  );
}
