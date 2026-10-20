import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {TVFocusGuideView} from '@amazon-devices/react-native-kepler';
import {palette, radius, spacing, typography} from '../theme/tokens';
import {Header, FocusRow, Screen, SectionTitle, StatusPill} from '../components/Shell';
import {Chip, Button, Focusable} from '../components/Focusable';
import {Poster} from '../components/Poster';
import {VoicePanel} from '../components/VoicePanel';
import {useApp} from '../state/AppProvider';
import {CATALOGUE, catalogueById} from '../engine/catalogue';

/** Scripted utterances shown as one-press entry points on Home. */
export const SUGGESTED_REQUESTS = [
  'An adventurous family movie night, nothing too scary, under two hours',
  'Something uplifting in 90 minutes',
  'An adventurous film without horror',
  'A quick comedy for tonight',
];

const FEATURED_IDS = [
  'paddington-2',
  'spider-verse',
  'knives-out',
  'coco',
  'grand-budapest',
  'kubo',
];

export interface HomeScreenProps {
  /** Last focused id for this screen — restores focus after Back. */
  initialFocus?: string;
  onFocusChanged: (focusId: string) => void;
  onAsk: (utterance: string) => void;
  onOpenChat: () => void;
  onOpenGroup: () => void;
  onOpenTitle: (titleId: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  initialFocus,
  onFocusChanged,
  onAsk,
  onOpenChat,
  onOpenGroup,
  onOpenTitle,
}) => {
  const {session, status, providerLabel, resetSessionNow} = useApp();

  const featured = useMemo(
    () =>
      FEATURED_IDS.map(catalogueById).filter((t): t is NonNullable<typeof t> => Boolean(t)),
    [],
  );

  const recent = session.recentTitleIds
    .map(catalogueById)
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .slice(0, 4);

  const wants = (id: string): boolean => (initialFocus ?? 'voice-entry') === id;

  return (
    <Screen>
      <Header
        title="Discover"
        subtitle="Tell LUMA what fits tonight"
        right={<StatusPill status={status} provider={providerLabel} />}
      />

      <View style={styles.columns}>
        {/* ---- Left: the conversational entry point ---- */}
        <View style={styles.left}>
          <Text style={styles.headline}>What are you in the mood for?</Text>
          <Text style={styles.subline}>
            LUMA reads plain-language requests, keeps the constraints you want to keep, and shows
            at most three titles — each with the reason it fits.
          </Text>

          <VoicePanel
            autoFocus={wants('voice-entry')}
            onUseKeyboard={onOpenChat}
            onPickSuggestion={() => onFocusChanged('suggest-0')}
          />

          <SectionTitle>TRY A REQUEST</SectionTitle>
          <FocusRow>
            {SUGGESTED_REQUESTS.map((suggestion, index) => (
              <Chip
                key={suggestion}
                label={suggestion}
                prefix="›"
                onFocus={() => onFocusChanged(`suggest-${index}`)}
                hasTVPreferredFocus={wants(`suggest-${index}`)}
                onPress={() => onAsk(suggestion)}
                testID={`suggest-${index}`}
              />
            ))}
          </FocusRow>

          <SectionTitle>OR DRIVE IT YOURSELF</SectionTitle>
          <FocusRow>
            <Button
              label="Type a request"
              tone="primary"
              onFocus={() => onFocusChanged('home-type')}
              hasTVPreferredFocus={wants('home-type')}
              onPress={onOpenChat}
              testID="home-type"
            />
            <Button
              label="Group Harmony"
              onFocus={() => onFocusChanged('home-group')}
              hasTVPreferredFocus={wants('home-group')}
              onPress={onOpenGroup}
              testID="home-group"
            />
            <Button
              label="Clear session"
              tone="danger"
              onFocus={() => onFocusChanged('home-clear')}
              hasTVPreferredFocus={wants('home-clear')}
              onPress={resetSessionNow}
              testID="home-clear"
            />
          </FocusRow>

          {recent.length > 0 ? (
            <>
              <SectionTitle tone="warm">RECENTLY EXPLORED</SectionTitle>
              <FocusRow>
                {recent.map((title, index) => (
                  <Chip
                    key={title.id}
                    label={title.title}
                    tone="warm"
                    onFocus={() => onFocusChanged(`recent-${index}`)}
                    hasTVPreferredFocus={wants(`recent-${index}`)}
                    onPress={() => onOpenTitle(title.id)}
                    testID={`recent-${title.id}`}
                  />
                ))}
              </FocusRow>
            </>
          ) : null}
        </View>

        {/* ---- Right: featured catalogue ---- */}
        <View style={styles.right}>
          <SectionTitle>FEATURED IN THE CATALOGUE</SectionTitle>
          <TVFocusGuideView style={styles.posterGrid} autoFocus>
            {featured.map((title, index) => (
              <Focusable
                key={title.id}
                focusId={`featured-${index}`}
                onFocus={() => onFocusChanged(`featured-${index}`)}
                hasTVPreferredFocus={wants(`featured-${index}`)}
                onPress={() => onOpenTitle(title.id)}
                accessibilityLabel={`${title.title}. Open details`}
                testID={`featured-${title.id}`}
                variant="ghost"
                style={styles.posterTile}>
                <Poster title={title} width={256} height={144} showOverlayText={false} />
                <Text numberOfLines={1} style={styles.posterLabel}>
                  {title.title}
                </Text>
                <Text numberOfLines={1} style={styles.posterMeta}>
                  {title.year} · {title.runtimeMin} min · {title.contentRating}
                </Text>
              </Focusable>
            ))}
          </TVFocusGuideView>
          <Text style={styles.catalogueNote}>
            {CATALOGUE.length} titles · offline sample catalogue · no streaming service connected
          </Text>
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  columns: {flexDirection: 'row', flex: 1},
  left: {flex: 1.08, paddingRight: spacing.xl},
  right: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: palette.border,
    paddingLeft: spacing.xl,
  },
  headline: {...typography.display, fontSize: 52, lineHeight: 62, color: palette.textPrimary},
  subline: {
    ...typography.body,
    color: palette.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    maxWidth: 880,
  },
  posterGrid: {flexDirection: 'row', flexWrap: 'wrap', marginLeft: -spacing.sm},
  posterTile: {
    margin: spacing.sm,
    padding: spacing.sm,
    width: 280,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderColor: palette.border,
  },
  posterLabel: {...typography.label, color: palette.textPrimary, marginTop: 8, includeFontPadding: false},
  posterMeta: {...typography.caption, color: palette.textSecondary, includeFontPadding: false},
  catalogueNote: {...typography.caption, color: palette.textDisabled, marginTop: spacing.md},
});
