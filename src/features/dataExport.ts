import { getDocs, query } from '@react-native-firebase/firestore';
import { Directory, File, Paths } from 'expo-file-system';

import { COL, shopCol } from '@/data/refs';
import type { Customer, LedgerRow, Shop } from '@/types/models';
import { buildLedger } from './khaata';
import { urduFontCss } from './fontEmbed';
import { shareFile } from './whatsapp';

/**
 * "Give me everything I have put into this app."
 *
 * Deliberately available even when the subscription has fully lapsed and the
 * app is locked. Holding someone's own records hostage is not a business
 * model, and the Firestore rules keep reads open for exactly this reason.
 *
 * Two formats, for two different people:
 *
 *  • **HTML** — one self-contained file. A shopkeeper can open it in any
 *    browser, read it, and print it. It is written as a document, not a data
 *    dump: sections with headings, one block per customer, running balances.
 *
 *  • **CSV** — one file per table, for anyone who wants it in Excel.
 *
 * ── Why not PDF ─────────────────────────────────────────────────────────
 *
 * Because Urdu in PDF breaks, constantly, and badly. Nastaliq needs proper
 * complex-script shaping; most PDF paths fall back to a face that renders
 * Urdu as disconnected, backwards or empty boxes. HTML never has that problem
 * — the renderer picks a font that can actually shape the script — and if the
 * shopkeeper wants a PDF, printing this HTML from the browser produces a
 * correct one with the font already embedded.
 *
 * ── Why the CSVs start with an invisible character ──────────────────────
 *
 * A UTF-8 byte-order mark. Without it Excel guesses the old Windows encoding
 * and every Urdu name comes out as mojibake — the single most common way a
 * "working" export turns out to be worthless.
 */

const BOM = '﻿';

function exportDir(): Directory {
  const dir = new Directory(Paths.cache, 'exports');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

function safeName(name: string | undefined): string {
  return (name ?? 'MilkBook').replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 30) || 'MilkBook';
}

/** HTML-escapes. Shop and customer names are user input and land in markup. */
function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** RFC 4180 quoting. A customer called `Ali, "Doodh Wala"` must survive. */
function csvCell(v: unknown): string {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: (string | number | null | undefined)[][]): string {
  return BOM + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export type ExportBundle = {
  shop: Shop | null;
  collections: Record<string, Record<string, unknown>[]>;
};

export async function readEverything(shopId: string, shop: Shop | null): Promise<ExportBundle> {
  const collections: ExportBundle['collections'] = {};
  for (const name of Object.values(COL)) {
    // eslint-disable-next-line no-await-in-loop
    const snap = await getDocs(query(shopCol(shopId, name)));
    collections[name] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }));
  }
  return { shop, collections };
}

// ── the readable document ─────────────────────────────────────────────────

export type ExportStrings = {
  lang: 'en' | 'ur';
  isRTL: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
  money: (n: number) => string;
  /** Long, human date. Never a raw timestamp — this is for a person. */
  date: (ms: number) => string;
};

type Section = { heading: string; body: string };

function table(headers: string[], rows: string[][], emptyText: string): string {
  if (rows.length === 0) return `<p class="empty">${esc(emptyText)}</p>`;
  return `<table>
  <thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
  <tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
    .join('')}</tbody>
</table>`;
}

/**
 * Builds the whole shop as one HTML document.
 *
 * Ordered the way a shopkeeper thinks about their business, not the way the
 * database is laid out: who owes what first, then the ledgers behind those
 * numbers, then the day-to-day records underneath.
 */
export async function buildReadableHtml(
  bundle: ExportBundle,
  s: ExportStrings
): Promise<string> {
  const { shop, collections } = bundle;
  const customers = (collections[COL.customers] ?? []) as unknown as Customer[];
  const deliveries = (collections[COL.deliveries] ?? []) as Record<string, unknown>[];
  const sales = (collections[COL.sales] ?? []) as Record<string, unknown>[];
  const payments = (collections[COL.payments] ?? []) as Record<string, unknown>[];
  const expenses = (collections[COL.expenses] ?? []) as Record<string, unknown>[];
  const khaataEntries = (collections[COL.khaataEntries] ?? []) as Record<string, unknown>[];
  const invoices = (collections[COL.invoices] ?? []) as Record<string, unknown>[];
  const suppliers = (collections[COL.suppliers] ?? []) as Record<string, unknown>[];

  const totalOwed = customers.reduce((n, c) => n + Math.max(0, c.balance ?? 0), 0);
  const totalReceived = payments.reduce((n, p) => n + Number(p.amount ?? 0), 0);
  const totalSpent = expenses.reduce((n, e) => n + Number(e.amount ?? 0), 0);

  const sections: Section[] = [];

  // ── shop ────────────────────────────────────────────────────────────────
  sections.push({
    heading: s.t('dl.sectionShop'),
    body: table(
      [s.t('common.name'), ''],
      [
        [s.t('onb.shopName'), shop?.name ?? '—'],
        [s.t('onb.ownerName'), shop?.ownerName ?? '—'],
        [s.t('common.phone'), shop?.phone ?? '—'],
        [s.t('common.address'), shop?.address ?? '—'],
        [s.t('onb.milkRate'), shop?.defaultMilkRate ? s.money(shop.defaultMilkRate) : '—'],
      ],
      s.t('dl.nothingHere')
    ),
  });

  // ── summary ─────────────────────────────────────────────────────────────
  sections.push({
    heading: s.t('dl.sectionSummary'),
    body: `<div class="stats">
      <div class="stat"><span>${esc(s.t('dl.totalCustomers'))}</span><b>${esc(customers.length)}</b></div>
      <div class="stat"><span>${esc(s.t('dl.totalOwed'))}</span><b class="owed">${esc(s.money(totalOwed))}</b></div>
      <div class="stat"><span>${esc(s.t('dl.totalReceived'))}</span><b class="in">${esc(s.money(totalReceived))}</b></div>
      <div class="stat"><span>${esc(s.t('dl.totalSpent'))}</span><b class="out">${esc(s.money(totalSpent))}</b></div>
    </div>`,
  });

  // ── customers ───────────────────────────────────────────────────────────
  const byName = [...customers].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  sections.push({
    heading: s.t('dl.sectionCustomers'),
    body: table(
      [s.t('common.name'), s.t('common.phone'), s.t('del.route'), s.t('cust.balance')],
      byName.map((c) => [
        c.name ?? '—',
        c.phone ?? '—',
        c.route ?? '—',
        s.money(c.balance ?? 0),
      ]),
      s.t('dl.nothingHere')
    ),
  });

  // ── khaata, one block per customer ──────────────────────────────────────
  // The heart of the export. Each customer gets their own ledger with a
  // running balance, so the file settles an argument the same way the app
  // does — which is the whole reason the khaata exists.
  const khaataBlocks = byName
    .map((c) => {
      let rows: LedgerRow[] = [];
      try {
        rows = buildLedger({
          customer: c,
          deliveries: deliveries.filter((d) => d.customerId === c.id) as never,
          sales: sales.filter((x) => x.customerId === c.id) as never,
          payments: payments.filter((p) => p.customerId === c.id) as never,
          entries: khaataEntries.filter((k) => k.customerId === c.id) as never,
          invoices: invoices.filter((i) => i.customerId === c.id) as never,
        });
      } catch {
        rows = [];
      }
      if (rows.length === 0 && (c.balance ?? 0) === 0) return '';
      return `<div class="khaata">
        <h3>${esc(c.name)}${c.phone ? ` <small>${esc(c.phone)}</small>` : ''}</h3>
        <p class="bal">${esc(s.t('cust.balance'))}: <b>${esc(s.money(c.balance ?? 0))}</b></p>
        ${table(
          [s.t('common.date'), s.t('common.note'), s.t('common.amount'), s.t('dl.runningBalance')],
          rows.map((r) => [
            s.date(r.ts),
            r.subtitle ? `${r.title} — ${r.subtitle}` : r.title,
            (r.delta >= 0 ? '+' : '−') + s.money(Math.abs(r.delta)),
            s.money(r.balanceAfter),
          ]),
          s.t('dl.nothingHere')
        )}
      </div>`;
    })
    .filter(Boolean)
    .join('\n');

  sections.push({
    heading: s.t('dl.sectionKhaata'),
    body: khaataBlocks || `<p class="empty">${esc(s.t('dl.nothingHere'))}</p>`,
  });

  // ── the day-to-day records ──────────────────────────────────────────────
  const nameOf = (id: unknown) => customers.find((c) => c.id === id)?.name ?? '—';
  const byDate = (a: Record<string, unknown>, b: Record<string, unknown>) =>
    String(a.date ?? '').localeCompare(String(b.date ?? ''));

  sections.push({
    heading: s.t('dl.sectionDeliveries'),
    body: table(
      [s.t('common.date'), s.t('nav.customers'), s.t('common.qty'), s.t('common.status')],
      [...deliveries].sort(byDate).map((d) => [
        String(d.date ?? '—'),
        nameOf(d.customerId),
        String(d.qty ?? ''),
        d.status === 'skipped' ? s.t('del.skipped') : s.t('del.delivered'),
      ]),
      s.t('dl.nothingHere')
    ),
  });

  sections.push({
    heading: s.t('dl.sectionPayments'),
    body: table(
      [s.t('common.date'), s.t('nav.customers'), s.t('common.amount'), s.t('dl.method')],
      [...payments].sort(byDate).map((p) => [
        String(p.date ?? '—'),
        nameOf(p.customerId),
        s.money(Number(p.amount ?? 0)),
        String(p.mode ?? '—'),
      ]),
      s.t('dl.nothingHere')
    ),
  });

  sections.push({
    heading: s.t('dl.sectionSales'),
    body: table(
      [s.t('common.date'), s.t('nav.customers'), s.t('common.total')],
      [...sales].sort(byDate).map((x) => [
        String(x.date ?? '—'),
        x.customerId ? nameOf(x.customerId) : '—',
        s.money(Number(x.total ?? 0)),
      ]),
      s.t('dl.nothingHere')
    ),
  });

  sections.push({
    heading: s.t('dl.sectionExpenses'),
    body: table(
      [s.t('common.date'), s.t('common.note'), s.t('common.amount')],
      [...expenses].sort(byDate).map((e) => [
        String(e.date ?? '—'),
        String(e.note ?? e.categoryId ?? '—'),
        s.money(Number(e.amount ?? 0)),
      ]),
      s.t('dl.nothingHere')
    ),
  });

  sections.push({
    heading: s.t('dl.sectionSuppliers'),
    body: table(
      [s.t('common.name'), s.t('common.phone'), s.t('cust.balance')],
      suppliers.map((x) => [
        String(x.name ?? '—'),
        String(x.phone ?? '—'),
        s.money(Number(x.balance ?? 0)),
      ]),
      s.t('dl.nothingHere')
    ),
  });

  // The real Nastaliq face, inlined, so the document looks the same on a
  // laptop in another country as it does on the shopkeeper's phone.
  const fontCss = s.lang === 'ur' ? await urduFontCss().catch(() => '') : '';

  return `<!doctype html>
<html lang="${s.lang}" dir="${s.isRTL ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(shop?.name ?? 'MilkBook')} — ${esc(s.t('dl.docTitle'))}</title>
<style>
${fontCss}
  :root { --ink:#0B1B3A; --muted:#5A6B8C; --line:#E2E9F5; --brand:#12246B; --in:#0E8F47; --out:#CC2E33; --owed:#B45309; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px; background: #fff; color: var(--ink);
    font-family: ${s.lang === 'ur'
      ? `'Noto Nastaliq Urdu','Jameel Noori Nastaleeq','Noto Naskh Arabic',serif`
      : `'Inter',-apple-system,'Segoe UI',Roboto,sans-serif`};
    line-height: ${s.lang === 'ur' ? '2.2' : '1.6'};
    font-size: 15px;
  }
  header { border-bottom: 3px solid var(--brand); padding-bottom: 16px; margin-bottom: 8px; }
  h1 { margin: 0 0 4px; font-size: 26px; color: var(--brand); }
  h2 { margin: 34px 0 10px; font-size: 20px; color: var(--brand);
       border-bottom: 1px solid var(--line); padding-bottom: 6px; }
  h3 { margin: 22px 0 4px; font-size: 16px; }
  h3 small { font-weight: 400; color: var(--muted); font-size: 13px; }
  .meta { color: var(--muted); font-size: 13px; margin: 0; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 4px; font-size: 14px; }
  th, td { text-align: ${s.isRTL ? 'right' : 'left'}; padding: 7px 10px;
           border-bottom: 1px solid var(--line); vertical-align: top; }
  th { background: #F2F6FC; font-weight: 700; font-size: 12px;
       text-transform: uppercase; letter-spacing: .04em; color: var(--muted);
       ${s.lang === 'ur' ? 'text-transform:none; letter-spacing:0;' : ''} }
  tbody tr:nth-child(even) { background: #FAFCFF; }
  /* Amounts stay in Latin digits and line up in a column — Nastaliq numerals
     in a money table are unreadable at a glance, which is the opposite of
     what a ledger is for. */
  td:last-child, td:nth-last-child(2) { font-variant-numeric: tabular-nums;
       font-family: 'Inter',-apple-system,'Segoe UI',Roboto,sans-serif;
       direction: ltr; text-align: ${s.isRTL ? 'left' : 'right'}; white-space: nowrap; }
  .stats { display: flex; flex-wrap: wrap; gap: 12px; margin: 12px 0; }
  .stat { flex: 1 1 150px; border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; }
  .stat span { display: block; font-size: 12px; color: var(--muted); }
  .stat b { font-size: 20px; font-family: 'Inter',sans-serif; direction: ltr; display: inline-block; }
  .in { color: var(--in); } .out { color: var(--out); } .owed { color: var(--owed); }
  .khaata { break-inside: avoid; page-break-inside: avoid; margin-bottom: 18px; }
  .bal { margin: 0 0 6px; color: var(--muted); font-size: 13px; }
  .empty { color: var(--muted); font-style: italic; margin: 6px 0 14px; }
  footer { margin-top: 40px; padding-top: 14px; border-top: 1px solid var(--line);
           color: var(--muted); font-size: 12px; }
  @media print {
    body { padding: 0; font-size: 12px; }
    h2 { page-break-after: avoid; }
    tbody tr:nth-child(even) { background: #fff; }
  }
</style>
</head>
<body>
<header>
  <h1>${esc(shop?.name ?? 'MilkBook')}</h1>
  <p class="meta">${esc(s.t('dl.docTitle'))} · ${esc(s.t('dl.generatedOn', { date: s.date(Date.now()) }))}</p>
</header>
${sections.map((sec) => `<section><h2>${esc(sec.heading)}</h2>${sec.body}</section>`).join('\n')}
<footer>${esc(s.t('dl.pageNote'))} · MilkBook</footer>
</body>
</html>`;
}

// ── writing files out ─────────────────────────────────────────────────────

export async function exportReadable(
  shopId: string,
  shop: Shop | null,
  s: ExportStrings,
  stamp: string,
  dialogTitle: string
): Promise<string> {
  const bundle = await readEverything(shopId, shop);
  const html = await buildReadableHtml(bundle, s);

  const file = new File(exportDir(), `${safeName(shop?.name)}-${stamp}.html`);
  if (file.exists) file.delete();
  file.create();
  file.write(html);

  await shareFile(file.uri, { mimeType: 'text/html', dialogTitle, UTI: 'public.html' });
  return file.uri;
}

/**
 * One CSV per table, zipped into… nothing. Android's share sheet handles
 * multiple files poorly and a zip needs a native module, so instead this
 * writes a single CSV with a blank line and a heading between each table.
 * Excel opens it, and a shopkeeper who has never seen a CSV still sees
 * headings they recognise.
 */
export async function exportSpreadsheet(
  shopId: string,
  shop: Shop | null,
  s: ExportStrings,
  stamp: string,
  dialogTitle: string
): Promise<string> {
  const { collections } = await readEverything(shopId, shop);
  const customers = (collections[COL.customers] ?? []) as unknown as Customer[];
  const nameOf = (id: unknown) => customers.find((c) => c.id === id)?.name ?? '';

  const blocks: string[] = [];

  const push = (heading: string, headers: string[], rows: (string | number)[][]) => {
    blocks.push([[heading], headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n'));
  };

  push(
    s.t('dl.sectionCustomers'),
    [s.t('common.name'), s.t('common.phone'), s.t('del.route'), s.t('common.qty'), s.t('common.rate'), s.t('cust.balance')],
    customers.map((c) => [c.name ?? '', c.phone ?? '', c.route ?? '', c.defaultQty ?? 0, c.rate ?? 0, c.balance ?? 0])
  );

  push(
    s.t('dl.sectionDeliveries'),
    [s.t('common.date'), s.t('nav.customers'), s.t('common.qty'), s.t('common.status')],
    (collections[COL.deliveries] ?? []).map((d) => [
      String(d.date ?? ''), nameOf(d.customerId), Number(d.qty ?? 0), String(d.status ?? ''),
    ])
  );

  push(
    s.t('dl.sectionPayments'),
    [s.t('common.date'), s.t('nav.customers'), s.t('common.amount'), s.t('dl.method')],
    (collections[COL.payments] ?? []).map((p) => [
      String(p.date ?? ''), nameOf(p.customerId), Number(p.amount ?? 0), String(p.mode ?? ''),
    ])
  );

  push(
    s.t('dl.sectionSales'),
    [s.t('common.date'), s.t('nav.customers'), s.t('common.total')],
    (collections[COL.sales] ?? []).map((x) => [
      String(x.date ?? ''), x.customerId ? nameOf(x.customerId) : '', Number(x.total ?? 0),
    ])
  );

  push(
    s.t('dl.sectionExpenses'),
    [s.t('common.date'), s.t('common.note'), s.t('common.amount')],
    (collections[COL.expenses] ?? []).map((e) => [
      String(e.date ?? ''), String(e.note ?? ''), Number(e.amount ?? 0),
    ])
  );

  push(
    s.t('khaata.title'),
    [s.t('common.date'), s.t('nav.customers'), s.t('common.note'), s.t('common.amount')],
    (collections[COL.khaataEntries] ?? []).map((k) => [
      String(k.date ?? ''), nameOf(k.customerId), String(k.note ?? ''), Number(k.amount ?? 0),
    ])
  );

  const csv = BOM + blocks.join('\r\n\r\n') + '\r\n';

  const file = new File(exportDir(), `${safeName(shop?.name)}-${stamp}.csv`);
  if (file.exists) file.delete();
  file.create();
  file.write(csv);

  await shareFile(file.uri, { mimeType: 'text/csv', dialogTitle, UTI: 'public.comma-separated-values-text' });
  return file.uri;
}

export { toCsv };
