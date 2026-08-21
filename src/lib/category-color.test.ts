/**
 * The promise this helper makes is stability: a category keeps its colour between renders, pages
 * and sessions.
 */

import { describe, expect, it } from 'vitest';

import { CATEGORY_HUES, categoryHue, categoryHueIndex } from '@/lib/category-color';

describe('categoryHueIndex', () => {
  const seeded = [
    { categoryId: 'cat_1' },
    { categoryId: 'cat_2' },
    { categoryId: 'cat_3' },
    { categoryId: 'cat_4' },
    { categoryId: 'cat_5' },
  ];

  it('gives every category its own hue while the palette lasts', () => {
    const hues = [...categoryHueIndex(seeded).values()];

    // The point of indexing rather than hashing: five categories, five colours.
    expect(new Set(hues).size).toBe(seeded.length);
  });

  it('cycles once the palette runs out rather than running dry', () => {
    const many = Array.from({ length: CATEGORY_HUES.length + 2 }, (_, index) => ({
      categoryId: `cat_${index}`,
    }));
    const index = categoryHueIndex(many);

    expect(index.size).toBe(many.length);
    expect(index.get('cat_0')).toBe(index.get(`cat_${CATEGORY_HUES.length}`));
  });

  it('does not move a category because the list grew after it', () => {
    const before = categoryHueIndex(seeded);
    const after = categoryHueIndex([...seeded, { categoryId: 'cat_6' }]);

    for (const { categoryId } of seeded) {
      expect(after.get(categoryId)).toBe(before.get(categoryId));
    }
  });
});

describe('categoryHue', () => {
  it('gives the same name the same hue every time', () => {
    expect(categoryHue('Minuman')).toBe(categoryHue('Minuman'));
  });

  it('ignores casing and surrounding space, which the API does not guarantee', () => {
    expect(categoryHue('  minuman ')).toBe(categoryHue('Minuman'));
  });

  it('always answers with a hue from the palette', () => {
    for (const name of ['Minuman', 'Makanan Ringan', 'Kopi', 'Perawatan Diri', 'Roti', '']) {
      expect(CATEGORY_HUES).toContain(categoryHue(name));
    }
  });

  it('never hands out the amber reserved for MENIPIS', () => {
    expect(CATEGORY_HUES).not.toContain('#F59E0B');
  });

  it('spreads the seeded categories over more than one hue', () => {
    // Not a guarantee the function can make for arbitrary input, but if the five categories this
    // product ships with all collided, the hashing would be pointless and this is where we would
    // find out.
    const hues = new Set(
      ['Minuman', 'Makanan Ringan', 'Kopi', 'Perawatan Diri', 'Roti'].map(categoryHue)
    );

    expect(hues.size).toBeGreaterThan(1);
  });
});
