import {CompatibilityResult, GroupMember, Intensity, Title} from './types';
import {intensityRank} from './explanationGenerator';

/**
 * Group Harmony — compatibility scoring.
 *
 * The score is arithmetic over explicit catalogue fields only. It is NOT a
 * model-generated percentage and carries no claim of statistical validity.
 *
 *     score = round(100 * satisfiedSignals / totalSignals)
 *
 * A "signal" is one preference statement from one member:
 *   - likedGenre          satisfied when the title has that genre
 *   - dislikedGenre       satisfied when the title lacks that genre
 *   - maxIntensity        satisfied when the title's verified intensity is at
 *                         or below the member's ceiling
 *   - childSafeOnly       satisfied when the title is verified family-suitable
 *
 * A signal whose catalogue field is `unknown` counts as unverified: it is
 * neither satisfied nor unsatisfied, but it still occupies a slot in the
 * denominator, so missing data lowers the score instead of being assumed safe.
 */

export const DEFAULT_MEMBERS: GroupMember[] = [
  {
    id: 'alex',
    name: 'Alex',
    likedGenres: ['adventure', 'comedy'],
    dislikedGenres: ['horror', 'documentary'],
    maxIntensity: 'medium',
    childSafeOnly: false,
  },
  {
    id: 'sam',
    name: 'Sam',
    likedGenres: ['comedy', 'drama'],
    dislikedGenres: ['horror', 'action'],
    maxIntensity: 'low',
    childSafeOnly: false,
  },
  {
    id: 'kiddo',
    name: 'Ravi (child)',
    likedGenres: ['animation', 'family', 'adventure'],
    dislikedGenres: ['horror', 'thriller'],
    maxIntensity: 'low',
    childSafeOnly: true,
  },
];

const label = (text: string) => text;

export const scoreTitleForGroup = (
  title: Title,
  members: GroupMember[],
): CompatibilityResult => {
  let satisfied = 0;
  let total = 0;
  const perMember = members.map(member => {
    const ok: string[] = [];
    const bad: string[] = [];
    const unknown: string[] = [];

    for (const genre of member.likedGenres) {
      total += 1;
      if (title.genres.includes(genre)) {
        satisfied += 1;
        ok.push(label(`Likes ${genre}`));
      } else {
        bad.push(label(`Wants ${genre}`));
      }
    }
    for (const genre of member.dislikedGenres) {
      total += 1;
      if (!title.genres.includes(genre)) {
        satisfied += 1;
        ok.push(label(`No ${genre}`));
      } else {
        bad.push(label(`Dislikes ${genre}`));
      }
    }

    total += 1;
    const titleRank = intensityRank(title.intensity);
    const memberRank = intensityRank(member.maxIntensity);
    if (titleRank === null) {
      unknown.push(label('Intensity unverified'));
    } else if (memberRank !== null && titleRank <= memberRank) {
      satisfied += 1;
      ok.push(label(`${member.name} is comfortable with the intensity`));
    } else {
      bad.push(label(`Too intense for ${member.name}`));
    }

    if (member.childSafeOnly) {
      total += 1;
      if (title.familyFriendly === true) {
        satisfied += 1;
        ok.push(label('Verified family-suitable'));
      } else if (title.familyFriendly === 'unknown') {
        unknown.push(label('Family suitability unverified'));
      } else {
        bad.push(label(`Not family-suitable for ${member.name}`));
      }
    }

    return {
      memberId: member.id,
      memberName: member.name,
      satisfied: ok,
      unsatisfied: bad,
      unverified: unknown,
    };
  });

  const tradeoffs: string[] = [];
  for (const m of perMember) {
    for (const item of m.unsatisfied) {
      tradeoffs.push(`${m.memberName}: ${item.toLowerCase()}`);
    }
    for (const item of m.unverified) {
      tradeoffs.push(`${m.memberName}: ${item.toLowerCase()}`);
    }
  }

  return {
    title,
    score: total === 0 ? 0 : Math.round((100 * satisfied) / total),
    perMember,
    tradeoffs,
  };
};

/** Rank a catalogue for a set of members, best compatibility first. */
export const rankForGroup = (
  catalogue: Title[],
  members: GroupMember[],
  limit = 3,
): CompatibilityResult[] =>
  catalogue
    .map(title => scoreTitleForGroup(title, members))
    .sort((a, b) => b.score - a.score || a.title.title.localeCompare(b.title.title))
    .slice(0, limit);

export const intensityCeilingLabel = (value: Exclude<Intensity, 'unknown'>) => value;
