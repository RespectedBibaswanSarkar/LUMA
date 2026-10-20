import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {palette, radius, spacing, typography} from '../theme/tokens';
import {FocusRow, Header, Panel, Screen} from '../components/Shell';
import {Button, Chip} from '../components/Focusable';
import {Poster} from '../components/Poster';
import {useApp} from '../state/AppProvider';
import {catalogueById} from '../engine/catalogue';
import {INTENSITY_LABEL} from '../engine/types';

export interface DetailsScreenProps {
  titleId: string;
  initialFocus?: string;
  onFocusChanged: (focusId: string) => void;
  onBack: () => void;
  onAsk: (utterance: string) => void;
  onOpenGroup: () => void;
}

export const DetailsScreen: React.FC<DetailsScreenProps> = ({
  titleId,
  initialFocus,
  onFocusChanged,
  onBack,
  onAsk,
  onOpenGroup,
}) => {
  const {session} = useApp();
  const title = catalogueById(titleId);
  const match = (session.lastMatches ?? []).find(m => m.title.id === titleId);
  const wants = (id: string): boolean => (initialFocus ?? 'details-back') === id;

  if (!title) {
    return (
      <Screen>
        <Header title="Details" onBack={onBack} />
        <Text style={styles.missing}>That title is no longer in the catalogue.</Text>
      </Screen>
    );
  }

  const familyText =
    title.familyFriendly === true
      ? `Family-suitable (rated ${title.contentRating})`
      : title.familyFriendly === false
        ? `Not marked family-suitable (rated ${title.contentRating})`
        : `Not verified by LUMA (rated ${title.contentRating})`;

  const scaryText =
    title.scary === true ? 'Flagged as frightening' : title.scary === false ? 'Not flagged as frightening' : 'Not verified';

  return (
    <Screen>
      <Header
        title="Details"
        subtitle={title.title}
        onBack={onBack}
        backFirstFocus={wants('details-back')}
      />

      <View style={styles.body}>
        <View style={styles.left}>
          <Poster title={title} width={620} height={360} hero />
          <View style={styles.factGrid}>
            <Fact label="Runtime" value={`${title.runtimeMin} min`} />
            <Fact label="Year" value={`${title.year}`} />
            <Fact label="Rating" value={title.contentRating} />
            <Fact label="Genres" value={title.genres.join(' · ')} />
            <Fact label="Intensity" value={INTENSITY_LABEL[title.intensity]} />
            <Fact label="Suitability" value={familyText} />
            <Fact label="Frightening content" value={scaryText} />
            <Fact label="Languages" value={title.languages.join(' · ')} />
          </View>
        </View>

        <View style={styles.right}>
          <Text style={styles.titleText}>{title.title}</Text>
          <Text style={styles.description}>{title.description}</Text>

          <Panel title="WHY LUMA SHOWED YOU THIS" accent>
            {match ? (
              <>
                {match.reasons.map(reason => (
                  <Text key={reason} style={styles.reason}>
                    → {reason}
                  </Text>
                ))}
                <Text style={styles.subLabel}>CONSTRAINTS IT SATISFIES</Text>
                <Text style={styles.good}>
                  {match.satisfied.length ? match.satisfied.join(' · ') : 'No specific constraint matched'}
                </Text>
                {match.unverified.length ? (
                  <>
                    <Text style={styles.subLabel}>COULD NOT BE VERIFIED</Text>
                    <Text style={styles.warn}>{match.unverified.join(' · ')}</Text>
                  </>
                ) : null}
                {match.failed.length ? (
                  <>
                    <Text style={styles.subLabel}>TRADE-OFFS</Text>
                    <Text style={styles.warn}>{match.failed.join(' · ')}</Text>
                  </>
                ) : null}
              </>
            ) : (
              <Text style={styles.reason}>
                Opened from the catalogue rather than a recommendation — ask LUMA a request to see
                an explanation for this title.
              </Text>
            )}
          </Panel>

          <FocusRow style={styles.actions}>
            <Button
              label="‹ Back to results"
              onFocus={() => onFocusChanged('details-back')}
              hasTVPreferredFocus={wants('details-back')}
              onPress={onBack}
              testID="details-back"
            />
            <Button
              label="Refine around this"
              tone="primary"
              onFocus={() => onFocusChanged('details-refine')}
              hasTVPreferredFocus={wants('details-refine')}
              onPress={() =>
                onAsk(
                  `Keep ${title.genres[0] ?? 'this'} but nothing too intense, under ${Math.max(90, title.runtimeMin)} minutes`,
                )
              }
              testID="details-refine"
            />
            <Chip
              label="Balance it for my group"
              onFocus={() => onFocusChanged('details-group')}
              hasTVPreferredFocus={wants('details-group')}
              onPress={onOpenGroup}
              testID="details-group"
            />
          </FocusRow>

          <Text style={styles.honesty}>
            Playback is not connected: LUMA is a discovery and recommendation companion, and does
            not stream or launch titles. Availability shown is catalogue metadata only.
          </Text>
        </View>
      </View>
    </Screen>
  );
};

const Fact: React.FC<{label: string; value: string}> = ({label, value}) => (
  <View style={styles.fact}>
    <Text style={styles.factLabel}>{label}</Text>
    <Text numberOfLines={2} style={styles.factValue}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  body: {flex: 1, flexDirection: 'row'},
  left: {width: 660, paddingRight: spacing.xl},
  right: {flex: 1},
  missing: {...typography.body, color: palette.error},
  titleText: {...typography.display, fontSize: 52, lineHeight: 60, color: palette.textPrimary},
  description: {
    ...typography.body,
    color: palette.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  factGrid: {flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.lg},
  fact: {
    width: '50%',
    paddingRight: spacing.md,
    marginBottom: spacing.md,
  },
  factLabel: {
    ...typography.caption,
    color: palette.textSecondary,
    letterSpacing: 2,
    fontSize: 19,
  },
  factValue: {...typography.label, color: palette.textPrimary},
  reason: {...typography.body, fontSize: 25, color: palette.highlight, marginBottom: 6},
  subLabel: {
    ...typography.caption,
    color: palette.textSecondary,
    letterSpacing: 2,
    marginTop: spacing.sm,
    fontSize: 19,
  },
  good: {...typography.label, color: palette.success},
  warn: {...typography.label, color: palette.highlight},
  actions: {marginTop: spacing.lg, marginBottom: spacing.sm},
  honesty: {
    ...typography.caption,
    fontSize: 20,
    lineHeight: 26,
    color: palette.textDisabled,
    maxWidth: 900,
    borderLeftWidth: 3,
    borderLeftColor: palette.border,
    paddingLeft: spacing.sm,
    marginTop: spacing.sm,
    borderRadius: radius.sm,
  },
});
