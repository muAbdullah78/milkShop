import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  subDays,
} from 'date-fns';

import type { Customer } from '@/types/models';

/** Canonical day key used across Firestore: `YYYY-MM-DD` in local time. */
export function dayKey(d: Date = new Date()): string {
  return format(d, 'yyyy-MM-dd');
}

/** Canonical month key: `YYYY-MM`. */
export function monthKey(d: Date = new Date()): string {
  return format(d, 'yyyy-MM');
}

export function monthKeyOf(dayOrMonth: string): string {
  return dayOrMonth.slice(0, 7);
}

export function parseDay(key: string): Date {
  return parseISO(`${key}T00:00:00`);
}

export function parseMonth(key: string): Date {
  return parseISO(`${key}-01T00:00:00`);
}

export function todayKey(): string {
  return dayKey(new Date());
}

export function thisMonthKey(): string {
  return monthKey(new Date());
}

export function shiftMonth(key: string, delta: number): string {
  return monthKey(addMonths(parseMonth(key), delta));
}

export function shiftDay(key: string, delta: number): string {
  return dayKey(addDays(parseDay(key), delta));
}

export function monthRange(key: string): { start: string; end: string; days: number } {
  const first = parseMonth(key);
  const last = endOfMonth(first);
  return {
    start: dayKey(startOfMonth(first)),
    end: dayKey(last),
    days: last.getDate(),
  };
}

export function lastNDays(n: number, endDate: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) out.push(dayKey(subDays(endDate, i)));
  return out;
}

export function lastNMonths(n: number, end: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) out.push(monthKey(addMonths(end, -i)));
  return out;
}

export function isToday(key: string): boolean {
  return isSameDay(parseDay(key), new Date());
}

export function isFuture(key: string): boolean {
  return differenceInCalendarDays(parseDay(key), new Date()) > 0;
}

/** True when the month has already finished (safe to bill). */
export function isMonthClosed(key: string): boolean {
  return key < thisMonthKey();
}

/**
 * Does this customer expect milk on this day?
 *  - daily      → always
 *  - alternate  → every other day, anchored to the day they joined
 *  - custom     → only the weekdays they picked
 */
export function isScheduledOn(customer: Customer, key: string): boolean {
  if (!customer.active) return false;
  const date = parseDay(key);

  if (customer.schedule === 'custom') {
    if (!customer.customDays?.length) return true;
    return customer.customDays.includes(date.getDay());
  }

  if (customer.schedule === 'alternate') {
    const anchor = customer.createdAt ? new Date(customer.createdAt) : date;
    const diff = Math.abs(differenceInCalendarDays(date, anchor));
    return diff % 2 === 0;
  }

  return true;
}

/** Number of scheduled days for a customer inside a month — used for fixed billing sanity. */
export function scheduledDaysInMonth(customer: Customer, month: string): number {
  const { days } = monthRange(month);
  let count = 0;
  for (let d = 1; d <= days; d += 1) {
    const key = `${month}-${String(d).padStart(2, '0')}`;
    if (isScheduledOn(customer, key)) count += 1;
  }
  return count;
}

export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function formatDayLong(key: string, lang: 'en' | 'ur'): string {
  const d = parseDay(key);
  if (lang === 'en') return format(d, 'd MMM yyyy');
  const months = [
    'جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون',
    'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر',
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatMonthLong(key: string, lang: 'en' | 'ur'): string {
  const d = parseMonth(key);
  if (lang === 'en') return format(d, 'MMMM yyyy');
  const months = [
    'جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون',
    'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر',
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDayShort(key: string): string {
  return format(parseDay(key), 'd MMM');
}

export function greetingKey(): 'dash.greetMorning' | 'dash.greetAfternoon' | 'dash.greetEvening' {
  const h = new Date().getHours();
  if (h < 12) return 'dash.greetMorning';
  if (h < 17) return 'dash.greetAfternoon';
  return 'dash.greetEvening';
}
