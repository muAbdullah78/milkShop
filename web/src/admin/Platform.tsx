import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { db } from '../lib/firebase';
import { Badge, Button, Card, Field, inputClass } from './ui';
import { useAdmin, when } from './useAdmin';

/**
 * Remote controls for every install.
 *
 * All of this lives in one world-readable document, `platform/config`, that
 * the app subscribes to. Nothing shop-specific is ever stored here — only
 * flags and copy — because the document is readable by anyone with the app.
 *
 * Writes are owner-only in the Firestore rules. Staff see the current state
 * read-only, which is deliberate: a maintenance switch that locks out every
 * shopkeeper in the country is not a support-desk button.
 */

type Announcement = {
  id?: string;
  title?: string;
  titleUr?: string;
  body?: string;
  bodyUr?: string;
  tone?: 'info' | 'warning' | 'success';
  active?: boolean;
};

type Config = {
  minVersionCode?: number;
  maintenance?: boolean;
  maintenanceMessage?: string;
  announcement?: Announcement;
  features?: Record<string, boolean>;
  updatedAt?: number;
};

/**
 * Every flag the app actually reads. Adding a row here is not enough — the
 * matching `isEnabled('…')` call has to exist in the app, or the switch does
 * nothing and lies to whoever flips it.
 */
const FEATURES: { key: string; label: string; help: string }[] = [
  {
    key: 'whatsappDirect',
    label: 'Open WhatsApp directly',
    help: 'On: the app jumps straight into the chat with whatsapp://. Off: it goes through the wa.me web link instead. Turn this off if a WhatsApp or Android update breaks the direct jump — bills keep sending either way.',
  },
  {
    key: 'pdfBill',
    label: 'PDF bills',
    help: 'The “Send as PDF” button on a customer bill. Text and image bills are unaffected.',
  },
  {
    key: 'backup',
    label: 'Backup & restore',
    help: 'Export and import the whole shop as a file, from Settings and from More.',
  },
  {
    key: 'reminders',
    label: 'Daily reminders',
    help: 'The reminders screen — notifications for the milk round and month-end billing.',
  },
];

export default function Platform() {
  const { isOwner, audit } = useAdmin();

  const [cfg, setCfg] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Draft state, so a half-typed announcement is never live.
  const [minVersion, setMinVersion] = useState('');
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [ann, setAnn] = useState<Announcement>({ tone: 'info', active: false });

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db(), 'platform', 'config'),
      (snap) => {
        const data = (snap.data() as Config | undefined) ?? {};
        setCfg(data);
        setMinVersion(data.minVersionCode ? String(data.minVersionCode) : '');
        setMaintenanceMessage(data.maintenanceMessage ?? '');
        setAnn(data.announcement ?? { tone: 'info', active: false });
        setLoading(false);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const write = async (patch: Config, action: string, detail?: Record<string, unknown>) => {
    setBusy(true);
    setSaved(null);
    try {
      await setDoc(doc(db(), 'platform', 'config'), { ...patch, updatedAt: Date.now() }, { merge: true });
      await audit(action, detail);
      setSaved('Saved. Every phone picks this up within seconds.');
    } catch {
      setSaved('Could not save — owner role required.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Card><p className="py-8 text-center text-sm text-ink-muted">Loading…</p></Card>;

  if (error) {
    return (
      <Card>
        <p className="font-bold text-danger">Could not read platform config</p>
        <p className="mt-1 text-sm text-ink-muted">{error}</p>
      </Card>
    );
  }

  const features = cfg?.features ?? {};

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Platform</h1>
        <p className="text-sm text-ink-muted">
          Controls that reach every install. Last changed {when(cfg?.updatedAt)}.
        </p>
      </div>

      {!isOwner ? (
        <div className="rounded-2xl border border-warning/30 bg-warning-soft p-4 text-sm text-ink">
          <strong className="font-bold">Read only.</strong> These switches affect every shop in the
          country, so only an owner can change them.
        </div>
      ) : null}

      {/* ── Announcement ─────────────────────────────────────────────────── */}
      <Card
        title="Dashboard announcement"
        sub="A banner at the top of every shopkeeper's home screen"
        action={ann.active ? <Badge tone="success">Live</Badge> : <Badge>Off</Badge>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title (English)">
            <input
              value={ann.title ?? ''}
              onChange={(e) => setAnn({ ...ann, title: e.target.value })}
              className={inputClass}
              disabled={!isOwner}
              placeholder="New: send bills as PDF"
            />
          </Field>
          <Field label="Title (Urdu)" hint="Leave blank to show the English title to everyone.">
            <input
              value={ann.titleUr ?? ''}
              onChange={(e) => setAnn({ ...ann, titleUr: e.target.value })}
              className={inputClass}
              disabled={!isOwner}
              dir="rtl"
              placeholder="نیا: بل پی ڈی ایف میں بھیجیں"
            />
          </Field>
          <Field label="Body (English)">
            <textarea
              rows={2}
              value={ann.body ?? ''}
              onChange={(e) => setAnn({ ...ann, body: e.target.value })}
              className={inputClass}
              disabled={!isOwner}
            />
          </Field>
          <Field label="Body (Urdu)">
            <textarea
              rows={2}
              value={ann.bodyUr ?? ''}
              onChange={(e) => setAnn({ ...ann, bodyUr: e.target.value })}
              className={inputClass}
              disabled={!isOwner}
              dir="rtl"
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <Field label="Tone">
            <select
              value={ann.tone ?? 'info'}
              onChange={(e) => setAnn({ ...ann, tone: e.target.value as Announcement['tone'] })}
              className={inputClass}
              disabled={!isOwner}
            >
              <option value="info">Info (blue)</option>
              <option value="success">Good news (green)</option>
              <option value="warning">Warning (amber)</option>
            </select>
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            disabled={!isOwner || busy || !ann.title?.trim()}
            onClick={() =>
              write(
                {
                  announcement: {
                    ...ann,
                    // A fresh id each time so a changed message counts as a new
                    // one for anything that tracks what has been shown.
                    id: `a${Date.now()}`,
                    title: ann.title?.trim() ?? '',
                    titleUr: ann.titleUr?.trim() ?? '',
                    body: ann.body?.trim() ?? '',
                    bodyUr: ann.bodyUr?.trim() ?? '',
                    tone: ann.tone ?? 'info',
                    active: true,
                  },
                },
                'platform.announcement.publish',
                { title: ann.title }
              )
            }
          >
            {ann.active ? 'Update banner' : 'Publish banner'}
          </Button>
          {ann.active ? (
            <Button
              tone="ghost"
              disabled={!isOwner || busy}
              onClick={() =>
                write(
                  { announcement: { ...ann, active: false } },
                  'platform.announcement.hide'
                )
              }
            >
              Take it down
            </Button>
          ) : null}
        </div>

        {/* Preview, so nobody publishes a broken sentence to 500 phones. */}
        {ann.title?.trim() ? (
          <div className="mt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-faint">
              How it looks in the app
            </p>
            <div
              className="rounded-2xl p-3.5"
              style={{
                background:
                  ann.tone === 'warning' ? '#FDF1D9' : ann.tone === 'success' ? '#E1F6EA' : '#E7EDFF',
              }}
            >
              <p className="text-sm font-bold text-ink">{ann.title}</p>
              {ann.body ? <p className="text-xs text-ink-muted">{ann.body}</p> : null}
              {ann.titleUr ? (
                <p className="mt-2 border-t border-black/5 pt-2 text-sm font-bold text-ink" dir="rtl">
                  {ann.titleUr}
                </p>
              ) : null}
              {ann.bodyUr ? (
                <p className="text-xs text-ink-muted" dir="rtl">
                  {ann.bodyUr}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── Minimum version ────────────────────────────────────────────── */}
        <Card title="Minimum app version" sub="Older builds are asked to update before they can continue">
          <Field
            label="Minimum versionCode"
            hint="The Android versionCode from app.config.ts, not the version name. 0 or blank means no minimum."
          >
            <input
              inputMode="numeric"
              value={minVersion}
              onChange={(e) => setMinVersion(e.target.value.replace(/[^0-9]/g, ''))}
              className={inputClass}
              disabled={!isOwner}
              placeholder="1"
            />
          </Field>
          <p className="mt-3 rounded-xl bg-page p-3 text-xs leading-relaxed text-ink-muted">
            Only raise this once the newer build is <strong>live on Play</strong>, not while it is
            still in review. Setting it too high locks every shopkeeper out of a working app with
            nothing to update to.
          </p>
          <div className="mt-4">
            <Button
              disabled={!isOwner || busy}
              onClick={() =>
                write(
                  { minVersionCode: Number(minVersion || 0) },
                  'platform.minVersion',
                  { minVersionCode: Number(minVersion || 0) }
                )
              }
            >
              Save minimum version
            </Button>
          </div>
        </Card>

        {/* ── Maintenance ────────────────────────────────────────────────── */}
        <Card
          title="Maintenance mode"
          sub="Blocks the app for everyone"
          action={cfg?.maintenance ? <Badge tone="danger">ON</Badge> : <Badge tone="success">Off</Badge>}
        >
          <Field label="Message shown on the blocking screen">
            <input
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              className={inputClass}
              disabled={!isOwner}
              placeholder="Back in about an hour."
            />
          </Field>
          <p className="mt-3 rounded-xl bg-danger/5 p-3 text-xs leading-relaxed text-ink-muted">
            A shopkeeper on their morning round cannot record a delivery while this is on. Their
            saved data is untouched, but the day&apos;s work stops. Use it for a real outage only.
          </p>
          <div className="mt-4 flex gap-3">
            {cfg?.maintenance ? (
              <Button
                tone="success"
                disabled={!isOwner || busy}
                onClick={() => write({ maintenance: false }, 'platform.maintenance.off')}
              >
                Turn maintenance off
              </Button>
            ) : (
              <Button
                tone="danger"
                disabled={!isOwner || busy}
                onClick={() => {
                  if (!window.confirm('This blocks the app for every shop. Continue?')) return;
                  write(
                    { maintenance: true, maintenanceMessage: maintenanceMessage.trim() },
                    'platform.maintenance.on',
                    { message: maintenanceMessage.trim() }
                  );
                }}
              >
                Turn maintenance on
              </Button>
            )}
            {cfg?.maintenance ? (
              <Button
                tone="ghost"
                disabled={!isOwner || busy}
                onClick={() =>
                  write(
                    { maintenanceMessage: maintenanceMessage.trim() },
                    'platform.maintenance.message'
                  )
                }
              >
                Update message
              </Button>
            ) : null}
          </div>
        </Card>
      </div>

      {/* ── Feature flags ────────────────────────────────────────────────── */}
      <Card title="Feature switches" sub="Turn a feature off everywhere if it starts misbehaving">
        <ul className="space-y-3">
          {FEATURES.map((f) => {
            const on = features[f.key] !== false; // Missing means on.
            return (
              <li
                key={f.key}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {f.label}{' '}
                    <code className="ms-1 rounded bg-page px-1.5 py-0.5 text-[11px] text-ink-faint">
                      {f.key}
                    </code>
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{f.help}</p>
                </div>
                <button
                  type="button"
                  disabled={!isOwner || busy}
                  onClick={() =>
                    write(
                      { features: { ...features, [f.key]: !on } },
                      on ? 'platform.feature.off' : 'platform.feature.on',
                      { feature: f.key }
                    )
                  }
                  className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${
                    on ? 'bg-money-in' : 'bg-line'
                  }`}
                  aria-pressed={on}
                  aria-label={f.label}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                      on ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      {saved ? <p className="text-sm font-semibold text-primary">{saved}</p> : null}
    </div>
  );
}
