import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {palette, spacing, typography} from '../theme/tokens';
import {EmptyState, FocusRow, Header, IntentBar, Screen, SectionTitle} from '../components/Shell';
import {Button, Chip} from '../components/Focusable';
import {TitleCard} from '../components/Poster';
import {useApp} from '../state/AppProvider';
import {describeIntent} from '../engine/intentParser';
import {explainExclusions} from '../engine/recommendationEngine';

const REFINE_SUGGESTIONS = [
  'Make it more adventurous, keep everything else',
  'Something funny instead, same runtime',
  'Nothing scary',
  'Nothing too intense',
];

export interface RecommendationsScreenProps {
  initialFocus?: string;
  onFocusChanged: (focusId: string) => void;
  onBack: () => void;
  onOpenTitle: (titleId: string) => void;
  onAsk: (utterance: string) => void;
}

export const RecommendationsScreen: React.FC<RecommendationsScreenProps> = ({
  initialFocus,
  onFocusChanged,
  onBack,
  onOpenTitle,
  onAsk,
}) => {
  const {session} = useApp();
  const matches = session.lastMatches ?? [];
  const labels = describeIntent(session.intent);
  const exclusions = matches.length ? explainExclusions(session.intent).slice(0, 6) : [];

  const wants = (id: string): boolean => (initialFocus ?? 'result-0') === id;

  return (
    <Screen>
      <Header
        title="Recommendations"
        subtitle={labels.length ? labels.join(' · ') : 'Ask LUMA to get tailored results'}
        onBack={onBack}
        backFirstFocus={false}
      />

      <IntentBar labels={labels} changes={session.lastChanges} />

      {matches.length === 0 ? (
        <EmptyState
          title="No results yet"
          body="LUMA shows up to three titles that verifiably satisfy your request. Ask something like “an adventurous family film under two hours” and every match will explain itself."
        />
      ) : (
        <>
          <SectionTitle>
            TOP {matches.length} FOR YOUR REQUEST · MAX SCORE 100
          </SectionTitle>
          <FocusRow>
            {matches.map((match, index) => (
              <TitleCard
                key={match.title.id}
                title={match.title}
                width={540}
                score={match.score}
                reasons={match.reasons}
                unverified={match.unverified}
                focusId={`result-${index}`}
                onFocus={() => onFocusChanged(`result-${index}`)}
                hasTVPreferredFocus={wants(`result-${index}`)}
                onPress={() => onOpenTitle(match.title.id)}
                testID={`result-${index}`}
                footer={
                  <View style={styles.footerNote}>
                    <Text style={styles.footerLabelText}>SATISFIES</Text>
                    <Text numberOfLines={3} style={styles.footerText}>
                      {match.satisfied.length ? match.satisfied.join(' · ') : '—'}
                    </Text>
                    {match.failed.length ? (
                      <Text numberOfLines={2} style={styles.footerFails}>
                        Trade-offs: {match.failed.join(' · ')}
                      </Text>
                    ) : null}
                  </View>
                }
              />
            ))}
          </FocusRow>

          <SectionTitle tone="warm">REFINE THE REQUEST</SectionTitle>
          <FocusRow>
            {REFINE_SUGGESTIONS.map((suggestion, index) => (
              <Chip
                key={suggestion}
                label={suggestion}
                prefix="›"
                onFocus={() => onFocusChanged(`refine-${index}`)}
                hasTVPreferredFocus={wants(`refine-${index}`)}
                onPress={() => onAsk(suggestion)}
                testID={`refine-${index}`}
              />
            ))}
            <Button
              label="Back to conversation"
              onFocus={() => onFocusChanged('results-chat')}
              hasTVPreferredFocus={wants('results-chat')}
              onPress={onBack}
              testID="results-chat"
            />
          </FocusRow>

          {exclusions.length ? (
            <View style={styles.exclusionPanel}>
              <Text style={styles.exclusionTitle}>
                FILTERED OUT OF THE CATALOGUE — {explainExclusions(session.intent).length} TITLES
              </Text>
              {exclusions.map(({title, why}) => (
                <Text key={title.id} numberOfLines={1} style={styles.exclusionLine}>
                  {title.title} — {why}
                </Text>
              ))}
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  footerNote: {
    marginTop: spacing.sm,
    backgroundColor: palette.backgroundSecondary,
    borderRadius: 12,
    padding: spacing.sm,
  },
  footerLabelText: {
    ...typography.caption,
    color: palette.textSecondary,
    letterSpacing: 2,
    fontSize: 18,
  },
  footerText: {...typography.caption, fontSize: 20, color: palette.success, marginTop: 2},
  footerFails: {...typography.caption, fontSize: 19, color: palette.highlight, marginTop: 2},
  exclusionPanel: {
    marginTop: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: palette.border,
    paddingLeft: spacing.md,
  },
  exclusionTitle: {
    ...typography.caption,
    color: palette.textSecondary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  exclusionLine: {...typography.caption, fontSize: 19, color: palette.textDisabled},
});
