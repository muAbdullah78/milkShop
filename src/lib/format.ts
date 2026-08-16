import type { Lang } from '@/theme/fonts';

const URDU_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export type FormatOpts = {
  lang: Lang;
  urduDigits: boolean;
};

/** Convert 0-9 in a string to Urdu digits (only when the shopkeeper asked for it). */
export function localizeDigits(input: string, urduDigits: boolean): string {
  if (!urduDigits) return input;
  return input.replace(/[0-9]/g, (d) => URDU_DIGITS[Number(d)]);
}

function groupPk(value: number, fractionDigits = 0): string {
  // Pakistani shops read plain thousands grouping (1,250) far more easily than
  // the lakh/crore grouping, so we keep Western grouping everywhere.
  const fixed = Math.abs(value).toFixed(fractionDigits);
  const [intPart, frac] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${grouped}.${frac}` : grouped;
}

/** `1,250` / `۱,۲۵۰` */
export function formatNumber(value: number, o: FormatOpts, fractionDigits = 0): string {
  const sign = value < 0 ? '-' : '';
  return localizeDigits(sign + groupPk(value, fractionDigits), o.urduDigits);
}

/** Money with the right currency word for the language. `Rs 1,250` / `1,250 روپے` */
export function formatMoney(value: number, o: FormatOpts, opts?: { compact?: boolean }): string {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  const hasPaisa = Math.abs(rounded % 1) > 0.004;
  const n = formatNumber(rounded, o, hasPaisa ? 2 : 0);

  if (opts?.compact) return n;
  return o.lang === 'ur' ? `${n} روپے` : `Rs ${n}`;
}

/** Short money for tight tiles: 12.4k / 1.2M */
export function formatMoneyShort(value: number, o: FormatOpts): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  let body: string;
  if (abs >= 10_000_000) body = `${(abs / 10_000_000).toFixed(abs % 10_000_000 === 0 ? 0 : 1)}Cr`;
  else if (abs >= 100_000) body = `${(abs / 100_000).toFixed(abs % 100_000 === 0 ? 0 : 1)}L`;
  else if (abs >= 1_000) body = `${(abs / 1_000).toFixed(abs % 1_000 === 0 ? 0 : 1)}k`;
  else return formatMoney(value, o, { compact: true });
  return localizeDigits(sign + body, o.urduDigits);
}

/** Quantities: keeps 0.5 / 1.25 readable, drops pointless trailing zeros. */
export function formatQty(value: number, o: FormatOpts): string {
  const rounded = Math.round((value + Number.EPSILON) * 1000) / 1000;
  const sign = rounded < 0 ? '-' : '';
  // Trim in Latin digits first — the trailing-zero regex cannot see ۰۱۲۳.
  const trimmed = groupPk(rounded, 3).replace(/\.?0+$/, '');
  return localizeDigits(sign + (trimmed || '0'), o.urduDigits);
}

export function formatPercent(value: number, o: FormatOpts): string {
  return `${localizeDigits(value.toFixed(0), o.urduDigits)}%`;
}

/** Normalises a Pakistani number to E.164 for wa.me links. */
export function toWhatsAppNumber(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, '');
  if (!digits) return null;

  let n = digits.replace(/^\+/, '');
  if (n.startsWith('0092')) n = n.slice(4);
  else if (n.startsWith('92')) n = n.slice(2);
  else if (n.startsWith('0')) n = n.slice(1);

  // Pakistani mobile numbers are 10 digits after the country code (3XXXXXXXXX).
  if (n.length < 9 || n.length > 12) return null;
  return `92${n}`;
}

/** Pretty local display: 0300 1234567 */
export function formatPhone(raw: string | undefined | null, o?: FormatOpts): string {
  if (!raw) return '';
  const e164 = toWhatsAppNumber(raw);
  if (!e164) return raw;
  const local = `0${e164.slice(2)}`;
  const pretty = local.length === 11 ? `${local.slice(0, 4)} ${local.slice(4)}` : local;
  return o ? localizeDigits(pretty, o.urduDigits) : pretty;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Clamp + parse user-typed numbers, tolerating Urdu digits and stray spaces. */
export function parseNumberInput(text: string): number {
  if (!text) return 0;
  let normalized = text.trim();
  URDU_DIGITS.forEach((d, i) => {
    normalized = normalized.split(d).join(String(i));
  });
  // Arabic-Indic digits too, in case a keyboard emits them.
  const arabicIndic = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  arabicIndic.forEach((d, i) => {
    normalized = normalized.split(d).join(String(i));
  });
  normalized = normalized.replace(/,/g, '').replace(/[^\d.-]/g, '');
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
}
