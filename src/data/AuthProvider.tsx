import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { auth, firebaseInitError, isFirebaseReady } from '@/lib/firebase';
import type { TranslationKey } from '@/i18n';

export class AuthError extends Error {
  constructor(public readonly key: TranslationKey, message?: string) {
    super(message ?? key);
  }
}

const googleWebClientId = (Constants.expoConfig?.extra as { googleWebClientId?: string } | undefined)
  ?.googleWebClientId;

let googleConfigured = false;
function configureGoogle() {
  if (googleConfigured || !googleWebClientId) return;
  GoogleSignin.configure({ webClientId: googleWebClientId, offlineAccess: false });
  googleConfigured = true;
}

function mapAuthError(e: unknown): AuthError {
  const code = (e as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return new AuthError('auth.errInvalidEmail');
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return new AuthError('auth.errWrongPassword');
    case 'auth/user-not-found':
      return new AuthError('auth.errUserNotFound');
    case 'auth/email-already-in-use':
      return new AuthError('auth.errEmailInUse');
    case 'auth/weak-password':
      return new AuthError('auth.errWeakPassword');
    case 'auth/network-request-failed':
      return new AuthError('auth.errNetwork');
    default:
      return new AuthError('auth.errGeneric', (e as Error)?.message);
  }
}

type AuthValue = {
  user: User | null;
  initializing: boolean;
  firebaseReady: boolean;
  firebaseError: string | null;
  googleAvailable: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const ready = isFirebaseReady();
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(ready);

  useEffect(() => {
    if (!ready) {
      setInitializing(false);
      return;
    }
    configureGoogle();
    const unsub = onAuthStateChanged(auth(), (next) => {
      setUser(next);
      setInitializing(false);
    });
    return unsub;
  }, [ready]);

  const signInWithGoogle = useCallback(async () => {
    if (!googleWebClientId) throw new AuthError('auth.errGoogleNotSetUp');
    configureGoogle();
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      if (result.type !== 'success') return; // user backed out
      const idToken = result.data.idToken;
      if (!idToken) throw new AuthError('auth.errGoogleNotSetUp');
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth(), credential);
    } catch (e) {
      if (e instanceof AuthError) throw e;
      const code = (e as { code?: string })?.code;
      if (code === statusCodes.SIGN_IN_CANCELLED) return;
      if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new AuthError('auth.errGoogleNotSetUp');
      }
      throw mapAuthError(e);
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth(), email.trim(), password);
    } catch (e) {
      throw mapAuthError(e);
    }
  }, []);

  const signUpWithEmail = useCallback(async (name: string, email: string, password: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth(), email.trim(), password);
      if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
    } catch (e) {
      throw mapAuthError(e);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth(), email.trim());
    } catch (e) {
      throw mapAuthError(e);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      if (googleConfigured) await GoogleSignin.signOut().catch(() => undefined);
      await fbSignOut(auth());
    } catch (e) {
      throw mapAuthError(e);
    }
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      initializing,
      firebaseReady: ready,
      firebaseError: firebaseInitError(),
      googleAvailable: Boolean(googleWebClientId),
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      resetPassword,
      signOut,
    }),
    [user, initializing, ready, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
