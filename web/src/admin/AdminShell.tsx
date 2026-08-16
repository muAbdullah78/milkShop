import { useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';

import { site } from '../site.config';
import { useAdmin } from './useAdmin';

const NAV = [
  { to: '/admin', end: true, label: 'Overview', icon: 'M3 12h7V3H3zM14 21h7v-9h-7zM14 3v6h7V3zM3 21h7v-6H3z' },
  { to: '/admin/shops', label: 'Shops', icon: 'M3 9 5 3h14l2 6M4 9v11h16V9M9 20v-6h6v6' },
  { to: '/admin/platform', label: 'Platform', icon: 'M12 2v4M12 18v4M4.9 4.9l2.9 2.9M16.2 16.2l2.9 2.9M2 12h4M18 12h4M4.9 19.1l2.9-2.9M16.2 7.8l2.9-2.9' },
  { to: '/admin/requests', label: 'Requests', icon: 'M4 4h16v12H7l-3 3z' },
  { to: '/admin/people', label: 'Admins', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87' },
  { to: '/admin/audit', label: 'Audit log', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 15h6M9 11h3' },
];

function Icon({ d }: { d: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

/** Panel shown when Firebase env vars are missing — a common first-run trip. */
function NotConfigured() {
  return (
    <Centered title="Admin console is not configured">
      <p className="text-ink-muted">
        Copy <code className="rounded bg-page px-1.5 py-0.5 text-sm">web/.env.example</code> to{' '}
        <code className="rounded bg-page px-1.5 py-0.5 text-sm">web/.env</code> and fill it from
        Firebase Console → Project settings → Your apps → Web app, then rebuild.
      </p>
    </Centered>
  );
}

function Centered({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-page px-5">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8">
        <h1 className="text-xl font-extrabold text-ink">{title}</h1>
        <div className="mt-3 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function Login() {
  const { signInEmail, signInGoogle } = useAdmin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch {
      setError('Could not sign in. Check the details and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-page px-5">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-line bg-white p-8">
          <span
            className="grid h-11 w-11 place-items-center rounded-xl text-white"
            style={{ background: 'linear-gradient(135deg,#0E1B52,#1B3FCB 62%,#2F72E8)' }}
            aria-hidden
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </span>
          <h1 className="mt-4 text-xl font-extrabold text-ink">{site.appName} Admin</h1>
          <p className="mt-1 text-sm text-ink-muted">Staff access only.</p>

          <form
            className="mt-6 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => signInEmail(email, password));
            }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-line bg-page px-4 py-3 text-sm outline-none focus:border-primary"
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-xl border border-line bg-page px-4 py-3 text-sm outline-none focus:border-primary"
            />
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white transition hover:bg-brand disabled:opacity-50"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => run(signInGoogle)}
            disabled={busy}
            className="mt-3 w-full rounded-xl border border-line py-3 text-sm font-bold text-ink transition hover:bg-page disabled:opacity-50"
          >
            Continue with Google
          </button>
        </div>

        <Link to="/" className="mt-5 block text-center text-sm text-ink-muted hover:text-primary">
          ← Back to the website
        </Link>
      </div>
    </div>
  );
}

export default function AdminShell() {
  const { user, admin, loading, configured, signOut, isOwner } = useAdmin();
  const [open, setOpen] = useState(false);

  if (!configured) return <NotConfigured />;
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-page">
        <p className="text-sm text-ink-muted">Loading…</p>
      </div>
    );
  }
  if (!user) return <Login />;

  if (!admin) {
    return (
      <Centered title="You do not have admin access">
        <p className="text-ink-muted">
          Signed in as <strong>{user.email}</strong>, but this account is not in the admin roster.
        </p>
        <p className="mt-3 text-ink-muted">
          An owner must add your user ID to the <code className="rounded bg-page px-1.5 py-0.5">admins</code>{' '}
          collection. Your ID is:
        </p>
        <code className="mt-2 block break-all rounded-lg bg-page p-3 text-xs">{user.uid}</code>
        <button
          type="button"
          onClick={signOut}
          className="mt-5 w-full rounded-xl border border-line py-2.5 text-sm font-bold text-ink hover:bg-page"
        >
          Sign out
        </button>
      </Centered>
    );
  }

  return (
    <div className="min-h-screen bg-page" dir="ltr">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white px-4">
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-lg lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <span className="font-extrabold tracking-tight text-ink">{site.appName} Admin</span>
        <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
          {isOwner ? 'Owner' : 'Staff'}
        </span>
        <div className="ms-auto flex items-center gap-3">
          <span className="hidden text-sm text-ink-muted sm:block">{user.email}</span>
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-ink hover:bg-page"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar */}
        <aside
          className={`${open ? 'block' : 'hidden'} w-full shrink-0 border-e border-line bg-white p-3 lg:block lg:w-60`}
        >
          <nav className="space-y-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    isActive ? 'bg-primary-soft text-primary' : 'text-ink-muted hover:bg-page hover:text-ink'
                  }`
                }
              >
                <Icon d={n.icon} />
                {n.label}
              </NavLink>
            ))}
          </nav>
          <Link
            to="/"
            className="mt-4 block rounded-xl px-3 py-2.5 text-sm text-ink-faint hover:text-ink"
          >
            ← Website
          </Link>
        </aside>

        <main className={`${open ? 'hidden' : 'block'} min-w-0 flex-1 p-5 lg:block`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
