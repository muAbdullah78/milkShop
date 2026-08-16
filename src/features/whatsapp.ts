import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { Alert, Linking as RNLinking } from 'react-native';

import { toWhatsAppNumber } from '@/lib/format';

export type WhatsAppResult = 'opened' | 'no-number' | 'not-installed' | 'failed';

/**
 * Opens a WhatsApp chat with a prefilled message.
 *
 * `whatsapp://send` goes straight into the chat when the app is installed.
 * `https://wa.me/…` is the fallback — it still lands in WhatsApp on Android
 * but bounces through the browser, so we only use it if the direct scheme
 * is unavailable.
 */
export async function openWhatsApp(phone: string | null | undefined, text: string): Promise<WhatsAppResult> {
  const number = toWhatsAppNumber(phone);
  if (!number) return 'no-number';

  const encoded = encodeURIComponent(text);
  const direct = `whatsapp://send?phone=${number}&text=${encoded}`;
  const web = `https://wa.me/${number}?text=${encoded}`;

  try {
    const canDirect = await RNLinking.canOpenURL(direct).catch(() => false);
    if (canDirect) {
      await RNLinking.openURL(direct);
      return 'opened';
    }
    await RNLinking.openURL(web);
    return 'opened';
  } catch {
    try {
      await Linking.openURL(web);
      return 'opened';
    } catch {
      return 'not-installed';
    }
  }
}

/** Share a generated file (PDF or JPG). WhatsApp appears in the share sheet. */
export async function shareFile(
  uri: string,
  opts: { mimeType: string; dialogTitle: string; UTI?: string }
): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, {
    mimeType: opts.mimeType,
    dialogTitle: opts.dialogTitle,
    UTI: opts.UTI,
  });
  return true;
}

export async function callNumber(phone: string | null | undefined): Promise<boolean> {
  const number = toWhatsAppNumber(phone);
  if (!number) return false;
  try {
    await RNLinking.openURL(`tel:+${number}`);
    return true;
  } catch {
    return false;
  }
}

export function warnNoNumber(title: string, message: string) {
  Alert.alert(title, message);
}
