import {
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type WriteBatch,
} from '@react-native-firebase/firestore';

import { db } from '@/lib/firebase';
import { dayKey, monthKeyOf } from '@/lib/dates';
import type {
  Category,
  Customer,
  KhaataEntry,
  Delivery,
  DeliveryStatus,
  Expense,
  ExpenseCategory,
  Invoice,
  Payment,
  PaymentMode,
  Product,
  Purchase,
  Sale,
  SaleItem,
  Shop,
  Supplier,
  SupplierPayment,
} from '@/types/models';
import {
  SEED_CATEGORIES,
  SEED_EXPENSE_CATEGORIES,
  SEED_PRODUCTS,
  SEED_VERSION,
} from './seed';
import {
  COL,
  deliveryId,
  invoiceId,
  shopCol,
  shopDoc,
  shopSubDoc,
  shopsCol,
  userDoc,
} from './refs';

/** Loose translate signature so seeding can accept the app's `t` without a cycle. */
type T = (key: string, params?: Record<string, string | number>) => string;

const now = () => Date.now();

function newId(shopId: string, col: (typeof COL)[keyof typeof COL]): string {
  return doc(shopCol(shopId, col)).id;
}

/** Firestore rejects `undefined`; strip it so optional fields just stay unset. */
function clean<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined) out[k] = v;
  });
  return out as T;
}

async function commitInChunks(
  ops: ((batch: WriteBatch) => void)[],
  size = 400
) {
  for (let i = 0; i < ops.length; i += size) {
    const batch = writeBatch(db());
    ops.slice(i, i + size).forEach((apply) => apply(batch));
    // eslint-disable-next-line no-await-in-loop
    await batch.commit();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shop & onboarding
// ─────────────────────────────────────────────────────────────────────────────

export const shopRepo = {
  async findForUser(uid: string): Promise<string | null> {
    const snap = await getDoc(userDoc(uid));
    const shopId = snap.exists() ? (snap.data()?.shopId as string | undefined) : undefined;
    if (shopId) return shopId;

    // Fallback: the user doc may not have been written (e.g. install wiped
    // mid-onboarding) but a shop already lists them as a member.
    const owned = await getDocs(
      query(shopsCol(), where('memberUids', 'array-contains', uid), limit(1))
    ).catch(() => null);
    const first = owned?.docs?.[0];
    if (first) {
      await setDoc(userDoc(uid), { shopId: first.id, updatedAt: now() }, { merge: true });
      return first.id;
    }
    return null;
  },

  async create(
    uid: string,
    input: {
      name: string;
      ownerName?: string;
      phone?: string;
      address?: string;
      defaultMilkRate: number;
      defaultMilkQty: number;
      email?: string;
    },
    t: T
  ): Promise<string> {
    const shopId = doc(shopsCol()).id;
    const ts = now();

    const shop: Omit<Shop, 'id'> = {
      name: input.name.trim(),
      ownerUid: uid,
      memberUids: [uid],
      ownerName: input.ownerName?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      address: input.address?.trim() || undefined,
      defaultMilkRate: input.defaultMilkRate,
      defaultMilkQty: input.defaultMilkQty,
      currency: 'PKR',
      createdAt: ts,
      updatedAt: ts,
      seedVersion: SEED_VERSION,
    };

    const batch = writeBatch(db());
    batch.set(shopDoc(shopId), clean(shop));
    batch.set(
      userDoc(uid),
      clean({
        shopId,
        name: input.ownerName?.trim() || undefined,
        email: input.email || undefined,
        createdAt: ts,
        updatedAt: ts,
      }),
      { merge: true }
    );

    // Seed catalogue -------------------------------------------------------
    const catIdByKey: Record<string, string> = {};
    SEED_CATEGORIES.forEach((c, i) => {
      const id = newId(shopId, COL.categories);
      catIdByKey[c.seedKey] = id;
      const row: Omit<Category, 'id'> = {
        name: t(c.labelKey),
        icon: c.icon,
        color: c.color,
        sortOrder: i,
        seedKey: c.seedKey,
        createdAt: ts,
      };
      batch.set(shopSubDoc(shopId, COL.categories, id), row);
    });

    SEED_PRODUCTS.forEach((p) => {
      const id = newId(shopId, COL.products);
      const row: Omit<Product, 'id'> = {
        name: t(p.labelKey),
        categoryId: catIdByKey[p.categoryKey] ?? '',
        unit: p.unit,
        salePrice: p.isMilk ? input.defaultMilkRate : p.salePrice,
        costPrice: p.costPrice,
        trackStock: p.trackStock ?? false,
        stock: 0,
        lowStockAt: p.trackStock ? 5 : 0,
        isMilk: p.isMilk ?? false,
        active: true,
        seedKey: p.seedKey,
        createdAt: ts,
        updatedAt: ts,
      };
      batch.set(shopSubDoc(shopId, COL.products, id), row);
    });

    SEED_EXPENSE_CATEGORIES.forEach((c, i) => {
      const id = newId(shopId, COL.expenseCategories);
      const row: Omit<ExpenseCategory, 'id'> = {
        name: t(c.labelKey),
        icon: c.icon,
        color: c.color,
        seedKey: c.seedKey,
        sortOrder: i,
      };
      batch.set(shopSubDoc(shopId, COL.expenseCategories, id), row);
    });

    await batch.commit();
    return shopId;
  },

  async update(shopId: string, patch: Partial<Shop>) {
    await updateDoc(shopDoc(shopId), clean({ ...patch, updatedAt: now() }) as never);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Customers
// ─────────────────────────────────────────────────────────────────────────────

export type CustomerInput = Omit<Customer, 'id' | 'balance' | 'createdAt' | 'updatedAt'> &
  Partial<Pick<Customer, 'balance'>>;

export const customerRepo = {
  async create(shopId: string, input: CustomerInput): Promise<string> {
    const id = newId(shopId, COL.customers);
    const ts = now();
    const row: Omit<Customer, 'id'> = {
      ...input,
      openingBalance: input.openingBalance || 0,
      balance: input.openingBalance || 0,
      createdAt: ts,
      updatedAt: ts,
    };
    await setDoc(shopSubDoc(shopId, COL.customers, id), clean(row));
    return id;
  },

  async update(shopId: string, id: string, patch: Partial<Customer>, prev?: Customer) {
    const next = { ...patch, updatedAt: now() } as Partial<Customer>;
    // Editing the opening balance should move the running balance by the same
    // amount, otherwise the khata silently drifts.
    if (
      prev &&
      patch.openingBalance !== undefined &&
      patch.openingBalance !== prev.openingBalance
    ) {
      const delta = patch.openingBalance - prev.openingBalance;
      await updateDoc(
        shopSubDoc(shopId, COL.customers, id),
        clean({ ...next, balance: increment(delta) }) as never
      );
      return;
    }
    await updateDoc(shopSubDoc(shopId, COL.customers, id), clean(next) as never);
  },

  async setActive(shopId: string, id: string, active: boolean) {
    await updateDoc(shopSubDoc(shopId, COL.customers, id), { active, updatedAt: now() } as never);
  },

  async remove(shopId: string, id: string) {
    // Detach history rather than orphaning it: records keep the stored name.
    await deleteDoc(shopSubDoc(shopId, COL.customers, id));
  },

  async adjustBalance(shopId: string, id: string, delta: number) {
    if (!delta) return;
    await updateDoc(shopSubDoc(shopId, COL.customers, id), {
      balance: increment(delta),
      updatedAt: now(),
    } as never);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Khaata (the credit ledger)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Opening a khaata is an explicit decision — it is the shopkeeper saying "I
 * trust this person to pay later". Nothing goes on credit before it, and the
 * date it was opened is kept because customers ask.
 */
export const khaataRepo = {
  async open(shopId: string, customerId: string) {
    await updateDoc(shopSubDoc(shopId, COL.customers, customerId), {
      khaataOpen: true,
      khaataOpenedAt: now(),
      updatedAt: now(),
    } as never);
  },

  async close(shopId: string, customerId: string) {
    await updateDoc(shopSubDoc(shopId, COL.customers, customerId), {
      khaataOpen: false,
      khaataClosedAt: now(),
      updatedAt: now(),
    } as never);
  },

  async setLimit(shopId: string, customerId: string, limit: number) {
    await updateDoc(shopSubDoc(shopId, COL.customers, customerId), {
      khaataLimit: limit > 0 ? limit : 0,
      updatedAt: now(),
    } as never);
  },

  /** Writes one line in the ledger and moves the customer's balance with it. */
  async addEntry(
    shopId: string,
    input: {
      customer: Customer;
      date: string;
      ts: number;
      kind: 'debit' | 'credit';
      title: string;
      amount: number;
      items?: KhaataEntry['items'];
      note?: string;
    }
  ): Promise<string> {
    const id = newId(shopId, COL.khaataEntries);
    const amount = round2(Math.abs(input.amount));
    const row: Omit<KhaataEntry, 'id'> = {
      date: input.date,
      month: monthKeyOf(input.date),
      ts: input.ts,
      customerId: input.customer.id,
      customerName: input.customer.name,
      kind: input.kind,
      title: input.title.trim(),
      amount,
      items: input.items?.length ? input.items : undefined,
      note: input.note?.trim() || undefined,
      createdAt: now(),
    };

    const batch = writeBatch(db());
    batch.set(shopSubDoc(shopId, COL.khaataEntries, id), clean(row));
    batch.update(shopSubDoc(shopId, COL.customers, input.customer.id), {
      balance: increment(input.kind === 'debit' ? amount : -amount),
      updatedAt: now(),
    } as never);
    await batch.commit();
    return id;
  },

  async removeEntry(shopId: string, entry: KhaataEntry) {
    const batch = writeBatch(db());
    batch.delete(shopSubDoc(shopId, COL.khaataEntries, entry.id));
    batch.update(shopSubDoc(shopId, COL.customers, entry.customerId), {
      balance: increment(entry.kind === 'debit' ? -entry.amount : entry.amount),
      updatedAt: now(),
    } as never);
    await batch.commit();
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Categories & products
// ─────────────────────────────────────────────────────────────────────────────

export const categoryRepo = {
  async create(shopId: string, input: Omit<Category, 'id' | 'createdAt'>) {
    const id = newId(shopId, COL.categories);
    await setDoc(shopSubDoc(shopId, COL.categories, id), clean({ ...input, createdAt: now() }));
    return id;
  },
  async update(shopId: string, id: string, patch: Partial<Category>) {
    await updateDoc(shopSubDoc(shopId, COL.categories, id), clean(patch) as never);
  },
  async remove(shopId: string, id: string) {
    await deleteDoc(shopSubDoc(shopId, COL.categories, id));
  },
};

export const productRepo = {
  async create(shopId: string, input: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
    const id = newId(shopId, COL.products);
    const ts = now();
    await setDoc(
      shopSubDoc(shopId, COL.products, id),
      clean({ ...input, createdAt: ts, updatedAt: ts })
    );
    return id;
  },
  async update(shopId: string, id: string, patch: Partial<Product>) {
    await updateDoc(
      shopSubDoc(shopId, COL.products, id),
      clean({ ...patch, updatedAt: now() }) as never
    );
  },
  async remove(shopId: string, id: string) {
    await deleteDoc(shopSubDoc(shopId, COL.products, id));
  },
  async addStock(shopId: string, id: string, delta: number) {
    if (!delta) return;
    await updateDoc(shopSubDoc(shopId, COL.products, id), {
      stock: increment(delta),
      updatedAt: now(),
    } as never);
  },
  async setStock(shopId: string, id: string, value: number) {
    await updateDoc(shopSubDoc(shopId, COL.products, id), {
      stock: value,
      updatedAt: now(),
    } as never);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Daily milk round
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deliveries are keyed `${date}__${customerId}` so marking the same customer
 * twice is a no-op instead of a duplicate — important because the milk round
 * is often done offline and re-synced.
 *
 * `amount` is 0 for fixed-monthly customers: their charge is the flat monthly
 * fee, posted once when the bill goes out.
 */
export const deliveryRepo = {
  async set(
    shopId: string,
    customer: Customer,
    date: string,
    opts: { qty: number; status: DeliveryStatus; note?: string }
  ) {
    const id = deliveryId(date, customer.id);
    const ref = shopSubDoc(shopId, COL.deliveries, id);
    const existingSnap = await getDoc(ref);
    const existing = existingSnap.exists() ? (existingSnap.data() as Delivery) : null;

    const qty = opts.status === 'skipped' ? 0 : Math.max(0, opts.qty);
    const rate = customer.rate;
    const amount = customer.billingType === 'daily' ? round2(qty * rate) : 0;
    const prevAmount = existing?.amount ?? 0;
    const delta = round2(amount - prevAmount);

    const row: Omit<Delivery, 'id'> = {
      date,
      month: monthKeyOf(date),
      customerId: customer.id,
      customerName: customer.name,
      route: customer.route || undefined,
      qty,
      rate,
      amount,
      status: opts.status,
      note: opts.note || undefined,
      createdAt: existing?.createdAt ?? now(),
      updatedAt: now(),
    };

    const batch = writeBatch(db());
    batch.set(ref, clean(row));
    if (delta !== 0) {
      batch.update(shopSubDoc(shopId, COL.customers, customer.id), {
        balance: increment(delta),
        updatedAt: now(),
      } as never);
    }
    await batch.commit();
  },

  async clear(shopId: string, customerId: string, date: string) {
    const ref = shopSubDoc(shopId, COL.deliveries, deliveryId(date, customerId));
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const existing = snap.data() as Delivery;

    const batch = writeBatch(db());
    batch.delete(ref);
    if (existing.amount) {
      batch.update(shopSubDoc(shopId, COL.customers, customerId), {
        balance: increment(-existing.amount),
        updatedAt: now(),
      } as never);
    }
    await batch.commit();
  },

  /** One-tap "everyone got their usual". Skips anyone already marked. */
  async markAllUsual(
    shopId: string,
    customers: Customer[],
    date: string,
    alreadyMarked: Set<string>
  ): Promise<number> {
    const ops: ((b: WriteBatch) => void)[] = [];
    const balanceDelta: Record<string, number> = {};
    let count = 0;

    customers.forEach((c) => {
      if (alreadyMarked.has(c.id)) return;
      const qty = c.defaultQty || 0;
      if (qty <= 0) return;
      const amount = c.billingType === 'daily' ? round2(qty * c.rate) : 0;
      const row: Omit<Delivery, 'id'> = {
        date,
        month: monthKeyOf(date),
        customerId: c.id,
        customerName: c.name,
        route: c.route || undefined,
        qty,
        rate: c.rate,
        amount,
        status: 'delivered',
        createdAt: now(),
        updatedAt: now(),
      };
      ops.push((b) => b.set(shopSubDoc(shopId, COL.deliveries, deliveryId(date, c.id)), clean(row)));
      if (amount) balanceDelta[c.id] = (balanceDelta[c.id] ?? 0) + amount;
      count += 1;
    });

    Object.entries(balanceDelta).forEach(([id, delta]) => {
      ops.push((b) =>
        b.update(shopSubDoc(shopId, COL.customers, id), {
          balance: increment(delta),
          updatedAt: now(),
        } as never)
      );
    });

    await commitInChunks(ops);
    return count;
  },

  /** Undo the whole day. */
  async clearDay(shopId: string, deliveries: Delivery[]) {
    const ops: ((b: WriteBatch) => void)[] = [];
    const balanceDelta: Record<string, number> = {};

    deliveries.forEach((d) => {
      ops.push((b) => b.delete(shopSubDoc(shopId, COL.deliveries, d.id)));
      if (d.amount) balanceDelta[d.customerId] = (balanceDelta[d.customerId] ?? 0) - d.amount;
    });

    Object.entries(balanceDelta).forEach(([id, delta]) => {
      if (!delta) return;
      ops.push((b) =>
        b.update(shopSubDoc(shopId, COL.customers, id), {
          balance: increment(delta),
          updatedAt: now(),
        } as never)
      );
    });

    await commitInChunks(ops);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sales
// ─────────────────────────────────────────────────────────────────────────────

export const saleRepo = {
  async create(
    shopId: string,
    input: {
      date: string;
      customerId: string | null;
      customerName?: string;
      items: SaleItem[];
      discount: number;
      paymentMode: PaymentMode;
      onCredit: boolean;
      note?: string;
    }
  ): Promise<string> {
    const id = newId(shopId, COL.sales);
    const subtotal = round2(input.items.reduce((s, i) => s + i.total, 0));
    const total = round2(Math.max(0, subtotal - (input.discount || 0)));
    const cost = round2(input.items.reduce((s, i) => s + i.costPrice * i.qty, 0));

    const row: Omit<Sale, 'id'> = {
      date: input.date,
      month: monthKeyOf(input.date),
      customerId: input.customerId,
      customerName: input.customerName || undefined,
      items: input.items,
      subtotal,
      discount: input.discount || 0,
      total,
      cost,
      paymentMode: input.onCredit ? 'credit' : input.paymentMode,
      onCredit: input.onCredit,
      note: input.note || undefined,
      createdAt: now(),
    };

    const batch = writeBatch(db());
    batch.set(shopSubDoc(shopId, COL.sales, id), clean(row));

    input.items.forEach((item) => {
      if (!item.productId) return;
      batch.update(shopSubDoc(shopId, COL.products, item.productId), {
        stock: increment(-item.qty),
        updatedAt: now(),
      } as never);
    });

    if (input.onCredit && input.customerId) {
      batch.update(shopSubDoc(shopId, COL.customers, input.customerId), {
        balance: increment(total),
        updatedAt: now(),
      } as never);
    }

    await batch.commit();
    return id;
  },

  async remove(shopId: string, sale: Sale, restoreStock = true) {
    const batch = writeBatch(db());
    batch.delete(shopSubDoc(shopId, COL.sales, sale.id));

    if (restoreStock) {
      sale.items.forEach((item) => {
        if (!item.productId) return;
        batch.update(shopSubDoc(shopId, COL.products, item.productId), {
          stock: increment(item.qty),
          updatedAt: now(),
        } as never);
      });
    }

    if (sale.onCredit && sale.customerId) {
      batch.update(shopSubDoc(shopId, COL.customers, sale.customerId), {
        balance: increment(-sale.total),
        updatedAt: now(),
      } as never);
    }

    await batch.commit();
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Payments
// ─────────────────────────────────────────────────────────────────────────────

export const paymentRepo = {
  async create(
    shopId: string,
    input: { date: string; customer: Customer; amount: number; mode: PaymentMode; note?: string }
  ): Promise<string> {
    const id = newId(shopId, COL.payments);
    const amount = round2(input.amount);
    const row: Omit<Payment, 'id'> = {
      date: input.date,
      month: monthKeyOf(input.date),
      customerId: input.customer.id,
      customerName: input.customer.name,
      amount,
      mode: input.mode,
      note: input.note || undefined,
      createdAt: now(),
    };

    const batch = writeBatch(db());
    batch.set(shopSubDoc(shopId, COL.payments, id), clean(row));
    batch.update(shopSubDoc(shopId, COL.customers, input.customer.id), {
      balance: increment(-amount),
      updatedAt: now(),
    } as never);
    await batch.commit();
    return id;
  },

  async remove(shopId: string, payment: Payment) {
    const batch = writeBatch(db());
    batch.delete(shopSubDoc(shopId, COL.payments, payment.id));
    batch.update(shopSubDoc(shopId, COL.customers, payment.customerId), {
      balance: increment(payment.amount),
      updatedAt: now(),
    } as never);
    await batch.commit();
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Expenses
// ─────────────────────────────────────────────────────────────────────────────

export const expenseRepo = {
  async create(shopId: string, input: Omit<Expense, 'id' | 'month' | 'createdAt'>) {
    const id = newId(shopId, COL.expenses);
    await setDoc(
      shopSubDoc(shopId, COL.expenses, id),
      clean({ ...input, month: monthKeyOf(input.date), createdAt: now() })
    );
    return id;
  },
  async update(shopId: string, id: string, patch: Partial<Expense>) {
    const next = { ...patch };
    if (patch.date) next.month = monthKeyOf(patch.date);
    await updateDoc(shopSubDoc(shopId, COL.expenses, id), clean(next) as never);
  },
  async remove(shopId: string, id: string) {
    await deleteDoc(shopSubDoc(shopId, COL.expenses, id));
  },
};

export const expenseCategoryRepo = {
  async create(shopId: string, input: Omit<ExpenseCategory, 'id'>) {
    const id = newId(shopId, COL.expenseCategories);
    await setDoc(shopSubDoc(shopId, COL.expenseCategories, id), clean(input));
    return id;
  },
  async update(shopId: string, id: string, patch: Partial<ExpenseCategory>) {
    await updateDoc(shopSubDoc(shopId, COL.expenseCategories, id), clean(patch) as never);
  },
  async remove(shopId: string, id: string) {
    await deleteDoc(shopSubDoc(shopId, COL.expenseCategories, id));
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Suppliers & purchases
// ─────────────────────────────────────────────────────────────────────────────

export const supplierRepo = {
  async create(shopId: string, input: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt' | 'balance'>) {
    const id = newId(shopId, COL.suppliers);
    const ts = now();
    await setDoc(
      shopSubDoc(shopId, COL.suppliers, id),
      clean({ ...input, balance: 0, createdAt: ts, updatedAt: ts })
    );
    return id;
  },
  async update(shopId: string, id: string, patch: Partial<Supplier>) {
    await updateDoc(
      shopSubDoc(shopId, COL.suppliers, id),
      clean({ ...patch, updatedAt: now() }) as never
    );
  },
  async remove(shopId: string, id: string) {
    await deleteDoc(shopSubDoc(shopId, COL.suppliers, id));
  },
};

export const purchaseRepo = {
  async create(
    shopId: string,
    input: {
      date: string;
      supplierId: string | null;
      supplierName?: string;
      productId: string | null;
      title: string;
      qty: number;
      unit: Purchase['unit'];
      rate: number;
      paid: number;
      addToStock: boolean;
      note?: string;
    }
  ) {
    const id = newId(shopId, COL.purchases);
    const amount = round2(input.qty * input.rate);
    const paid = round2(Math.min(input.paid, amount));

    const row: Omit<Purchase, 'id'> = {
      date: input.date,
      month: monthKeyOf(input.date),
      supplierId: input.supplierId,
      supplierName: input.supplierName || undefined,
      productId: input.productId,
      title: input.title,
      qty: input.qty,
      unit: input.unit,
      rate: input.rate,
      amount,
      paid,
      addedToStock: input.addToStock,
      note: input.note || undefined,
      createdAt: now(),
    };

    const batch = writeBatch(db());
    batch.set(shopSubDoc(shopId, COL.purchases, id), clean(row));

    if (input.supplierId && amount - paid !== 0) {
      batch.update(shopSubDoc(shopId, COL.suppliers, input.supplierId), {
        balance: increment(round2(amount - paid)),
        updatedAt: now(),
      } as never);
    }
    if (input.addToStock && input.productId) {
      batch.update(shopSubDoc(shopId, COL.products, input.productId), {
        stock: increment(input.qty),
        updatedAt: now(),
      } as never);
    }

    await batch.commit();
    return id;
  },

  async remove(shopId: string, purchase: Purchase) {
    const batch = writeBatch(db());
    batch.delete(shopSubDoc(shopId, COL.purchases, purchase.id));
    const owed = round2(purchase.amount - purchase.paid);
    if (purchase.supplierId && owed !== 0) {
      batch.update(shopSubDoc(shopId, COL.suppliers, purchase.supplierId), {
        balance: increment(-owed),
        updatedAt: now(),
      } as never);
    }
    if (purchase.addedToStock && purchase.productId) {
      batch.update(shopSubDoc(shopId, COL.products, purchase.productId), {
        stock: increment(-purchase.qty),
        updatedAt: now(),
      } as never);
    }
    await batch.commit();
  },
};

export const supplierPaymentRepo = {
  async create(
    shopId: string,
    input: { date: string; supplier: Supplier; amount: number; mode: PaymentMode; note?: string }
  ) {
    const id = newId(shopId, COL.supplierPayments);
    const amount = round2(input.amount);
    const row: Omit<SupplierPayment, 'id'> = {
      date: input.date,
      month: monthKeyOf(input.date),
      supplierId: input.supplier.id,
      supplierName: input.supplier.name,
      amount,
      mode: input.mode,
      note: input.note || undefined,
      createdAt: now(),
    };
    const batch = writeBatch(db());
    batch.set(shopSubDoc(shopId, COL.supplierPayments, id), clean(row));
    batch.update(shopSubDoc(shopId, COL.suppliers, input.supplier.id), {
      balance: increment(-amount),
      updatedAt: now(),
    } as never);
    await batch.commit();
    return id;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Invoices
// ─────────────────────────────────────────────────────────────────────────────

export const invoiceRepo = {
  /**
   * Records that a bill went out. For fixed-monthly customers this is also the
   * moment the flat charge is posted to their balance — doing it here (rather
   * than on a timer) keeps it idempotent and offline-safe.
   */
  async markSent(
    shopId: string,
    input: {
      month: string;
      customer: Customer;
      milkQty: number;
      milkAmount: number;
      milkDays: number;
      itemsAmount: number;
      previousBalance: number;
      paidInMonth: number;
      total: number;
      postFixedCharge: number;
    }
  ) {
    const id = invoiceId(input.month, input.customer.id);
    const ref = shopSubDoc(shopId, COL.invoices, id);
    const existing = await getDoc(ref);
    const alreadyPosted = existing.exists() ? Boolean(existing.data()?.chargePosted) : false;

    const row: Omit<Invoice, 'id'> = {
      month: input.month,
      customerId: input.customer.id,
      customerName: input.customer.name,
      milkQty: input.milkQty,
      milkAmount: input.milkAmount,
      milkDays: input.milkDays,
      itemsAmount: input.itemsAmount,
      previousBalance: input.previousBalance,
      paidInMonth: input.paidInMonth,
      total: input.total,
      status: 'sent',
      sentAt: now(),
      createdAt: existing.exists() ? (existing.data()?.createdAt as number) : now(),
      updatedAt: now(),
      chargePosted: alreadyPosted || input.postFixedCharge > 0,
      chargeAmount: alreadyPosted
        ? ((existing.data()?.chargeAmount as number | undefined) ?? 0)
        : input.postFixedCharge,
    };

    const batch = writeBatch(db());
    batch.set(ref, clean(row), { merge: true });
    if (!alreadyPosted && input.postFixedCharge > 0) {
      batch.update(shopSubDoc(shopId, COL.customers, input.customer.id), {
        balance: increment(input.postFixedCharge),
        updatedAt: now(),
      } as never);
    }
    await batch.commit();
  },

  async unmarkSent(shopId: string, month: string, customerId: string) {
    await updateDoc(shopSubDoc(shopId, COL.invoices, invoiceId(month, customerId)), {
      status: 'draft',
      updatedAt: now(),
    } as never);
  },
};

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export { dayKey };
