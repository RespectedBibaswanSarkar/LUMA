import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {palette, radius, spacing, typography} from '../theme/tokens';
import {Header, IntentBar, FocusRow, Screen, SectionTitle, StatusPill} from '../components/Shell';
import {Button, Chip} from '../components/Focusable';
import {MessageList} from '../components/MessageList';
import {OnScreenKeyboard} from '../components/OnScreenKeyboard';
import {useApp} from '../state/AppProvider';
import {describeIntent} from '../engine/intentParser';

const FOLLOW_UPS = [
  'Make it more adventurous, keep everything else',
  'Something funny instead, same runtime',
  'Nothing scary',
  'Keep the family requirement but shorten the runtime',
  'Start over',
];

export interface ConversationScreenProps {
  preset?: string;
  initialFocus?: string;
  onFocusChanged: (focusId: string) => void;
  onBack: () => void;
  onOpenResults: () => void;
}

export const ConversationScreen: React.FC<ConversationScreenProps> = ({
  preset,
  initialFocus,
  onFocusChanged,
  onBack,
  onOpenResults,
}) => {
  const {session, status, providerLabel, send, resetSessionNow, lastOutcome} = useApp();
  const [draft, setDraft] = useState('');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  // Default to the first follow-up chip: when the screen mounts after a route
  // push, SOMETHING must claim initial focus or D-pad navigation has no
  // anchor and further presses are ignored by the TV focus system.
  const [focusTarget, setFocusTarget] = useState<string | undefined>(
    initialFocus ?? 'followup-0',
  );
  const presetConsumed = useRef(false);

  // A suggestion chip on Home pushes this route with the utterance attached;
  // consume it exactly once per mount.
  useEffect(() => {
    if (preset && !presetConsumed.current) {
      presetConsumed.current = true;
      void send(preset);
    }
  }, [preset, send]);

  const wants = (id: string): boolean => focusTarget === id;

  const moveFocus = (id: string) => {
    setFocusTarget(id);
    onFocusChanged(id);
  };

  const submit = () => {
    const text = draft.trim();
    if (!text) {
      return;
    }
    setDraft('');
    setKeyboardOpen(false);
    moveFocus('followup-0');
    void send(text);
  };

  const ask = (utterance: string) => {
    moveFocus('followup-0');
    void send(utterance);
  };

  const hasIntent = describeIntent(session.intent).length > 0;
  const suggestions = session.messages.length === 0
    ? [
        'An adventurous family movie night, nothing too scary, under two hours',
        'Something uplifting in 90 minutes',
        'A quick comedy for tonight',
      ]
    : FOLLOW_UPS;

  return (
    <Screen>
      <Header
        title="Conversation"
        subtitle={
          hasIntent ? describeIntent(session.intent).join(' · ') : 'No active request yet'
        }
        onBack={onBack}
        right={<StatusPill status={status} provider={providerLabel} />}
      />

      <IntentBar labels={describeIntent(session.intent)} changes={session.lastChanges} />

      <View style={styles.body}>
        {/* ---- Conversation history ---- */}
        <View style={styles.history}>
          <MessageList messages={session.messages} />
          {status === 'processing' ? (
            <View style={styles.thinking} testID="thinking-indicator">
              <View style={styles.thinkingDot} />
              <Text style={styles.thinkingText}>LUMA is reading your request…</Text>
            </View>
          ) : null}
          {status === 'error' ? (
            <Text style={styles.errorText} testID="error-indicator">
              Something went wrong. Your session is intact — try again.
            </Text>
          ) : null}
        </View>

        {/* ---- Right rail: follow-ups and actions ---- */}
        <View style={styles.rail}>
          <SectionTitle>
            {session.messages.length === 0 ? 'SUGGESTED REQUESTS' : 'SUGGESTED FOLLOW-UPS'}
          </SectionTitle>
          <FocusRow style={styles.railRow}>
            {suggestions.map((suggestion, index) => (
              <Chip
                key={suggestion}
                label={suggestion}
                prefix="›"
                onFocus={() => moveFocus(`followup-${index}`)}
                hasTVPreferredFocus={wants(`followup-${index}`)}
                onPress={() => ask(suggestion)}
                testID={`followup-${index}`}
              />
            ))}
          </FocusRow>

          <SectionTitle tone="warm">ACTIONS</SectionTitle>
          <FocusRow style={styles.railRow}>
            <Button
              label="See recommendations"
              tone="primary"
              onFocus={() => moveFocus('chat-results')}
              hasTVPreferredFocus={wants('chat-results')}
              onPress={onOpenResults}
              testID="chat-results"
            />
            <Button
              label={keyboardOpen ? 'Hide keyboard' : 'Type a request'}
              onFocus={() => moveFocus('chat-type')}
              hasTVPreferredFocus={wants('chat-type')}
              onPress={() => {
                setKeyboardOpen(open => !open);
                if (!keyboardOpen) {
                  setFocusTarget(undefined);
                } else {
                  moveFocus('chat-type');
                }
              }}
              testID="chat-type"
            />
            <Button
              label="Start over"
              tone="danger"
              onFocus={() => moveFocus('chat-reset')}
              hasTVPreferredFocus={wants('chat-reset')}
              onPress={resetSessionNow}
              testID="chat-reset"
            />
          </FocusRow>

          <View style={styles.metaPanel}>
            <Text style={styles.metaLabel}>INPUT MODE</Text>
            <Text style={styles.metaText}>
              Remote control: D-pad, on-screen keyboard and suggested phrases. Voice capture is
              not available in this Vega build and is not simulated.
            </Text>
            <Text style={styles.metaLabel}>ANSWERED BY</Text>
            <Text style={styles.metaText} testID="provider-label">
              {providerLabel}
              {lastOutcome?.fellBack ? ' (local fallback after remote failure)' : ''}
            </Text>
          </View>
        </View>
      </View>

      {keyboardOpen ? (
        <OnScreenKeyboard
          value={draft}
          onChange={setDraft}
          onSubmit={submit}
          onClose={() => {
            setKeyboardOpen(false);
            moveFocus('chat-type');
          }}
        />
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: {flex: 1, flexDirection: 'row'},
  history: {flex: 1.35, paddingRight: spacing.lg},
  rail: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: palette.border,
    paddingLeft: spacing.lg,
  },
  railRow: {marginBottom: spacing.sm},
  thinking: {flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm},
  thinkingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: palette.interactive,
    marginRight: spacing.sm,
  },
  thinkingText: {...typography.body, color: palette.interactive},
  errorText: {...typography.body, color: palette.error, paddingVertical: spacing.sm},
  metaPanel: {
    marginTop: spacing.lg,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.md,
  },
  metaLabel: {
    ...typography.caption,
    color: palette.textSecondary,
    letterSpacing: 3,
    marginTop: spacing.sm,
  },
  metaText: {...typography.caption, fontSize: 20, lineHeight: 26, color: palette.textPrimary},
});
