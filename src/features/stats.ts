import { round2 } from '@/data/repo';
import { lastNDays, monthRange } from '@/lib/dates';
import type {
  Category,
  Customer,
  Delivery,
  Expense,
  ExpenseCategory,
  Payment,
  Product,
  Purchase,
  Sale,
} from '@/types/models';

export type DayStats = {
  milkQty: number;
  milkAmount: number;
  deliveredCount: number;
  skippedCount: number;
  saleTotal: number;
  saleCount: number;
  cashIn: number;
  spent: number;
};

export function statsForDay(input: {
  date: string;
  deliveries: Delivery[];
  sales: Sale[];
  payments: Payment[];
  expenses: Expense[];
}): DayStats {
  const d = input.deliveries.filter((x) => x.date === input.date);
  const delivered = d.filter((x) => x.status === 'delivered');
  const sales = input.sales.filter((x) => x.date === input.date);

  return {
    milkQty: round2(delivered.reduce((s, x) => s + x.qty, 0)),
    milkAmount: round2(delivered.reduce((s, x) => s + x.amount, 0)),
    deliveredCount: delivered.length,
    skippedCount: d.filter((x) => x.status === 'skipped').length,
    saleTotal: round2(sales.reduce((s, x) => s + x.total, 0)),
    saleCount: sales.length,
    cashIn: round2(
      sales.filter((x) => !x.onCredit).reduce((s, x) => s + x.total, 0) +
        input.payments.filter((p) => p.date === input.date).reduce((s, p) => s + p.amount, 0)
    ),
    spent: round2(input.expenses.filter((e) => e.date === input.date).reduce((s, e) => s + e.amount, 0)),
  };
}

export type MonthStats = {
  milkQty: number;
  milkAmount: number;
  milkDays: number;
  itemSales: number;
  itemCost: number;
  /** Everything that was earned this month, paid or on khata. */
  earned: number;
  /** Cash that actually came in (counter sales + khata payments). */
  collected: number;
  expenses: number;
  purchases: number;
  profit: number;
  outstanding: number;
  avgDailyMilk: number;
};

export function statsForMonth(input: {
  month: string;
  deliveries: Delivery[];
  sales: Sale[];
  payments: Payment[];
  expenses: Expense[];
  purchases: Purchase[];
  customers: Customer[];
}): MonthStats {
  const delivered = input.deliveries.filter((d) => d.status === 'delivered');
  const milkQty = round2(delivered.reduce((s, d) => s + d.qty, 0));
  const milkAmount = round2(delivered.reduce((s, d) => s + d.amount, 0));

  const monthlyFixed = round2(
    input.customers
      .filter((c) => c.active && c.billingType === 'monthly')
      .reduce((s, c) => s + (c.monthlyAmount || 0), 0)
  );

  const itemSales = round2(input.sales.reduce((s, x) => s + x.total, 0));
  const itemCost = round2(input.sales.reduce((s, x) => s + x.cost, 0));

  const collected = round2(
    input.sales.filter((x) => !x.onCredit).reduce((s, x) => s + x.total, 0) +
      input.payments.reduce((s, p) => s + p.amount, 0)
  );

  const expenses = round2(input.expenses.reduce((s, e) => s + e.amount, 0));
  const purchases = round2(input.purchases.reduce((s, p) => s + p.amount, 0));

  const earned = round2(milkAmount + monthlyFixed + itemSales);
  const outstanding = round2(input.customers.reduce((s, c) => s + Math.max(0, c.balance), 0));

  const uniqueDays = new Set(delivered.map((d) => d.date));
  const daysElapsed = Math.max(1, uniqueDays.size);

  return {
    milkQty,
    milkAmount: round2(milkAmount + monthlyFixed),
    milkDays: uniqueDays.size,
    itemSales,
    itemCost,
    earned,
    collected,
    expenses,
    purchases,
    // Purchases are the cost of the milk itself; item cost covers everything
    // bought for resale that has already been sold.
    profit: round2(earned - expenses - purchases),
    outstanding,
    avgDailyMilk: round2(milkQty / daysElapsed),
  };
}

export function milkTrend(deliveries: Delivery[], days = 7): { label: string; value: number; date: string }[] {
  const keys = lastNDays(days);
  const byDate = new Map<string, number>();
  deliveries.forEach((d) => {
    if (d.status !== 'delivered') return;
    byDate.set(d.date, (byDate.get(d.date) ?? 0) + d.qty);
  });
  return keys.map((key) => ({
    date: key,
    label: key.slice(8),
    value: round2(byDate.get(key) ?? 0),
  }));
}

export function moneyTrend(
  input: { deliveries: Delivery[]; sales: Sale[]; payments: Payment[]; expenses: Expense[] },
  days = 7
): { label: string; a: number; b: number }[] {
  const keys = lastNDays(days);
  const inMap = new Map<string, number>();
  const outMap = new Map<string, number>();

  input.sales.forEach((s) => {
    if (s.onCredit) return;
    inMap.set(s.date, (inMap.get(s.date) ?? 0) + s.total);
  });
  input.payments.forEach((p) => inMap.set(p.date, (inMap.get(p.date) ?? 0) + p.amount));
  input.expenses.forEach((e) => outMap.set(e.date, (outMap.get(e.date) ?? 0) + e.amount));

  return keys.map((key) => ({
    label: key.slice(8),
    a: round2(inMap.get(key) ?? 0),
    b: round2(outMap.get(key) ?? 0),
  }));
}

export function salesByCategory(
  sales: Sale[],
  products: Product[],
  categories: Category[]
): { label: string; value: number; color: string }[] {
  const catOf = new Map(products.map((p) => [p.id, p.categoryId]));
  const catById = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string, number>();

  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const catId = catOf.get(item.productId) ?? '__other__';
      totals.set(catId, (totals.get(catId) ?? 0) + item.total);
    });
  });

  return [...totals.entries()]
    .map(([catId, value]) => {
      const cat = catById.get(catId);
      return {
        label: cat?.name ?? '—',
        value: round2(value),
        color: cat?.color ?? '#64748B',
      };
    })
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function expenseBreakdown(
  expenses: Expense[],
  categories: ExpenseCategory[]
): { label: string; value: number; color: string }[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string, number>();
  expenses.forEach((e) => totals.set(e.categoryId, (totals.get(e.categoryId) ?? 0) + e.amount));

  return [...totals.entries()]
    .map(([id, value]) => ({
      label: byId.get(id)?.name ?? '—',
      value: round2(value),
      color: byId.get(id)?.color ?? '#64748B',
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function topCustomersByMilk(
  deliveries: Delivery[],
  limit = 5
): { customerId: string; name: string; qty: number; amount: number }[] {
  const map = new Map<string, { name: string; qty: number; amount: number }>();
  deliveries.forEach((d) => {
    if (d.status !== 'delivered') return;
    const prev = map.get(d.customerId);
    if (prev) {
      prev.qty += d.qty;
      prev.amount += d.amount;
    } else {
      map.set(d.customerId, { name: d.customerName, qty: d.qty, amount: d.amount });
    }
  });
  return [...map.entries()]
    .map(([customerId, v]) => ({ customerId, name: v.name, qty: round2(v.qty), amount: round2(v.amount) }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit);
}

export function topProducts(
  sales: Sale[],
  limit = 5
): { productId: string; name: string; qty: number; total: number }[] {
  const map = new Map<string, { name: string; qty: number; total: number }>();
  sales.forEach((sale) =>
    sale.items.forEach((item) => {
      const prev = map.get(item.productId);
      if (prev) {
        prev.qty += item.qty;
        prev.total += item.total;
      } else {
        map.set(item.productId, { name: item.name, qty: item.qty, total: item.total });
      }
    })
  );
  return [...map.entries()]
    .map(([productId, v]) => ({ productId, name: v.name, qty: round2(v.qty), total: round2(v.total) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export function customersWithDues(customers: Customer[], limit?: number): Customer[] {
  const list = customers.filter((c) => c.balance >= 1).sort((a, b) => b.balance - a.balance);
  return limit ? list.slice(0, limit) : list;
}

/** Progress through the current month, used for "on track" hints. */
export function monthProgress(month: string): number {
  const { days } = monthRange(month);
  const today = new Date();
  const isCurrent = month === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  if (!isCurrent) return 1;
  return Math.min(1, today.getDate() / days);
}
