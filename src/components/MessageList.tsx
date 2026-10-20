import React, {useEffect, useRef} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {palette, radius, spacing, typography} from '../theme/tokens';
import {Message} from '../engine/types';

/**
 * Conversation history, sized for a TV viewed from across the room:
 * wide bubbles, big type, clear user/assistant differentiation, and the
 * newest exchange always in view.
 */
export const MessageList: React.FC<{messages: Message[]}> = ({messages}) => {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    const timer = setTimeout(() => ref.current?.scrollToEnd({animated: false}), 60);
    return () => clearTimeout(timer);
  }, [messages.length]);

  if (!messages.length) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>Tell LUMA what you are in the mood for.</Text>
        <Text style={styles.emptyBody}>
          Ask in plain language — for example “an adventurous family film under two hours, nothing
          too scary”. Follow-ups keep the constraints you want to keep.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={ref}
      style={styles.list}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      {messages.map(message => {
        const mine = message.sender === 'user';
        return (
          <View key={message.id} style={[styles.row, mine ? styles.rowMine : styles.rowLuma]}>
            <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleLuma]}>
              <Text style={[styles.sender, mine ? styles.senderMine : styles.senderLuma]}>
                {mine ? 'YOU' : 'LUMA'}
              </Text>
              <Text style={styles.text}>{message.text}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  list: {flex: 1},
  content: {paddingBottom: spacing.lg, paddingRight: spacing.sm},
  row: {marginBottom: spacing.md, flexDirection: 'row'},
  rowMine: {justifyContent: 'flex-end'},
  rowLuma: {justifyContent: 'flex-start'},
  bubble: {
    maxWidth: '92%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
  },
  bubbleMine: {
    backgroundColor: palette.surfaceFocused,
    borderColor: palette.interactive,
    borderBottomRightRadius: radius.sm,
  },
  bubbleLuma: {
    backgroundColor: palette.surface,
    borderColor: palette.accent,
    borderBottomLeftRadius: radius.sm,
  },
  sender: {
    ...typography.caption,
    letterSpacing: 3,
    fontWeight: '700',
    marginBottom: 4,
    includeFontPadding: false,
  },
  senderMine: {color: palette.interactive},
  senderLuma: {color: palette.accent},
  text: {...typography.body, color: palette.textPrimary},
  emptyWrap: {padding: spacing.xl, maxWidth: 980},
  emptyTitle: {...typography.title, color: palette.textPrimary, marginBottom: spacing.md},
  emptyBody: {...typography.body, color: palette.textSecondary},
});
