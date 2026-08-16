import { getDocs, query, writeBatch } from '@react-native-firebase/firestore';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';

import { COL, shopCol, shopDoc, shopSubDoc } from '@/data/refs';
import { db } from '@/lib/firebase';
import type { Shop } from '@/types/models';
import { shareFile } from './whatsapp';

const BACKUP_VERSION = 1;
const COLLECTIONS = Object.values(COL);

export type BackupFile = {
  app: 'milkbook';
  version: number;
  exportedAt: string;
  shop: Record<string, unknown> | null;
  collections: Record<string, Record<string, unknown>[]>;
};

function backupDir(): Directory {
  const dir = new Directory(Paths.cache, 'backups');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/** Reads the whole shop out of Firestore (offline cache included). */
export async function buildBackup(shopId: string, shop: Shop | null): Promise<BackupFile> {
  const collections: BackupFile['collections'] = {};

  for (const name of COLLECTIONS) {
    // eslint-disable-next-line no-await-in-loop
    const snap = await getDocs(query(shopCol(shopId, name)));
    collections[name] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }));
  }

  return {
    app: 'milkbook',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    shop: shop ? { ...shop } : null,
    collections,
  };
}

/** Writes the backup to a dated file and opens the share sheet. */
export async function exportBackup(
  shopId: string,
  shop: Shop | null,
  dialogTitle: string,
  stamp: string
): Promise<string> {
  const data = await buildBackup(shopId, shop);
  const safeName = (shop?.name ?? 'MilkBook').replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 30);
  const file = new File(backupDir(), `MilkBook-${safeName}-${stamp}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(data, null, 2));

  await shareFile(file.uri, { mimeType: 'application/json', dialogTitle, UTI: 'public.json' });
  return file.uri;
}

export type RestoreResult = { restored: number; skipped: number };

/** Lets the shopkeeper pick a backup file and writes it back into Firestore. */
export async function importBackup(shopId: string): Promise<RestoreResult | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled || !picked.assets?.[0]) return null;

  const raw = new File(picked.assets[0].uri).textSync();
  const parsed = JSON.parse(raw) as BackupFile;

  if (parsed.app !== 'milkbook' || !parsed.collections) {
    throw new Error('This is not a MilkBook backup file.');
  }

  let restored = 0;
  let skipped = 0;
  const pending: (() => void)[] = [];
  let batch = writeBatch(db());
  let inBatch = 0;

  const flush = async () => {
    if (inBatch === 0) return;
    await batch.commit();
    batch = writeBatch(db());
    inBatch = 0;
  };

  if (parsed.shop) {
    const { id: _ignored, ...shopData } = parsed.shop as { id?: string };
    batch.set(shopDoc(shopId), shopData, { merge: true });
    inBatch += 1;
  }

  for (const name of COLLECTIONS) {
    const rows = parsed.collections[name] ?? [];
    for (const row of rows) {
      const { id, ...data } = row as { id?: string };
      if (!id) {
        skipped += 1;
        continue;
      }
      batch.set(shopSubDoc(shopId, name, id), data, { merge: true });
      inBatch += 1;
      restored += 1;
      if (inBatch >= 400) {
        // eslint-disable-next-line no-await-in-loop
        await flush();
      }
    }
  }

  await flush();
  pending.forEach((fn) => fn());
  return { restored, skipped };
}

/** Simple CSV export of the customer ledger, for shops that keep a PC record. */
export function customersToCsv(
  rows: { name: string; phone: string; route: string; qty: number; rate: number; balance: number }[]
): string {
  const header = ['Name', 'Phone', 'Area', 'Daily Litres', 'Rate', 'Balance'];
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(',')];
  rows.forEach((r) =>
    lines.push([r.name, r.phone, r.route, r.qty, r.rate, r.balance].map(escape).join(','))
  );
  return lines.join('\n');
}

export async function shareCsv(content: string, fileName: string, dialogTitle: string) {
  const file = new File(backupDir(), fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  return shareFile(file.uri, { mimeType: 'text/csv', dialogTitle, UTI: 'public.comma-separated-values-text' });
}
