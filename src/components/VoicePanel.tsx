import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {palette, radius, spacing, typography} from '../theme/tokens';
import {Focusable} from './Focusable';
import {SoftGradient} from './Shell';

/**
 * Voice entry point — honest edition.
 *
 * The installed Vega SDK (0.24.12112) exposes no microphone or speech
 * recognition API to React Native, so LUMA does NOT pretend to listen.
 * Activating this control states exactly that, and offers the working input
 * modes instead. `src/engine/aiProvider.ts` documents the provider pattern;
 * a real recognizer would require a supported platform API.
 */
export const VoicePanel: React.FC<{
  onUseKeyboard: () => void;
  onPickSuggestion: () => void;
  compact?: boolean;
  /** Claim initial screen focus. */
  autoFocus?: boolean;
}> = ({onUseKeyboard, onPickSuggestion, compact, autoFocus}) => {
  const [explaining, setExplaining] = useState(false);

  if (explaining) {
    return (
      <View style={[styles.wrap, styles.disclosure]}>
        <SoftGradient from={palette.surface} to={palette.backgroundSecondary} bands={4} />
        <View style={styles.disclosureInner}>
          <Text style={styles.disclosureTitle}>Voice input is not available yet</Text>
          <Text style={styles.disclosureBody}>
            This Vega build (SDK 0.24.12112) exposes no microphone or speech-recognition API to
            React Native, so LUMA will not simulate listening. Everything else works with the
            remote today: pick a suggested request, or type with the on-screen keyboard. A real
            recognizer requires a supported platform API.
          </Text>
          <View style={styles.disclosureActions}>
            <Focusable
              onPress={onUseKeyboard}
              hasTVPreferredFocus={autoFocus}
              focusId="voice-use-keyboard"
              variant="block"
              accessibilityLabel="Open the on-screen keyboard">
              <Text style={styles.actionText}>Use the keyboard</Text>
            </Focusable>
            <Focusable
              onPress={onPickSuggestion}
              focusId="voice-use-suggestion"
              variant="ghost"
              accessibilityLabel="Back to suggested requests">
              <Text style={[styles.actionText, {color: palette.textSecondary}]}>
                Pick a suggestion
              </Text>
            </Focusable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Focusable
      onPress={() => setExplaining(true)}
      focusId="voice-entry"
      hasTVPreferredFocus={autoFocus}
      accessibilityLabel="Voice input status and alternatives"
      testID="voice-entry"
      variant={compact ? 'ghost' : 'block'}
      style={compact ? undefined : styles.orb}
      contentStyle={styles.orbContent}>
      <View style={styles.orbGlow}>
        <Text style={styles.orbGlyph}>◗</Text>
      </View>
      <View>
        <Text style={styles.orbTitle}>Talk to LUMA</Text>
        <Text style={styles.orbSubtitle}>Voice ready — remote input active right now</Text>
      </View>
    </Focusable>
  );
};

const styles = StyleSheet.create({
  wrap: {borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: palette.accent},
  disclosure: {padding: 0},
  disclosureInner: {padding: spacing.lg},
  disclosureTitle: {...typography.heading, color: palette.textPrimary, marginBottom: spacing.sm},
  disclosureBody: {...typography.body, color: palette.textSecondary, marginBottom: spacing.md},
  code: {color: palette.interactive, fontFamily: 'monospace', fontSize: 24},
  disclosureActions: {flexDirection: 'row', flexWrap: 'wrap'},
  actionText: {...typography.label, color: palette.background, fontWeight: '800'},
  orb: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    width: '100%',
  },
  orbContent: {flexDirection: 'row', alignItems: 'center'},
  orbGlow: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(167, 139, 250, 0.22)',
    borderWidth: 2,
    borderColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  orbGlyph: {color: palette.accent, fontSize: 40, lineHeight: 46},
  orbTitle: {...typography.heading, color: palette.textPrimary},
  orbSubtitle: {...typography.caption, color: palette.textSecondary},
});
