import React from 'react';
import {ActivityIndicator, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {TVFocusGuideView} from '@amazon-devices/react-native-kepler';
import {palette, radius, spacing, typography} from '../theme/tokens';
import {Focusable} from './Focusable';
import {ConstraintChange} from '../engine/types';

/** Layered bands that approximate a soft gradient without browser-only CSS. */
export const SoftGradient: React.FC<{
  from: string;
  to: string;
  style?: StyleProp<ViewStyle>;
  bands?: number;
}> = ({from, to, style, bands = 6}) => (
  <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.gradientWrap, style]}>
    <View style={[StyleSheet.absoluteFill, {backgroundColor: from}]} />
    {Array.from({length: bands}).map((_, i) => (
      <View
        key={i}
        style={[
          styles.gradientBand,
          {
            top: `${(i * 100) / bands}%`,
            height: `${100 / bands + 1}%`,
            backgroundColor: to,
            opacity: ((i + 1) / bands) * 0.85,
          },
        ]}
      />
    ))}
  </View>
);

export const Screen: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}> = ({children, style}) => (
  <View style={[styles.screen, style]}>
    <SoftGradient from={palette.background} to={palette.backgroundSecondary} />
    <View style={styles.screenContent}>{children}</View>
  </View>
);

export const Header: React.FC<{
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backFirstFocus?: boolean;
  right?: React.ReactNode;
}> = ({title, subtitle, onBack, backFirstFocus, right}) => (
  <View style={styles.header}>
    <View style={styles.brand}>
      <View style={styles.brandMark}>
        <Text style={styles.brandMarkText}>L</Text>
      </View>
      <View>
        <Text style={styles.brandName}>LUMA</Text>
        <Text style={styles.brandTagline}>Your Living Room, Understood.</Text>
      </View>
    </View>

    <View style={styles.headerCenter} accessibilityRole="header">
      <Text numberOfLines={1} style={styles.headerTitle}>
        {title}
      </Text>
      {subtitle ? (
        <Text numberOfLines={1} style={styles.headerSubtitle}>
          {subtitle}
        </Text>
      ) : null}
    </View>

    <View style={styles.headerRight}>
      {right}
      {onBack ? (
        <Focusable
          onPress={onBack}
          hasTVPreferredFocus={backFirstFocus}
          focusId="header-back"
          accessibilityLabel={`${title}. Back`}
          testID="header-back"
          variant="ghost">
          <Text style={styles.backLabel}>‹ Back</Text>
        </Focusable>
      ) : null}
    </View>
  </View>
);

export const Panel: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  title?: string;
  accent?: boolean;
}> = ({children, style, title, accent}) => (
  <View style={[styles.panel, accent && styles.panelAccent, style]}>
    {title ? <Text style={styles.panelTitle}>{title}</Text> : null}
    {children}
  </View>
);

export const SectionTitle: React.FC<{children: React.ReactNode; tone?: 'default' | 'warm'}> = ({
  children,
  tone = 'default',
}) => <Text style={[styles.sectionTitle, tone === 'warm' && {color: palette.highlight}]}>{children}</Text>;

/** Shows the active request as chips, with badges for what just changed. */
export const IntentBar: React.FC<{labels: string[]; changes?: ConstraintChange[]}> = ({
  labels,
  changes = [],
}) => (
  <View style={styles.intentBar}>
    <Text style={styles.intentBarLabel}>CURRENT REQUEST</Text>
    <View style={styles.intentChips}>
      {labels.length === 0 ? (
        <Text style={styles.intentEmpty}>No constraints yet — tell LUMA what you want.</Text>
      ) : (
        labels.map(label => (
          <View key={label} style={styles.intentChip}>
            <Text style={styles.intentChipText}>{label}</Text>
          </View>
        ))
      )}
    </View>
    {changes.length > 0 ? (
      <View style={styles.changeRow}>
        {changes.slice(0, 4).map((change, index) => (
          <View
            key={`${change.key}-${index}`}
            style={[styles.changeBadge, change.kind === 'removed' && styles.changeRemoved]}>
            <Text style={styles.changeBadgeText}>
              {changeIcon(change.kind)} {change.label}
            </Text>
          </View>
        ))}
      </View>
    ) : null}
  </View>
);

const changeIcon = (kind: ConstraintChange['kind']): string => {
  switch (kind) {
    case 'added':
      return '+';
    case 'removed':
      return '−';
    case 'replaced':
      return '⇄';
    case 'increased':
      return '↑';
    case 'decreased':
      return '↓';
    case 'reset':
      return '⟲';
    default:
      return '•';
  }
};

export const StatusPill: React.FC<{status: 'idle' | 'processing' | 'error'; provider: string}> = ({
  status,
  provider,
}) => {
  const tone =
    status === 'error'
      ? {bg: palette.error, fg: palette.background, text: 'Could not process'}
      : status === 'processing'
        ? {bg: palette.interactive, fg: palette.background, text: 'Thinking…'}
        : {bg: palette.surface, fg: palette.textSecondary, text: provider};
  return (
    <View style={[styles.statusPill, {backgroundColor: tone.bg}]} testID="status-pill">
      {status === 'processing' ? (
        <ActivityIndicator size="small" color={tone.fg} style={styles.statusSpinner} />
      ) : status === 'error' ? (
        <Text style={[styles.statusAlert, {color: tone.fg}]}>⚠</Text>
      ) : (
        <View style={styles.statusDot} />
      )}
      <Text numberOfLines={1} style={[styles.statusText, {color: tone.fg}]}>
        {tone.text}
      </Text>
    </View>
  );
};

/** Horizontal focusable row that guides the D-pad through its children. */
export const FocusRow: React.FC<{children: React.ReactNode; style?: StyleProp<ViewStyle>}> = ({
  children,
  style,
}) => (
  <TVFocusGuideView style={[styles.focusRow, style]} autoFocus>
    {children}
  </TVFocusGuideView>
);

export const Scroll: React.FC<{children: React.ReactNode; style?: StyleProp<ViewStyle>}> = ({
  children,
  style,
}) => (
  <ScrollView
    style={style}
    contentContainerStyle={styles.scrollContent}
    showsVerticalScrollIndicator={false}
    // On TV the remote's up/down must move focus, not scroll the page, so the
    // scroll view itself is never focusable; long lists use FocusRow instead.
    keyboardShouldPersistTaps="handled">
    {children}
  </ScrollView>
);

export const EmptyState: React.FC<{
  title: string;
  body: string;
  icon?: string;
  action?: React.ReactNode;
}> = ({title, body, icon, action}) => (
  <View style={styles.empty}>
    {icon ? <Text style={styles.emptyIcon}>{icon}</Text> : null}
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyBody}>{body}</Text>
    {action ? <View style={styles.emptyAction}>{action}</View> : null}
  </View>
);

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: palette.background},
  screenContent: {flex: 1, paddingHorizontal: 72, paddingTop: 28, paddingBottom: 40},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 96,
    marginBottom: spacing.md,
  },
  brand: {flexDirection: 'row', alignItems: 'center', width: 420},
  brandMark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  brandMarkText: {color: palette.background, fontSize: 34, fontWeight: '800'},
  brandName: {...typography.heading, color: palette.textPrimary, letterSpacing: 4},
  brandTagline: {...typography.caption, color: palette.textSecondary},
  headerCenter: {flex: 1, paddingHorizontal: spacing.lg},
  headerTitle: {...typography.title, color: palette.textPrimary},
  headerSubtitle: {...typography.body, color: palette.textSecondary},
  headerRight: {flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', minWidth: 260},
  backLabel: {...typography.label, color: palette.interactive},
  panel: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
  },
  panelAccent: {borderColor: palette.accent},
  panelTitle: {...typography.label, color: palette.highlight, marginBottom: spacing.sm, letterSpacing: 2},
  sectionTitle: {...typography.heading, color: palette.textPrimary, marginBottom: spacing.md},
  intentBar: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  intentBarLabel: {
    ...typography.caption,
    color: palette.textSecondary,
    letterSpacing: 3,
    marginBottom: spacing.xs,
  },
  intentChips: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center'},
  intentChip: {
    backgroundColor: palette.backgroundSecondary,
    borderColor: palette.accent,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
  },
  intentChipText: {...typography.label, color: palette.textPrimary},
  intentEmpty: {...typography.body, color: palette.textSecondary, fontStyle: 'italic'},
  changeRow: {flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xs},
  changeBadge: {
    backgroundColor: 'rgba(103, 232, 249, 0.14)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginRight: spacing.sm,
    marginTop: spacing.xs,
  },
  changeRemoved: {backgroundColor: 'rgba(255, 138, 138, 0.14)'},
  changeBadgeText: {...typography.caption, color: palette.interactive},
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: palette.success,
    marginRight: spacing.sm,
  },
  statusSpinner: {
    marginRight: spacing.sm,
    transform: [{scale: 0.85}],
  },
  statusAlert: {
    fontSize: 16,
    fontWeight: '800',
    marginRight: spacing.xs,
  },
  statusText: {...typography.caption, fontWeight: '600'},
  focusRow: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap'},
  scrollContent: {paddingBottom: spacing.xl},
  gradientWrap: {overflow: 'hidden'},
  gradientBand: {position: 'absolute', left: 0, right: 0},
  empty: {padding: spacing.xl, alignItems: 'center'},
  emptyIcon: {fontSize: 54, color: palette.interactive, marginBottom: spacing.md},
  emptyTitle: {...typography.heading, color: palette.textPrimary, marginBottom: spacing.sm},
  emptyBody: {...typography.body, color: palette.textSecondary, textAlign: 'center', maxWidth: 900},
  emptyAction: {marginTop: spacing.lg},
});
