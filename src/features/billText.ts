import { formatDayShort, formatMonthLong } from '@/lib/dates';
import type { BillSummary, Payment, Shop } from '@/types/models';
import type { Lang } from '@/theme/fonts';

export type MsgCtx = {
  lang: Lang;
  t: (key: never, params?: Record<string, string | number>) => string;
  money: (v: number) => string;
  qty: (v: number) => string;
  shop: Shop | null;
};

const LINE = '━━━━━━━━━━━━━━━';

function header(ctx: MsgCtx): string {
  const name = ctx.shop?.name?.trim();
  return name ? `*${name}*` : `*${ctx.lang === 'ur' ? 'ملک بک' : 'MilkBook'}*`;
}

function footer(ctx: MsgCtx): string {
  const bits: string[] = [];
  const phone = ctx.shop?.phone?.trim();
  if (phone) bits.push(phone);
  return bits.join('\n');
}

/**
 * The monthly bill as a WhatsApp message.
 *
 * Deliberately plain text: it renders identically on every phone, costs
 * nothing on 2G, and the customer can read it without opening an attachment.
 */
export function buildBillMessage(bill: BillSummary, ctx: MsgCtx): string {
  const ur = ctx.lang === 'ur';
  const lines: string[] = [];

  lines.push(header(ctx));
  lines.push(ur ? `${formatMonthLong(bill.month, 'ur')} کا بل` : `Bill for ${formatMonthLong(bill.month, 'en')}`);
  lines.push('');
  lines.push(`*${bill.customer.name}*`);
  lines.push('');

  if (bill.customer.billingType === 'monthly') {
    lines.push(
      ur
        ? `ماہانہ دودھ: ${ctx.money(bill.fixedAmount)}`
        : `Monthly milk: ${ctx.money(bill.fixedAmount)}`
    );
    if (bill.milkQty > 0) {
      lines.push(
        ur
          ? `  (${ctx.qty(bill.milkQty)} لیٹر، ${bill.milkDays} دن)`
          : `  (${ctx.qty(bill.milkQty)} L over ${bill.milkDays} days)`
      );
    }
  } else if (bill.milkQty > 0) {
    lines.push(
      ur
        ? `دودھ: ${ctx.qty(bill.milkQty)} لیٹر × ${ctx.money(bill.customer.rate)} = ${ctx.money(bill.milkAmount)}`
        : `Milk: ${ctx.qty(bill.milkQty)} L × ${ctx.money(bill.customer.rate)} = ${ctx.money(bill.milkAmount)}`
    );
    lines.push(
      ur
        ? `  (${bill.milkDays} دن، روزانہ ${ctx.qty(bill.avgQty)} لیٹر)`
        : `  (${bill.milkDays} days, ${ctx.qty(bill.avgQty)} L per day)`
    );
  }

  if (bill.itemLines.length > 0) {
    lines.push('');
    lines.push(ur ? 'دیگر چیزیں:' : 'Other items:');
    bill.itemLines.forEach((l) => {
      lines.push(`  • ${l.name} × ${ctx.qty(l.qty)} = ${ctx.money(l.total)}`);
    });
  }

  lines.push('');
  if (Math.abs(bill.previousBalance) >= 1) {
    lines.push(
      ur ? `پرانا بقایا: ${ctx.money(bill.previousBalance)}` : `Old balance: ${ctx.money(bill.previousBalance)}`
    );
  }
  if (bill.paidInMonth > 0) {
    lines.push(
      ur
        ? `اس مہینے ادا کیا: −${ctx.money(bill.paidInMonth)}`
        : `Paid this month: −${ctx.money(bill.paidInMonth)}`
    );
  }

  lines.push(LINE);
  if (bill.total <= 0) {
    lines.push(ur ? '*کچھ دینا باقی نہیں — شکریہ!*' : '*Nothing to pay — thank you!*');
  } else {
    lines.push(
      ur ? `*کل واجب الادا: ${ctx.money(bill.total)}*` : `*Total to Pay: ${ctx.money(bill.total)}*`
    );
  }
  lines.push('');
  lines.push(ur ? 'آپ کا بہت شکریہ۔' : 'Thank you for your business.');

  const f = footer(ctx);
  if (f) {
    lines.push('');
    lines.push(f);
  }

  return lines.join('\n');
}

/** Short nudge for someone who has not paid yet. */
export function buildReminderMessage(bill: BillSummary, ctx: MsgCtx): string {
  const ur = ctx.lang === 'ur';
  const lines = [
    header(ctx),
    '',
    `${ur ? 'محترم' : 'Dear'} ${bill.customer.name},`,
    ur
      ? `${formatMonthLong(bill.month, 'ur')} تک آپ کا بقایا *${ctx.money(bill.total)}* ہے۔`
      : `Your balance up to ${formatMonthLong(bill.month, 'en')} is *${ctx.money(bill.total)}*.`,
    '',
    ur ? 'برائے مہربانی ادائیگی کر دیں۔ شکریہ۔' : 'Please clear it when convenient. Thank you.',
  ];
  const f = footer(ctx);
  if (f) lines.push('', f);
  return lines.join('\n');
}

/** Receipt sent right after taking cash. */
export function buildPaymentThanksMessage(
  payment: Pick<Payment, 'amount' | 'date' | 'customerName'>,
  balanceAfter: number,
  ctx: MsgCtx
): string {
  const ur = ctx.lang === 'ur';
  const lines = [
    header(ctx),
    '',
    `${payment.customerName}`,
    ur
      ? `${formatDayShort(payment.date)} — *${ctx.money(payment.amount)}* وصول ہوئے۔ شکریہ!`
      : `${formatDayShort(payment.date)} — Received *${ctx.money(payment.amount)}*. Thank you!`,
  ];
  if (balanceAfter > 0) {
    lines.push(ur ? `باقی بقایا: ${ctx.money(balanceAfter)}` : `Remaining balance: ${ctx.money(balanceAfter)}`);
  } else {
    lines.push(ur ? 'آپ کا حساب صاف ہے۔' : 'Your account is clear.');
  }
  const f = footer(ctx);
  if (f) lines.push('', f);
  return lines.join('\n');
}
