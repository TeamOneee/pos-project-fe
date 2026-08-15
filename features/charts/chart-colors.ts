/**
 * Resolved colours for charts.
 *
 * Victory paints SVG and needs real colour values, not class names, so this is
 * one of the sanctioned places a token is read at runtime rather than through
 * Tailwind. Everything still comes from design-tokens.js — no chart file
 * contains a hex.
 *
 * The two series colours are fixed across themes by CLAUDE.md: revenue is
 * always #4F46E5 and transaction count always #0EA5E9, so a reader who learns
 * the pairing on one screen keeps it on every other.
 */

import { useTheme } from '@/components/theme-provider';
import { CHART_SERIES, color } from '@/lib/tokens';

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

export function useChartColors(): ChartColors {
  const { theme } = useTheme();

  return {
    revenue: CHART_SERIES.revenue,
    transactions: CHART_SERIES.transactionCount,
    axis: color('fg-subtle', theme),
    grid: color('border', theme),
    // Non-peak bars sit back; peak hours come forward in accent.
    bar: color('border-strong', theme),
    barHighlight: color('accent', theme),
    surface: color('surface', theme),
    text: color('fg', theme),
  };
}

/** Gridlines at half opacity, per the brief's "no chart junk" rule. */
export const GRID_OPACITY = 0.5;

/** Revenue's filled area sits at 8% so the line stays the figure. */
export const AREA_OPACITY = 0.08;
