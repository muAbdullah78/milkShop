import {
  EmailAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  signInWithCredential,
  GoogleAuthProvider,
  type User,
} from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { deleteDoc, getDocs, query, writeBatch } from '@react-native-firebase/firestore';

import { COL, shopCol, shopDoc, userDoc } from '@/data/refs';
import { auth, db } from '@/lib/firebase';

/**
 * Permanent deletion of a shop and the account that owns it.
 *
 * Google Play requires any app that lets people create an account to also let
 * them delete it from inside the app, and to delete the associated data — not
 * just deactivate. This does the real thing:
 *
 *   1. every document in every sub-collection of the shop
 *   2. the shop document
 *   3. the user's own profile document
 *   4. the Firebase Auth account itself
 *
 * Order matters. Auth goes last, because once it is gone the security rules
 * will refuse every remaining write and the data would be stranded forever.
 */

export type DeletionProgress = {
  step: 'data' | 'shop' | 'profile' | 'account' | 'done';
  /** 0..1 */
  progress: number;
  deletedDocs: number;
};

export class ReauthRequiredError extends Error {
  constructor() {
    super('auth/requires-recent-login');
  }
}

const BATCH_LIMIT = 400;

async function deleteCollection(
  shopId: string,
  name: (typeof COL)[keyof typeof COL]
): Promise<number> {
  const snap = await getDocs(query(shopCol(shopId, name)));
  if (snap.docs.length === 0) return 0;

  for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db());
    snap.docs.slice(i, i + BATCH_LIMIT).forEach((d) => batch.delete(d.ref));
    // eslint-disable-next-line no-await-in-loop
    await batch.commit();
  }
  return snap.docs.length;
}

export async function deleteAccountAndData(
  shopId: string | null,
  onProgress?: (p: DeletionProgress) => void
): Promise<void> {
  const user = auth().currentUser;
  if (!user) throw new Error('Not signed in');

  const collections = Object.values(COL);
  let deleted = 0;

  if (shopId) {
    for (let i = 0; i < collections.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      deleted += await deleteCollection(shopId, collections[i]);
      onProgress?.({
        step: 'data',
        progress: (i + 1) / (collections.length + 3),
        deletedDocs: deleted,
      });
    }

    onProgress?.({ step: 'shop', progress: 0.8, deletedDocs: deleted });
    await deleteDoc(shopDoc(shopId));
  }

  onProgress?.({ step: 'profile', progress: 0.9, deletedDocs: deleted });
  await deleteDoc(userDoc(user.uid)).catch(() => undefined);

  onProgress?.({ step: 'account', progress: 0.95, deletedDocs: deleted });
  try {
    await deleteUser(user);
  } catch (e) {
    if ((e as { code?: string })?.code === 'auth/requires-recent-login') {
      throw new ReauthRequiredError();
    }
    throw e;
  }

  await GoogleSignin.signOut().catch(() => undefined);
  onProgress?.({ step: 'done', progress: 1, deletedDocs: deleted });
}

/** Proves the person at the keyboard owns the account, right now. */
export async function reauthenticate(input:
  | { method: 'password'; password: string }
  | { method: 'google' }
): Promise<void> {
  const user = auth().currentUser as User | null;
  if (!user) throw new Error('Not signed in');

  if (input.method === 'password') {
    if (!user.email) throw new Error('This account has no password');
    const credential = EmailAuthProvider.credential(user.email, input.password);
    await reauthenticateWithCredential(user, credential);
    return;
  }

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();
  if (result.type !== 'success' || !result.data.idToken) {
    throw new Error('Google sign-in cancelled');
  }
  const credential = GoogleAuthProvider.credential(result.data.idToken);
  await reauthenticateWithCredential(user, credential).catch(async () => {
    // Some Android builds reject reauthenticate but accept a fresh sign-in.
    await signInWithCredential(auth(), credential);
  });
}

/** Which re-auth method this account can actually use. */
export function signInMethod(): 'password' | 'google' | 'unknown' {
  const user = auth().currentUser;
  if (!user) return 'unknown';
  const providers = user.providerData.map((p) => p.providerId);
  if (providers.includes('password')) return 'password';
  if (providers.includes('google.com')) return 'google';
  return 'unknown';
}
