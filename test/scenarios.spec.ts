import {SCENARIOS} from '../src/engine/scenarios';
import {createSession} from '../src/engine/conversationState';
import {handleUtterance} from '../src/engine/luma';
import {describeIntent} from '../src/engine/intentParser';
import {DEFAULT_MEMBERS} from '../src/engine/groupCompatibility';
import {SessionState} from '../src/engine/types';

/**
 * Executes the scripted demo scenarios end-to-end through the same pipeline
 * the UI calls, so the behaviour demonstrated on stage is the behaviour these
 * tests assert.
 */
describe('scripted scenarios', () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: ${scenario.goal}`, async () => {
      let state: SessionState = createSession(DEFAULT_MEMBERS);

      for (const step of scenario.steps) {
        const outcome = await handleUtterance(state, step.utterance);
        state = outcome.state;
        const summary = describeIntent(state.intent).join(' | ');
        const ids = (state.lastMatches ?? []).map(m => m.title.id);

        for (const expected of step.expectIntentIncludes ?? []) {
          expect(summary).toContain(expected);
        }
        for (const unexpected of step.expectIntentExcludes ?? []) {
          expect(summary).not.toContain(unexpected);
        }
        if (step.expectSomeTitleIds?.length) {
          expect(ids.some(id => step.expectSomeTitleIds!.includes(id))).toBe(true);
        }
        for (const banned of step.expectNoTitleIds ?? []) {
          expect(ids).not.toContain(banned);
        }
      }
    });
  }
});

describe('offline guarantees', () => {
  it('answers with the local engine and never reports a fallback', async () => {
    const outcome = await handleUtterance(createSession(), 'a funny family film under 90 minutes');
    expect(outcome.provider).toBe('LUMA local engine');
    expect(outcome.fellBack).toBe(false);
    expect(outcome.matches.length).toBeGreaterThan(0);
  });

  it('still produces results when the request is only loosely specified', async () => {
    const outcome = await handleUtterance(createSession(), 'something cozy');
    expect(outcome.parse.recognized).toBe(true);
    expect(outcome.matches.length).toBeGreaterThan(0);
  });
});
