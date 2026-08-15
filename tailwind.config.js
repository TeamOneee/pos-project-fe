/** @type {import('tailwindcss').Config} */

const plugin = require('tailwindcss/plugin');

const {
  CHART_PALETTE,
  CHART_SERIES,
  TYPE_SCALE,
  SPACING,
  RADIUS,
  TOUCH_TARGET,
  BREAKPOINTS,
} = require('./design-tokens');

/** Semantic colour backed by a CSS variable, so `bg-accent/10` still works. */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

const px = (value) => `${value}px`;

/**
 * Android does not synthesize weights from a single family — each weight is a
 * separately registered face (see lib/fonts.ts). Web and iOS accept these names
 * too, so the presets name the exact face rather than relying on fontWeight.
 */
const WEIGHT_FAMILY = {
  400: 'Inter-Regular',
  500: 'Inter-Medium',
  600: 'Inter-SemiBold',
  700: 'Inter-Bold',
};

/** { xs: 4 } -> { xs: '4px' } */
const toPxScale = (scale) =>
  Object.fromEntries(Object.entries(scale).map(([name, value]) => [name, px(value)]));

module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './features/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    // CLAUDE.md: mobile <768, tablet 768–1279, desktop >=1280. Mobile is the base.
    screens: {
      tablet: px(BREAKPOINTS.tablet),
      desktop: px(BREAKPOINTS.desktop),
    },

    // Replaces the default radius scale, so only the design scale is expressible.
    borderRadius: {
      none: '0px',
      DEFAULT: px(RADIUS.md),
      ...toPxScale(RADIUS),
    },

    extend: {
      colors: {
        canvas: token('canvas'),
        surface: {
          DEFAULT: token('surface'),
          raised: token('surface-raised'),
        },
        subtle: token('subtle'),
        border: {
          DEFAULT: token('border'),
          strong: token('border-strong'),
        },
        fg: {
          DEFAULT: token('fg'),
          muted: token('fg-muted'),
          subtle: token('fg-subtle'),
        },
        accent: {
          DEFAULT: token('accent'),
          hover: token('accent-hover'),
          subtle: token('accent-subtle'),
        },
        success: {
          DEFAULT: token('success'),
          subtle: token('success-subtle'),
        },
        warning: {
          DEFAULT: token('warning'),
          subtle: token('warning-subtle'),
        },
        danger: {
          DEFAULT: token('danger'),
          subtle: token('danger-subtle'),
        },
        info: token('info'),

        // Chart palette — fixed across themes, in this exact order.
        // Revenue is always chart-1, transaction count always chart-2.
        chart: {
          ...Object.fromEntries(CHART_PALETTE.map((hex, index) => [index + 1, hex])),
          revenue: CHART_SERIES.revenue,
          count: CHART_SERIES.transactionCount,
        },
      },

      fontFamily: {
        sans: ['Inter-Regular', 'Inter', 'system-ui', 'sans-serif'],
        medium: ['Inter-Medium', 'Inter', 'system-ui', 'sans-serif'],
        semibold: ['Inter-SemiBold', 'Inter', 'system-ui', 'sans-serif'],
        bold: ['Inter-Bold', 'Inter', 'system-ui', 'sans-serif'],
        // "mono" is the money/figure style: Inter with tabular figures, not a
        // monospaced typeface. Pair with `tabular-nums`, or use `.type-mono`.
        mono: ['Inter-Medium', 'Inter', 'system-ui', 'sans-serif'],
      },

      // Individual utilities: text-display, text-body, text-mono, ...
      fontSize: Object.fromEntries(
        Object.entries(TYPE_SCALE).map(([name, { fontSize, lineHeight, fontWeight }]) => [
          name,
          [px(fontSize), { lineHeight: px(lineHeight), fontWeight }],
        ])
      ),

      // Design spacing scale as semantic names, layered on the default numeric
      // scale (which already carries 4/8/12/16/20/24/32/40/48/64 at 1..16).
      spacing: {
        ...toPxScale(SPACING),
        // Minimum accessible touch target (CLAUDE.md rule 6).
        touch: px(TOUCH_TARGET),
      },

      minHeight: { touch: px(TOUCH_TARGET) },
      minWidth: { touch: px(TOUCH_TARGET) },
    },
  },
  plugins: [
    // Whole-preset classes: `.type-h1` sets family + size + line-height + weight
    // in one go, so screens never re-specify the scale.
    plugin(({ addComponents }) => {
      addComponents(
        Object.fromEntries(
          Object.entries(TYPE_SCALE).map(([name, { fontSize, lineHeight, fontWeight }]) => [
            `.type-${name}`,
            {
              fontFamily: WEIGHT_FAMILY[fontWeight],
              fontSize: px(fontSize),
              lineHeight: px(lineHeight),
              fontWeight,
              // Money is always tabular so digits line up down a column.
              ...(name === 'mono' ? { fontVariantNumeric: 'tabular-nums' } : {}),
            },
          ])
        )
      );
    }),
  ],
};
