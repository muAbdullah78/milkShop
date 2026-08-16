// Standalone replica of buildLedger's arithmetic, exercised against a
// simulated shop. Verifies the running balance is exact and that the ledger
// and the cached counter can never disagree when every write is applied.
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

function buildLedger({ customer, deliveries, sales, payments, entries, invoices, since }) {
  const rows = [];
  deliveries.filter(d => d.customerId === customer.id && d.status === 'delivered' && d.amount > 0)
    .forEach(d => rows.push({ id: `d_${d.id}`, ts: d.createdAt, date: d.date, source: 'milk', delta: d.amount }));
  sales.filter(s => s.customerId === customer.id && s.onCredit)
    .forEach(s => rows.push({ id: `s_${s.id}`, ts: s.createdAt, date: s.date, source: 'sale', delta: s.total }));
  entries.filter(e => e.customerId === customer.id)
    .forEach(e => rows.push({ id: `k_${e.id}`, ts: e.ts, date: e.date, source: 'khaata', delta: e.kind === 'debit' ? e.amount : -e.amount }));
  (invoices ?? []).filter(i => i.customerId === customer.id && i.chargePosted && (i.chargeAmount ?? 0) > 0)
    .forEach(i => rows.push({ id: `m_${i.id}`, ts: i.chargePostedAt, date: `${i.month}-28`, source: 'monthly', delta: i.chargeAmount }));
  payments.filter(p => p.customerId === customer.id)
    .forEach(p => rows.push({ id: `p_${p.id}`, ts: p.createdAt, date: p.date, source: 'payment', delta: -p.amount }));

  rows.sort((a, b) => a.ts - b.ts || a.id.localeCompare(b.id));

  const withBalance = new Array(rows.length);
  let running = customer.balance;
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    withBalance[i] = { ...rows[i], balanceAfter: round2(running) };
    running -= rows[i].delta;
  }
  const sinceTs = since ? new Date(`${since}T00:00:00`).getTime() : null;
  const visible = sinceTs === null ? withBalance : withBalance.filter(r => r.ts >= sinceTs);
  const anchorBalance = visible.length > 0 ? visible[0].balanceAfter - visible[0].delta : customer.balance;
  const anchor = Math.abs(anchorBalance) >= 0.5
    ? { id: 'opening', source: 'opening', delta: 0, balanceAfter: round2(anchorBalance) } : null;
  return (anchor ? [anchor, ...visible] : visible).slice().reverse();
}

// ── Simulate a real shop: every write moves the counter the way the repos do ──
let rng = Number(process.argv[2] ?? 12345);
const rand = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = (a) => a[Math.floor(rand() * a.length)];

const customer = { id: 'c1', balance: 0, openingBalance: 1200, createdAt: 1_700_000_000_000 };
customer.balance = customer.openingBalance;

const deliveries = [], sales = [], payments = [], entries = [], invoices = [];
let ts = 1_700_000_000_000;
const day = (n) => new Date(ts + n * 86400000).toISOString().slice(0, 10);

for (let i = 0; i < 400; i += 1) {
  ts += 3600_000 + Math.floor(rand() * 40_000_000);
  const d = new Date(ts).toISOString().slice(0, 10);
  const kind = pick(['milk', 'milk', 'milk', 'sale', 'khaata', 'khaata', 'payment', 'monthly']);

  if (kind === 'milk') {
    const amount = round2((1 + Math.floor(rand() * 4) * 0.5) * 220);
    deliveries.push({ id: `d${i}`, customerId: 'c1', status: 'delivered', qty: 1, amount, date: d, createdAt: ts });
    customer.balance = round2(customer.balance + amount);
  } else if (kind === 'sale') {
    const total = round2(50 + Math.floor(rand() * 1200));
    sales.push({ id: `s${i}`, customerId: 'c1', onCredit: true, total, date: d, createdAt: ts });
    customer.balance = round2(customer.balance + total);
  } else if (kind === 'khaata') {
    const debit = rand() > 0.15;
    const amount = round2(20 + Math.floor(rand() * 900) + (rand() > 0.5 ? 0.5 : 0));
    entries.push({ id: `k${i}`, customerId: 'c1', kind: debit ? 'debit' : 'credit', amount, date: d, ts });
    customer.balance = round2(customer.balance + (debit ? amount : -amount));
  } else if (kind === 'payment') {
    const amount = round2(Math.min(customer.balance, 100 + Math.floor(rand() * 6000)));
    if (amount <= 0) continue;
    payments.push({ id: `p${i}`, customerId: 'c1', amount, date: d, createdAt: ts });
    customer.balance = round2(customer.balance - amount);
  } else {
    const amount = 6000;
    const month = d.slice(0, 7);
    if (invoices.some(x => x.month === month)) continue;
    invoices.push({ id: `${month}__c1`, customerId: 'c1', month, chargePosted: true, chargeAmount: amount, chargePostedAt: ts });
    customer.balance = round2(customer.balance + amount);
  }
}

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { cond ? pass++ : (fail++, console.log(`  FAIL ${name} ${extra}`)); };

// 1. Full ledger: every row's balanceAfter must equal previous + delta.
const full = buildLedger({ customer, deliveries, sales, payments, entries, invoices }).slice().reverse();
for (let i = 1; i < full.length; i += 1) {
  const prev = full[i - 1].balanceAfter;
  check(`chain@${i}`, Math.abs(round2(prev + full[i].delta) - full[i].balanceAfter) < 0.005,
    `${prev}+${full[i].delta} != ${full[i].balanceAfter}`);
}
// 2. Last row must equal the live balance.
check('tail==balance', Math.abs(full[full.length - 1].balanceAfter - customer.balance) < 0.005,
  `${full[full.length-1].balanceAfter} vs ${customer.balance}`);

// 3. Independent recount (the reconcile path) must equal the counter.
const recomputed = round2(
  customer.openingBalance
  + deliveries.filter(d => d.status === 'delivered').reduce((s, d) => s + d.amount, 0)
  + sales.filter(s => s.onCredit).reduce((s, x) => s + x.total, 0)
  + entries.reduce((s, e) => s + (e.kind === 'debit' ? e.amount : -e.amount), 0)
  + invoices.filter(i => i.chargePosted).reduce((s, i) => s + i.chargeAmount, 0)
  - payments.reduce((s, p) => s + p.amount, 0));
check('reconcile==counter', Math.abs(recomputed - customer.balance) < 0.005, `${recomputed} vs ${customer.balance}`);

// 4. A windowed view must still chain correctly and end at the live balance.
const cut = full[Math.floor(full.length / 2)].date;
const win = buildLedger({ customer, deliveries, sales, payments, entries, invoices, since: cut }).slice().reverse();
for (let i = 1; i < win.length; i += 1) {
  const prev = win[i - 1].balanceAfter;
  check(`win-chain@${i}`, Math.abs(round2(prev + win[i].delta) - win[i].balanceAfter) < 0.005);
}
check('win-anchor', win[0].source === 'opening' || win.length === full.length);
check('win-tail==balance', Math.abs(win[win.length - 1].balanceAfter - customer.balance) < 0.005);

// 5. Deleting an entry must move the counter by exactly its delta.
const victim = entries[10];
const before = customer.balance;
customer.balance = round2(customer.balance - (victim.kind === 'debit' ? victim.amount : -victim.amount));
const after = buildLedger({ customer, deliveries, sales, payments, entries: entries.filter(e => e.id !== victim.id), invoices }).slice().reverse();
check('delete-tail', Math.abs(after[after.length - 1].balanceAfter - customer.balance) < 0.005);
check('delete-delta', Math.abs(round2(before - customer.balance) - (victim.kind === 'debit' ? victim.amount : -victim.amount)) < 0.005);
customer.balance = before;



console.log(`seed ${process.argv[2]}: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
