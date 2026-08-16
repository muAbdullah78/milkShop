import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import { captureRef } from 'react-native-view-shot';

import type { BillSummary } from '@/types/models';
import { buildBillHtml, type HtmlCtx } from './billHtml';
import { shareFile } from './whatsapp';

/** Safe-for-filesystem name, e.g. `Bill-Ahmad-Ali-2026-08.pdf`. */
function fileNameFor(bill: BillSummary, ext: string): string {
  const name = bill.customer.name
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `Bill-${name || 'Customer'}-${bill.month}.${ext}`;
}

function billsDir(): Directory {
  const dir = new Directory(Paths.cache, 'bills');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/** Renders the bill to a PDF in the cache directory and returns its uri. */
export async function makeBillPdf(
  bill: BillSummary,
  ctx: HtmlCtx,
  opts: { includeBreakdown?: boolean } = {}
): Promise<string> {
  const html = await buildBillHtml(bill, ctx, opts);
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  // expo-print names the file with a random uuid; give it something the
  // customer will recognise in their WhatsApp downloads.
  try {
    const target = new File(billsDir(), fileNameFor(bill, 'pdf'));
    if (target.exists) target.delete();
    const source = new File(uri);
    await source.move(target);
    return target.uri;
  } catch {
    return uri;
  }
}

export async function shareBillPdf(
  bill: BillSummary,
  ctx: HtmlCtx,
  dialogTitle: string,
  opts: { includeBreakdown?: boolean } = {}
): Promise<boolean> {
  const uri = await makeBillPdf(bill, ctx, opts);
  return shareFile(uri, { mimeType: 'application/pdf', dialogTitle, UTI: 'com.adobe.pdf' });
}

export async function printBill(
  bill: BillSummary,
  ctx: HtmlCtx,
  opts: { includeBreakdown?: boolean } = {}
): Promise<void> {
  const html = await buildBillHtml(bill, ctx, opts);
  await Print.printAsync({ html });
}

/**
 * Captures an on-screen view as a JPG. Used for "send the bill as a picture",
 * which customers can open instantly inside WhatsApp.
 */
export async function shareViewAsImage(
  ref: React.RefObject<unknown>,
  fileName: string,
  dialogTitle: string
): Promise<boolean> {
  const tmp = await captureRef(ref as never, {
    format: 'jpg',
    quality: 0.95,
    result: 'tmpfile',
  });

  let uri = tmp;
  try {
    const target = new File(billsDir(), fileName);
    if (target.exists) target.delete();
    await new File(tmp).move(target);
    uri = target.uri;
  } catch {
    // keep the tmpfile path
  }

  return shareFile(uri, { mimeType: 'image/jpeg', dialogTitle, UTI: 'public.jpeg' });
}

export function billImageName(bill: BillSummary): string {
  return fileNameFor(bill, 'jpg');
}

/** Removes cached bill files so the app does not grow forever. */
export function clearBillCache() {
  try {
    const dir = new Directory(Paths.cache, 'bills');
    if (dir.exists) dir.delete();
  } catch {
    // best effort
  }
}
