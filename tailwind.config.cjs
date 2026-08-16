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
} = require('./design-tokens.cjs');

/** Semantic colour backed by a CSS variable, so `bg-accent/10` still works. */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

const px = (value) => `${value}px`;

/** { xs: 4 } -> { xs: '4px' } */
const toPxScale = (scale) =>
  Object.fromEntries(Object.entries(scale).map(([name, value]) => [name, px(value)]));

module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
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

        chart: {
          ...Object.fromEntries(CHART_PALETTE.map((hex, index) => [index + 1, hex])),
          revenue: CHART_SERIES.revenue,
          count: CHART_SERIES.transactionCount,
        },
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Inter', 'system-ui', 'sans-serif'],
      },

      fontSize: Object.fromEntries(
        Object.entries(TYPE_SCALE).map(([name, { fontSize, lineHeight, fontWeight }]) => [
          name,
          [px(fontSize), { lineHeight: px(lineHeight), fontWeight }],
        ])
      ),

      spacing: {
        ...toPxScale(SPACING),
        touch: px(TOUCH_TARGET),
      },

      minHeight: { touch: px(TOUCH_TARGET) },
      minWidth: { touch: px(TOUCH_TARGET) },
    },
  },
  plugins: [
    plugin(({ addComponents }) => {
      addComponents(
        Object.fromEntries(
          Object.entries(TYPE_SCALE).map(([name, { fontSize, lineHeight, fontWeight }]) => [
            `.type-${name}`,
            {
              fontSize: px(fontSize),
              lineHeight: px(lineHeight),
              fontWeight,
              ...(name === 'mono' ? { fontVariantNumeric: 'tabular-nums' } : {}),
            },
          ])
        )
      );
    }),
  ],
};