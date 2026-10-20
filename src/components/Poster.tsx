import React from 'react';
import {StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {palette, radius, spacing, typography} from '../theme/tokens';
import {Title} from '../engine/types';
import {Focusable} from './Focusable';

/**
 * Local placeholder artwork.
 *
 * No third-party images are fetched or hot-linked: every poster is generated
 * from the title's own data (deterministic gradient + monogram), so the app
 * has no artwork licensing dependency and never fails offline.
 */
const GRADIENTS: Array<[string, string]> = [
  ['#3B2A6E', '#7C5CE0'],
  ['#123B4A', '#2E8FA8'],
  ['#4A2E1E', '#C08A4A'],
  ['#2A2350', '#5A63D8'],
  ['#123F35', '#3FA98A'],
  ['#4A1F3D', '#B4519A'],
  ['#2E1A4A', '#A78BFA'],
  ['#0F3048', '#67E8F9'],
];

const hash = (value: string): number => {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h;
};

export const monogram = (title: string): string => {
  const words = title.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) {
    return '?';
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
};

export const Poster: React.FC<{
  title: Title;
  width: number;
  height: number;
  /** Larger type for hero/featured usage. */
  hero?: boolean;
  style?: StyleProp<ViewStyle>;
}> = ({title, width, height, hero, style}) => {
  const [from, to] = GRADIENTS[hash(title.id) % GRADIENTS.length];
  return (
    <View
      style={[
        styles.poster,
        {width, height, backgroundColor: from, borderColor: palette.border},
        style,
      ]}>
      {/* Poor-man's gradient: stacked translucent bands, pure RN views. */}
      <View style={[styles.posterTop, {backgroundColor: to, opacity: 0.45}]} />
      <View style={[styles.posterMid, {backgroundColor: to, opacity: 0.72}]} />
      <View style={styles.posterSheen} />

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.monogram, hero && {fontSize: height * 0.3}]}
        ellipsizeMode="tail">
        {monogram(title.title)}
      </Text>
      <View style={styles.posterFooter}>
        <Text numberOfLines={2} style={[styles.posterTitle, hero && {fontSize: 26, lineHeight: 32}]}>
          {title.title}
        </Text>
        <Text style={[styles.posterMeta, hero && {fontSize: 20}]}>
          {title.year} · {title.runtimeMin} min
        </Text>
      </View>
      <View style={styles.ratingTag}>
        <Text style={styles.ratingText}>{title.contentRating}</Text>
      </View>
    </View>
  );
};

export interface TitleCardProps {
  title: Title;
  onPress?: () => void;
  onFocus?: () => void;
  hasTVPreferredFocus?: boolean;
  width?: number;
  /** Explanation lines from the recommendation engine. */
  reasons?: string[];
  score?: number;
  unverified?: string[];
  focusId?: string;
  testID?: string;
  /** Extra footer content (buttons, badges). */
  footer?: React.ReactNode;
}

export const TitleCard: React.FC<TitleCardProps> = ({
  title,
  onPress,
  onFocus,
  hasTVPreferredFocus,
  width = 380,
  reasons = [],
  score,
  unverified = [],
  focusId,
  testID,
  footer,
}) => (
  <Focusable
    onPress={onPress}
    onFocus={onFocus}
    hasTVPreferredFocus={hasTVPreferredFocus}
    focusId={focusId}
    testID={testID}
    accessibilityLabel={`${title.title}, ${title.year}, ${title.runtimeMin} minutes`}
    variant="block"
    style={[styles.card, {width}]}
    contentStyle={styles.cardContent}>
    <Poster title={title} width={width - 36} height={Math.round((width - 36) * 0.56)} />

    <View style={styles.cardBody}>
      <View style={styles.cardTitleRow}>
        <Text numberOfLines={1} style={styles.cardTitle}>
          {title.title}
        </Text>
        {typeof score === 'number' ? (
          <View style={[styles.scoreBadge, score >= 70 ? styles.scoreHigh : styles.scoreMid]}>
            <Text style={styles.scoreText}>{score}</Text>
          </View>
        ) : null}
      </View>

      <Text numberOfLines={2} style={styles.cardMeta}>
        {title.genres.slice(0, 3).join(' · ')}
      </Text>
      <Text style={styles.cardMeta}>
        {title.runtimeMin} min · {title.contentRating} ·{' '}
        {title.intensity === 'unknown' ? 'Intensity unknown' : `Intensity ${title.intensity}`}
      </Text>

      {reasons.slice(0, 2).map(reason => (
        <Text key={reason} numberOfLines={2} style={styles.reason}>
          → {reason}
        </Text>
      ))}

      {unverified.length ? (
        <View style={styles.warnRow}>
          <Text numberOfLines={2} style={styles.warnText}>
            ! {unverified.join(' · ')}
          </Text>
        </View>
      ) : null}

      {footer}
    </View>
  </Focusable>
);

const styles = StyleSheet.create({
  poster: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterTop: {...StyleSheet.absoluteFillObject, height: '55%'},
  posterMid: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '40%',
  },
  posterSheen: {
    position: 'absolute',
    left: -40,
    top: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#FFFFFF',
    opacity: 0.06,
  },
  monogram: {
    fontSize: 76,
    fontWeight: '800',
    color: 'rgba(248, 250, 252, 0.92)',
    letterSpacing: 2,
    includeFontPadding: false,
  },
  posterFooter: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
  },
  posterTitle: {
    ...typography.label,
    color: palette.textPrimary,
    fontWeight: '700',
    includeFontPadding: false,
  },
  posterMeta: {...typography.caption, color: 'rgba(248, 250, 252, 0.82)', includeFontPadding: false},
  ratingTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(8, 11, 20, 0.72)',
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  ratingText: {color: palette.highlight, fontSize: 17, fontWeight: '700'},
  card: {
    marginRight: spacing.md,
    backgroundColor: palette.surface,
    borderColor: palette.border,
  },
  cardContent: {alignItems: 'stretch', padding: 18},
  cardBody: {marginTop: spacing.sm},
  cardTitleRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  cardTitle: {...typography.heading, fontSize: 28, lineHeight: 34, color: palette.textPrimary, flex: 1},
  scoreBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: spacing.sm,
  },
  scoreHigh: {backgroundColor: palette.success},
  scoreMid: {backgroundColor: palette.highlight},
  scoreText: {color: palette.background, fontWeight: '800', fontSize: 20},
  cardMeta: {...typography.caption, color: palette.textSecondary, includeFontPadding: false},
  reason: {
    ...typography.caption,
    color: palette.highlight,
    marginTop: 6,
    includeFontPadding: false,
  },
  warnRow: {
    marginTop: 8,
    backgroundColor: 'rgba(245, 201, 130, 0.12)',
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  warnText: {...typography.caption, fontSize: 19, color: palette.highlight},
});
