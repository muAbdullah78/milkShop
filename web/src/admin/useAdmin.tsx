import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { auth, db, firebaseConfigured } from '../lib/firebase';

export type AdminRole = 'owner' | 'staff';

export type AdminRecord = {
  uid: string;
  role: AdminRole;
  name?: string;
  email?: string;
  createdAt?: number;
};

type AdminValue = {
  user: User | null;
  admin: AdminRecord | null;
  loading: boolean;
  configured: boolean;
  isOwner: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Records an admin action. Every mutation in the console calls this. */
  audit: (action: string, detail?: Record<string, unknown>) => Promise<void>;
};

const AdminContext = createContext<AdminValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<AdminRecord | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    if (!firebaseConfigured) return;
    return onAuthStateChanged(auth(), async (next) => {
      setUser(next);
      if (!next) {
        setAdmin(null);
        setLoading(false);
        return;
      }
      try {
        // Membership of `admins/{uid}` is what the Firestore rules check, so
        // the console asks the same question rather than trusting a claim.
        const snap = await getDoc(doc(db(), 'admins', next.uid));
        setAdmin(snap.exists() ? ({ uid: next.uid, ...snap.data() } as AdminRecord) : null);
      } catch {
        setAdmin(null);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const audit = useCallback(
    async (action: string, detail?: Record<string, unknown>) => {
      const current = auth().currentUser;
      if (!current) return;
      await addDoc(collection(db(), 'adminAudit'), {
        actorUid: current.uid,
        actorEmail: current.email ?? null,
        action,
        detail: detail ?? {},
        at: serverTimestamp(),
      }).catch(() => undefined);
    },
    []
  );

  const value = useMemo<AdminValue>(
    () => ({
      user,
      admin,
      loading,
      configured: firebaseConfigured,
      isOwner: admin?.role === 'owner',
      signInEmail: async (email, password) => {
        await signInWithEmailAndPassword(auth(), email.trim(), password);
      },
      signInGoogle: async () => {
        await signInWithPopup(auth(), new GoogleAuthProvider());
      },
      signOut: async () => {
        await fbSignOut(auth());
      },
      audit,
    }),
    [user, admin, loading, audit]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside <AdminProvider>');
  return ctx;
}

/** `1,250` with thousands separators, tabular. */
export function num(n: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(n));
}

export function money(n: number): string {
  return `Rs ${num(n)}`;
}

export function when(value: unknown): string {
  const ms =
    typeof value === 'number'
      ? value
      : value && typeof value === 'object' && 'seconds' in (value as object)
        ? (value as { seconds: number }).seconds * 1000
        : null;
  if (!ms) return '—';
  return new Date(ms).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function daysAgo(value: unknown): number | null {
  const ms =
    typeof value === 'number'
      ? value
      : value && typeof value === 'object' && 'seconds' in (value as object)
        ? (value as { seconds: number }).seconds * 1000
        : null;
  if (!ms) return null;
  return Math.floor((Date.now() - ms) / 86_400_000);
}
