import {catalogueById} from '../src/engine/catalogue';
import {DEFAULT_MEMBERS, rankForGroup, scoreTitleForGroup} from '../src/engine/groupCompatibility';
import {GroupMember, Title} from '../src/engine/types';

const member = (partial: Partial<GroupMember> & {id: string; name: string}): GroupMember => ({
  likedGenres: [],
  dislikedGenres: [],
  maxIntensity: 'medium',
  childSafeOnly: false,
  ...partial,
});

describe('scoreTitleForGroup', () => {
  it('gives a perfect score when every explicit preference is met', () => {
    const title = catalogueById('paddington-2') as Title;
    const m = member({
      id: 'm1',
      name: 'Morgan',
      likedGenres: ['comedy'],
      dislikedGenres: ['horror'],
      maxIntensity: 'low',
    });
    const result = scoreTitleForGroup(title, [m]);
    expect(result.score).toBe(100);
    expect(result.perMember[0].unsatisfied).toEqual([]);
  });

  it('counts unmet preferences against the score', () => {
    const title = catalogueById('alien') as Title;
    const m = member({id: 'm1', name: 'Morgan', likedGenres: ['comedy'], maxIntensity: 'low'});
    const result = scoreTitleForGroup(title, [m]);
    expect(result.score).toBeLessThan(100);
    expect(result.tradeoffs.length).toBeGreaterThan(0);
  });

  it('treats unknown metadata as unverified, never as satisfied', () => {
    const title = catalogueById('free-solo') as Title; // intensity + family unknown
    const m = member({
      id: 'm1',
      name: 'Morgan',
      likedGenres: ['documentary'],
      maxIntensity: 'low',
      childSafeOnly: true,
    });
    const result = scoreTitleForGroup(title, [m]);
    const unverified = result.perMember[0].unverified.join(' ');
    expect(unverified).toMatch(/Intensity unverified/);
    expect(unverified).toMatch(/Family suitability unverified/);
    // 3 signals (liked genre satisfied, intensity unverified, family unverified)
    expect(result.score).toBe(33);
  });

  it('is reproducible for the shipped default group', () => {
    const title = catalogueById('paddington') as Title;
    expect(scoreTitleForGroup(title, DEFAULT_MEMBERS)).toEqual(
      scoreTitleForGroup(title, DEFAULT_MEMBERS),
    );
  });

  it('aggregates every member', () => {
    const title = catalogueById('paddington-2') as Title;
    const result = scoreTitleForGroup(title, DEFAULT_MEMBERS);
    expect(result.perMember).toHaveLength(DEFAULT_MEMBERS.length);
  });
});

describe('rankForGroup', () => {
  it('sorts by compatibility, then title, and is deterministic', () => {
    const first = rankForGroup(
      // A set that includes both a very compatible and a very incompatible title.
      ['paddington-2', 'alien', 'the-shining', 'kubo', 'dangal'].map(id => {
        const t = catalogueById(id);
        if (!t) {
          throw new Error(`missing fixture ${id}`);
        }
        return t;
      }),
      DEFAULT_MEMBERS,
    );
    const second = rankForGroup(
      ['alien', 'the-shining', 'paddington-2', 'kubo', 'dangal'].map(id => {
        const t = catalogueById(id);
        if (!t) {
          throw new Error(`missing fixture ${id}`);
        }
        return t;
      }),
      DEFAULT_MEMBERS,
    );
    expect(first.map(r => r.title.id)).toEqual(second.map(r => r.title.id));
    for (let i = 1; i < first.length; i++) {
      expect(first[i - 1].score).toBeGreaterThanOrEqual(first[i].score);
    }
    expect(first[0].title.id).not.toBe('alien');
  });
});
