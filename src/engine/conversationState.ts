import {EMPTY_INTENT, GroupMember, Intent, Message, ParseResult, SessionState} from './types';

/**
 * Explicit session-state model.
 *
 * A follow-up utterance *modifies* the existing intent instead of replacing
 * it: `parseIntent` receives the current intent and only touches the
 * constraints it explicitly mentions. Every mutation returns a new immutable
 * SessionState so the UI can render change badges.
 */

let messageCounter = 0;

export const createMessage = (
  sender: Message['sender'],
  text: string,
  extra: Partial<Message> = {},
): Message => ({
  id: `m${++messageCounter}`,
  sender,
  text,
  at: new Date().toISOString(),
  ...extra,
});

export const createSession = (members: GroupMember[] = []): SessionState => ({
  intent: {...EMPTY_INTENT},
  messages: [],
  lastChanges: [],
  recentTitleIds: [],
  groupMembers: members,
});

/** Record a user utterance, LUMA's reply, and the resulting intent. */
export const recordExchange = (
  state: SessionState,
  userText: string,
  parse: ParseResult,
  reply: string,
  resultTitleIds: string[] = [],
): SessionState => ({
  ...state,
  intent: parse.intent,
  lastChanges: parse.changes,
  recentTitleIds: resultTitleIds.length ? resultTitleIds : state.recentTitleIds,
  messages: [
    ...state.messages,
    createMessage('user', userText, {intentSnapshot: parse.intent}),
    createMessage('luma', reply, {
      intentSnapshot: parse.intent,
      titleIds: resultTitleIds.length ? resultTitleIds : undefined,
    }),
  ],
});

/** Record an utterance LUMA could not read, plus the clarification question. */
export const recordClarification = (
  state: SessionState,
  userText: string,
  parse: ParseResult,
): SessionState => ({
  ...state,
  messages: [
    ...state.messages,
    createMessage('user', userText),
    createMessage('luma', parse.clarification ?? 'Could you rephrase that?'),
  ],
  lastChanges: [],
});

export const resetSession = (state: SessionState): SessionState => ({
  ...state,
  intent: {...EMPTY_INTENT},
  lastChanges: [{key: 'session', label: 'Session cleared', kind: 'reset'}],
  recentTitleIds: [],
  messages: [
    ...state.messages,
    createMessage('luma', 'Session cleared. What are you in the mood for now?'),
  ],
});

export const setGroupMembers = (state: SessionState, members: GroupMember[]): SessionState => ({
  ...state,
  groupMembers: members,
  intent: {...state.intent, groupIds: []},
});

export const rememberTitles = (state: SessionState, ids: string[]): SessionState => ({
  ...state,
  recentTitleIds: Array.from(new Set([...ids, ...state.recentTitleIds])).slice(0, 8),
});

/** Only the non-sensitive fields worth keeping between app launches. */
export const persistableState = (state: SessionState) => ({
  intent: state.intent,
  groupMembers: state.groupMembers,
  recentTitleIds: state.recentTitleIds,
});

export const restoreState = (
  saved: Partial<Pick<SessionState, 'intent' | 'groupMembers' | 'recentTitleIds'>>,
): SessionState => ({
  ...createSession(saved.groupMembers ?? []),
  intent: saved.intent ? {...EMPTY_INTENT, ...saved.intent} : {...EMPTY_INTENT},
  recentTitleIds: saved.recentTitleIds ?? [],
});

export const hasGroupMembers = (state: SessionState): boolean => state.groupMembers.length > 0;

export type {Intent};
