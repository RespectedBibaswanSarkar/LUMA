import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {palette, radius, spacing, typography} from '../theme/tokens';
import {Focusable} from './Focusable';

/**
 * Remote-first text entry.
 *
 * Why a custom keyboard instead of <TextInput>: the Vega runtime provides no
 * system on-screen keyboard for the React Native layer, so a focusable
 * character grid is the reliable, fully D-pad-operable input mechanism. Every
 * key is a normal focusable, so left/right/up/down move through the grid with
 * the remote and OK commits.
 */
const ROWS = ['1234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const SYMBOLS = [',', '.', "'", '?', '!', '-'];

export interface KeyboardProps {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  /** Visible action label, customized when this keyboard edits a name. */
  submitLabel?: string;
  /** Screen-reader label for the submit action. */
  submitAccessibilityLabel?: string;
  /** Give initial focus to the first key when the keyboard opens. */
  autoFocus?: boolean;
  testID?: string;
}

export const OnScreenKeyboard: React.FC<KeyboardProps> = ({
  value,
  onChange,
  onSubmit,
  onClose,
  submitLabel = 'Ask LUMA',
  submitAccessibilityLabel = 'Send request to LUMA',
  autoFocus = true,
  testID = 'on-screen-keyboard',
}) => {
  const [uppercase, setUppercase] = useState(false);
  const append = (character: string) => onChange(value + character);

  return (
    <View style={styles.wrap} testID={testID}>
      <View style={styles.previewRow}>
        <Text numberOfLines={1} style={styles.previewLabel}>
          YOUR REQUEST
        </Text>
        <Text numberOfLines={1} style={styles.previewText}>
          {value || ' '}
          <Text style={styles.caret}>|</Text>
        </Text>
      </View>

      {ROWS.map((row, rowIndex) => (
        <View key={row} style={styles.row}>
          {row.split('').map((rawChar, charIndex) => {
            const char = uppercase ? rawChar.toUpperCase() : rawChar;
            return (
            <Focusable
              key={rawChar}
              focusId={`key-${rawChar}`}
              onPress={() => append(char)}
              hasTVPreferredFocus={autoFocus && rowIndex === 0 && charIndex === 0}
              accessibilityLabel={`Type ${char}`}
              testID={`key-${rawChar}`}
              style={styles.key}
              >
              <Text style={styles.keyText}>{char}</Text>
            </Focusable>
            );
          })}
        </View>
      ))}

      <View style={styles.row}>
        <Focusable
          focusId="key-shift"
          onPress={() => setUppercase(current => !current)}
          accessibilityLabel={uppercase ? 'Use lowercase letters' : 'Use uppercase letters'}
          testID="key-shift"
          style={[styles.key, styles.keyWide]}>
          <Text style={[styles.keyText, uppercase && {color: palette.interactive}]}>
            {uppercase ? 'ABC' : 'abc'}
          </Text>
        </Focusable>
        {SYMBOLS.map(symbol => (
          <Focusable
            key={symbol}
            focusId={`key-symbol-${symbol}`}
            onPress={() => append(symbol)}
            accessibilityLabel={`Type ${symbol}`}
            testID={`key-symbol-${symbol}`}
            style={styles.key}>
            <Text style={styles.keyText}>{symbol}</Text>
          </Focusable>
        ))}
      </View>

      <View style={styles.row}>
        <Focusable
          focusId="key-space"
          onPress={() => onChange(value + ' ')}
          accessibilityLabel="Space"
          testID="key-space"
          style={[styles.key, styles.keyWide]}>
          <Text style={styles.keyText}>space</Text>
        </Focusable>
        <Focusable
          focusId="key-backspace"
          onPress={() => onChange(value.slice(0, -1))}
          accessibilityLabel="Backspace"
          testID="key-backspace"
          style={[styles.key, styles.keyWide]}>
          <Text style={styles.keyText}>⌫ delete</Text>
        </Focusable>
        <Focusable
          focusId="key-clear"
          onPress={() => onChange('')}
          accessibilityLabel="Clear the request"
          testID="key-clear"
          style={[styles.key, styles.keyWide]}>
          <Text style={[styles.keyText, {color: palette.error}]}>clear</Text>
        </Focusable>
        <Focusable
          focusId="key-send"
          onPress={onSubmit}
          accessibilityLabel={submitAccessibilityLabel}
          testID="key-send"
          variant="block"
          style={[styles.key, styles.keySend]}
          contentStyle={styles.keySendContent}>
          <Text style={styles.sendText}>{submitLabel}</Text>
        </Focusable>
        <Focusable
          focusId="key-close"
          onPress={onClose}
          accessibilityLabel="Close keyboard"
          testID="key-close"
          style={[styles.key, styles.keyWide]}>
          <Text style={[styles.keyText, {color: palette.textSecondary}]}>close</Text>
        </Focusable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: palette.backgroundSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  previewLabel: {
    ...typography.caption,
    color: palette.textSecondary,
    letterSpacing: 3,
    marginRight: spacing.md,
  },
  previewText: {...typography.body, color: palette.textPrimary, flex: 1},
  caret: {color: palette.interactive, fontWeight: '700'},
  row: {flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.xs},
  key: {
    marginHorizontal: 5,
    paddingVertical: 10,
    paddingHorizontal: 6,
    minWidth: 68,
    borderRadius: radius.md,
  },
  keyWide: {minWidth: 112},
  keySend: {minWidth: 180, backgroundColor: palette.interactive},
  keySendContent: {flexDirection: 'row'},
  keyText: {...typography.label, color: palette.textPrimary, includeFontPadding: false},
  sendText: {...typography.label, color: palette.background, fontWeight: '800'},
});
