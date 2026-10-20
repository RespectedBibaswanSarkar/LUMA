/**
 * Scripted conversational scenarios.
 *
 * These drive the three-minute demo and are executed verbatim by the Jest
 * suite (`test/scenarios.spec.ts`), so the behaviour shown on stage is the
 * behaviour the tests assert.
 */

export interface ScenarioStep {
  utterance: string;
  /** Substrings that must appear in the resulting intent summary. */
  expectIntentIncludes?: string[];
  /** Substrings that must NOT appear in the resulting intent summary. */
  expectIntentExcludes?: string[];
  /** Title ids that must be among the recommendations. */
  expectSomeTitleIds?: string[];
  /** Title ids that must NOT be recommended. */
  expectNoTitleIds?: string[];
}

export interface Scenario {
  id: string;
  name: string;
  goal: string;
  steps: ScenarioStep[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'family-movie-night',
    name: 'Family movie night',
    goal: 'Adventure + family suitability + a runtime ceiling, then refine.',
    steps: [
      {
        utterance: 'Find something adventurous for family movie night, nothing too scary, under two hours',
        expectIntentIncludes: ['Adventure', 'Family suitable', 'Under 120 min', 'Nothing scary'],
        expectNoTitleIds: ['alien', 'the-shining', 'get-out', 'spirited-away'],
      },
      {
        utterance: 'Make it more adventurous, but keep everything else',
        expectIntentIncludes: ['Under 120 min', 'Family suitable', 'Nothing scary'],
      },
    ],
  },
  {
    id: 'quick-comedy',
    name: 'Quick comedy',
    goal: 'Runtime + genre, then swap the genre with “instead” while keeping runtime.',
    steps: [
      {
        utterance: 'A quick comedy for tonight, under 90 minutes',
        expectIntentIncludes: ['Comedy', 'Under 90 min'],
      },
      {
        utterance: 'Something dramatic instead, but keep the same runtime',
        expectIntentIncludes: ['Drama', 'Under 90 min'],
        expectIntentExcludes: ['Comedy'],
      },
    ],
  },
  {
    id: 'nothing-scary',
    name: 'Nothing scary',
    goal: 'Unknown intensity must never be treated as safe.',
    steps: [
      {
        utterance: 'Nothing scary tonight, under 120 minutes',
        expectIntentIncludes: ['Nothing scary', 'Under 120 min'],
        expectNoTitleIds: ['alien', 'the-shining', 'get-out', 'jaws'],
      },
    ],
  },
  {
    id: 'shorten-runtime',
    name: 'Shorten but keep the family requirement',
    goal: 'Follow-up changes one constraint and preserves the others.',
    steps: [
      {
        utterance: 'Family films under two hours',
        expectIntentIncludes: ['Family suitable', 'Under 120 min'],
      },
      {
        utterance: 'Keep the family requirement but shorten the runtime',
        expectIntentIncludes: ['Family suitable', 'Under 90 min'],
      },
    ],
  },
  {
    id: 'group-harmony',
    name: 'Works for everyone',
    goal: 'Group Harmony balances the configured members.',
    steps: [
      {
        utterance: 'Find something that works for everyone',
        expectIntentIncludes: ['Group balance'],
      },
    ],
  },
  {
    id: 'hindi-film',
    name: 'Language constraint',
    goal: 'Language filter with honest unknown handling.',
    steps: [
      {
        utterance: 'An uplifting Hindi film',
        expectIntentIncludes: ['Hindi', 'Uplifting'],
        expectSomeTitleIds: ['dangal', 'hichki'],
        expectNoTitleIds: ['alien', 'paddington'],
      },
    ],
  },
  {
    id: 'unclear-request',
    name: 'Unclear request',
    goal: 'Ask a clarification instead of guessing.',
    steps: [
      {
        utterance: 'something',
        expectIntentExcludes: ['Comedy', 'Family suitable'],
      },
    ],
  },
];
