import {Intensity, Title} from './types';

/**
 * Explanation strings.
 *
 * Every sentence produced here is derived from an actual catalogue field or an
 * actual constraint in the user's request. Nothing is invented, and unknown
 * metadata is always surfaced as unknown rather than assumed safe.
 */

const ORDINAL: Record<Exclude<Intensity, 'unknown'>, number> = {low: 1, medium: 2, high: 3};

export const intensityRank = (value: Intensity): number | null =>
  value === 'unknown' ? null : ORDINAL[value];

const INTENSITY_WORD: Record<Exclude<Intensity, 'unknown'>, string> = {
  low: 'Gentle',
  medium: 'Moderate',
  high: 'Intense',
};

export const intensityWord = (value: Intensity): string =>
  value === 'unknown' ? 'Unknown intensity' : INTENSITY_WORD[value];

export const genreReason = (title: Title, matched: string[]): string | null => {
  if (!matched.length) {
    return null;
  }
  if (matched.length === 1) {
    return `${title.title} is ${matched[0]} — exactly the genre you asked for.`;
  }
  return `${title.title} blends ${matched.join(' and ')}, matching the genres you asked for.`;
};

export const moodReason = (matched: string[]): string | null => {
  if (!matched.length) {
    return null;
  }
  return `Mood fit: ${matched.join(', ')}.`;
};

export const runtimeReason = (title: Title, max?: number, min?: number): string | null => {
  if (max !== undefined && min !== undefined) {
    return `${title.runtimeMin} min — inside your ${min}-${max} minute window.`;
  }
  if (max !== undefined) {
    return `${title.runtimeMin} min — comfortably under your ${max} minute limit.`;
  }
  if (min !== undefined) {
    return `${title.runtimeMin} min — longer than your ${min} minute minimum.`;
  }
  return null;
};

export const familyReason = (title: Title): string => {
  if (title.familyFriendly === true) {
    return `Verified family-suitable (rated ${title.contentRating}).`;
  }
  if (title.familyFriendly === false) {
    return `Not marked family-suitable (rated ${title.contentRating}).`;
  }
  return `Family suitability is unverified in LUMA's catalogue (rated ${title.contentRating}).`;
};

export const intensityReason = (title: Title, max?: Exclude<Intensity, 'unknown'>): string => {
  if (title.intensity === 'unknown') {
    return 'Intensity is unverified, so LUMA cannot promise it stays below your limit.';
  }
  const word = intensityWord(title.intensity);
  if (max) {
    return `${word} intensity — within your ${INTENSITY_WORD[max].toLowerCase()} ceiling.`;
  }
  return `${word} intensity.`;
};

export const scaryReason = (title: Title): string => {
  if (title.scary === false) {
    return 'Not flagged as frightening.';
  }
  if (title.scary === true) {
    return 'Flagged as frightening.';
  }
  return 'Frightening content is unverified.';
};

export const languageReason = (title: Title, language?: string): string | null =>
  language ? `Available in ${language}.` : null;
