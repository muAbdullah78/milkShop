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
