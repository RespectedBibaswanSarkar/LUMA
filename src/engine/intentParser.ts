import {
  ConstraintChange,
  EMPTY_INTENT,
  Intent,
  ParseResult,
} from './types';

/**
 * Deterministic, offline intent parser.
 *
 * Design notes:
 * - Static lexicons + fixed rule order => the same utterance always produces
 *   the same Intent. Required for the deterministic-ranking contract and for
 *   the Jest suite.
 * - Every recognised constraint emits a ConstraintChange so the UI can show
 *   exactly what was added, replaced or removed.
 * - When nothing can be inferred confidently we ask a short clarification
 *   question instead of silently guessing.
 */

export const GENRE_SYNONYMS: Record<string, string> = {
  comedy: 'comedy',
  comedies: 'comedy',
  comedic: 'comedy',
  funny: 'comedy',
  humorous: 'comedy',
  humor: 'comedy',
  horror: 'horror',
  thriller: 'thriller',
  thrillers: 'thriller',
  action: 'action',
  adventure: 'adventure',
  adventures: 'adventure',
  adventurous: 'adventure',
  drama: 'drama',
  dramas: 'drama',
  dramatic: 'drama',
  'sci-fi': 'sci-fi',
  scifi: 'sci-fi',
  'science fiction': 'sci-fi',
  fantasy: 'fantasy',
  animation: 'animation',
  animated: 'animation',
  cartoons: 'animation',
  cartoon: 'animation',
  mystery: 'mystery',
  mysteries: 'mystery',
  detective: 'mystery',
  crime: 'crime',
  romance: 'romance',
  'love story': 'romance',
  documentary: 'documentary',
  documentaries: 'documentary',
  music: 'music',
  musical: 'music',
  musicals: 'music',
  sports: 'sports',
  family: 'family',
};

export const MOOD_SYNONYMS: Record<string, string> = {
  uplifting: 'uplifting',
  'feel-good': 'uplifting',
  'feel good': 'uplifting',
  positive: 'uplifting',
  funny: 'funny',
  hilarious: 'funny',
  adventurous: 'adventurous',
  exciting: 'exciting',
  thrilling: 'exciting',
  tense: 'tense',
  suspenseful: 'tense',
  scary: 'scary',
  terrifying: 'scary',
  frightening: 'scary',
  cozy: 'cozy',
  cosy: 'cozy',
  relaxing: 'cozy',
  gentle: 'cozy',
  calm: 'cozy',
  heartwarming: 'heartwarming',
  'heart-warming': 'heartwarming',
  sweet: 'heartwarming',
  touching: 'heartwarming',
  emotional: 'emotional',
  moving: 'emotional',
  thoughtful: 'thoughtful',
  meaningful: 'thoughtful',
  dark: 'dark',
  bleak: 'dark',
  inspiring: 'inspiring',
  motivating: 'inspiring',
  witty: 'witty',
  romantic: 'romantic',
  intense: 'intense',
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  ninety: 90,
  hundred: 100,
};

const toMinutes = (value: string, unit: string): number | null => {
  const num = NUMBER_WORDS[value] ?? parseInt(value, 10);
  if (Number.isNaN(num)) {
    return null;
  }
  return /^h/.test(unit) ? num * 60 : num;
};

const capitalise = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

export const uniq = (items: string[]): string[] => Array.from(new Set(items));

const clone = (intent: Intent): Intent => ({
  ...intent,
  genres: [...intent.genres],
  moods: [...intent.moods],
  excludedGenres: [...intent.excludedGenres],
  groupIds: [...intent.groupIds],
});

const change = (
  key: ConstraintChange['key'],
  label: string,
  kind: ConstraintChange['kind'],
  detail?: string,
): ConstraintChange => ({key, label, kind, detail});

const RESET_RE =
  /\b(start over|start again|fresh start|reset|clear (?:that|it|everything|the request)|never ?mind|forget (?:it|that)|cancel|new request)\b/;

const KEEP_RE = /\b(keep|retain|hold on to)\b/;

const FOLLOW_UP_RE =
  /\b(more|less|too|instead|also|but|shorter|longer|funnier|lighter|darker|warmer)\b/;

const GROUP_RE =
  /\b(works for everyone|for everyone|for all of us|all of us|everyone can agree|the whole group|the entire group|something we can all watch|agree on)\b/;

const FAMILY_RE =
  /\b(family movie night|family night|family films?|family movies?|family[-\s]friendly|for (?:the )?(?:whole |entire )?family|whole family|for (?:the )?kids|kid[-\s]friendly|for children|suitable for children|appropriate for (?:children|kids)|child[-\s]friendly|age appropriate|for my (?:son|daughter|kids|child)|for our (?:son|daughter|kids|child)|with (?:the )?children)\b/;

const NO_SCARY_RE =
  /\b(nothing scary|nothing too scary|not scary|no scares|no scary bits|avoid anything scary|nothing frightening|nothing too frightening|no gore|nothing gory)\b/;

const LOW_INTENSITY_RE =
  /\b(nothing too intense|not too intense|low intensity|nothing intense|keep it mild|mild|gentle on the eyes)\b/;

const MODERATE_INTENSITY_RE = /\b(moderate intensity|medium intensity|moderately intense)\b/i;

const LANGUAGE_RE =
  /\b(?:in\s+)?(hindi|english|tamil|telugu|bengali|marathi|malayalam|spanish|french|japanese|korean|german)\s*(?:film|movie|show|series)?\b/i;

/** True when the text immediately before a word negates it. */
export const isNegated = (before: string): boolean =>
  /\b(no|nothing|not|without|avoid|minus|never|non)\b[^,;.]*$/.test(before);

const FUNNY_RE = /\b(funnier|more funny|more comedic|more humour|more humor|make it funny|make it funnier)\b/;
const ADVENTURE_RE = /\b(more adventurous|much more adventurous|way more adventurous|more adventure|add some adventure)\b/;
const SHORTER_RE = /\b(shorter|shorten)\b/;
const LONGER_RE = /\b(longer|extend)\b/;
const INSTEAD_RE = /\binstead\b/;

const NEGATION_RE = /\b(no|without|avoid|minus|exclude|skip)\s+(?:any\s+)?[a-z-]+\s*$/;

/** Everything the lexicon could recognise in one utterance. */
interface Pieces {
  genres: string[];
  moods: string[];
  excludedGenres: string[];
  maxRuntime?: number;
  minRuntime?: number;
  familyFriendly: boolean;
  noScary: boolean;
  maxIntensity?: 'low' | 'medium' | 'high';
  language?: string;
  wantsShorter: boolean;
  wantsLonger: boolean;
  matched: string[];
}

const MIN_RUNTIME_RE =
  /\b(at least|minimum of|no shorter than|longer than|more than)\s*(\d{1,3}|one|two|three|four|five|six|seven|eight|ninety|hundred)\s*(hours?|hrs?|h\b|minutes?|mins?|m\b)/;

const MAX_RUNTIME_RE =
  /\b(under|below|less than|within|at most|no longer than|shorter than|maximum of)?\s*(\d{1,3}|one|two|three|four|five|six|seven|eight|ninety|hundred)\s*(hours?|hrs?|h\b|minutes?|mins?|m\b)/;

const analyse = (text: string): Pieces => {
  const pieces: Pieces = {
    genres: [],
    moods: [],
    excludedGenres: [],
    familyFriendly: false,
    noScary: false,
    wantsShorter: false,
    wantsLonger: false,
    matched: [],
  };

  // 1. Exclusions first, so "no horror" never also reads as a genre request.
  const words = text.split(' ');
  for (let i = 0; i < words.length; i++) {
    const prev = words[i - 1] ?? '';
    if (NEGATION_RE.test(`${prev} ${words[i]}`)) {
      const genre =
        GENRE_SYNONYMS[words[i]] ?? GENRE_SYNONYMS[words[i].replace(/s$/, '')];
      if (genre && !pieces.excludedGenres.includes(genre)) {
        pieces.excludedGenres.push(genre);
        pieces.matched.push(`no ${genre}`);
      }
    }
  }

  // 2. Runtime (positive minimum first, then maximum, so the two never
  //    consume each other's phrases).
  let m = MIN_RUNTIME_RE.exec(text);
  if (m) {
    const mins = toMinutes(m[2], m[3]);
    if (mins && mins > 0 && mins <= 600) {
      pieces.minRuntime = mins;
      pieces.matched.push(m[0].trim());
    }
  }
  const maxMatches = text.match(new RegExp(MAX_RUNTIME_RE.source, 'g')) ?? [];
  for (const candidate of maxMatches) {
    if (MIN_RUNTIME_RE.test(candidate)) {
      continue;
    }
    const mm = MAX_RUNTIME_RE.exec(candidate);
    if (!mm) {
      continue;
    }
    const mins = toMinutes(mm[2], mm[3]);
    if (mins && mins > 0 && mins <= 600) {
      pieces.maxRuntime = mins;
      pieces.matched.push(candidate.trim());
    }
  }
  if (pieces.maxRuntime !== undefined && pieces.maxRuntime <= 0) {
    pieces.maxRuntime = undefined;
  }
  if (SHORTER_RE.test(text)) {
    pieces.wantsShorter = true;
    pieces.matched.push('shorter');
  }
  if (LONGER_RE.test(text)) {
    pieces.wantsLonger = true;
    pieces.matched.push('longer');
  }

  // 3. Genres and moods, skipping anything a negation word applies to
  //    ("no horror", "nothing scary", "not too intense").
  for (const [phrase, genre] of Object.entries(GENRE_SYNONYMS)) {
    const re = new RegExp(`(?:^|\\s)${phrase}(?:\\s|$)`, 'i');
    const hit = re.exec(text);
    if (!hit) {
      continue;
    }
    if (isNegated(text.slice(Math.max(0, hit.index - 24), hit.index))) {
      continue;
    }
    if (!pieces.genres.includes(genre)) {
      pieces.genres.push(genre);
      pieces.matched.push(phrase);
    }
  }

  for (const [phrase, mood] of Object.entries(MOOD_SYNONYMS)) {
    const re = new RegExp(`(?:^|\\s)${phrase.replace(/-/g, '[-\\s]')}(?:\\s|$)`, 'i');
    const hit = re.exec(text);
    if (!hit) {
      continue;
    }
    if (isNegated(text.slice(Math.max(0, hit.index - 24), hit.index))) {
      continue;
    }
    if (!pieces.moods.includes(mood)) {
      pieces.moods.push(mood);
      pieces.matched.push(phrase);
    }
  }

  // 5. Suitability, intensity, language, follow-up modifiers.
  const familyHit = FAMILY_RE.exec(text);
  if (familyHit) {
    pieces.familyFriendly = true;
    pieces.matched.push(familyHit[1]);
  }
  const scaryHit = NO_SCARY_RE.exec(text);
  if (scaryHit) {
    pieces.noScary = true;
    pieces.matched.push(scaryHit[1]);
  }
  const lowHit = LOW_INTENSITY_RE.exec(text);
  if (lowHit) {
    pieces.maxIntensity = 'low';
    pieces.matched.push(lowHit[1]);
  }
  const modHit = MODERATE_INTENSITY_RE.exec(text);
  if (modHit) {
    pieces.maxIntensity = 'medium';
    pieces.matched.push(modHit[1]);
  }
  if (FUNNY_RE.test(text)) {
    pieces.matched.push('funnier');
    if (!pieces.moods.includes('funny')) {
      pieces.moods.push('funny');
    }
    if (!pieces.genres.includes('comedy')) {
      pieces.genres.push('comedy');
    }
  }
  if (ADVENTURE_RE.test(text)) {
    pieces.matched.push('more adventurous');
    if (!pieces.moods.includes('adventurous')) {
      pieces.moods.push('adventurous');
    }
    if (!pieces.genres.includes('adventure')) {
      pieces.genres.push('adventure');
    }
  }
  const langHit = LANGUAGE_RE.exec(text);
  if (langHit) {
    pieces.language = langHit[1];
    pieces.matched.push(langHit[0]);
  }

  return pieces;
};

const FILLER_RE =
  /^(?:can you |could you |please |i (?:want|need|would like) (?:to watch |something )?|let's (?:watch|find) )?(?:find |get |show me |look for |give me )?/;

export interface ParseOptions {
  /** The user has configured at least one Group Harmony member. */
  hasGroup?: boolean;
}

/**
 * Parse a user utterance into an updated Intent plus a user-visible change log.
 */
export const parseIntent = (
  text: string,
  current: Intent = EMPTY_INTENT,
  options: ParseOptions = {},
): ParseResult => {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  const matched: string[] = [];

  if (RESET_RE.test(normalized)) {
    return {
      intent: clone(EMPTY_INTENT),
      changes: [change('session', 'Session cleared', 'reset', 'All constraints removed')],
      needsClarification: true,
      clarification: 'Starting fresh — what are you in the mood for?',
      recognized: true,
      isFollowUp: false,
      matchedPhrases: [RESET_RE.exec(normalized)?.[1] ?? 'start over'],
    };
  }

  const keepsSomething = KEEP_RE.test(normalized);
  const looksLikeFollowUp = FOLLOW_UP_RE.test(normalized) || keepsSomething;

  const pieces = analyse(normalized.replace(FILLER_RE, ''));
  matched.push(...pieces.matched);

  const groupRequested = GROUP_RE.test(normalized);
  if (groupRequested) {
    matched.push(GROUP_RE.exec(normalized)?.[1] ?? 'works for everyone');
  }

  if (groupRequested && !options.hasGroup) {
    return {
      intent: clone(current),
      changes: [],
      needsClarification: true,
      clarification:
        'I need a group to balance. Open Group Harmony, add your viewers, then ask again.',
      recognized: false,
      isFollowUp: false,
      matchedPhrases: uniq(matched),
    };
  }

  const hasPriorConstraints =
    current.genres.length > 0 ||
    current.moods.length > 0 ||
    current.maxRuntimeMin !== undefined ||
    current.requireFamilyFriendly ||
    current.noScary ||
    current.excludedGenres.length > 0;

  // A refinement of an existing request keeps everything not being changed.
  const base = looksLikeFollowUp && hasPriorConstraints ? clone(current) : clone(EMPTY_INTENT);
  const changes: ConstraintChange[] = [];

  if (groupRequested) {
    base.groupIds = ['__all__'];
    changes.push(change('groupIds', 'Group balance', 'added', 'Balancing every group member'));
  }

  // --- runtime ----------------------------------------------------------
  if (pieces.maxRuntime !== undefined) {
    const prev = base.maxRuntimeMin;
    base.maxRuntimeMin = pieces.maxRuntime;
    changes.push(
      change(
        'maxRuntimeMin',
        `Under ${pieces.maxRuntime} min`,
        prev !== undefined && prev !== pieces.maxRuntime ? 'replaced' : 'added',
        prev !== undefined && prev !== pieces.maxRuntime ? `Was under ${prev} min` : undefined,
      ),
    );
  } else if (pieces.wantsShorter) {
    if (base.maxRuntimeMin === undefined) {
      return {
        intent: clone(current),
        changes: [],
        needsClarification: true,
        clarification: 'How long is OK? Try “under 90 minutes”.',
        recognized: false,
        isFollowUp: looksLikeFollowUp,
        matchedPhrases: uniq(matched),
      };
    }
    base.maxRuntimeMin = Math.max(45, base.maxRuntimeMin - 30);
    changes.push(change('maxRuntimeMin', `Under ${base.maxRuntimeMin} min`, 'decreased'));
  } else if (pieces.wantsLonger) {
    base.maxRuntimeMin = Math.min(300, (base.maxRuntimeMin ?? 90) + 30);
    changes.push(change('maxRuntimeMin', `Under ${base.maxRuntimeMin} min`, 'increased'));
  }
  if (pieces.minRuntime !== undefined) {
    base.minRuntimeMin = pieces.minRuntime;
    changes.push(change('minRuntimeMin', `At least ${pieces.minRuntime} min`, 'added'));
  }

  // --- genres -----------------------------------------------------------
  for (const genre of pieces.genres) {
    if (base.genres.includes(genre)) {
      continue;
    }
    base.genres.push(genre);
    changes.push(change('genres', capitalise(genre), 'added'));
  }

  // --- moods ------------------------------------------------------------
  for (const mood of pieces.moods) {
    if (base.moods.includes(mood)) {
      continue;
    }
    base.moods.push(mood);
    changes.push(change('moods', capitalise(mood), 'added'));
  }

  // "…instead" swaps the taste preferences but keeps hard constraints.
  if (INSTEAD_RE.test(normalized)) {
    const droppedGenres = base.genres.filter(g => !pieces.genres.includes(g));
    if (droppedGenres.length) {
      base.genres = [...pieces.genres];
      changes.push(
        change('genres', droppedGenres.map(capitalise).join(', '), 'removed', 'Replaced by “instead”'),
      );
    }
    const droppedMoods = base.moods.filter(m => !pieces.moods.includes(m));
    if (droppedMoods.length) {
      base.moods = [...pieces.moods];
      changes.push(change('moods', droppedMoods.map(capitalise).join(', '), 'removed'));
    }
  }

  // --- exclusions -------------------------------------------------------
  for (const genre of pieces.excludedGenres) {
    if (!base.excludedGenres.includes(genre)) {
      base.excludedGenres.push(genre);
      changes.push(change('excludedGenres', `No ${capitalise(genre)}`, 'added'));
    }
    base.genres = base.genres.filter(g => g !== genre);
  }

  // --- suitability / intensity / language -------------------------------
  if (pieces.familyFriendly && !base.requireFamilyFriendly) {
    base.requireFamilyFriendly = true;
    changes.push(
      change('requireFamilyFriendly', 'Family suitable', 'added', 'Verified family titles only'),
    );
  }
  if (pieces.noScary && !base.noScary) {
    base.noScary = true;
    changes.push(change('noScary', 'Nothing scary', 'added'));
  }
  if (pieces.maxIntensity) {
    const prev = base.maxIntensity;
    base.maxIntensity = pieces.maxIntensity;
    changes.push(
      change(
        'maxIntensity',
        `${capitalise(pieces.maxIntensity)} intensity max`,
        prev && prev !== pieces.maxIntensity ? 'replaced' : 'added',
      ),
    );
  }
  if (pieces.language) {
    base.language = capitalise(pieces.language);
    changes.push(change('language', `In ${base.language}`, 'added'));
  }

  // "more adventurous" with nothing on screen yet is a modifier, not a
  // request — ask for a base request rather than inventing one.
  const modifierWithoutBase =
    !hasPriorConstraints &&
    /^\s*(?:make (?:it |me )?|get |can i have )?(?:more|less|shorter|longer|too|much more)\b/.test(
      normalized,
    );

  const recognized = changes.length > 0;

  if (modifierWithoutBase) {
    return {
      intent: clone(current),
      changes: [],
      needsClarification: true,
      clarification:
        'Tell me the kind of film first — for example “a funny family film under 90 minutes”.',
      recognized: false,
      isFollowUp: true,
      matchedPhrases: uniq(matched),
    };
  }

  if (!recognized) {
    // A bare modifier with nothing to modify, or an unrecognised request.
    const needsBase = looksLikeFollowUp && !hasPriorConstraints;
    return {
      intent: clone(current),
      changes: [],
      needsClarification: true,
      clarification: needsBase
        ? 'Tell me the kind of film first — for example “a funny family film under 90 minutes”.'
        : 'I could not read a constraint in that. Try a genre, a mood, a runtime like “under 90 minutes”, or “suitable for children”.',
      recognized: false,
      isFollowUp: looksLikeFollowUp,
      matchedPhrases: uniq(matched),
    };
  }

  return {
    intent: base,
    changes,
    needsClarification: false,
    recognized: true,
    isFollowUp: looksLikeFollowUp && hasPriorConstraints,
    matchedPhrases: uniq(matched),
  };
};

/** Human summary of the active constraints — shown in the UI intent bar. */
export const describeIntent = (intent: Intent): string[] => {
  const parts: string[] = [];
  if (intent.genres.length) {
    parts.push(intent.genres.map(capitalise).join(' · '));
  }
  if (intent.moods.length) {
    parts.push(intent.moods.map(capitalise).join(' · '));
  }
  if (intent.maxRuntimeMin !== undefined) {
    parts.push(`Under ${intent.maxRuntimeMin} min`);
  }
  if (intent.minRuntimeMin !== undefined) {
    parts.push(`At least ${intent.minRuntimeMin} min`);
  }
  if (intent.requireFamilyFriendly) {
    parts.push('Family suitable');
  }
  if (intent.noScary) {
    parts.push('Nothing scary');
  }
  if (intent.maxIntensity) {
    parts.push(`${capitalise(intent.maxIntensity)} intensity max`);
  }
  if (intent.language) {
    parts.push(`In ${intent.language}`);
  }
  if (intent.excludedGenres.length) {
    parts.push(`No ${intent.excludedGenres.map(capitalise).join('/')}`);
  }
  if (intent.groupIds.length) {
    parts.push('Group balance');
  }
  return parts;
};

export {capitalise as titleCase};
