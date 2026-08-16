import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { db } from '../lib/firebase';
import { Badge, Button, Card, Empty, Stat, inputClass } from './ui';
import { useAdmin, when } from './useAdmin';

type Ticket = {
  id: string;
  uid?: string;
  shopId?: string;
  shopName?: string;
  phone?: string;
  message?: string;
  lang?: string;
  appVersion?: string;
  status?: 'open' | 'done';
  adminNote?: string;
  createdAt?: unknown;
};

type DeletionRequest = {
  id: string;
  email?: string;
  note?: string;
  status?: 'open' | 'done';
  createdAt?: unknown;
};

/**
 * The inbox.
 *
 * Two queues that must not be confused with each other:
 *
 *  • Support messages, written from inside the app by a signed-in shopkeeper.
 *  • Account-deletion requests, written by the public form on the website by
 *    someone who may no longer be able to sign in at all.
 *
 * Play policy expects deletion requests to actually be honoured, and within a
 * reasonable time, so the second queue shows how long each one has been
 * waiting rather than hiding it behind a status chip.
 */
export default function Requests() {
  const { audit, isOwner } = useAdmin();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [deletions, setDeletions] = useState<DeletionRequest[]>([]);
  const [tab, setTab] = useState<'support' | 'deletion'>('support');
  const [showDone, setShowDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubA = onSnapshot(
      query(collection(db(), 'supportTickets'), orderBy('createdAt', 'desc'), limit(300)),
      (snap) => setTickets(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as Ticket[]),
      (e) => setError(e.message)
    );
    const unsubB = onSnapshot(
      query(collection(db(), 'deletionRequests'), orderBy('createdAt', 'desc'), limit(300)),
      (snap) =>
        setDeletions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as DeletionRequest[]),
      (e) => setError(e.message)
    );
    return () => {
      unsubA();
      unsubB();
    };
  }, []);

  const openTickets = useMemo(() => tickets.filter((t) => t.status !== 'done'), [tickets]);
  const openDeletions = useMemo(() => deletions.filter((d) => d.status !== 'done'), [deletions]);

  const visibleTickets = showDone ? tickets : openTickets;
  const visibleDeletions = showDone ? deletions : openDeletions;

  const resolveTicket = async (t: Ticket, next: 'open' | 'done') => {
    setBusy(true);
    try {
      await updateDoc(doc(db(), 'supportTickets', t.id), { status: next, resolvedAt: Date.now() });
      await audit(next === 'done' ? 'ticket.close' : 'ticket.reopen', { ticketId: t.id });
    } catch {
      setError('Could not update the ticket.');
    } finally {
      setBusy(false);
    }
  };

  const noteTicket = async (t: Ticket, note: string) => {
    setBusy(true);
    try {
      await updateDoc(doc(db(), 'supportTickets', t.id), { adminNote: note });
      await audit('ticket.note', { ticketId: t.id });
    } catch {
      setError('Could not save the note.');
    } finally {
      setBusy(false);
    }
  };

  const resolveDeletion = async (d: DeletionRequest) => {
    setBusy(true);
    try {
      await updateDoc(doc(db(), 'deletionRequests', d.id), {
        status: 'done',
        resolvedAt: Date.now(),
      });
      await audit('deletion.resolve', { requestId: d.id, email: d.email });
    } catch {
      setError('Could not update the request.');
    } finally {
      setBusy(false);
    }
  };

  const removeDeletion = async (d: DeletionRequest) => {
    if (!window.confirm('Delete this request record? The audit entry stays.')) return;
    setBusy(true);
    try {
      await deleteDoc(doc(db(), 'deletionRequests', d.id));
      await audit('deletion.purge', { requestId: d.id });
    } catch {
      setError('Could not delete.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Requests</h1>
        <p className="text-sm text-ink-muted">Messages from shopkeepers, and deletion requests.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Open messages" value={String(openTickets.length)} tone={openTickets.length ? 'primary' : 'muted'} />
        <Stat
          label="Deletion requests"
          value={String(openDeletions.length)}
          tone={openDeletions.length ? 'danger' : 'muted'}
          sub="Must be honoured"
        />
        <Stat label="Handled" value={String(tickets.length + deletions.length - openTickets.length - openDeletions.length)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ['support', `Support (${openTickets.length})`],
            ['deletion', `Deletion (${openDeletions.length})`],
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
        <label className="ms-auto flex items-center gap-2 text-sm text-ink-muted">
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
          Show handled
        </label>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {tab === 'support' ? (
        visibleTickets.length === 0 ? (
          <Card>
            <Empty text={showDone ? 'Nothing here yet.' : 'No open messages. '} />
          </Card>
        ) : (
          <div className="space-y-4">
            {visibleTickets.map((t) => (
              <TicketCard
                key={t.id}
                ticket={t}
                busy={busy}
                onResolve={resolveTicket}
                onNote={noteTicket}
              />
            ))}
          </div>
        )
      ) : visibleDeletions.length === 0 ? (
        <Card>
          <Empty text="No deletion requests." />
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-warning/30 bg-warning-soft p-4 text-sm leading-relaxed text-ink">
            <strong className="font-bold">How to handle one.</strong> Almost always the answer is to
            walk the person through <em>Settings → Account → Delete account</em> in the app, which
            wipes everything without you touching their data. Only if they truly cannot sign in do
            you delete the Firebase Auth user and their <code className="rounded bg-white/60 px-1.5">shops/…</code>{' '}
            document by hand in Firebase Console. Mark the request handled once it is done.
          </div>
          {visibleDeletions.map((d) => (
            <Card key={d.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-all font-bold text-ink">{d.email ?? '—'}</p>
                  <p className="text-xs text-ink-faint">{when(d.createdAt)}</p>
                </div>
                {d.status === 'done' ? <Badge tone="success">Handled</Badge> : <Badge tone="danger">Open</Badge>}
              </div>
              {d.note ? (
                <p className="mt-3 whitespace-pre-wrap rounded-xl bg-page p-3 text-sm text-ink">{d.note}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {d.status !== 'done' ? (
                  <Button onClick={() => resolveDeletion(d)} disabled={busy}>
                    Mark handled
                  </Button>
                ) : null}
                <a
                  href={`mailto:${d.email ?? ''}?subject=Your%20account%20deletion%20request`}
                  className="rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-ink hover:bg-page"
                >
                  Reply by email
                </a>
                {isOwner ? (
                  <button
                    type="button"
                    onClick={() => removeDeletion(d)}
                    disabled={busy}
                    className="rounded-xl border border-danger/30 px-4 py-2.5 text-sm font-bold text-danger hover:bg-danger/5 disabled:opacity-50"
                  >
                    Delete record
                  </button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TicketCard({
  ticket,
  busy,
  onResolve,
  onNote,
}: {
  ticket: Ticket;
  busy: boolean;
  onResolve: (t: Ticket, next: 'open' | 'done') => void;
  onNote: (t: Ticket, note: string) => void;
}) {
  const [note, setNote] = useState(ticket.adminNote ?? '');

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-ink">{ticket.shopName || 'Unknown shop'}</p>
          <p className="text-xs text-ink-faint">
            {ticket.phone ? `${ticket.phone} · ` : ''}
            {when(ticket.createdAt)}
            {ticket.appVersion ? ` · v${ticket.appVersion}` : ''}
            {ticket.lang ? ` · ${ticket.lang.toUpperCase()}` : ''}
          </p>
        </div>
        {ticket.status === 'done' ? <Badge tone="success">Handled</Badge> : <Badge tone="primary">Open</Badge>}
      </div>

      <p className="mt-3 whitespace-pre-wrap rounded-xl bg-page p-3.5 text-sm leading-relaxed text-ink">
        {ticket.message || '(empty)'}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        {ticket.shopId ? (
          <Link to={`/admin/shops/${ticket.shopId}`} className="font-bold text-primary">
            Open shop →
          </Link>
        ) : null}
        {ticket.phone ? (
          <a
            href={`https://wa.me/${ticket.phone.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-money-in"
          >
            WhatsApp them →
          </a>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Internal note…"
          className={`${inputClass} flex-1`}
        />
        <Button tone="ghost" disabled={busy} onClick={() => onNote(ticket, note.trim())}>
          Save note
        </Button>
        {ticket.status === 'done' ? (
          <Button tone="ghost" disabled={busy} onClick={() => onResolve(ticket, 'open')}>
            Reopen
          </Button>
        ) : (
          <Button tone="success" disabled={busy} onClick={() => onResolve(ticket, 'done')}>
            Mark handled
          </Button>
        )}
      </div>
    </Card>
  );
}
