import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {createSession, resetSession, setGroupMembers as setMembers} from '../engine/conversationState';
import {handleUtterance, LumaOutcome} from '../engine/luma';
import {createAiProvider, LocalAiProvider} from '../engine/aiProvider';
import {loadSession, saveSession} from '../engine/sessionRepository';
import {DEFAULT_MEMBERS} from '../engine/groupCompatibility';
import {GroupMember, SessionState} from '../engine/types';

export type UiStatus = 'idle' | 'processing' | 'error';

export interface AppContextValue {
  session: SessionState;
  status: UiStatus;
  /** Provider currently answering — surfaced in the UI for honesty. */
  providerLabel: string;
  lastOutcome: LumaOutcome | null;
  send: (utterance: string) => Promise<LumaOutcome>;
  resetSessionNow: () => void;
  updateMembers: (members: GroupMember[]) => void;
  restored: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

/** Keeps the processing state on screen long enough to be perceivable. */
const MIN_PROCESSING_MS = 320;
const delay = (ms: number) => new Promise<void>(resolve => setTimeout(() => resolve(), ms));

export const AppProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [session, setSession] = useState<SessionState>(() => createSession(DEFAULT_MEMBERS));
  const [status, setStatus] = useState<UiStatus>('idle');
  const [lastOutcome, setLastOutcome] = useState<LumaOutcome | null>(null);
  const [restored, setRestored] = useState(false);
  const ai = useRef(createAiProvider());
  const busy = useRef(false);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const lastOutcomeRef = useRef(lastOutcome);
  lastOutcomeRef.current = lastOutcome;

  // Restore non-sensitive preferences once on launch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadSession();
      if (!cancelled && saved) {
        setSession(prev => ({
          ...saved,
          messages: prev.messages,
          groupMembers: saved.groupMembers.length ? saved.groupMembers : prev.groupMembers,
        }));
      }
      if (!cancelled) {
        setRestored(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (restored) {
      void saveSession(session);
    }
  }, [session, restored]);

  const idleOutcome = (reply: string): LumaOutcome => ({
    state: sessionRef.current,
    parse: {
      intent: sessionRef.current.intent,
      changes: [],
      needsClarification: false,
      recognized: false,
      isFollowUp: false,
      matchedPhrases: [],
    },
    matches: [],
    reply,
    provider: 'LUMA local engine',
    fellBack: false,
  });

  const send = useCallback(async (utterance: string): Promise<LumaOutcome> => {
    const text = utterance.trim();
    if (!text) {
      return idleOutcome('Type or pick a request first.');
    }
    if (busy.current) {
      // Guard against double activation from an OK/centre-press repeat.
      return lastOutcomeRef.current ?? idleOutcome('Still working on your last request.');
    }
    busy.current = true;
    setStatus('processing');
    try {
      const current = sessionRef.current;
      const [outcome] = await Promise.all([
        handleUtterance(current, text, ai.current),
        delay(MIN_PROCESSING_MS),
      ]);
      setSession(outcome.state);
      setLastOutcome(outcome);
      setStatus('idle');
      return outcome;
    } catch {
      setStatus('error');
      const fallback = idleOutcome(
        'Something went wrong reading that. Please try again.',
      );
      const withFlags: LumaOutcome = {
        ...fallback,
        parse: {...fallback.parse, needsClarification: true},
      };
      setLastOutcome(withFlags);
      return withFlags;
    } finally {
      busy.current = false;
    }
  }, []);

  const resetSessionNow = useCallback(() => {
    setSession(prev => resetSession(prev));
    setLastOutcome(null);
    setStatus('idle');
  }, []);

  const updateMembers = useCallback((members: GroupMember[]) => {
    setSession(prev => setMembers(prev, members));
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      session,
      status,
      providerLabel: lastOutcome?.provider ?? new LocalAiProvider().name,
      lastOutcome,
      send,
      resetSessionNow,
      updateMembers,
      restored,
    }),
    [session, status, lastOutcome, send, resetSessionNow, updateMembers, restored],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextValue => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside <AppProvider>');
  }
  return ctx;
};
