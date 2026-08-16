import { getApp, getApps, type ReactNativeFirebase } from '@react-native-firebase/app';
import { getAuth, type Auth } from '@react-native-firebase/auth';
import {
  CACHE_SIZE_UNLIMITED,
  getFirestore,
  initializeFirestore,
  type Firestore,
} from '@react-native-firebase/firestore';

/**
 * MilkBook talks to Firestore through the native SDK on purpose:
 * it keeps a full offline cache on disk, so a shopkeeper on a dead 2G
 * connection can run the whole milk round and everything syncs later.
 */

let app: ReactNativeFirebase.FirebaseApp | null = null;
let firestore: Firestore | null = null;
let initError: string | null = null;

function bootstrap() {
  if (app || initError) return;
  try {
    if (getApps().length === 0) {
      initError =
        'Firebase is not configured. Add google-services.json and rebuild (see SETUP.md).';
      return;
    }
    app = getApp();
    try {
      firestore = initializeFirestore(app, {
        persistence: true,
        cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      });
    } catch {
      // initializeFirestore throws if the instance already exists.
      firestore = getFirestore(app);
    }
  } catch (e) {
    initError = e instanceof Error ? e.message : String(e);
  }
}

export function isFirebaseReady(): boolean {
  bootstrap();
  return app !== null && firestore !== null;
}

export function firebaseInitError(): string | null {
  bootstrap();
  return initError;
}

export function db(): Firestore {
  bootstrap();
  if (!firestore) throw new Error(initError ?? 'Firestore is not available');
  return firestore;
}

export function auth(): Auth {
  bootstrap();
  if (!app) throw new Error(initError ?? 'Firebase Auth is not available');
  return getAuth(app);
}
