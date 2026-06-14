/**
 * Catppuccin Mocha Color Palette
 * https://github.com/catppuccin/catppuccin
 * 
 * A soothing pastel theme for terminals and applications
 */

export const colors = {
  // Accent Colors
  rosewater: '#f5e0dc',
  flamingo: '#f2cdcd',
  pink: '#f5c2e7',
  mauve: '#cba6f7',
  red: '#f38ba8',
  maroon: '#eba0ac',
  peach: '#fab387',
  yellow: '#f9e2af',
  green: '#a6e3a1',
  teal: '#94e2d5',
  sky: '#89dceb',
  sapphire: '#74c7ec',
  blue: '#89b4fa',
  lavender: '#b4befe',

  // Text Colors
  text: '#cdd6f4',
  subtext1: '#bac2de',
  subtext0: '#a6adc8',

  // Overlay Colors
  overlay2: '#9399b2',
  overlay1: '#7f849c',
  overlay0: '#6c7086',

  // Surface Colors
  surface2: '#585b70',
  surface1: '#45475a',
  surface0: '#313244',

  // Base Colors
  base: '#1e1e2e',
  mantle: '#181825',
  crust: '#11111b',
} as const;

/**
 * Common UI element colors mapped to Catppuccin palette
 */
export const uiColors = {
  // Primary brand color
  primary: colors.blue,
  primaryDim: colors.sapphire,

  // Status indicators
  success: colors.green,
  warning: colors.yellow,
  error: colors.red,
  info: colors.sky,

  // Interactive elements
  highlight: colors.mauve,
  accent: colors.lavender,

  // Text
  textPrimary: colors.text,
  textSecondary: colors.subtext1,
  textTertiary: colors.subtext0,
  textMuted: colors.overlay2,

  // Backgrounds
  bgBase: colors.base,
  bgMantle: colors.mantle,
  bgCrust: colors.crust,
  bgSurface0: colors.surface0,
  bgSurface1: colors.surface1,
  bgSurface2: colors.surface2,

  // Borders
  border: colors.surface2,
  borderFocus: colors.blue,
  borderHighlight: colors.lavender,

  // Selection
  selectionBg: colors.surface1,
  selectionBgActive: colors.surface2,
  selectionText: colors.text,

  // Scrollbar
  scrollbarTrack: colors.surface0,   // track background  (#313244)
  scrollbarThumb: colors.overlay0,   // thumb             (#6c7086)

  // Diff colors (OpenCode-aligned)
  diffAdded: colors.green,           // Text color for added lines
  diffRemoved: colors.red,           // Text color for removed lines
  diffContext: colors.overlay2,      // Text color for context lines
  diffAddedBg: '#24312b',            // Background for added lines (dark green tint)
  diffRemovedBg: '#3c2a32',          // Background for removed lines (dark red tint)
  diffContextBg: colors.mantle,      // Background for context lines
} as const;

export type CatppuccinColor = keyof typeof colors;
export type UIColor = keyof typeof uiColors;

/**
 * Shared scrollbar options for all native <scrollbox> elements.
 * Pass directly as scrollbarOptions={SCROLLBAR_OPTIONS}.
 *
 * Track background : surface0  (#313244) — blends into dark backgrounds
 * Thumb foreground  : overlay0  (#6c7086) — visible but not distracting
 *
 * NOTE: `visible` is intentionally omitted here so that each scrollbar
 * auto-manages its own visibility via recalculateVisibility().
 * Forcing visible:true on the shared options would also make the
 * horizontal scrollbar permanently visible (as a 1-line grey strip at
 * the bottom of every panel) even when there is nothing to scroll
 * horizontally, because both scrollbars receive scrollbarOptions.
 */
export const SCROLLBAR_OPTIONS = {
  showArrows: false,
  trackOptions: {
    backgroundColor: colors.surface0,
    foregroundColor: colors.overlay0,
  },
} as const;
