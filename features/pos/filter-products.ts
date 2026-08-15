/**
 * The POS search filter.
 *
 * A pure function so the grid can memoise it and so it can be tested against
 * a realistic catalogue without rendering anything. It runs on every keystroke
 * over the whole catalogue, so it does the cheap checks first and allocates
 * nothing per candidate beyond the lowercased query.
 */

import type { PosProduct } from '@/features/pos/pos-catalog';

/** Sentinel for the "Semua" chip. */
export const ALL_CATEGORIES = null;

export type CatalogFilter = {
  /** Matches product name or SKU, case-insensitively. */
  query: string;
  /** Null shows every category. */
  categoryId: string | null;
};

export function filterProducts(products: PosProduct[], filter: CatalogFilter): PosProduct[] {
  const query = filter.query.trim().toLowerCase();
  const { categoryId } = filter;

  if (!query && !categoryId) return products;

  return products.filter((product) => {
    if (categoryId && product.categoryId !== categoryId) return false;
    if (!query) return true;

    return (
      product.name.toLowerCase().includes(query) || product.sku.toLowerCase().includes(query)
    );
  });
}

/**
 * Which empty state to show. "No results at all" and "nothing matched the
 * filter" are different problems with different ways out (design brief §7.1).
 */
export type CatalogEmptyKind = 'none' | 'empty-catalog' | 'no-results';

export function emptyKind(total: number, shown: number): CatalogEmptyKind {
  if (shown > 0) return 'none';
  return total === 0 ? 'empty-catalog' : 'no-results';
}
