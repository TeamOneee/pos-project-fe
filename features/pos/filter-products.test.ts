/**
 * The search filter. Pure, so it can be checked against a realistic catalogue
 * without rendering — which is also what lets the grid memoise it.
 */

import { emptyKind, filterProducts } from '@/features/pos/filter-products';
import type { PosProduct } from '@/features/pos/pos-catalog';

function make(name: string, sku: string, categoryId = 'cat_minuman'): PosProduct {
  return {
    productId: sku,
    name,
    sku,
    price: 15_000,
    categoryId,
    categoryName: 'Minuman',
    stock: 10,
  };
}

const CATALOG: PosProduct[] = [
  make('Coca Cola 1.5L', 'CC-1500'),
  make('Sprite 1.5L', 'SP-1500'),
  make('Air Mineral 600ml', 'MW-600'),
  make('Chitato Sapi Panggang', 'CH-068', 'cat_makanan_ringan'),
  make('Indomie Goreng', 'IM-001', 'cat_makanan_ringan'),
];

const ALL = { query: '', categoryId: null };

describe('search', () => {
  it('returns everything for an empty query', () => {
    expect(filterProducts(CATALOG, ALL)).toHaveLength(5);
  });

  it('returns the same array instance when nothing is filtered', () => {
    // Cheap identity check keeps the grid from re-rendering for nothing.
    expect(filterProducts(CATALOG, ALL)).toBe(CATALOG);
  });

  it('matches on name, case-insensitively', () => {
    expect(filterProducts(CATALOG, { ...ALL, query: 'coca' }).map((p) => p.sku)).toEqual([
      'CC-1500',
    ]);
    expect(filterProducts(CATALOG, { ...ALL, query: 'COCA' })).toHaveLength(1);
  });

  it('matches on SKU', () => {
    expect(filterProducts(CATALOG, { ...ALL, query: 'mw-600' }).map((p) => p.name)).toEqual([
      'Air Mineral 600ml',
    ]);
  });

  it('matches partway through a word', () => {
    expect(filterProducts(CATALOG, { ...ALL, query: '1.5L' })).toHaveLength(2);
  });

  it('ignores surrounding whitespace', () => {
    expect(filterProducts(CATALOG, { ...ALL, query: '  sprite  ' })).toHaveLength(1);
  });

  it('returns nothing for a query that matches nothing', () => {
    expect(filterProducts(CATALOG, { ...ALL, query: 'kopi' })).toHaveLength(0);
  });
});

describe('category chips', () => {
  it('narrows to one category', () => {
    const snacks = filterProducts(CATALOG, { query: '', categoryId: 'cat_makanan_ringan' });
    expect(snacks.map((p) => p.sku)).toEqual(['CH-068', 'IM-001']);
  });

  it('combines with the search query', () => {
    const result = filterProducts(CATALOG, {
      query: 'indomie',
      categoryId: 'cat_makanan_ringan',
    });
    expect(result.map((p) => p.sku)).toEqual(['IM-001']);
  });

  it('returns nothing when the query sits outside the chosen category', () => {
    const result = filterProducts(CATALOG, { query: 'coca', categoryId: 'cat_makanan_ringan' });
    expect(result).toHaveLength(0);
  });
});

describe('which empty state to show', () => {
  it('says nothing when there are results', () => {
    expect(emptyKind(5, 5)).toBe('none');
  });

  it('distinguishes an empty catalogue from an over-narrow filter', () => {
    // Different problems, different ways out (design brief §7.1).
    expect(emptyKind(0, 0)).toBe('empty-catalog');
    expect(emptyKind(5, 0)).toBe('no-results');
  });
});
