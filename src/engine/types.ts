/**
 * Domain model for LUMA.
 *
 * Everything in `src/engine/**` is pure TypeScript with no React Native
 * imports, so it runs identically on the device, in Jest, and (in the future)
 * inside any agent runtime that imports the same modules.
 */

/** Intensity of a title. `unknown` means the catalogue has no verified value. */
export type Intensity = 'low' | 'medium' | 'high' | 'unknown';

/** Tri-state for catalogue facts that may be missing. */
export type Trilean = true | false | 'unknown';

export interface Title {
  id: string;
  title: string;
  year: number;
  /** Runtime in minutes. Catalogue value, never inferred. */
  runtimeMin: number;
  genres: string[];
  /** Mood tags used for explainable mood matching. */
  moods: string[];
  intensity: Intensity;
  /** Whether the title is frightening. `unknown` is never treated as "safe". */
  scary: Trilean;
  /** Whether the title is suitable for children. `unknown` is never treated as "safe". */
  familyFriendly: Trilean;
  /** Content rating from the public rating body, e.g. "PG". */
  contentRating: string;
  languages: string[];
  description: string;
}

/**
 * A structured viewing request. Every field is optional; an empty Intent
 * means "no constraints yet".
 */
export interface Intent {
  genres: string[];
  moods: string[];
  excludedGenres: string[];
  maxRuntimeMin?: number;
  minRuntimeMin?: number;
  /** Require a verified family-suitable title. */
  requireFamilyFriendly: boolean;
  /** Exclude titles verified as frightening. */
  noScary: boolean;
  /** Upper bound on intensity. Unknown intensity never satisfies this. */
  maxIntensity?: Exclude<Intensity, 'unknown'>;
  language?: string;
  /** Group Harmony member ids whose preferences should be applied. */
  groupIds: string[];
}

export const EMPTY_INTENT: Intent = {
  genres: [],
  moods: [],
  excludedGenres: [],
  requireFamilyFriendly: false,
  noScary: false,
  groupIds: [],
};

export type ConstraintKey =
  | 'genres'
  | 'moods'
  | 'excludedGenres'
  | 'maxRuntimeMin'
  | 'minRuntimeMin'
  | 'requireFamilyFriendly'
  | 'noScary'
  | 'maxIntensity'
  | 'language'
  | 'groupIds';

export type ChangeKind = 'added' | 'removed' | 'replaced' | 'increased' | 'decreased' | 'reset';

/** A single, user-visible change to the active request. */
export interface ConstraintChange {
  key: ConstraintKey | 'session';
  label: string;
  kind: ChangeKind;
  detail?: string;
}

export interface ParseResult {
  /** The intent after applying this utterance. */
  intent: Intent;
  /** Human-readable description of what changed. */
  changes: ConstraintChange[];
  /** True when the utterance could not be interpreted confidently. */
  needsClarification: boolean;
  clarification?: string;
  /** True when at least one constraint was recognised. */
  recognized: boolean;
  /** True when this utterance was treated as a refinement of an existing request. */
  isFollowUp: boolean;
  /** Raw phrases that matched the lexicon — surfaced in the UI for trust. */
  matchedPhrases: string[];
}

export interface MatchResult {
  title: Title;
  /** 0-100, deterministic, documented in README. */
  score: number;
  /** Constraints this title verifiably satisfies. */
  satisfied: string[];
  /** Constraints that could not be verified from catalogue metadata. */
  unverified: string[];
  /** Constraints this title verifiably fails. */
  failed: string[];
  /** Short, data-derived explanation sentences. */
  reasons: string[];
  /** Hard-filter result. Only passing titles are recommended. */
  passes: boolean;
}

export interface GroupMember {
  id: string;
  name: string;
  likedGenres: string[];
  dislikedGenres: string[];
  /** Upper bound this member is comfortable with. */
  maxIntensity: Exclude<Intensity, 'unknown'>;
  /** Member only accepts verified family-suitable titles. */
  childSafeOnly: boolean;
}

export interface MemberCompatibility {
  memberId: string;
  memberName: string;
  satisfied: string[];
  unsatisfied: string[];
  unverified: string[];
}

export interface CompatibilityResult {
  title: Title;
  /** 0-100. Documented formula in README; derived only from explicit fields. */
  score: number;
  perMember: MemberCompatibility[];
  tradeoffs: string[];
}

export type Sender = 'user' | 'luma';

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  /** ISO timestamp. */
  at: string;
  /** Optional structured payload attached by the engine. */
  intentSnapshot?: Intent;
  titleIds?: string[];
}

export interface SessionState {
  intent: Intent;
  messages: Message[];
  lastChanges: ConstraintChange[];
  /** Ids of the most recent recommendations, newest first. */
  recentTitleIds: string[];
  groupMembers: GroupMember[];
  /** Title currently open on the details screen. */
  focusedTitleId?: string;
  /** Full match objects from the most recent successful exchange. */
  lastMatches?: MatchResult[];
}

export const INTENSITY_LABEL: Record<Intensity, string> = {
  low: 'Gentle',
  medium: 'Moderate',
  high: 'Intense',
  unknown: 'Unknown intensity',
};
