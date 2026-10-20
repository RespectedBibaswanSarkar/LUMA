import {CATALOGUE} from '../src/engine/catalogue';
import {
  explainExclusions,
  filterCatalogue,
  rankRecommendations,
} from '../src/engine/recommendationEngine';
import {EMPTY_INTENT, Intent} from '../src/engine/types';

const intent = (partial: Partial<Intent>): Intent => ({...EMPTY_INTENT, ...partial});

describe('filterCatalogue — hard constraints', () => {
  it('respects the runtime ceiling', () => {
    const results = filterCatalogue(intent({maxRuntimeMin: 90}));
    expect(results.length).toBeGreaterThan(0);
    for (const title of results) {
      expect(title.runtimeMin).toBeLessThanOrEqual(90);
    }
  });

  it('respects the runtime floor', () => {
    const results = filterCatalogue(intent({minRuntimeMin: 120}));
    for (const title of results) {
      expect(title.runtimeMin).toBeGreaterThanOrEqual(120);
    }
  });

  it('removes excluded genres', () => {
    const results = filterCatalogue(intent({excludedGenres: ['horror']}));
    expect(results.length).toBeGreaterThan(0);
    for (const title of results) {
      expect(title.genres).not.toContain('horror');
    }
  });

  it('removes titles verified as not family suitable, keeps unknown ones', () => {
    const results = filterCatalogue(intent({requireFamilyFriendly: true}));
    for (const title of results) {
      expect(title.familyFriendly).not.toBe(false);
    }
    expect(results.some(t => t.familyFriendly === 'unknown')).toBe(true);
  });

  it('removes titles verified as frightening', () => {
    const results = filterCatalogue(intent({noScary: true}));
    for (const title of results) {
      expect(title.scary).not.toBe(true);
    }
  });

  it('filters by language', () => {
    const results = filterCatalogue(intent({language: 'Hindi'}));
    expect(results.map(t => t.id)).toEqual(
      expect.arrayContaining(['dangal', 'hichki', 'lunchbox']),
    );
    for (const title of results) {
      expect(title.languages).toContain('Hindi');
    }
  });

  it('enforces the intensity ceiling but never treats unknown as safe', () => {
    const results = filterCatalogue(intent({maxIntensity: 'low'}));
    for (const title of results) {
      expect(['low', 'unknown']).toContain(title.intensity);
    }
    expect(results.some(t => t.intensity === 'unknown')).toBe(true);
  });
});

describe('rankRecommendations', () => {
  it('returns at most three results', () => {
    expect(rankRecommendations(intent({genres: ['comedy']})).length).toBeLessThanOrEqual(3);
  });

  it('is deterministic across runs', () => {
    const i = intent({genres: ['adventure'], moods: ['funny'], maxRuntimeMin: 120});
    expect(rankRecommendations(i)).toEqual(rankRecommendations(i));
  });

  it('prefers titles that verifiably match', () => {
    const results = rankRecommendations(
      intent({genres: ['comedy'], moods: ['funny'], maxRuntimeMin: 120}),
    );
    expect(results.length).toBeGreaterThan(0);
    for (const result of results) {
      expect(result.title.genres).toContain('comedy');
      expect(result.score).toBeGreaterThan(0);
    }
  });

  it('explains each result from catalogue facts', () => {
    const results = rankRecommendations(intent({genres: ['animation'], maxRuntimeMin: 120}));
    expect(results[0].reasons.length).toBeGreaterThan(0);
    expect(results[0].satisfied.length).toBeGreaterThan(0);
  });

  it('flags unverifiable constraints instead of assuming safety', () => {
    const results = rankRecommendations(intent({noScary: true}));
    const unknownScary = results.find(t => t.title.scary === 'unknown');
    if (unknownScary) {
      expect(unknownScary.unverified.join(' ')).toMatch(/unverified/i);
    }
  });

  it('blends a precomputed group score when supplied', () => {
    const plain = rankRecommendations(intent({genres: ['comedy']}));
    const grouped = rankRecommendations(intent({genres: ['comedy'], groupIds: ['__all__']}), {
      groupScores: {[plain[0].title.id]: 100},
    });
    const sameTitle = grouped.find(m => m.title.id === plain[0].title.id);
    expect(sameTitle).toBeDefined();
    expect(sameTitle!.satisfied.some(s => s.startsWith('Group balance'))).toBe(true);
  });

  it('returns nothing when the constraints are impossible', () => {
    expect(rankRecommendations(intent({maxRuntimeMin: 30}))).toEqual([]);
  });
});

describe('explainExclusions', () => {
  it('names a concrete reason for every excluded title', () => {
    const exclusions = explainExclusions(intent({maxRuntimeMin: 90}));
    expect(exclusions.length).toBeGreaterThan(0);
    expect(exclusions[0].why).toMatch(/90 min/);
  });
});

describe('catalogue integrity', () => {
  it('has unique ids and complete records', () => {
    const ids = CATALOGUE.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const title of CATALOGUE) {
      expect(title.runtimeMin).toBeGreaterThan(0);
      expect(title.genres.length).toBeGreaterThan(0);
      expect(title.description.length).toBeGreaterThan(10);
      expect(['low', 'medium', 'high', 'unknown']).toContain(title.intensity);
      expect([true, false, 'unknown']).toContain(title.familyFriendly);
      expect([true, false, 'unknown']).toContain(title.scary);
    }
  });

  it('covers enough variety to make filtering meaningful', () => {
    expect(CATALOGUE.length).toBeGreaterThanOrEqual(24);
    expect(CATALOGUE.filter(t => t.scary === true).length).toBeGreaterThanOrEqual(3);
    expect(CATALOGUE.filter(t => t.familyFriendly === true).length).toBeGreaterThanOrEqual(8);
  });
});
