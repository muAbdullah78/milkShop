import { round2 } from '@/data/repo';
import type {
  Customer,
  Delivery,
  Invoice,
  KhaataEntry,
  LedgerRow,
  Payment,
  Sale,
} from '@/types/models';

export type LedgerInputs = {
  customer: Customer;
  deliveries: Delivery[];
  sales: Sale[];
  payments: Payment[];
  entries: KhaataEntry[];
  /** Posted monthly charges, so the running balance never jumps unexplained. */
  invoices?: Invoice[];
  /** Optional window — only rows on or after this day key are shown. */
  since?: string;
};

/** A customer can take things on credit only once their khaata is open. */
export function isKhaataOpen(customer: Customer | null | undefined): boolean {
  if (!customer) return false;
  // Records written before khaatas existed have no flag; treat them as open so
  // no existing balance is stranded.
  return customer.khaataOpen !== false;
}

export function khaataOverLimit(customer: Customer): boolean {
  const limit = customer.khaataLimit ?? 0;
  return limit > 0 && customer.balance > limit;
}

/**
 * The paper khaata, rebuilt.
 *
 * Milk, counter items taken on credit, hand-written lines and payments all
 * land in one list ordered by when they actually happened. The running
 * balance is walked *backwards* from the customer's live balance, so the
 * numbers stay exact even when only the last few months are loaded.
 */
export function buildLedger(input: LedgerInputs): LedgerRow[] {
  const { customer } = input;
  const rows: Omit<LedgerRow, 'balanceAfter'>[] = [];

  input.deliveries
    .filter((d) => d.customerId === customer.id && d.status === 'delivered' && d.amount > 0)
    .forEach((d) =>
      rows.push({
        id: `d_${d.id}`,
        ts: d.createdAt || dayStart(d.date),
        date: d.date,
        source: 'milk',
        title: 'milk',
        subtitle: `${d.qty}|${d.rate}`,
        delta: d.amount,
        refId: d.id,
      })
    );

  input.sales
    .filter((s) => s.customerId === customer.id && s.onCredit)
    .forEach((s) =>
      rows.push({
        id: `s_${s.id}`,
        ts: s.createdAt || dayStart(s.date),
        date: s.date,
        source: 'sale',
        title: s.items.map((i) => i.name).join(', '),
        subtitle: s.items.map((i) => `${i.name} × ${i.qty}`).join(', '),
        delta: s.total,
        refId: s.id,
      })
    );

  input.entries
    .filter((e) => e.customerId === customer.id)
    .forEach((e) =>
      rows.push({
        id: `k_${e.id}`,
        ts: e.ts || e.createdAt || dayStart(e.date),
        date: e.date,
        source: 'khaata',
        title: e.title,
        subtitle: e.note,
        delta: e.kind === 'debit' ? e.amount : -e.amount,
        refId: e.id,
      })
    );

  (input.invoices ?? [])
    .filter((i) => i.customerId === customer.id && i.chargePosted && (i.chargeAmount ?? 0) > 0)
    .forEach((i) =>
      rows.push({
        id: `m_${i.id}`,
        ts: i.chargePostedAt ?? dayStart(`${i.month}-28`),
        date: `${i.month}-28`,
        source: 'monthly',
        title: i.month,
        delta: i.chargeAmount ?? 0,
        refId: i.id,
      })
    );

  input.payments
    .filter((p) => p.customerId === customer.id)
    .forEach((p) =>
      rows.push({
        id: `p_${p.id}`,
        ts: p.createdAt || dayStart(p.date),
        date: p.date,
        source: 'payment',
        title: p.mode,
        subtitle: p.note,
        delta: -p.amount,
        refId: p.id,
      })
    );

  rows.sort((a, b) => a.ts - b.ts || a.id.localeCompare(b.id));

  // Walk backwards from the live balance so a partial window is still exact.
  const withBalance: LedgerRow[] = new Array(rows.length);
  let running = customer.balance;
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    withBalance[i] = { ...rows[i], balanceAfter: round2(running) };
    running -= rows[i].delta;
  }

  // Filter on the row's own timestamp, not its date string. Rows are ordered
  // by `ts`, and a monthly charge carries a nominal date (the 28th) that can
  // sit apart from when it was actually posted — filtering by date could drop
  // a row from the middle of the chain and make the running balance jump.
  const sinceTs = input.since ? new Date(`${input.since}T00:00:00`).getTime() : null;
  const visible = sinceTs === null ? withBalance : withBalance.filter((r) => r.ts >= sinceTs);

  // Anchor the list with whatever the customer owed before the first visible
  // row, so the running balance column always adds up on screen.
  const anchorBalance = visible.length > 0 ? visible[0].balanceAfter - visible[0].delta : customer.balance;
  const anchor: LedgerRow | null =
    Math.abs(anchorBalance) >= 0.5
      ? {
          id: 'opening',
          ts: customer.khaataOpenedAt ?? customer.createdAt,
          date: input.since ?? '',
          source: 'opening',
          title: 'opening',
          delta: 0,
          balanceAfter: round2(anchorBalance),
        }
      : null;

  const result = anchor ? [anchor, ...visible] : visible;
  // Newest first — that is the end of the page a shopkeeper flips to.
  return result.slice().reverse();
}

function dayStart(dayKey: string): number {
  return new Date(`${dayKey}T00:00:00`).getTime();
}

export type KhaataSummary = {
  totalTaken: number;
  totalPaid: number;
  entryCount: number;
  lastActivityTs: number | null;
  lastPaymentTs: number | null;
};

export function summariseLedger(rows: LedgerRow[]): KhaataSummary {
  const real = rows.filter((r) => r.source !== 'opening');
  const payments = real.filter((r) => r.source === 'payment');
  return {
    totalTaken: round2(real.filter((r) => r.delta > 0).reduce((s, r) => s + r.delta, 0)),
    totalPaid: round2(payments.reduce((s, r) => s + Math.abs(r.delta), 0)),
    entryCount: real.length,
    lastActivityTs: real.length > 0 ? Math.max(...real.map((r) => r.ts)) : null,
    lastPaymentTs: payments.length > 0 ? Math.max(...payments.map((r) => r.ts)) : null,
  };
}

/** How many days since anything happened — surfaces forgotten khaatas. */
export function daysSince(ts: number | null): number | null {
  if (!ts) return null;
  return Math.floor((Date.now() - ts) / 86_400_000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Statement — the part that wins trust
// ─────────────────────────────────────────────────────────────────────────────

export type StatementCtx = {
  lang: 'en' | 'ur';
  money: (v: number) => string;
  qty: (v: number) => string;
  num: (v: number) => string;
  stamp: (ts: number) => string;
  sourceLabel: (source: LedgerRow['source']) => string;
  shopName: string;
  shopPhone?: string;
};

/**
 * The whole khaata as a WhatsApp message.
 *
 * A customer who can read every line — with the date and time it was written —
 * stops arguing about the total. That is the entire point: the record is not
 * the shopkeeper's word against theirs, it is a list they can check.
 */
export function buildStatementMessage(
  customer: Customer,
  rows: LedgerRow[],
  ctx: StatementCtx
): string {
  const ur = ctx.lang === 'ur';
  const lines: string[] = [`*${ctx.shopName}*`];

  lines.push(ur ? `${customer.name} کا کھاتہ` : `Khaata of ${customer.name}`);
  lines.push('');

  // Oldest first reads like the paper book.
  const ordered = [...rows].reverse();

  ordered.forEach((r) => {
    if (r.source === 'opening') {
      lines.push(
        `${ur ? 'پرانا بقایا' : 'Old balance'}: ${ctx.money(r.balanceAfter)}`
      );
      lines.push('');
      return;
    }
    const sign = r.delta >= 0 ? '+' : '−';
    lines.push(`${ctx.stamp(r.ts)}`);
    lines.push(
      `  ${r.source === 'payment' ? (ur ? 'ادائیگی' : 'Paid') : r.title} — ${sign}${ctx.money(
        Math.abs(r.delta)
      )}`
    );
    lines.push(`  ${ur ? 'بقایا' : 'Balance'}: ${ctx.money(r.balanceAfter)}`);
    lines.push('');
  });

  lines.push('━━━━━━━━━━━━━━━');
  if (customer.balance <= 0) {
    lines.push(ur ? '*حساب صاف ہے — شکریہ!*' : '*All clear — thank you!*');
  } else {
    lines.push(
      ur
        ? `*کل بقایا: ${ctx.money(customer.balance)}*`
        : `*Total to Pay: ${ctx.money(customer.balance)}*`
    );
  }
  lines.push('');
  lines.push(
    ur
      ? 'اگر کوئی بات غلط لگے تو بتا دیں۔ شکریہ۔'
      : 'If anything looks wrong, please tell us. Thank you.'
  );
  if (ctx.shopPhone) lines.push('', ctx.shopPhone);

  return lines.join('\n');
}
