/**
 * The single source of truth for every design token (CLAUDE.md § Design tokens).
 * Nothing else in the codebase may contain a colour literal.
 *
 * Plain CommonJS because three very different consumers read it:
 *   1. `tailwind.config.js`      — at Metro/PostCSS build time, cannot load TypeScript
 *   2. `scripts/generate-tokens-css.js` — regenerates global.css (`npm run tokens`)
 *   3. `lib/tokens.ts`           — the typed API for runtime code
 *
 * After editing, run `npm run tokens` to regenerate global.css.
 */

/** Semantic colour roles, light and dark. */
const COLOR_TOKENS = {
  canvas: { light: '#F7F8FA', dark: '#0B0D11' },
  surface: { light: '#FFFFFF', dark: '#14171D' },
  'surface-raised': { light: '#FFFFFF', dark: '#1B1F27' },
  subtle: { light: '#F1F3F6', dark: '#1B1F27' },
  border: { light: '#E4E7EC', dark: '#272B34' },
  'border-strong': { light: '#CDD2DA', dark: '#3A404C' },
  fg: { light: '#101828', dark: '#F2F4F7' },
  'fg-muted': { light: '#5A6376', dark: '#98A2B3' },
  'fg-subtle': { light: '#8A94A6', dark: '#6B7385' },
  accent: { light: '#4F46E5', dark: '#6366F1' },
  'accent-hover': { light: '#4338CA', dark: '#818CF8' },
  'accent-subtle': { light: '#EEF0FE', dark: '#1E1B4B' },
  success: { light: '#16A34A', dark: '#22C55E' },
  'success-subtle': { light: '#ECFDF3', dark: '#052E16' },
  warning: { light: '#D97706', dark: '#F59E0B' },
  'warning-subtle': { light: '#FFFAEB', dark: '#3B2506' },
  danger: { light: '#DC2626', dark: '#EF4444' },
  'danger-subtle': { light: '#FEF3F2', dark: '#3B0A0A' },
  info: { light: '#0284C7', dark: '#38BDF8' },

  /*
   * Accessible variants of the palette above, for the roles where the base token
   * cannot meet WCAG AA. Measured, not guessed — lib/contrast.test.ts asserts
   * every ratio below and fails if one of these values drifts.
   *
   * Why they exist: the base status colours are tuned for fills and icons, where
   * the bar is 3:1. Used as *text* they need 4.5:1, and on a light surface
   * `success #16A34A` reaches only 3.30 (`warning` 3.19, `info` 4.10). Rather
   * than lighten the fills — which would weaken every badge and chart — text and
   * fills split into two roles:
   *
   *   `*-text`         — text and any glyph read as text. ≥4.5:1 both themes.
   *   `*-fill`         — a solid background carrying white text. ≥4.5:1 both.
   *   `border-interactive` — the boundary of a control the user can operate,
   *                          which WCAG 1.4.11 puts at 3:1. `border` and
   *                          `border-strong` stay decorative hairlines.
   */
  'accent-text': { light: '#4F46E5', dark: '#818CF8' },
  'success-text': { light: '#15803D', dark: '#22C55E' },
  'warning-text': { light: '#B45309', dark: '#F59E0B' },
  // Dark: one step lighter than the base #EF4444, which reaches only 4.39:1 on
  // `surface-raised` — the background of every dialog, where errors live.
  'danger-text': { light: '#B91C1C', dark: '#F87171' },
  'info-text': { light: '#0369A1', dark: '#38BDF8' },

  // White-on-fill needs the darker end of the ramp in both themes: the dark
  // accent (#6366F1) reaches only 4.47:1 against white, and its hover state 2.7.
  'accent-fill': { light: '#4F46E5', dark: '#4F46E5' },
  'accent-fill-hover': { light: '#4338CA', dark: '#4338CA' },
  'danger-fill': { light: '#DC2626', dark: '#DC2626' },

  'border-interactive': { light: '#7C8698', dark: '#6B7385' },
};

/**
 * Chart palette, in this exact order. Identical in both themes so a series keeps
 * its colour when the user flips the theme mid-session.
 */
const CHART_PALETTE = ['#4F46E5', '#0EA5E9', '#14B8A6', '#F59E0B', '#EC4899', '#8B5CF6'];

/** Fixed series colours: revenue is always indigo, transaction count always sky. */
const CHART_SERIES = {
  revenue: CHART_PALETTE[0],
  transactionCount: CHART_PALETTE[1],
};

/** Type scale (Inter). Money is always `mono` — tabular figures, right-aligned. */
const TYPE_SCALE = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: '600' },
  h1: { fontSize: 24, lineHeight: 32, fontWeight: '600' },
  h2: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
  h3: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  'body-strong': { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  mono: { fontSize: 13, lineHeight: 20, fontWeight: '500' },
};

/** Spacing scale (px): 4 8 12 16 20 24 32 40 48 64. */
const SPACING = {
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
};

/** Radius scale (px). */
const RADIUS = { sm: 6, md: 8, lg: 12, full: 9999 };

/** Minimum accessible touch target, px (CLAUDE.md rule 6). */
const TOUCH_TARGET = 44;

/** Breakpoints (px): mobile <768, tablet 768–1279, desktop >=1280. */
const BREAKPOINTS = { tablet: 768, desktop: 1280 };

/** "#4F46E5" -> "79 70 229", the channel triplet form CSS variables use. */
function hexToRgbChannels(hex) {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized;

  const int = parseInt(full, 16);
  return `${(int >> 16) & 255} ${(int >> 8) & 255} ${int & 255}`;
}

module.exports = {
  COLOR_TOKENS,
  CHART_PALETTE,
  CHART_SERIES,
  TYPE_SCALE,
  SPACING,
  RADIUS,
  TOUCH_TARGET,
  BREAKPOINTS,
  hexToRgbChannels,
};
