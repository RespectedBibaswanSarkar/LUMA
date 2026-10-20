import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle} from 'react-native';
import {palette, radius, spacing, typography} from '../theme/tokens';

/**
 * Focusable — the single interactive primitive of the app.
 *
 * TV contract:
 *  - visible focus ring (2px interactive accent + lift + glow)
 *  - `hasTVPreferredFocus` for the initial focus of every screen
 *  - `onFocus` reports the focused id upward so focus can be restored on Back
 *  - double-activation is blocked with a short re-entry guard
 *  - disabled items stay in the tree but never activate
 */
export interface FocusableProps {
  children: React.ReactNode;
  onPress?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  /** Stable id used for initial-focus / focus-restoration decisions. */
  focusId?: string;
  hasTVPreferredFocus?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  focusedStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
  /** Renders as a pill (default) or a block. */
  variant?: 'pill' | 'block' | 'ghost';
}

const ACTIVATION_GUARD_MS = 350;

export const Focusable: React.FC<FocusableProps> = ({
  children,
  onPress,
  onFocus,
  onBlur,
  focusId,
  hasTVPreferredFocus,
  disabled,
  style,
  focusedStyle,
  contentStyle,
  accessibilityLabel,
  testID,
  variant = 'pill',
}) => {
  const [focused, setFocused] = useState(false);
  const lastPress = React.useRef(0);
  const pressRef = useRef<View>(null);

  // Claim focus proactively: `hasTVPreferredFocus` alone only takes effect when
  // the system runs a default-focus pass, which does NOT reliably happen when
  // the app relaunches into an already-focused window on Vega OS — leaving the
  // D-pad with no anchor and every press silently ignored. Retried a few times
  // because view attachment and window-focus state settle asynchronously, and a
  // claim at exactly the wrong moment is silently dropped with no later pass to
  // correct it. Best-effort: errors are swallowed, hasTVPreferredFocus remains
  // the system-level path.
  useEffect(() => {
    if (!hasTVPreferredFocus || disabled) {
      return;
    }
    const attempts = [0, 250, 700].map(delay =>
      setTimeout(() => {
        try {
          pressRef.current?.focus?.();
        } catch {
          // focus() is unavailable or too early — the retries cover this.
        }
      }, delay),
    );
    return () => attempts.forEach(clearTimeout);
  }, [hasTVPreferredFocus, disabled]);

  const handleFocus = useCallback(() => {
    setFocused(true);
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    onBlur?.();
  }, [onBlur]);

  const handlePress = useCallback(() => {
    if (disabled || !onPress) {
      return;
    }
    const now = Date.now();
    if (now - lastPress.current < ACTIVATION_GUARD_MS) {
      return;
    }
    lastPress.current = now;
    onPress();
  }, [disabled, onPress]);

  const base: StyleProp<ViewStyle> = [
    styles.base,
    variant === 'pill' && styles.pill,
    variant === 'block' && styles.block,
    variant === 'ghost' && styles.ghost,
    disabled && styles.disabled,
    focused && styles.focused,
    focused && variant === 'ghost' && styles.ghostFocused,
    style,
    focused && focusedStyle,
  ];

  return (
    <Pressable
      ref={pressRef}
      focusable={!disabled}
      isTVSelectable={!disabled}
      hasTVPreferredFocus={hasTVPreferredFocus}
      disabled={disabled}
      onPress={handlePress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      testID={testID ?? focusId}
      accessibilityRole="button"
      accessibilityState={{disabled: !!disabled}}
      accessibilityLabel={accessibilityLabel}
      style={base}>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </Pressable>
  );
};

export interface ChipProps {
  label: string;
  onPress?: () => void;
  onFocus?: () => void;
  hasTVPreferredFocus?: boolean;
  tone?: 'default' | 'accent' | 'warm';
  disabled?: boolean;
  testID?: string;
  /** Small leading marker, e.g. a change icon. */
  prefix?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  onPress,
  onFocus,
  hasTVPreferredFocus,
  tone = 'default',
  disabled,
  testID,
  prefix,
}) => (
  <Focusable
    onPress={onPress}
    onFocus={onFocus}
    hasTVPreferredFocus={hasTVPreferredFocus}
    disabled={disabled}
    testID={testID}
    accessibilityLabel={label}
    contentStyle={styles.chipContent}
    focusedStyle={tone === 'warm' ? styles.chipWarmFocused : undefined}>
    <Text
      numberOfLines={1}
      style={[
        styles.chipText,
        tone === 'accent' && {color: palette.interactive},
        tone === 'warm' && {color: palette.highlight},
        disabled && {color: palette.textDisabled},
      ]}>
      {prefix ? `${prefix} ` : ''}
      {label}
    </Text>
  </Focusable>
);

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  onFocus?: () => void;
  hasTVPreferredFocus?: boolean;
  disabled?: boolean;
  tone?: 'primary' | 'secondary' | 'danger';
  testID?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  onFocus,
  hasTVPreferredFocus,
  disabled,
  tone = 'secondary',
  testID,
  style,
  textStyle,
}) => (
  <Focusable
    onPress={onPress}
    onFocus={onFocus}
    hasTVPreferredFocus={hasTVPreferredFocus}
    disabled={disabled}
    testID={testID}
    accessibilityLabel={label}
    variant={tone === 'secondary' ? 'ghost' : 'block'}
    style={[tone === 'primary' && styles.primary, tone === 'danger' && styles.danger, style]}
    contentStyle={styles.buttonContent}>
    <Text
      numberOfLines={1}
      style={[
        styles.buttonLabel,
        tone === 'primary' && {color: palette.background},
        tone === 'danger' && {color: palette.error},
        disabled && {color: palette.textDisabled},
        textStyle,
      ]}>
      {label}
    </Text>
  </Focusable>
);

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  pill: {
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    margin: spacing.xs,
  },
  block: {
    backgroundColor: palette.surfaceFocused,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    margin: spacing.xs,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: palette.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    margin: spacing.xs,
  },
  ghostFocused: {
    borderColor: palette.focusRing,
    backgroundColor: palette.surface,
  },
  disabled: {
    opacity: 0.45,
  },
  focused: {
    borderColor: palette.focusRing,
    transform: [{scale: 1.04}],
    backgroundColor: palette.surfaceFocused,
    shadowColor: palette.interactive,
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 0},
    elevation: 8,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipWarmFocused: {
    borderColor: palette.highlight,
    backgroundColor: palette.surfaceFocused,
  },
  chipText: {
    ...typography.label,
    color: palette.textSecondary,
    includeFontPadding: false,
  },
  buttonContent: {
    flexDirection: 'row',
  },
  buttonLabel: {
    ...typography.label,
    color: palette.textPrimary,
    includeFontPadding: false,
  },
  primary: {
    backgroundColor: palette.interactive,
  },
  danger: {
    backgroundColor: 'transparent',
    borderColor: palette.error,
  },
});
