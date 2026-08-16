/**
 * Resolved colours for charts.
 *
 * Recharts paints SVG and needs real colour values, not class names, so this
 * is one of the sanctioned places a token is read at runtime rather than
 * through Tailwind. Everything still comes from the design tokens — no chart
 * file contains a hex except the two fixed series colours.
 *
 * The two series colours are fixed across themes: revenue is always #4F46E5
 * and transaction count always #0EA5E9, so a reader who learns the pairing on
 * one screen keeps it on every other.
 */

import { useTheme } from '@/components/ui/theme-provider';
import { CHART_SERIES } from '@/lib/tokens';

export type ChartColors = {
  revenue: string;
  transactions: string;
  axis: string;
  grid: string;
  bar: string;
  barHighlight: string;
  surface: string;
  text: string;
};

/** Reads a CSS variable as `rgb(r g b)`, the same string Tailwind produces. */
function tokenValue(name: string): string {
  if (typeof document === 'undefined') return 'rgb(0 0 0)';
  const channels = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  return channels ? `rgb(${channels})` : 'rgb(0 0 0)';
}

export function useChartColors(): ChartColors {
  // Subscribe to theme changes so the resolved colours re-read on toggle.
  useTheme();

  return {
    revenue: CHART_SERIES.revenue,
    transactions: CHART_SERIES.transactionCount,
    axis: tokenValue('fg-subtle'),
    grid: tokenValue('border'),
    // Non-peak bars sit back; peak hours come forward in accent.
    bar: tokenValue('border-strong'),
    barHighlight: tokenValue('accent'),
    surface: tokenValue('surface-raised'),
    text: tokenValue('fg'),
  };
}

/** Gridlines at half opacity, per the "no chart junk" rule. */
export const GRID_OPACITY = 0.5;

/** Revenue's filled area sits at 8% so the line stays the figure. */
export const AREA_OPACITY = 0.08;
