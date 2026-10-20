import {CATALOGUE} from './catalogue';
import {scoreTitleForGroup} from './groupCompatibility';
import {
  familyReason,
  genreReason,
  intensityReason,
  languageReason,
  moodReason,
  runtimeReason,
  scaryReason,
  intensityRank,
} from './explanationGenerator';
import {Intent, MatchResult, Title} from './types';

/**
 * Deterministic filtering and ranking.
 *
 * Two stages:
 *   1. Hard filters — a title that verifiably violates a constraint is
 *      removed. Verified-unknown metadata is never treated as a pass; those
 *      titles stay in the pool but are flagged and scored down.
 *   2. Scoring — a weighted percentage of the constraints the user actually
 *      asked for. Same input, same output, every time. Ties break on title.
 *
 * The full formula is documented in README.md.
 */

export const WEIGHTS = {
  base: 10,
  genre: 25,
  mood: 20,
  runtimeMax: 15,
  runtimeMin: 10,
  family: 15,
  intensity: 15,
  scary: 15,
  language: 10,
  group: 40,
} as const;

const ordinal = (value: string): number => {
  switch (value) {
    case 'action':
      return 1;
    default:
      return 0;
  }
};

/** Stage 1: hard filters. Unknown metadata never counts as "safe". */
export const filterCatalogue = (intent: Intent, catalogue: Title[] = CATALOGUE): Title[] =>
  catalogue.filter(title => {
    if (intent.maxRuntimeMin !== undefined && title.runtimeMin > intent.maxRuntimeMin) {
      return false;
    }
    if (intent.minRuntimeMin !== undefined && title.runtimeMin < intent.minRuntimeMin) {
      return false;
    }
    if (intent.excludedGenres.some(g => title.genres.includes(g))) {
      return false;
    }
    // `false` excludes; `unknown` is kept but flagged (never assumed safe).
    if (intent.requireFamilyFriendly && title.familyFriendly === false) {
      return false;
    }
    if (intent.noScary && title.scary === true) {
      return false;
    }
    if (intent.maxIntensity) {
      const rank = intensityRank(title.intensity);
      const ceiling = intensityRank(intent.maxIntensity);
      if (rank !== null && ceiling !== null && rank > ceiling) {
        return false;
      }
    }
    if (intent.language && !title.languages.includes(intent.language)) {
      return false;
    }
    return true;
  });

interface Scored {
  score: number;
  satisfied: string[];
  unverified: string[];
  failed: string[];
  reasons: string[];
}

const scoreTitle = (
  title: Title,
  intent: Intent,
  groupScore: number | null,
): Scored => {
  let earned = WEIGHTS.base;
  let applicable = WEIGHTS.base;
  const satisfied: string[] = [];
  const unverified: string[] = [];
  const failed: string[] = [];
  const reasons: string[] = [];

  // Genres
  if (intent.genres.length) {
    applicable += WEIGHTS.genre;
    const matched = intent.genres.filter(g => title.genres.includes(g));
    earned += (WEIGHTS.genre * matched.length) / intent.genres.length;
    if (matched.length) {
      satisfied.push(`${matched.length}/${intent.genres.length} genres`);
      const reason = genreReason(title, matched);
      if (reason) {
        reasons.push(reason);
      }
    }
    const missing = intent.genres.filter(g => !title.genres.includes(g));
    if (missing.length) {
      failed.push(`Not ${missing.join(' or ')}`);
    }
  }

  // Moods
  if (intent.moods.length) {
    applicable += WEIGHTS.mood;
    const matched = intent.moods.filter(m => title.moods.includes(m));
    earned += (WEIGHTS.mood * matched.length) / intent.moods.length;
    if (matched.length) {
      satisfied.push(`${matched.length}/${intent.moods.length} moods`);
      const reason = moodReason(matched);
      if (reason) {
        reasons.push(reason);
      }
    }
    const missing = intent.moods.filter(m => !title.moods.includes(m));
    if (missing.length) {
      failed.push(`Not ${missing.join(' or ')}`);
    }
  }

  // Runtime
  if (intent.maxRuntimeMin !== undefined) {
    applicable += WEIGHTS.runtimeMax;
    if (title.runtimeMin <= intent.maxRuntimeMin) {
      earned += WEIGHTS.runtimeMax;
      satisfied.push(`Under ${intent.maxRuntimeMin} min`);
    }
    const reason = runtimeReason(title, intent.maxRuntimeMin, intent.minRuntimeMin);
    if (reason) {
      reasons.push(reason);
    }
  }
  if (intent.minRuntimeMin !== undefined) {
    applicable += WEIGHTS.runtimeMin;
    if (title.runtimeMin >= intent.minRuntimeMin) {
      earned += WEIGHTS.runtimeMin;
      satisfied.push(`At least ${intent.minRuntimeMin} min`);
    }
  }

  // Family suitability
  if (intent.requireFamilyFriendly) {
    applicable += WEIGHTS.family;
    if (title.familyFriendly === true) {
      earned += WEIGHTS.family;
      satisfied.push('Family suitable');
      reasons.push(familyReason(title));
    } else if (title.familyFriendly === 'unknown') {
      earned += 5; // partial credit only; explicitly flagged as unverified
      unverified.push('Family suitability unverified');
      reasons.push(familyReason(title));
    } else {
      failed.push('Not family suitable');
    }
  }

  // Intensity ceiling
  if (intent.maxIntensity) {
    applicable += WEIGHTS.intensity;
    const rank = intensityRank(title.intensity);
    const ceiling = intensityRank(intent.maxIntensity);
    if (rank === null) {
      earned += 5;
      unverified.push('Intensity unverified');
      reasons.push(intensityReason(title, intent.maxIntensity));
    } else if (ceiling !== null && rank <= ceiling) {
      earned += WEIGHTS.intensity;
      satisfied.push('Within intensity limit');
      reasons.push(intensityReason(title, intent.maxIntensity));
    }
  }

  // Scary content
  if (intent.noScary) {
    applicable += WEIGHTS.scary;
    if (title.scary === false) {
      earned += WEIGHTS.scary;
      satisfied.push('Not frightening');
      reasons.push(scaryReason(title));
    } else if (title.scary === 'unknown') {
      earned += 5;
      unverified.push('Frightening content unverified');
      reasons.push(scaryReason(title));
    }
  }

  // Language
  if (intent.language) {
    applicable += WEIGHTS.language;
    if (title.languages.includes(intent.language)) {
      earned += WEIGHTS.language;
      satisfied.push(`In ${intent.language}`);
      const reason = languageReason(title, intent.language);
      if (reason) {
        reasons.push(reason);
      }
    }
  }

  // Group balance
  if (intent.groupIds.length && groupScore !== null) {
    applicable += WEIGHTS.group;
    earned += (WEIGHTS.group * groupScore) / 100;
    if (groupScore >= 70) {
      satisfied.push(`Group balance ${groupScore}%`);
    } else {
      failed.push(`Group balance only ${groupScore}%`);
    }
  }

  if (!reasons.length) {
    reasons.push(`${title.title} (${title.year}) matches the shape of your request.`);
  }

  return {
    score: Math.max(0, Math.min(100, Math.round((100 * earned) / applicable))),
    satisfied,
    unverified,
    failed,
    reasons,
  };
};

export interface SearchOptions {
  /** Full group member list; used when the intent requests group balance. */
  members?: {id: string}[];
  /** Compatibility result per title id, precomputed by the caller. */
  groupScores?: Record<string, number>;
  limit?: number;
  catalogue?: Title[];
}

/** Stage 2 + explanation: full pipeline from Intent to ranked matches. */
export const rankRecommendations = (
  intent: Intent,
  options: SearchOptions = {},
): MatchResult[] => {
  const catalogue = options.catalogue ?? CATALOGUE;
  const limit = options.limit ?? 3;
  const pool = filterCatalogue(intent, catalogue);

  const scored = pool.map(title => {
    const groupScore = options.groupScores ? options.groupScores[title.id] ?? null : null;
    return {
      title,
      ...scoreTitle(title, intent, groupScore),
      passes: true,
    } satisfies MatchResult;
  });

  return scored
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.title.title.localeCompare(b.title.title) ||
        b.title.year - a.title.year,
    )
    .slice(0, limit);
};

/** Convenience wrapper used by the conversation pipeline. */
export const searchCatalogue = (intent: Intent, options: SearchOptions = {}): MatchResult[] =>
  rankRecommendations(intent, options);

/** Titles that were excluded and why — shown in the UI "what was filtered" row. */
export const explainExclusions = (intent: Intent, catalogue: Title[] = CATALOGUE) => {
  const passing = new Set(filterCatalogue(intent, catalogue).map(t => t.id));
  return catalogue
    .filter(t => !passing.has(t.id))
    .map(title => {
      let why = 'Does not match the request';
      if (intent.maxRuntimeMin !== undefined && title.runtimeMin > intent.maxRuntimeMin) {
        why = `${title.runtimeMin} min is over your ${intent.maxRuntimeMin} min limit`;
      } else if (
        intent.minRuntimeMin !== undefined &&
        title.runtimeMin < intent.minRuntimeMin
      ) {
        why = `${title.runtimeMin} min is under your ${intent.minRuntimeMin} min minimum`;
      } else if (intent.excludedGenres.some(g => title.genres.includes(g))) {
        why = `Excluded genre: ${intent.excludedGenres
          .filter(g => title.genres.includes(g))
          .join(', ')}`;
      } else if (intent.requireFamilyFriendly && title.familyFriendly === false) {
        why = 'Not marked family-suitable';
      } else if (intent.noScary && title.scary === true) {
        why = 'Flagged as frightening';
      } else if (intent.language && !title.languages.includes(intent.language)) {
        why = `Not available in ${intent.language}`;
      } else if (intent.maxIntensity) {
        const rank = intensityRank(title.intensity);
        const ceiling = intensityRank(intent.maxIntensity);
        if (rank !== null && ceiling !== null && rank > ceiling) {
          why = `Intensity ${title.intensity} is over your ${intent.maxIntensity} limit`;
        }
      }
      return {title, why};
    })
    .sort((a, b) => a.title.title.localeCompare(b.title.title));
};

export {scoreTitleForGroup};
export const _internal = {ordinal};
