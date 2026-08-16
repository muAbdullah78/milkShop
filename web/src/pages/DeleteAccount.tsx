import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';

import { PageHead } from '../components/Layout';
import { db, firebaseConfigured } from '../lib/firebase';
import { site } from '../site.config';

/**
 * Google Play requires a publicly reachable web page — no login — where a user
 * can request deletion of their account and data, listing what is deleted and
 * what (if anything) is retained. This is that page, and the URL goes in the
 * Play Console "Data deletion" field.
 */
export default function DeleteAccount() {
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return;

    setState('sending');
    try {
      if (!firebaseConfigured) throw new Error('not configured');
      // Field set must match the Firestore rule for deletionRequests exactly.
      await addDoc(collection(db(), 'deletionRequests'), {
        email: email.trim().slice(0, 200),
        note: note.trim().slice(0, 2000),
        createdAt: serverTimestamp(),
        status: 'open',
      });
      setState('sent');
    } catch {
      setState('error');
    }
  };

  return (
    <>
      <PageHead
        title="Delete your account and data"
        sub={`How to permanently remove your ${site.appName} account and everything in it.`}
      />

      <div className="mx-auto max-w-3xl px-5 py-14">
        {/* Fastest route first */}
        <section className="rounded-2xl border-2 border-primary bg-white p-7">
          <h2 className="text-xl font-extrabold text-ink">Fastest: delete it yourself in the app</h2>
          <p className="mt-2 leading-relaxed text-ink-muted">
            Deletion is immediate and needs no waiting on us.
          </p>
          <ol className="mt-4 space-y-2">
            {[
              'Open MilkBook and sign in',
              'Go to the More tab, then Settings',
              'Tap My Account',
              'Save a backup first if you want to keep your records',
              'Tap Delete My Account, type DELETE, and confirm',
            ].map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary num">
                  {i + 1}
                </span>
                <span className="text-ink-muted">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* What goes, what stays — Play requires this to be explicit */}
        <section className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-white p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-danger">
              Deleted permanently
            </h3>
            <ul className="mt-3 space-y-1.5 text-sm text-ink-muted">
              {[
                'Your login and account',
                'Your shop and its settings',
                'Every customer and their details',
                'Every khaata line and running balance',
                'All deliveries, sales and payments',
                'All expenses, suppliers and purchases',
                'All generated bills and invoices',
              ].map((x) => (
                <li key={x}>• {x}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-line bg-white p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink-faint">
              Briefly retained
            </h3>
            <ul className="mt-3 space-y-1.5 text-sm text-ink-muted">
              <li>
                • Encrypted infrastructure backups, overwritten on a rolling basis within 30 days.
                Not readable or restorable by us.
              </li>
              <li>
                • Any support emails you sent us, kept only so we have a record of the conversation.
                Ask us and we will delete those too.
              </li>
            </ul>
            <p className="mt-4 text-sm text-ink-muted">
              Backup files you saved to your own phone stay on your phone. Delete them yourself if
              you no longer want them.
            </p>
          </div>
        </section>

        {/* Request form for people who cannot get into the app */}
        <section className="mt-8 rounded-2xl border border-line bg-white p-7">
          <h2 className="text-xl font-extrabold text-ink">Cannot get into the app?</h2>
          <p className="mt-2 leading-relaxed text-ink-muted">
            Send a request below and we will verify you own the account and delete it within 30
            days. You can also email{' '}
            <a className="text-primary underline" href={`mailto:${site.privacyEmail}`}>
              {site.privacyEmail}
            </a>
            .
          </p>

          {state === 'sent' ? (
            <div className="mt-5 rounded-xl bg-money-in/10 p-5">
              <p className="font-bold text-money-in">Request received</p>
              <p className="mt-1 text-sm text-ink-muted">
                We will email <span className="font-semibold">{email}</span> to confirm it is you,
                then delete the account. If you do not hear from us within a few days, email{' '}
                {site.privacyEmail} directly.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-ink">
                  The email address on the account
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1.5 w-full rounded-xl border border-line bg-page px-4 py-3 outline-none focus:border-primary"
                />
              </div>

              <div>
                <label htmlFor="note" className="block text-sm font-semibold text-ink">
                  Anything else we should know <span className="font-normal text-ink-faint">(optional)</span>
                </label>
                <textarea
                  id="note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1.5 w-full resize-y rounded-xl border border-line bg-page px-4 py-3 outline-none focus:border-primary"
                />
              </div>

              {state === 'error' ? (
                <p className="text-sm text-danger">
                  Could not send the request. Please email {site.privacyEmail} instead.
                </p>
              ) : null}

              <button
                type="submit"
                disabled={state === 'sending'}
                className="rounded-xl bg-danger px-6 py-3.5 font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {state === 'sending' ? 'Sending…' : 'Request account deletion'}
              </button>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
