export type Unit = 'litre' | 'kg' | 'gram' | 'dozen' | 'piece' | 'packet' | 'bottle';

export const UNITS: Unit[] = ['litre', 'kg', 'gram', 'dozen', 'piece', 'packet', 'bottle'];

export type PaymentMode = 'cash' | 'easypaisa' | 'jazzcash' | 'bank' | 'credit';

export const PAYMENT_MODES: PaymentMode[] = ['cash', 'easypaisa', 'jazzcash', 'bank'];

export type BillingType = 'daily' | 'monthly';

export type DeliverySchedule = 'daily' | 'alternate' | 'custom';

export type DeliveryStatus = 'delivered' | 'skipped';

/** Documents live under `shops/{shopId}/…` — every record carries its own id. */
export type WithId = { id: string };

// Billing fields are defined in the subscription engine so the pure, tested
// module stays the single source of truth for their shape.
import type { ShopBilling } from '@/features/subscription';
export type { ShopBilling };

/**
 * A shop.
 *
 * Note it extends `ShopBilling`. The subscription gate lives on this document
 * rather than in its own collection because the Firestore rules already read
 * the shop to check membership — putting the paywall here makes gating every
 * write in the app cost zero extra document reads. The full billing history
 * lives in `subscriptions/{shopId}`, which shop members can read but never
 * write.
 */
export type Shop = WithId &
  ShopBilling & {
    name: string;
    ownerUid: string;
    memberUids: string[];
    ownerName?: string;
    phone?: string;
    address?: string;
    logoUri?: string;
    defaultMilkRate: number;
    defaultMilkQty: number;
    currency: 'PKR';
    createdAt: number;
    updatedAt: number;
    /** Bumped by the app whenever the seeded catalogue schema changes. */
    seedVersion?: number;
    /** Set by an admin from the console. Blocks the app for this shop only. */
    suspended?: boolean;
    suspensionReason?: string;
    /** Only ever visible to admins. */
    adminNote?: string;
  };

export type Customer = WithId & {
  name: string;
  phone?: string;
  address?: string;
  route?: string;
  billingType: BillingType;
  /** Litres delivered on a normal day. */
  defaultQty: number;
  /** Per-litre price for this customer. */
  rate: number;
  /** Flat charge when `billingType === 'monthly'`. */
  monthlyAmount: number;
  schedule: DeliverySchedule;
  /** 0 = Sunday … 6 = Saturday. Only meaningful for `schedule === 'custom'`. */
  customDays: number[];
  openingBalance: number;
  /** Cached running balance: positive = customer owes the shop. */
  balance: number;
  /**
   * Whether this customer has an open khaata (ledger). Nothing can go on
   * credit until the shopkeeper opens one — that is the deliberate moment
   * where they decide to trust someone.
   *
   * Undefined on records written before khaatas existed, which are treated
   * as open so no history is stranded.
   */
  khaataOpen?: boolean;
  khaataOpenedAt?: number;
  khaataClosedAt?: number;
  /** Optional ceiling; the app warns past it but never blocks a sale. */
  khaataLimit?: number;
  khaataNote?: string;
  active: boolean;
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

export type Category = WithId & {
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
  /** Seeded rows can be renamed but are recreated for new shops. */
  seedKey?: string;
  createdAt: number;
};

export type Product = WithId & {
  name: string;
  categoryId: string;
  unit: Unit;
  salePrice: number;
  costPrice: number;
  trackStock: boolean;
  stock: number;
  lowStockAt: number;
  /** The one product that the daily milk round writes against. */
  isMilk: boolean;
  active: boolean;
  seedKey?: string;
  createdAt: number;
  updatedAt: number;
};

export type Delivery = WithId & {
  /** `YYYY-MM-DD` in the shop's local time. */
  date: string;
  /** `YYYY-MM`, denormalised so month queries need no range scan. */
  month: string;
  customerId: string;
  customerName: string;
  route?: string;
  qty: number;
  rate: number;
  amount: number;
  status: DeliveryStatus;
  note?: string;
  createdAt: number;
  updatedAt: number;
};

export type SaleItem = {
  productId: string;
  name: string;
  unit: Unit;
  qty: number;
  price: number;
  costPrice: number;
  total: number;
};

export type Sale = WithId & {
  date: string;
  month: string;
  /** null = walk-in counter sale. */
  customerId: string | null;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  cost: number;
  paymentMode: PaymentMode;
  /** true when it went on the customer's khata instead of being paid now. */
  onCredit: boolean;
  note?: string;
  createdAt: number;
};

export type Payment = WithId & {
  date: string;
  month: string;
  customerId: string;
  customerName: string;
  amount: number;
  mode: PaymentMode;
  note?: string;
  createdAt: number;
};

export type ExpenseCategory = WithId & {
  name: string;
  icon: string;
  color: string;
  seedKey?: string;
  sortOrder: number;
};

export type Expense = WithId & {
  date: string;
  month: string;
  categoryId: string;
  categoryName: string;
  title: string;
  amount: number;
  note?: string;
  createdAt: number;
};

export type Supplier = WithId & {
  name: string;
  phone?: string;
  address?: string;
  /** Positive = the shop owes the supplier. */
  balance: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

export type Purchase = WithId & {
  date: string;
  month: string;
  supplierId: string | null;
  supplierName?: string;
  productId: string | null;
  title: string;
  qty: number;
  unit: Unit;
  rate: number;
  amount: number;
  paid: number;
  addedToStock: boolean;
  note?: string;
  createdAt: number;
};

export type SupplierPayment = WithId & {
  date: string;
  month: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  mode: PaymentMode;
  note?: string;
  createdAt: number;
};

/**
 * A hand-written line in the khaata: "took 2 dozen eggs, Rs 700".
 *
 * Milk deliveries, credit sales and payments already produce their own
 * records and show up in the ledger automatically — this type is for the
 * everyday case of a customer picking something up off the counter that the
 * shopkeeper just wants written down, exactly like the paper book.
 */
export type KhaataEntry = WithId & {
  date: string;
  month: string;
  /** Exact moment it happened — the ledger shows the time of day. */
  ts: number;
  customerId: string;
  customerName: string;
  /** `debit` = they took something. `credit` = a discount or a correction. */
  kind: 'debit' | 'credit';
  title: string;
  amount: number;
  /** Optional itemisation when picked from the catalogue. */
  items?: { name: string; qty: number; unit: Unit; price: number }[];
  note?: string;
  createdAt: number;
};

/** One row of the merged khaata ledger, newest first in the UI. */
export type LedgerRow = {
  id: string;
  ts: number;
  date: string;
  source: 'opening' | 'milk' | 'sale' | 'khaata' | 'payment' | 'monthly';
  title: string;
  subtitle?: string;
  /** Positive = they owe more. Negative = they owe less. */
  delta: number;
  /** What they owed immediately after this row. */
  balanceAfter: number;
  refId?: string;
};

export type InvoiceStatus = 'draft' | 'sent' | 'paid';

export type Invoice = WithId & {
  /** `YYYY-MM` */
  month: string;
  customerId: string;
  customerName: string;
  milkQty: number;
  milkAmount: number;
  milkDays: number;
  itemsAmount: number;
  previousBalance: number;
  paidInMonth: number;
  total: number;
  status: InvoiceStatus;
  /**
   * True once a fixed-monthly customer's flat charge has been added to their
   * running balance. Guarantees the charge is posted exactly once per month.
   */
  chargePosted?: boolean;
  /** The exact amount posted, frozen at posting time. */
  chargeAmount?: number;
  chargePostedAt?: number;
  sentAt?: number;
  createdAt: number;
  updatedAt: number;
};

/** Fully computed bill, built on the fly from the month's records. */
export type BillSummary = {
  customer: Customer;
  month: string;
  milkQty: number;
  milkAmount: number;
  milkDays: number;
  avgQty: number;
  fixedAmount: number;
  itemsAmount: number;
  itemLines: { name: string; qty: number; unit: Unit; total: number }[];
  previousBalance: number;
  paidInMonth: number;
  monthCharges: number;
  total: number;
  deliveries: Delivery[];
  status: InvoiceStatus;
  invoiceId?: string;
};
