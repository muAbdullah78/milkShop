import { getDocs, increment, query, where, writeBatch } from '@react-native-firebase/firestore';

import { COL, invoiceId, shopCol, shopSubDoc } from '@/data/refs';
import { round2 } from '@/data/repo';
import { db } from '@/lib/firebase';
import { monthKey, shiftMonth, thisMonthKey } from '@/lib/dates';
import type { Customer, Invoice } from '@/types/models';

/** How many closed months back we will catch up on in one pass. */
const CATCH_UP_MONTHS = 6;

/**
 * Posts the flat charge for fixed-monthly customers as soon as a month ends.
 *
 * Why this exists: tying the charge to "you tapped send bill" meant a shop
 * that forgot to send bills would show those customers owing nothing, which
 * is simply a lie. Now the khaata is truthful whether or not a bill goes out.
 *
 * Idempotency is the whole game here. Each (month, customer) pair has exactly
 * one invoice document, and `chargePosted` on it is the flag. We only ever
 * write the increment in the same batch that sets the flag, so a charge can
 * never be applied twice — even if the app is killed mid-run or the write is
 * replayed from the offline queue.
 */
export async function postDueMonthlyCharges(
  shopId: string,
  customers: Customer[]
): Promise<number> {
  const monthly = customers.filter(
    (c) => c.billingType === 'monthly' && (c.monthlyAmount || 0) > 0
  );
  if (monthly.length === 0) return 0;

  const current = thisMonthKey();
  const months: string[] = [];
  for (let i = 1; i <= CATCH_UP_MONTHS; i += 1) months.push(shiftMonth(current, -i));

  let posted = 0;

  for (const month of months) {
    // Never charge for a month that started before the customer existed, or
    // before their khaata was opened.
    const eligible = monthly.filter((c) => {
      const start = c.khaataOpenedAt ?? c.createdAt;
      return monthKey(new Date(start)) <= month;
    });
    if (eligible.length === 0) continue;

    // eslint-disable-next-line no-await-in-loop
    const snap = await getDocs(query(shopCol(shopId, COL.invoices), where('month', '==', month)));
    const byCustomer = new Map<string, Invoice>();
    snap.docs.forEach((d) => {
      const data = { id: d.id, ...(d.data() as object) } as Invoice;
      byCustomer.set(data.customerId, data);
    });

    const due = eligible.filter((c) => !byCustomer.get(c.id)?.chargePosted);
    if (due.length === 0) continue;

    const batch = writeBatch(db());
    const stamp = Date.now();

    due.forEach((c) => {
      const amount = round2(c.monthlyAmount);
      const existing = byCustomer.get(c.id);

      batch.set(
        shopSubDoc(shopId, COL.invoices, invoiceId(month, c.id)),
        {
          month,
          customerId: c.id,
          customerName: c.name,
          milkQty: existing?.milkQty ?? 0,
          milkAmount: existing?.milkAmount ?? amount,
          milkDays: existing?.milkDays ?? 0,
          itemsAmount: existing?.itemsAmount ?? 0,
          previousBalance: existing?.previousBalance ?? 0,
          paidInMonth: existing?.paidInMonth ?? 0,
          total: existing?.total ?? amount,
          status: existing?.status ?? 'draft',
          chargePosted: true,
          chargeAmount: amount,
          chargePostedAt: stamp,
          createdAt: existing?.createdAt ?? stamp,
          updatedAt: stamp,
        },
        { merge: true }
      );

      batch.update(shopSubDoc(shopId, COL.customers, c.id), {
        balance: increment(amount),
        updatedAt: stamp,
      } as never);
      posted += 1;
    });

    // eslint-disable-next-line no-await-in-loop
    await batch.commit();
  }

  return posted;
}
