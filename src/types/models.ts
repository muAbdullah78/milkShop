export type Unit = 'litre' | 'kg' | 'gram' | 'dozen' | 'piece' | 'packet' | 'bottle';

export const UNITS: Unit[] = ['litre', 'kg', 'gram', 'dozen', 'piece', 'packet', 'bottle'];

export type PaymentMode = 'cash' | 'easypaisa' | 'jazzcash' | 'bank' | 'credit';

export const PAYMENT_MODES: PaymentMode[] = ['cash', 'easypaisa', 'jazzcash', 'bank'];

export type BillingType = 'daily' | 'monthly';

export type DeliverySchedule = 'daily' | 'alternate' | 'custom';

export type DeliveryStatus = 'delivered' | 'skipped';

/** Documents live under `shops/{shopId}/…` — every record carries its own id. */
export type WithId = { id: string };

export type Shop = WithId & {
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
