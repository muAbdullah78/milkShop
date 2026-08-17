import { collection, doc } from '@react-native-firebase/firestore';

import { db } from '@/lib/firebase';

export const COL = {
  customers: 'customers',
  categories: 'categories',
  products: 'products',
  deliveries: 'deliveries',
  sales: 'sales',
  payments: 'payments',
  expenses: 'expenses',
  expenseCategories: 'expenseCategories',
  suppliers: 'suppliers',
  purchases: 'purchases',
  supplierPayments: 'supplierPayments',
  invoices: 'invoices',
  khaataEntries: 'khaataEntries',
} as const;

export type ColName = (typeof COL)[keyof typeof COL];

export function usersCol() {
  return collection(db(), 'users');
}

export function userDoc(uid: string) {
  return doc(db(), 'users', uid);
}

export function shopsCol() {
  return collection(db(), 'shops');
}

/**
 * One free trial per account, for ever.
 *
 * Create-once and immutable in the security rules — the user writes it, and
 * from then on neither they nor the app can change or remove it. Deleting the
 * shop and starting again finds this still sitting here.
 */
export function trialClaimDoc(uid: string) {
  return doc(db(), 'trialClaims', uid);
}

/** The billing record an admin maintains. Readable by the shop, never writable. */
export function subscriptionDoc(shopId: string) {
  return doc(db(), 'subscriptions', shopId);
}

export function subscriptionPaymentsCol(shopId: string) {
  return collection(db(), 'subscriptions', shopId, 'payments');
}

/** "I paid by JazzCash, here is the transaction id" — an inbox, not a door. */
export function paymentClaimsCol() {
  return collection(db(), 'paymentClaims');
}

export function discountDoc(code: string) {
  return doc(db(), 'discounts', code.trim().toUpperCase());
}

export function shopDoc(shopId: string) {
  return doc(db(), 'shops', shopId);
}

export function shopCol(shopId: string, name: ColName) {
  return collection(db(), 'shops', shopId, name);
}

export function shopSubDoc(shopId: string, name: ColName, id: string) {
  return doc(db(), 'shops', shopId, name, id);
}

/** Deterministic ids keep writes idempotent and offline-safe. */
export function deliveryId(date: string, customerId: string) {
  return `${date}__${customerId}`;
}

export function invoiceId(month: string, customerId: string) {
  return `${month}__${customerId}`;
}
