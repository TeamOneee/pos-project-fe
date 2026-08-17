/**
 * The accessibility rules that can be proved rather than reviewed.
 *
 * Two kinds of check live here, and it is worth being clear about which is which:
 *
 *   • Rendered-DOM checks. Every interactive element on the main screens has an
 *     accessible name, and every status badge carries words. Real assertions
 *     against the tree a screen reader would walk.
 *   • A source check on touch targets. jsdom has no layout — every element
 *     measures 0×0 — so a 44px assertion is impossible here. Instead the source
 *     is scanned for interactive elements that never opt into a touch size, which
 *     is the mistake worth catching. Actual sizing is a browser check.
 *
 * Contrast is asserted separately, from the tokens, in lib/contrast.test.ts.
 */

import '@/api';

import { act, render, screen } from '@testing-library/react';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

import App from '@/App';
import { resetDb } from '@/api/mock/db';
import { setToken } from '@/api/token';
import { authApi } from '@/services';

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

async function signInAs(email: string) {
  resetDb();
  const result = await authApi.login({ email, password: 'password123' });
  setToken(result.accessToken);
}

async function open(path: string) {
  render(<App />);
  await act(async () => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

/** The accessible name of an element, by the rules that apply in this app. */
function accessibleName(element: Element): string {
  const label = element.getAttribute('aria-label');
  if (label && label.trim()) return label.trim();

  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const target = document.getElementById(labelledBy);
    if (target?.textContent?.trim()) return target.textContent.trim();
  }

  const title = element.getAttribute('title');
  if (title && title.trim()) return title.trim();

  return element.textContent?.trim() ?? '';
}

beforeEach(() => {
  window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  window.innerWidth = 1400;
  window.history.pushState({}, '', '/');
});

const SCREENS: [string, string, string][] = [
  ['owner@indomart.com', '/dashboard', 'Owner dashboard'],
  ['owner@indomart.com', '/transactions', 'transaction history'],
  ['sari@indomart.com', '/dashboard', 'Admin stock dashboard'],
  ['sari@indomart.com', '/products', 'products'],
  ['sari@indomart.com', '/categories', 'categories'],
  ['sari@indomart.com', '/inventory', 'inventory'],
  ['budi@indomart.com', '/pos', 'POS'],
];

describe('every interactive element is named', () => {
  it.each(SCREENS)('%s · %s (%s)', async (email, path) => {
    await signInAs(email);
    await open(path);

    // Let the screen's first paint settle so the real controls are present.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });

    const interactive = Array.from(
      document.querySelectorAll(
        'button, a[href], [role="button"], [role="radio"], [role="menuitem"], [role="tab"], [role="combobox"], input, textarea, select, summary'
      )
    );

    expect(interactive.length).toBeGreaterThan(0);

    const unnamed = interactive
      .filter((element) => accessibleName(element) === '')
      .map((element) => `<${element.tagName.toLowerCase()} class="${element.className}">`);

    expect(unnamed, `${unnamed.length} unnamed control(s) on ${path}`).toEqual([]);
  });
});

describe('status is never colour alone', () => {
  it('gives every badge a text label', async () => {
    await signInAs('sari@indomart.com');
    await open('/products');

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });

    // Badges are the app's status carrier; a coloured pill with no words would be
    // invisible to a screen reader and to anyone who cannot tell the hues apart.
    const badges = Array.from(document.querySelectorAll('.rounded-full')).filter((element) =>
      /bg-(success|warning|danger|accent)-subtle|bg-subtle/.test(element.className)
    );

    expect(badges.length).toBeGreaterThan(0);
    for (const badge of badges) {
      expect(accessibleName(badge), `badge with class ${badge.className}`).not.toBe('');
    }
  });

  it('states the stock condition in words on the inventory table', async () => {
    await signInAs('sari@indomart.com');
    await open('/inventory?outlet=otl_a');

    // AMAN / MENIPIS / HABIS — the colour repeats the word, never replaces it.
    const labels = await screen.findAllByText(/AMAN|MENIPIS|HABIS/);
    expect(labels.length).toBeGreaterThan(0);
  });
});

/* -------------------------------------------------------------------------- */
/* Source-level checks                                                         */
/* -------------------------------------------------------------------------- */

/** Every .tsx under src, excluding tests. */
function sourceFiles(dir = 'src', found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(path, found);
    else if (path.endsWith('.tsx') && !path.includes('.test.')) found.push(path);
  }
  return found;
}

/**
 * Finds each `<button` open tag and returns its attribute text, tracking brace
 * depth so a `>` inside a JSX expression or template literal does not end the tag
 * early. A naive regex reports false positives on half this codebase.
 */
function buttonTags(source: string): { attrs: string; line: number }[] {
  const tags: { attrs: string; line: number }[] = [];
  const open = /<button\b/g;
  let match: RegExpExecArray | null;

  while ((match = open.exec(source))) {
    let depth = 0;
    let index = match.index + match[0].length;

    for (; index < source.length; index += 1) {
      const char = source[index];
      if (char === '{' || char === '`') depth += 1;
      else if (char === '}') depth -= 1;
      else if (char === '>' && depth <= 0) break;
    }

    tags.push({
      attrs: source.slice(match.index, index),
      line: source.slice(0, match.index).split('\n').length,
    });
  }

  return tags;
}

describe('touch targets', () => {
  it('has every raw button opt into a touch size', () => {
    // The Button primitive is already ≥44px in every size, so this only catches
    // hand-rolled ones — icon triggers, table row actions, tiles.
    const offenders: string[] = [];

    for (const file of sourceFiles()) {
      const source = readFileSync(file, 'utf8');
      for (const { attrs, line } of buttonTags(source)) {
        const sized =
          /min-h-touch|h-touch|min-h-\[|py-(md|lg|xl)|h-(9|10|11|12|14|16)\b/.test(attrs) ||
          // A wrapper around a whole card, or a full-screen click-away catcher,
          // is larger than 44px by construction.
          /\bsizing\b|flex-1|w-full|inset-0/.test(attrs) ||
          // Sizing supplied by a shared class helper or the Button primitive.
          /buttonVariants|cnStepper/.test(attrs);

        if (!sized) offenders.push(`${file}:${line}`);
      }
    }

    expect(offenders, `un-sized interactive elements: ${offenders.join(', ')}`).toEqual([]);
  });

  it('routes every focus ring through the single class', () => {
    // One ring, defined once in tailwind.config.cjs: 2px accent at 40%, 2px
    // offset. A hand-rolled ring utility means a second, different ring.
    const offenders: string[] = [];

    for (const file of sourceFiles()) {
      const source = readFileSync(file, 'utf8');
      if (/focus-visible:ring-|focus:ring-\d/.test(source)) offenders.push(file);
    }

    expect(offenders, `hand-rolled focus rings: ${offenders.join(', ')}`).toEqual([]);
  });
});
