import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

/**
 * Firebase config for the web console.
 *
 * These values are public by design — they identify the project, they do not
 * grant access. Everything is enforced by the Firestore rules, which only let
 * a uid listed in `admins/{uid}` read across shops.
 *
 * Supplied through Vite env vars so the same build can point at a staging
 * project. Copy `.env.example` to `.env` and fill it from
 * Firebase Console → Project settings → Your apps → Web app.
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId);

let app: FirebaseApp | null = null;

function ensure(): FirebaseApp {
  if (!firebaseConfigured) {
    throw new Error(
      'Firebase is not configured. Copy web/.env.example to web/.env and fill in the values.'
    );
  }
  if (!app) app = initializeApp(config);
  return app;
}

export function auth(): Auth {
  return getAuth(ensure());
}

export function db(): Firestore {
  return getFirestore(ensure());
}
