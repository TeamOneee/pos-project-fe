/**
 * Typed runtime API over `design-tokens.js` — the single source of truth for
 * every design token (CLAUDE.md § Design tokens).
 *
 * Runtime consumers: the navigation theme, chart series colours, the splash and
 * status bar. Styling in components goes through Tailwind classes instead.
 */
import tokens from '@/design-tokens';

export type ThemeName = 'light' | 'dark';

export const COLOR_TOKENS: Record<string, Record<ThemeName, string>> = tokens.COLOR_TOKENS;

export type ColorToken = keyof typeof tokens.COLOR_TOKENS;

/** Chart palette, in this exact order. */
export const CHART_PALETTE: readonly string[] = tokens.CHART_PALETTE;

/** Revenue is always CHART_PALETTE[0], transaction count always CHART_PALETTE[1]. */
export const CHART_SERIES: { revenue: string; transactionCount: string } = tokens.CHART_SERIES;

export const TYPE_SCALE = tokens.TYPE_SCALE;
export type TypePreset = keyof typeof tokens.TYPE_SCALE;

export const SPACING = tokens.SPACING;
export const RADIUS = tokens.RADIUS;
export const TOUCH_TARGET: number = tokens.TOUCH_TARGET;
export const BREAKPOINTS = tokens.BREAKPOINTS;

/** Resolve one token for a theme: `color('accent', 'dark')`. */
export function color(name: ColorToken, theme: ThemeName): string {
  const variants = COLOR_TOKENS[name as string];
  if (!variants) throw new Error(`Unknown colour token: ${String(name)}`);
  return variants[theme];
}

/** Every token resolved for one theme. */
export function themeColors(theme: ThemeName): Record<string, string> {
  return Object.fromEntries(
    Object.entries(COLOR_TOKENS).map(([name, variants]) => [name, variants[theme]])
  );
}

export const hexToRgbChannels: (hex: string) => string = tokens.hexToRgbChannels;
