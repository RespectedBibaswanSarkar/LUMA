import {hasGroupMembers, recordClarification, recordExchange} from './conversationState';
import {scoreTitleForGroup} from './groupCompatibility';
import {describeIntent, parseIntent} from './intentParser';
import {rankRecommendations} from './recommendationEngine';
import {AiProvider, LocalAiProvider} from './aiProvider';
import {Intent, MatchResult, ParseResult, SessionState} from './types';

/**
 * The single entry point the UI calls for every utterance.
 *
 * handleUtterance(state, text, ai) is a pure state transition plus one async
 * provider call; all of the intelligence lives in testable modules and this
 * function only orchestrates them.
 */

export interface LumaOutcome {
  state: SessionState;
  parse: ParseResult;
  matches: MatchResult[];
  /** LUMA's spoken-style reply text. */
  reply: string;
  provider: string;
  /** True when the optional remote provider failed and local answered. */
  fellBack: boolean;
}

const MAX_RESULTS = 3;

const buildReply = (
  parse: ParseResult,
  matches: MatchResult[],
  intent: Intent,
  groupLabel?: string,
): string => {
  if (!parse.recognized) {
    return parse.clarification ?? 'Could you rephrase that?';
  }
  const summary = describeIntent(intent).join(' · ');
  if (!matches.length) {
    return `I kept ${summary || 'your request'}, but nothing in the catalogue matches all of it. Try relaxing the runtime or the intensity limit.`;
  }
  const list = matches
    .map((m, i) => `${i + 1}. ${m.title.title} (${m.title.runtimeMin} min) — ${m.reasons[0]}`)
    .join('\n');
  const caveats = matches
    .filter(m => m.unverified.length)
    .map(m => `${m.title.title}: ${m.unverified.join(', ')}`)
    .join('; ');
  const header = parse.isFollowUp
    ? `Updated — ${summary}. Still your best ${matches.length === 1 ? 'match' : 'matches'}:`
    : `${summary}. Here are my top ${matches.length}:`;
  return [header, list, groupLabel, caveats ? `Worth knowing: ${caveats}` : undefined]
    .filter(Boolean)
    .join('\n');
};

export const handleUtterance = async (
  state: SessionState,
  utterance: string,
  ai: AiProvider = new LocalAiProvider(),
): Promise<LumaOutcome> => {
  const response = await ai.understand({
    utterance,
    current: state.intent,
    hasGroup: hasGroupMembers(state),
  });

  // The local provider already returns a full ParseResult-shaped intent; we
  // re-run the deterministic parser for the change log so the UI can show
  // exactly what moved, regardless of which provider answered.
  const parse = parseIntent(utterance, state.intent, {hasGroup: hasGroupMembers(state)});
  const effective: ParseResult = parse.recognized
    ? parse
    : {
        ...parse,
        intent: response.intent,
        recognized:
          JSON.stringify(response.intent) !== JSON.stringify(state.intent),
        changes: [],
      };

  if (!effective.recognized) {
    return {
      state: recordClarification(state, utterance, effective),
      parse: effective,
      matches: [],
      reply: effective.clarification ?? response.explanation,
      provider: response.provider,
      fellBack: response.fellBack,
    };
  }

  const intent = effective.intent;
  const useGroup = intent.groupIds.length > 0 && state.groupMembers.length > 0;

  let scores: Record<string, number> | undefined;
  let groupLabel: string | undefined;
  if (useGroup) {
    scores = {};
    const pool = rankRecommendations({...intent, groupIds: []}, {limit: 40});
    for (const match of pool) {
      scores[match.title.id] = scoreTitleForGroup(match.title, state.groupMembers).score;
    }
    const best = Math.max(0, ...Object.values(scores));
    groupLabel = `Group balance: best compatibility ${best}% across ${state.groupMembers.length} members.`;
  }

  const matches = rankRecommendations(intent, {
    groupScores: scores,
    limit: MAX_RESULTS,
  });

  const reply = buildReply(effective, matches, intent, groupLabel);

  return {
    state: {
      ...recordExchange(state, utterance, effective, reply, matches.map(m => m.title.id)),
      lastMatches: matches,
    },
    parse: effective,
    matches,
    reply,
    provider: response.provider,
    fellBack: response.fellBack,
  };
};

/** Titles for the recommendations screen, from the most recent exchange. */
export const matchesFromSession = (state: SessionState): MatchResult[] =>
  state.lastMatches ?? [];
