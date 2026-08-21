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
          // The boundary of an operable control: 3:1, per WCAG 1.4.11.
          interactive: token('border-interactive'),
        },
        fg: {
          DEFAULT: token('fg'),
          muted: token('fg-muted'),
          subtle: token('fg-subtle'),
        },
        /*
         * Each status role has up to three tokens: the base (fills, icons — 3:1),
         * `text` (anything read as text — 4.5:1) and `fill` (a solid background
         * under white text — 4.5:1). See design-tokens.cjs.
         */
        accent: {
          DEFAULT: token('accent'),
          hover: token('accent-hover'),
          subtle: token('accent-subtle'),
          text: token('accent-text'),
          fill: token('accent-fill'),
          'fill-hover': token('accent-fill-hover'),
        },
        success: {
          DEFAULT: token('success'),
          subtle: token('success-subtle'),
          text: token('success-text'),
        },
        warning: {
          DEFAULT: token('warning'),
          subtle: token('warning-subtle'),
          text: token('warning-text'),
        },
        danger: {
          DEFAULT: token('danger'),
          subtle: token('danger-subtle'),
          text: token('danger-text'),
          fill: token('danger-fill'),
        },
        info: {
          DEFAULT: token('info'),
          text: token('info-text'),
        },

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

      /*
       * The keyboard focus ring, defined once: 2px accent at 40% opacity, 2px
       * offset. Every focusable element uses `.focus-ring` rather than restating
       * a ring utility, so the app cannot end up with three different rings.
       *
       * `outline` rather than a box-shadow ring, deliberately: an outline needs
       * no offset colour, so the ring looks right on canvas, on a raised card and
       * inside a dialog alike, and it follows the element's border radius.
       */
      addComponents({
        '.focus-ring': {
          '&:focus-visible': {
            outline: `2px solid rgb(var(--accent) / 0.4)`,
            outlineOffset: '2px',
          },
        },
        // Text inputs and selects: the same ring, on any focus rather than
        // keyboard focus only, because clicking into a field should show where
        // typing will go. It is the *only* thing these controls change on focus
        // — pairing it with an accent border drew two rings around one field.
        '.focus-ring-always': {
          '&:focus': {
            outline: `2px solid rgb(var(--accent) / 0.4)`,
            outlineOffset: '2px',
          },
        },
        // The same ring in the error colour, for a field that is focused *and*
        // invalid. Recolouring the one ring is what keeps that state down to a
        // single line: a red border inside an accent ring is two, and the pair
        // reads as a rendering fault rather than as an error.
        '.focus-ring-danger': {
          '&:focus': {
            outline: `2px solid rgb(var(--danger) / 0.4)`,
            outlineOffset: '2px',
          },
        },
      });
    }),
  ],
};
