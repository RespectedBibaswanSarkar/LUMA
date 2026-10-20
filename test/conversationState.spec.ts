import {
  createSession,
  persistableState,
  recordExchange,
  recordClarification,
  resetSession,
  restoreState,
} from '../src/engine/conversationState';
import {parseIntent, describeIntent} from '../src/engine/intentParser';
import {handleUtterance} from '../src/engine/luma';
import {DEFAULT_MEMBERS} from '../src/engine/groupCompatibility';
import {SessionState} from '../src/engine/types';

const run = async (state: SessionState, utterance: string): Promise<SessionState> => {
  const outcome = await handleUtterance(state, utterance);
  return outcome.state;
};

describe('conversation state', () => {
  it('records both sides of an exchange', async () => {
    let state = createSession();
    state = await run(state, 'a funny family film under 90 minutes');
    expect(state.messages).toHaveLength(2);
    expect(state.messages[0].sender).toBe('user');
    expect(state.messages[1].sender).toBe('luma');
    expect(state.recentTitleIds.length).toBeGreaterThan(0);
  });

  it('keeps earlier constraints when a follow-up arrives', async () => {
    let state = createSession();
    state = await run(state, 'a comedy for the family under 90 minutes');
    const first = describeIntent(state.intent).join(' | ');
    state = await run(state, 'make it more adventurous, keep everything else');
    const second = describeIntent(state.intent).join(' | ');
    expect(second).toContain('Comedy');
    expect(second).toContain('Under 90 min');
    expect(second).toContain('Family suitable');
    expect(second).toContain('Adventure');
    expect(first).toContain('Comedy');
  });

  it('surfaces a clarification without changing the intent', async () => {
    let state = createSession();
    state = await run(state, 'a comedy under 90 minutes');
    const before = state.intent;
    state = await run(state, 'purple');
    expect(state.intent).toEqual(before);
    expect(state.messages[state.messages.length - 1].text).toMatch(/could not read/i);
  });

  it('resets on request', async () => {
    let state = createSession();
    state = await run(state, 'a comedy under 90 minutes');
    state = resetSession(state);
    expect(state.intent.genres).toEqual([]);
    expect(state.intent.maxRuntimeMin).toBeUndefined();
    expect(state.recentTitleIds).toEqual([]);
  });

  it('persists only non-sensitive fields and restores them', () => {
    let state = createSession(DEFAULT_MEMBERS);
    const parse = parseIntent('a comedy under 90 minutes');
    state = recordExchange(state, 'a comedy under 90 minutes', parse, 'ok', ['klaus']);
    const saved = persistableState(state);
    expect(Object.keys(saved).sort()).toEqual(['groupMembers', 'intent', 'recentTitleIds']);
    const restored = restoreState(JSON.parse(JSON.stringify(saved)));
    expect(restored.intent).toEqual(state.intent);
    expect(restored.groupMembers).toHaveLength(DEFAULT_MEMBERS.length);
    expect(restored.recentTitleIds).toEqual(['klaus']);
  });

  it('records clarifications as messages', () => {
    const state = createSession();
    const parse = parseIntent('zzz');
    const next = recordClarification(state, 'zzz', parse);
    expect(next.messages).toHaveLength(2);
    expect(next.messages[1].text).toBe(parse.clarification);
  });
});
