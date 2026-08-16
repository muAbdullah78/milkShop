import { swatches } from '@/theme/colors';
import type { TranslationKey } from '@/i18n';
import type { Unit } from '@/types/models';

export const SEED_VERSION = 1;

export type SeedCategory = {
  seedKey: string;
  labelKey: TranslationKey;
  icon: string;
  color: string;
};

export const SEED_CATEGORIES: SeedCategory[] = [
  { seedKey: 'milk', labelKey: 'seed.catMilk', icon: 'cup', color: swatches.blue },
  { seedKey: 'eggs', labelKey: 'seed.catEggs', icon: 'egg', color: swatches.amber },
  { seedKey: 'dairy', labelKey: 'seed.catDairy', icon: 'cheese', color: swatches.teal },
  { seedKey: 'bakery', labelKey: 'seed.catBakery', icon: 'bread-slice', color: swatches.brown },
  { seedKey: 'drinks', labelKey: 'seed.catDrinks', icon: 'bottle-soda-classic', color: swatches.cyan },
  { seedKey: 'other', labelKey: 'seed.catOther', icon: 'shape', color: swatches.slate },
];

export type SeedProduct = {
  seedKey: string;
  labelKey: TranslationKey;
  categoryKey: string;
  unit: Unit;
  salePrice: number;
  costPrice: number;
  isMilk?: boolean;
  trackStock?: boolean;
};

/**
 * Starter catalogue with rough Pakistani retail prices so a shop is usable in
 * the first minute. Everything is editable — these are only defaults.
 */
export const SEED_PRODUCTS: SeedProduct[] = [
  {
    seedKey: 'milk',
    labelKey: 'seed.prodMilk',
    categoryKey: 'milk',
    unit: 'litre',
    salePrice: 220,
    costPrice: 180,
    isMilk: true,
  },
  { seedKey: 'eggs', labelKey: 'seed.prodEggs', categoryKey: 'eggs', unit: 'dozen', salePrice: 350, costPrice: 300, trackStock: true },
  { seedKey: 'desi_eggs', labelKey: 'seed.prodDesiEggs', categoryKey: 'eggs', unit: 'dozen', salePrice: 550, costPrice: 470, trackStock: true },
  { seedKey: 'yogurt', labelKey: 'seed.prodYogurt', categoryKey: 'dairy', unit: 'kg', salePrice: 240, costPrice: 190 },
  { seedKey: 'butter', labelKey: 'seed.prodButter', categoryKey: 'dairy', unit: 'kg', salePrice: 1400, costPrice: 1150 },
  { seedKey: 'cream', labelKey: 'seed.prodCream', categoryKey: 'dairy', unit: 'kg', salePrice: 700, costPrice: 560 },
  { seedKey: 'ghee', labelKey: 'seed.prodGhee', categoryKey: 'dairy', unit: 'kg', salePrice: 3200, costPrice: 2700, trackStock: true },
  { seedKey: 'cheese', labelKey: 'seed.prodCheese', categoryKey: 'dairy', unit: 'kg', salePrice: 1200, costPrice: 980 },
  { seedKey: 'lassi', labelKey: 'seed.prodLassi', categoryKey: 'drinks', unit: 'bottle', salePrice: 120, costPrice: 85 },
  { seedKey: 'bread', labelKey: 'seed.prodBread', categoryKey: 'bakery', unit: 'piece', salePrice: 150, costPrice: 130, trackStock: true },
];

export type SeedExpenseCategory = {
  seedKey: string;
  labelKey: TranslationKey;
  icon: string;
  color: string;
};

export const SEED_EXPENSE_CATEGORIES: SeedExpenseCategory[] = [
  { seedKey: 'milk_buy', labelKey: 'exp.catMilkBuy', icon: 'truck-delivery', color: swatches.blue },
  { seedKey: 'feed', labelKey: 'exp.catFeed', icon: 'cow', color: swatches.lime },
  { seedKey: 'fuel', labelKey: 'exp.catFuel', icon: 'gas-station', color: swatches.orange },
  { seedKey: 'rent', labelKey: 'exp.catRent', icon: 'home-city', color: swatches.purple },
  { seedKey: 'salary', labelKey: 'exp.catSalary', icon: 'account-cash', color: swatches.teal },
  { seedKey: 'electricity', labelKey: 'exp.catElectricity', icon: 'flash', color: swatches.amber },
  { seedKey: 'transport', labelKey: 'exp.catTransport', icon: 'motorbike', color: swatches.cyan },
  { seedKey: 'repair', labelKey: 'exp.catRepair', icon: 'wrench', color: swatches.slate },
  { seedKey: 'packing', labelKey: 'exp.catPacking', icon: 'package-variant', color: swatches.brown },
  { seedKey: 'other', labelKey: 'exp.catOther', icon: 'dots-horizontal-circle', color: swatches.slate },
];

/** Icons offered when the shopkeeper makes their own category. */
export const CATEGORY_ICONS = [
  'cup', 'egg', 'cheese', 'bread-slice', 'bottle-soda-classic', 'ice-cream',
  'cow', 'food-drumstick', 'fish', 'fruit-watermelon', 'carrot', 'rice',
  'coffee', 'tea', 'cookie', 'cake-variant', 'candy', 'water',
  'basket', 'cart', 'store', 'package-variant', 'silverware-fork-knife', 'leaf',
  'flower', 'spray-bottle', 'soap', 'broom', 'shopping', 'tag',
  'gas-station', 'motorbike', 'truck-delivery', 'home-city', 'account-cash', 'flash',
  'wrench', 'shape', 'star', 'heart', 'gift', 'dots-horizontal-circle',
];
