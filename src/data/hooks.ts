import { orderBy, query, where } from '@react-native-firebase/firestore';
import { useMemo } from 'react';

import { thisMonthKey, todayKey } from '@/lib/dates';
import type {
  Category,
  Customer,
  Delivery,
  KhaataEntry,
  Expense,
  ExpenseCategory,
  Invoice,
  Payment,
  Product,
  Purchase,
  Sale,
  Supplier,
  SupplierPayment,
} from '@/types/models';
import { COL, shopCol } from './refs';
import { useShopId } from './ShopProvider';
import { useLiveQuery } from './useQuery';

/**
 * Every query below filters on a single field so Firestore's automatic
 * single-field indexes cover them — no composite index deploy needed, and
 * the offline cache can serve them all. Sorting happens on the client.
 */

export function useCustomers() {
  const shopId = useShopId();
  const state = useLiveQuery<Customer>(
    () => (shopId ? query(shopCol(shopId, COL.customers), orderBy('name')) : null),
    [shopId]
  );
  return state;
}

export function useActiveCustomers() {
  const { data, loading, error } = useCustomers();
  const active = useMemo(() => data.filter((c) => c.active), [data]);
  return { data: active, loading, error };
}

export function useCustomer(customerId: string | undefined) {
  const { data, loading, error } = useCustomers();
  const customer = useMemo(
    () => data.find((c) => c.id === customerId) ?? null,
    [data, customerId]
  );
  return { customer, loading, error };
}

export function useCategories() {
  const shopId = useShopId();
  return useLiveQuery<Category>(
    () => (shopId ? query(shopCol(shopId, COL.categories), orderBy('sortOrder')) : null),
    [shopId]
  );
}

export function useProducts() {
  const shopId = useShopId();
  return useLiveQuery<Product>(
    () => (shopId ? query(shopCol(shopId, COL.products), orderBy('name')) : null),
    [shopId]
  );
}

export function useMilkProduct() {
  const { data } = useProducts();
  return useMemo(() => data.find((p) => p.isMilk) ?? null, [data]);
}

export function useExpenseCategories() {
  const shopId = useShopId();
  return useLiveQuery<ExpenseCategory>(
    () => (shopId ? query(shopCol(shopId, COL.expenseCategories), orderBy('sortOrder')) : null),
    [shopId]
  );
}

export function useSuppliers() {
  const shopId = useShopId();
  return useLiveQuery<Supplier>(
    () => (shopId ? query(shopCol(shopId, COL.suppliers), orderBy('name')) : null),
    [shopId]
  );
}

// ── date-scoped ──────────────────────────────────────────────────────────────

export function useDeliveriesForDay(date: string = todayKey()) {
  const shopId = useShopId();
  return useLiveQuery<Delivery>(
    () => (shopId ? query(shopCol(shopId, COL.deliveries), where('date', '==', date)) : null),
    [shopId, date]
  );
}

export function useDeliveriesForMonth(month: string = thisMonthKey()) {
  const shopId = useShopId();
  return useLiveQuery<Delivery>(
    () => (shopId ? query(shopCol(shopId, COL.deliveries), where('month', '==', month)) : null),
    [shopId, month]
  );
}

export function useSalesForMonth(month: string = thisMonthKey()) {
  const shopId = useShopId();
  return useLiveQuery<Sale>(
    () => (shopId ? query(shopCol(shopId, COL.sales), where('month', '==', month)) : null),
    [shopId, month]
  );
}

export function usePaymentsForMonth(month: string = thisMonthKey()) {
  const shopId = useShopId();
  return useLiveQuery<Payment>(
    () => (shopId ? query(shopCol(shopId, COL.payments), where('month', '==', month)) : null),
    [shopId, month]
  );
}

export function useExpensesForMonth(month: string = thisMonthKey()) {
  const shopId = useShopId();
  return useLiveQuery<Expense>(
    () => (shopId ? query(shopCol(shopId, COL.expenses), where('month', '==', month)) : null),
    [shopId, month]
  );
}

export function usePurchasesForMonth(month: string = thisMonthKey()) {
  const shopId = useShopId();
  return useLiveQuery<Purchase>(
    () => (shopId ? query(shopCol(shopId, COL.purchases), where('month', '==', month)) : null),
    [shopId, month]
  );
}

export function useSupplierPaymentsForMonth(month: string = thisMonthKey()) {
  const shopId = useShopId();
  return useLiveQuery<SupplierPayment>(
    () => (shopId ? query(shopCol(shopId, COL.supplierPayments), where('month', '==', month)) : null),
    [shopId, month]
  );
}

export function useInvoicesForMonth(month: string) {
  const shopId = useShopId();
  return useLiveQuery<Invoice>(
    () => (shopId ? query(shopCol(shopId, COL.invoices), where('month', '==', month)) : null),
    [shopId, month]
  );
}

// ── customer-scoped ──────────────────────────────────────────────────────────

export function useCustomerDeliveries(customerId: string | undefined) {
  const shopId = useShopId();
  return useLiveQuery<Delivery>(
    () =>
      shopId && customerId
        ? query(shopCol(shopId, COL.deliveries), where('customerId', '==', customerId))
        : null,
    [shopId, customerId]
  );
}

export function useCustomerSales(customerId: string | undefined) {
  const shopId = useShopId();
  return useLiveQuery<Sale>(
    () =>
      shopId && customerId
        ? query(shopCol(shopId, COL.sales), where('customerId', '==', customerId))
        : null,
    [shopId, customerId]
  );
}

export function useKhaataEntries(customerId: string | undefined) {
  const shopId = useShopId();
  return useLiveQuery<KhaataEntry>(
    () =>
      shopId && customerId
        ? query(shopCol(shopId, COL.khaataEntries), where('customerId', '==', customerId))
        : null,
    [shopId, customerId]
  );
}

export function useKhaataEntriesForMonth(month: string = thisMonthKey()) {
  const shopId = useShopId();
  return useLiveQuery<KhaataEntry>(
    () => (shopId ? query(shopCol(shopId, COL.khaataEntries), where('month', '==', month)) : null),
    [shopId, month]
  );
}

export function useCustomerPayments(customerId: string | undefined) {
  const shopId = useShopId();
  return useLiveQuery<Payment>(
    () =>
      shopId && customerId
        ? query(shopCol(shopId, COL.payments), where('customerId', '==', customerId))
        : null,
    [shopId, customerId]
  );
}

export function useInvoicesForCustomer(customerId: string | undefined) {
  const shopId = useShopId();
  return useLiveQuery<Invoice>(
    () =>
      shopId && customerId
        ? query(shopCol(shopId, COL.invoices), where('customerId', '==', customerId))
        : null,
    [shopId, customerId]
  );
}

export function useSupplierPurchases(supplierId: string | undefined) {
  const shopId = useShopId();
  return useLiveQuery<Purchase>(
    () =>
      shopId && supplierId
        ? query(shopCol(shopId, COL.purchases), where('supplierId', '==', supplierId))
        : null,
    [shopId, supplierId]
  );
}

// ── derived helpers ──────────────────────────────────────────────────────────

/** Distinct, sorted list of areas/mohallas the shop actually delivers to. */
export function useRoutes(): string[] {
  const { data } = useCustomers();
  return useMemo(() => {
    const set = new Set<string>();
    data.forEach((c) => {
      const r = c.route?.trim();
      if (r) set.add(r);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [data]);
}

export function useProductsByCategory() {
  const { data: products } = useProducts();
  const { data: categories } = useCategories();
  return useMemo(() => {
    const map = new Map<string, Product[]>();
    categories.forEach((c) => map.set(c.id, []));
    products.forEach((p) => {
      const list = map.get(p.categoryId);
      if (list) list.push(p);
      else map.set(p.categoryId, [p]);
    });
    return { map, categories, products };
  }, [products, categories]);
}

export function useLowStockProducts(): Product[] {
  const { data } = useProducts();
  return useMemo(
    () => data.filter((p) => p.active && p.trackStock && p.stock <= p.lowStockAt),
    [data]
  );
}
