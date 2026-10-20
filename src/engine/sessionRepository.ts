import {GroupMember, Intent, SessionState} from './types';
import {persistableState, restoreState} from './conversationState';

/**
 * Session persistence.
 *
 * Vega OS exposes `AsyncStorage` through `@amazon-devices/react-native-kepler`.
 * Nothing sensitive is stored: no audio, no transcripts beyond the current
 * request, no identifiers. If storage is unavailable the app silently falls
 * back to an in-memory store so the session still works.
 */

const KEY = 'luma.session.v1';

export interface SessionStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const memoryStorage = (): SessionStorage => {
  const map = new Map<string, string>();
  return {
    getItem: async key => map.get(key) ?? null,
    setItem: async (key, value) => {
      map.set(key, value);
    },
    removeItem: async key => {
      map.delete(key);
    },
  };
};

let resolved: SessionStorage | null = null;

/** Resolve the platform storage once, falling back to memory. */
export const getStorage = (): SessionStorage => {
  if (resolved) {
    return resolved;
  }
  resolved = memoryStorage();
  try {
    // Required import; resolves to the Kepler AsyncStorage on device and to
    // the Jest mock in tests.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {AsyncStorage} = require('@amazon-devices/react-native-kepler');
    if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
      resolved = AsyncStorage as SessionStorage;
    }
  } catch {
    // Keep the in-memory fallback.
  }
  return resolved;
};

/** Test seam. */
export const __setStorageForTests = (storage: SessionStorage | null) => {
  resolved = storage;
};

export const saveSession = async (state: SessionState): Promise<void> => {
  try {
    await getStorage().setItem(KEY, JSON.stringify(persistableState(state)));
  } catch {
    // Persistence is best-effort; the session stays in memory.
  }
};

export const loadSession = async (): Promise<ReturnType<typeof restoreState> | null> => {
  try {
    const raw = await getStorage().getItem(KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as {
      intent?: Intent;
      groupMembers?: GroupMember[];
      recentTitleIds?: string[];
    };
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return restoreState(parsed);
  } catch {
    return null;
  }
};

export const clearSession = async (): Promise<void> => {
  try {
    await getStorage().removeItem(KEY);
  } catch {
    // Ignore.
  }
};
