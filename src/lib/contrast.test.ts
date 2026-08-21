/** WCAG contrast, asserted against the tokens themselves. */

import { describe, expect, it } from 'vitest';

// The Tailwind/token source of truth, read directly rather than mirrored.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tokens = require('../../design-tokens.cjs') as {
  COLOR_TOKENS: Record<string, { light: string; dark: string }>;
  CHART_PALETTE: string[];
};

type Theme = 'light' | 'dark';

const BODY_TEXT_MIN = 4.5;
const LARGE_TEXT_MIN = 3;
const UI_BOUNDARY_MIN = 3;

function channels(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16) / 255);
  return [r ?? 0, g ?? 0, b ?? 0];
}

/** Relative luminance, per WCAG 2.1. */
function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

const color = (name: string, theme: Theme): string => {
  const token = tokens.COLOR_TOKENS[name];
  if (!token) throw new Error(`Unknown design token: ${name}`);
  return token[theme];
};

/** Every surface a piece of text can land on in this app. */
const SURFACES = ['canvas', 'surface', 'surface-raised', 'subtle'] as const;

/** Text roles that must clear 4.5:1 on every surface above. */
const TEXT_ON_ANY_SURFACE = ['fg', 'fg-muted', 'accent-text'] as const;

/** Status text always appears on its own tint or on a plain surface. */
const STATUS_TEXT: [string, string[]][] = [
  ['success-text', ['surface', 'surface-raised', 'success-subtle']],
  ['warning-text', ['surface', 'surface-raised', 'warning-subtle']],
  ['danger-text', ['surface', 'surface-raised', 'danger-subtle']],
  ['info-text', ['surface', 'surface-raised']],
  ['accent-text', ['accent-subtle']],
];

describe.each(['light', 'dark'] as const)('%s theme', (theme) => {
  it('clears 4.5:1 for text on every surface', () => {
    for (const role of TEXT_ON_ANY_SURFACE) {
      for (const surface of SURFACES) {
        const ratio = contrastRatio(color(role, theme), color(surface, theme));
        expect(
          ratio,
          `${role} on ${surface} is ${ratio.toFixed(2)}:1, needs ${BODY_TEXT_MIN}`
        ).toBeGreaterThanOrEqual(BODY_TEXT_MIN);
      }
    }
  });

  it('clears 4.5:1 for status text on its own tint', () => {
    for (const [role, surfaces] of STATUS_TEXT) {
      for (const surface of surfaces) {
        const ratio = contrastRatio(color(role, theme), color(surface, theme));
        expect(
          ratio,
          `${role} on ${surface} is ${ratio.toFixed(2)}:1, needs ${BODY_TEXT_MIN}`
        ).toBeGreaterThanOrEqual(BODY_TEXT_MIN);
      }
    }
  });

  it('clears 4.5:1 for white on every solid fill that carries it', () => {
    // Primary and danger buttons are the only white-on-fill surfaces.
    for (const fill of ['accent-fill', 'accent-fill-hover', 'danger-fill']) {
      const ratio = contrastRatio('#FFFFFF', color(fill, theme));
      expect(
        ratio,
        `white on ${fill} is ${ratio.toFixed(2)}:1, needs ${BODY_TEXT_MIN}`
      ).toBeGreaterThanOrEqual(BODY_TEXT_MIN);
    }
  });

  it('clears 3:1 for the boundary of an operable control', () => {
    // WCAG 1.4.11: inputs, selects, checkboxes, switches, outline buttons.
    for (const surface of ['canvas', 'surface', 'surface-raised', 'subtle'] as const) {
      const ratio = contrastRatio(color('border-interactive', theme), color(surface, theme));
      expect(
        ratio,
        `border-interactive on ${surface} is ${ratio.toFixed(2)}:1, needs ${UI_BOUNDARY_MIN}`
      ).toBeGreaterThanOrEqual(UI_BOUNDARY_MIN);
    }
  });

  it('clears 3:1 for status icons and large text', () => {
    for (const role of ['accent', 'success', 'warning', 'danger', 'info']) {
      const ratio = contrastRatio(color(role, theme), color('surface', theme));
      expect(
        ratio,
        `${role} on surface is ${ratio.toFixed(2)}:1, needs ${LARGE_TEXT_MIN}`
      ).toBeGreaterThanOrEqual(LARGE_TEXT_MIN);
    }
  });

  it('keeps the focus ring visible against every surface', () => {
    // The ring is accent at 40% over the surface behind it; the composite is what the eye sees, so
    // that is what is measured.
    const [ar, ag, ab] = channels(color('accent', theme));
    for (const surface of SURFACES) {
      const [sr, sg, sb] = channels(color(surface, theme));
      const blend = (a: number, s: number) => Math.round((a * 0.4 + s * 0.6) * 255);
      const hex = `#${[blend(ar, sr), blend(ag, sg), blend(ab, sb)]
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('')}`;

      const ratio = contrastRatio(hex, color(surface, theme));
      expect(
        ratio,
        `focus ring over ${surface} is ${ratio.toFixed(2)}:1, needs 1.6`
      ).toBeGreaterThanOrEqual(1.6);
    }
  });
});

/** The two places this product knowingly sits below the bar, and why. */
describe('documented exceptions', () => {
  it('keeps decorative hairlines subtle rather than 3:1', () => {
    // `border` and `border-strong` separate rows and cards. WCAG 1.4.11 covers the boundary of a
    // *control*, not a divider, and a 3:1 table rule reads as a heavy black grid.
    const ratio = contrastRatio(color('border', 'light'), color('surface', 'light'));
    expect(ratio).toBeLessThan(UI_BOUNDARY_MIN);
  });

  it('keeps the specified chart palette, mitigated by labels and a table', () => {
    // CLAUDE.md fixes the chart palette and its order, and three series fall below 3:1 against a
    // light surface (sky 2.77, teal 2.49, amber 2.15).
    const belowBar = tokens.CHART_PALETTE.filter(
      (hex) => contrastRatio(hex, color('surface', 'light')) < LARGE_TEXT_MIN
    );
    expect(belowBar).toHaveLength(3);
  });
});
