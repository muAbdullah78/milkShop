import {
  onSnapshot,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type FirestoreError,
  type Query,
  type QuerySnapshot,
} from '@react-native-firebase/firestore';
import { useEffect, useMemo, useRef, useState } from 'react';

import { isFirebaseReady } from '@/lib/firebase';

export type QueryState<T> = {
  data: T[];
  loading: boolean;
  error: Error | null;
  /** True while Firestore is serving from the offline cache. */
  fromCache: boolean;
};

type AnyQuery = Query<DocumentData, DocumentData>;
type AnyDocRef = DocumentReference<DocumentData, DocumentData>;

/**
 * Subscribes to a Firestore query and keeps a plain-object array in state.
 *
 * `build` is re-run whenever `deps` change. Returning `null` parks the hook in
 * a loading-free empty state (used before the shop id is known).
 */
export function useLiveQuery<T>(build: () => AnyQuery | null, deps: unknown[]): QueryState<T> {
  const [state, setState] = useState<QueryState<T>>({
    data: [],
    loading: true,
    error: null,
    fromCache: true,
  });
  const buildRef = useRef(build);
  buildRef.current = build;

  useEffect(() => {
    if (!isFirebaseReady()) {
      setState({ data: [], loading: false, error: null, fromCache: true });
      return;
    }

    let query: AnyQuery | null = null;
    try {
      query = buildRef.current();
    } catch (e) {
      setState({ data: [], loading: false, error: e as Error, fromCache: false });
      return;
    }

    if (!query) {
      setState({ data: [], loading: false, error: null, fromCache: true });
      return;
    }

    setState((s) => (s.loading ? s : { ...s, loading: true }));

    const unsub = onSnapshot(
      query,
      (snap: QuerySnapshot<DocumentData, DocumentData>) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as T[];
        setState({
          data: rows,
          loading: false,
          error: null,
          fromCache: snap.metadata.fromCache,
        });
      },
      (error: FirestoreError) =>
        setState({ data: [], loading: false, error: error as unknown as Error, fromCache: false })
    );

    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

/** Single-document live subscription. */
export function useLiveDoc<T>(
  build: () => AnyDocRef | null,
  deps: unknown[]
): { data: T | null; loading: boolean; error: Error | null } {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: Error | null }>({
    data: null,
    loading: true,
    error: null,
  });
  const buildRef = useRef(build);
  buildRef.current = build;

  useEffect(() => {
    if (!isFirebaseReady()) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    let ref: AnyDocRef | null = null;
    try {
      ref = buildRef.current();
    } catch (e) {
      setState({ data: null, loading: false, error: e as Error });
      return;
    }
    if (!ref) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    const unsub = onSnapshot(
      ref,
      (snap: DocumentSnapshot<DocumentData, DocumentData>) => {
        setState({
          data: snap.exists() ? ({ id: snap.id, ...(snap.data() as object) } as T) : null,
          loading: false,
          error: null,
        });
      },
      (error: FirestoreError) =>
        setState({ data: null, loading: false, error: error as unknown as Error })
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

/** Small helper for derived lists that would otherwise re-sort every render. */
export function useSorted<T>(rows: T[], compare: (a: T, b: T) => number, deps: unknown[] = []): T[] {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => [...rows].sort(compare), [rows, ...deps]);
}
