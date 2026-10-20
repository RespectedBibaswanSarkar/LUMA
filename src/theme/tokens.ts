/**
 * LUMA — Midnight Cinema design tokens.
 * Single source of truth for color, spacing, radius, typography and motion.
 * All values are TV-safe: large type, high contrast, no micro-text.
 */

export const palette = {
  /** Main background */
  background: '#080B14',
  /** Secondary background */
  backgroundSecondary: '#111827',
  /** Elevated surfaces (cards, sheets) */
  surface: '#192235',
  /** Slightly brighter surface for focused/hovered elements */
  surfaceFocused: '#22304A',
  /** Primary accent — voice / brand */
  accent: '#A78BFA',
  /** Interactive accent — focus ring, links, primary actions */
  interactive: '#67E8F9',
  /** Warm highlight — explanations, badges */
  highlight: '#F5C982',
  /** Primary text */
  textPrimary: '#F8FAFC',
  /** Secondary text */
  textSecondary: '#B8C4D8',
  /** Tertiary / disabled text */
  textDisabled: '#5C6980',
  /** Accessible error red on #080B14 (contrast ratio ~7.1:1) */
  error: '#FF8A8A',
  /** Success / satisfied */
  success: '#7BD8A8',
  /** Hairlines and dividers */
  border: '#2A3752',
  /** Focus ring */
  focusRing: '#67E8F9',
} as const;

export const spacing = {
  xs: 8,
  sm: 12,
  md: 20,
  lg: 32,
  xl: 48,
  xxl: 72,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

/**
 * Typography scale. Sizes are absolute pixels because the app targets a
 * fixed 16:9 TV canvas; `scale` (see useTvLayout) multiplies them on
 * lower-resolution runtimes so the design keeps its proportions.
 */
export const typography = {
  display: {fontSize: 60, lineHeight: 70, fontWeight: '700' as const},
  title: {fontSize: 44, lineHeight: 54, fontWeight: '700' as const},
  heading: {fontSize: 34, lineHeight: 44, fontWeight: '600' as const},
  body: {fontSize: 28, lineHeight: 38, fontWeight: '400' as const},
  label: {fontSize: 24, lineHeight: 32, fontWeight: '600' as const},
  caption: {fontSize: 21, lineHeight: 28, fontWeight: '400' as const},
} as const;

export const motion = {
  /** Short, non-blocking transitions only. */
  fast: 120,
  normal: 200,
} as const;

/** Canvas the design is authored against. */
export const DESIGN_WIDTH = 1920;
export const DESIGN_HEIGHT = 1080;

/** Deterministic per-title accent hues, kept inside the Midnight Cinema family. */
export const posterHues = [258, 199, 36, 226, 172, 320, 288, 214] as const;
