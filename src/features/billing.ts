import { round2 } from '@/data/repo';
import type {
  BillSummary,
  Customer,
  Delivery,
  Invoice,
  Payment,
  Sale,
  Unit,
} from '@/types/models';

export type BillInputs = {
  customer: Customer;
  month: string;
  deliveries: Delivery[];
  sales: Sale[];
  payments: Payment[];
  invoice?: Invoice;
};

/**
 * Builds one customer's monthly bill.
 *
 * The number a shopkeeper actually reads out is "what do they owe me today",
 * so `total` is anchored to the live running balance rather than re-derived
 * from history. Everything else on the bill explains how that number was
 * reached:
 *
 *     total = previousBalance + monthCharges − paidInMonth
 *
 * For fixed-monthly customers the flat charge is only added to the balance
 * once the bill is actually sent, so an unsent month is added on top here as
 * a pending charge — the preview and the posted bill always agree.
 */
export function buildBill(input: BillInputs): BillSummary {
  const { customer, month, deliveries, sales, payments, invoice } = input;

  const monthDeliveries = deliveries
    .filter((d) => d.customerId === customer.id && d.month === month)
    .sort((a, b) => a.date.localeCompare(b.date));

  const delivered = monthDeliveries.filter((d) => d.status === 'delivered' && d.qty > 0);
  const milkQty = round2(delivered.reduce((s, d) => s + d.qty, 0));
  const milkAmount = round2(delivered.reduce((s, d) => s + d.amount, 0));
  const milkDays = delivered.length;

  const creditSales = sales.filter(
    (s) => s.customerId === customer.id && s.month === month && s.onCredit
  );
  const itemsAmount = round2(creditSales.reduce((s, x) => s + x.total, 0));

  const itemLines = aggregateItems(creditSales);

  const paidInMonth = round2(
    payments.filter((p) => p.customerId === customer.id && p.month === month).reduce((s, p) => s + p.amount, 0)
  );

  const isMonthly = customer.billingType === 'monthly';
  const chargePosted = Boolean(invoice?.chargePosted);
  const fixedAmount = isMonthly ? round2(customer.monthlyAmount || 0) : 0;
  const pendingFixed = isMonthly && !chargePosted ? fixedAmount : 0;

  const total = round2(customer.balance + pendingFixed);
  const monthCharges = round2(milkAmount + itemsAmount + fixedAmount);
  const previousBalance = round2(total - monthCharges + paidInMonth);

  const avgQty = milkDays > 0 ? round2(milkQty / milkDays) : 0;

  return {
    customer,
    month,
    milkQty,
    milkAmount,
    milkDays,
    avgQty,
    fixedAmount,
    itemsAmount,
    itemLines,
    previousBalance,
    paidInMonth,
    monthCharges,
    total,
    deliveries: monthDeliveries,
    status: invoice?.status ?? 'draft',
    invoiceId: invoice?.id,
  };
}

function aggregateItems(sales: Sale[]): { name: string; qty: number; unit: Unit; total: number }[] {
  const map = new Map<string, { name: string; qty: number; unit: Unit; total: number }>();
  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const key = `${item.productId}__${item.unit}`;
      const prev = map.get(key);
      if (prev) {
        prev.qty = round2(prev.qty + item.qty);
        prev.total = round2(prev.total + item.total);
      } else {
        map.set(key, { name: item.name, qty: item.qty, unit: item.unit, total: item.total });
      }
    });
    if (sale.discount > 0) {
      const key = '__discount__';
      const prev = map.get(key);
      const amount = -sale.discount;
      if (prev) prev.total = round2(prev.total + amount);
      else map.set(key, { name: 'Discount', qty: 1, unit: 'piece', total: amount });
    }
  });
  return [...map.values()].filter((l) => l.qty !== 0 || l.total !== 0);
}

/** Bills for every customer with either activity this month or money owed. */
export function buildAllBills(input: {
  customers: Customer[];
  month: string;
  deliveries: Delivery[];
  sales: Sale[];
  payments: Payment[];
  invoices: Invoice[];
}): BillSummary[] {
  const invoiceByCustomer = new Map(input.invoices.map((i) => [i.customerId, i]));

  return input.customers
    .map((customer) =>
      buildBill({
        customer,
        month: input.month,
        deliveries: input.deliveries,
        sales: input.sales,
        payments: input.payments,
        invoice: invoiceByCustomer.get(customer.id),
      })
    )
    .filter(
      (b) =>
        b.milkQty > 0 ||
        b.itemsAmount !== 0 ||
        b.fixedAmount > 0 ||
        b.paidInMonth > 0 ||
        Math.abs(b.total) >= 1
    )
    .sort((a, b) => b.total - a.total);
}

export function billTotals(bills: BillSummary[]) {
  return {
    count: bills.length,
    toCollect: round2(bills.reduce((s, b) => s + Math.max(0, b.total), 0)),
    milkQty: round2(bills.reduce((s, b) => s + b.milkQty, 0)),
    sent: bills.filter((b) => b.status === 'sent').length,
  };
}
