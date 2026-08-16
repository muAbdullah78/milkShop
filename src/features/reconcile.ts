import { getDocs, query, updateDoc, where } from '@react-native-firebase/firestore';

import { COL, shopCol, shopSubDoc } from '@/data/refs';
import { round2 } from '@/data/repo';
import type {
  Customer,
  Delivery,
  Invoice,
  KhaataEntry,
  Payment,
  Sale,
} from '@/types/models';

export type Reconciliation = {
  stored: number;
  computed: number;
  difference: number;
  matches: boolean;
  counted: {
    opening: number;
    milk: number;
    items: number;
    khaata: number;
    monthly: number;
    payments: number;
  };
};

/**
 * Re-adds every single line of a customer's khaata from scratch.
 *
 * `customer.balance` is a running counter kept in step by atomic increments.
 * That is fast and offline-safe, but a counter can only ever be as good as
 * the writes that touched it — a half-finished migration, a hand edit in the
 * Firebase console, or two phones marking the same delivery offline can all
 * pull it away from the truth. A khaata that quietly disagrees with its own
 * lines is worse than no khaata, so the shopkeeper gets a button that recounts
 * and repairs.
 *
 * The events are the source of truth. The counter is the cache.
 */
export async function reconcileCustomer(
  shopId: string,
  customer: Customer
): Promise<Reconciliation> {
  const [deliverySnap, saleSnap, khaataSnap, paymentSnap, invoiceSnap] = await Promise.all([
    getDocs(query(shopCol(shopId, COL.deliveries), where('customerId', '==', customer.id))),
    getDocs(query(shopCol(shopId, COL.sales), where('customerId', '==', customer.id))),
    getDocs(query(shopCol(shopId, COL.khaataEntries), where('customerId', '==', customer.id))),
    getDocs(query(shopCol(shopId, COL.payments), where('customerId', '==', customer.id))),
    getDocs(query(shopCol(shopId, COL.invoices), where('customerId', '==', customer.id))),
  ]);

  const rows = <T,>(snap: { docs: { id: string; data: () => unknown }[] }): T[] =>
    snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as T[];

  const deliveries = rows<Delivery>(deliverySnap);
  const sales = rows<Sale>(saleSnap);
  const entries = rows<KhaataEntry>(khaataSnap);
  const payments = rows<Payment>(paymentSnap);
  const invoices = rows<Invoice>(invoiceSnap);

  const opening = round2(customer.openingBalance || 0);

  const milk = round2(
    deliveries
      .filter((d) => d.status === 'delivered')
      .reduce((s, d) => s + (d.amount || 0), 0)
  );

  const items = round2(sales.filter((s) => s.onCredit).reduce((s, x) => s + x.total, 0));

  const khaata = round2(
    entries.reduce((s, e) => s + (e.kind === 'debit' ? e.amount : -e.amount), 0)
  );

  // Only charges that were actually posted count — an unposted month is not
  // yet money owed. Use the amount frozen on the invoice, never today's rate,
  // so editing a customer's monthly fee cannot rewrite the past.
  const monthly = round2(
    invoices
      .filter((i) => i.chargePosted)
      .reduce((s, i) => s + (i.chargeAmount ?? 0), 0)
  );

  const paid = round2(payments.reduce((s, p) => s + p.amount, 0));

  const computed = round2(opening + milk + items + khaata + monthly - paid);
  const stored = round2(customer.balance);
  const difference = round2(computed - stored);

  return {
    stored,
    computed,
    difference,
    // Half a rupee of float drift is not a real disagreement.
    matches: Math.abs(difference) < 0.5,
    counted: { opening, milk, items, khaata, monthly, payments: paid },
  };
}

/** Writes the recomputed total back. Only call after showing the user. */
export async function applyReconciliation(
  shopId: string,
  customerId: string,
  computed: number
): Promise<void> {
  await updateDoc(shopSubDoc(shopId, COL.customers, customerId), {
    balance: round2(computed),
    updatedAt: Date.now(),
  } as never);
}

/** Does this customer have any khaata history at all? Blocks deletion. */
export async function customerHasHistory(shopId: string, customerId: string): Promise<boolean> {
  const snaps = await Promise.all(
    [COL.deliveries, COL.sales, COL.payments, COL.khaataEntries].map((col) =>
      getDocs(query(shopCol(shopId, col), where('customerId', '==', customerId)))
    )
  );
  return snaps.some((s) => s.docs.length > 0);
}
