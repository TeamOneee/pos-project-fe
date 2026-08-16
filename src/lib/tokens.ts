/**
 * Typed runtime API over the design tokens (single source: design-tokens.cjs).
 *
 * Runtime consumers: chart series colours and breakpoints. Styling in
 * components goes through Tailwind classes instead.
 */

export type ThemeName = 'light' | 'dark';

export const CHART_PALETTE: readonly string[] = [
  '#4F46E5',
  '#0EA5E9',
  '#14B8A6',
  '#F59E0B',
  '#EC4899',
  '#8B5CF6',
];

/** Revenue is always CHART_PALETTE[0], transaction count always CHART_PALETTE[1]. */
export const CHART_SERIES: { revenue: string; transactionCount: string } = {
  revenue: CHART_PALETTE[0],
  transactionCount: CHART_PALETTE[1],
};

/** Breakpoints (px): mobile <768, tablet 768–1279, desktop >=1280. */
export const BREAKPOINTS = { tablet: 768, desktop: 1280 } as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const;

export const RADIUS = { sm: 6, md: 8, lg: 12, full: 9999 } as const;

export const TOUCH_TARGET = 44 as const;
