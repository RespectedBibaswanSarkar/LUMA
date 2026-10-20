import {parseIntent, describeIntent, titleCase} from '../src/engine/intentParser';
import {EMPTY_INTENT, Intent} from '../src/engine/types';

const base = (): Intent => ({...EMPTY_INTENT});

describe('parseIntent — initial requests', () => {
  it('reads a runtime ceiling in words and digits', () => {
    expect(parseIntent('under two hours').intent.maxRuntimeMin).toBe(120);
    expect(parseIntent('something funny under 90 minutes').intent.maxRuntimeMin).toBe(90);
    expect(parseIntent('a film 100 minutes or less').intent.maxRuntimeMin).toBe(100);
  });

  it('reads a runtime floor', () => {
    const parse = parseIntent('a drama of at least 120 minutes');
    expect(parse.intent.minRuntimeMin).toBe(120);
    expect(parse.intent.genres).toContain('drama');
  });

  it('marks family suitability', () => {
    for (const utterance of [
      'suitable for children',
      'family movie night',
      'something for the kids',
      'a family-friendly film',
    ]) {
      expect(parseIntent(utterance).intent.requireFamilyFriendly).toBe(true);
    }
  });

  it('excludes frightening titles without requesting the horror genre', () => {
    const parse = parseIntent('nothing scary tonight');
    expect(parse.intent.noScary).toBe(true);
    expect(parse.intent.genres).not.toContain('horror');
  });

  it('honours an explicit genre exclusion', () => {
    const parse = parseIntent('no horror please, something adventurous');
    expect(parse.intent.excludedGenres).toContain('horror');
    expect(parse.intent.genres).not.toContain('horror');
    expect(parse.intent.genres).toContain('adventure');
  });

  it('maps intensity ceilings', () => {
    expect(parseIntent('nothing too intense').intent.maxIntensity).toBe('low');
    expect(parseIntent('moderate intensity is fine').intent.maxIntensity).toBe('medium');
  });

  it('reads a language constraint', () => {
    expect(parseIntent('an uplifting hindi film').intent.language).toBe('Hindi');
    expect(parseIntent('something in Tamil').intent.language).toBe('Tamil');
  });

  it('returns a clarification instead of guessing', () => {
    const parse = parseIntent('something');
    expect(parse.needsClarification).toBe(true);
    expect(parse.clarification).toBeTruthy();
    expect(parse.intent).toEqual(base());
  });

  it('clarifies a bare follow-up modifier with no prior request', () => {
    const parse = parseIntent('more adventurous', base());
    expect(parse.needsClarification).toBe(true);
  });

  it('is deterministic', () => {
    const a = parseIntent('an adventurous family film under two hours, nothing scary');
    const b = parseIntent('an adventurous family film under two hours, nothing scary');
    expect(a).toEqual(b);
  });
});

describe('parseIntent — follow-ups preserve context', () => {
  const initial = parseIntent('a comedy for the family under 90 minutes');

  it('adds a mood without dropping the rest', () => {
    const parse = parseIntent('make it more adventurous, keep everything else', initial.intent);
    expect(parse.isFollowUp).toBe(true);
    expect(parse.intent.genres).toContain('comedy');
    expect(parse.intent.genres).toContain('adventure');
    expect(parse.intent.maxRuntimeMin).toBe(90);
    expect(parse.intent.requireFamilyFriendly).toBe(true);
  });

  it('reports what changed', () => {
    const parse = parseIntent('make it more adventurous, keep everything else', initial.intent);
    expect(parse.changes.some(c => c.label === 'Adventure')).toBe(true);
    expect(parse.changes.some(c => c.key === 'maxRuntimeMin')).toBe(false);
  });

  it('replaces the genre on “instead” but keeps the runtime', () => {
    const parse = parseIntent('something dramatic instead, keep the same runtime', initial.intent);
    expect(parse.intent.genres).toContain('drama');
    expect(parse.intent.genres).not.toContain('comedy');
    expect(parse.intent.maxRuntimeMin).toBe(90);
    expect(parse.intent.requireFamilyFriendly).toBe(true);
  });

  it('shortens the runtime on request and keeps the family requirement', () => {
    const parse = parseIntent('keep the family requirement but shorten the runtime', initial.intent);
    expect(parse.intent.maxRuntimeMin).toBe(60);
    expect(parse.intent.requireFamilyFriendly).toBe(true);
    expect(parse.changes.some(c => c.kind === 'decreased')).toBe(true);
  });

  it('replaces a runtime ceiling and flags the replacement', () => {
    const parse = parseIntent('make it under 120 minutes instead', initial.intent);
    expect(parse.intent.maxRuntimeMin).toBe(120);
    const change = parse.changes.find(c => c.key === 'maxRuntimeMin');
    expect(change?.kind).toBe('replaced');
    expect(change?.detail).toContain('90');
  });

  it('resets the session on request', () => {
    const parse = parseIntent('start over', initial.intent);
    expect(parse.intent).toEqual(base());
    expect(parse.changes[0].kind).toBe('reset');
  });
});

describe('parseIntent — group harmony', () => {
  it('asks for a group when none is configured', () => {
    const parse = parseIntent('find something that works for everyone');
    expect(parse.needsClarification).toBe(true);
    expect(parse.intent.groupIds).toEqual([]);
  });

  it('activates group balancing when members exist', () => {
    const parse = parseIntent('find something that works for everyone', base(), {hasGroup: true});
    expect(parse.intent.groupIds).toEqual(['__all__']);
  });
});

describe('helpers', () => {
  it('summarises an intent for the UI', () => {
    const intent = parseIntent(
      'an adventurous family film under two hours, nothing scary, in hindi',
    ).intent;
    const summary = describeIntent(intent).join(' | ');
    expect(summary).toContain('Adventure');
    expect(summary).toContain('Under 120 min');
    expect(summary).toContain('Family suitable');
    expect(summary).toContain('Nothing scary');
    expect(summary).toContain('In Hindi');
  });

  it('title-cases labels', () => {
    expect(titleCase('sci-fi')).toBe('Sci-fi');
  });
});
