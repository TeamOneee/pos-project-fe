/**
 * What the POS grid is allowed to sell.
 *
 * This used to compose three Owner/Admin endpoints — products, categories and
 * inventory — and apply the sellability rule on the client. Contract §4.2 makes
 * that both unnecessary and impossible:
 *
 *   • Unnecessary, because `GET /products/catalog` already returns only active
 *     products in active categories that have stock at the outlet, priced at
 *     that outlet's effective price (FR-CAT-006, FR-CAT-011–012, OD-002).
 *   • Impossible, because a CASHIER may call none of the three: `GET /products`
 *     and `GET /inventory` are OWNER/ADMIN only (§3.2, §4.2).
 *
 * So the till reads one endpoint and trusts it. The only thing still joined
 * locally is the category *name* for the chip row, since the catalogue rows
 * carry `category_id` but not the label — and `GET /categories` is readable by
 * every role.
 */

import * as React from 'react';

import { useCatalog } from '@/hooks/use-catalog';
import { useCategories } from '@/hooks/use-categories';
import type { CatalogProduct } from '@/services/catalog';
import type { Category } from '@/services/categories';
import type { Rupiah } from '@/lib/money';

export type PosProduct = {
  productId: string;
  name: string;
  /** Integer rupiah — this outlet's effective price. */
  price: Rupiah;
  categoryId: string;
  categoryName: string;
  /** Units on hand at this cashier's outlet. */
  stock: number;
};

export type PosCategory = { categoryId: string; name: string };

export type PosCatalog = {
  products: PosProduct[];
  categories: PosCategory[];
};

/**
 * The POS asks for one large page rather than paginating: the grid is
 * virtualised, the search is client-side, and a cashier scrolling into a
 * network round trip mid-sale is worse than one larger initial load.
 *
 * §0 caps `size` at 100, so this is the ceiling — a merchant with more sellable
 * products than this at one outlet will need the grid to page.
 */
export const CATALOG_PAGE_SIZE = 100;

export function buildCatalog(rows: CatalogProduct[], categories: Category[]): PosCatalog {
  const nameById = new Map(categories.map((category) => [category.categoryId, category.name]));

  const products = rows.map<PosProduct>((row) => ({
    productId: row.productId,
    name: row.name,
    price: row.price,
    categoryId: row.categoryId,
    // A row whose category is missing from the list is still sellable — the
    // server said so — it just shows without a label rather than disappearing.
    categoryName: nameById.get(row.categoryId) ?? '',
    stock: row.stockQuantity,
  }));

  // Only categories that can actually show something. A chip leading to an
  // empty grid is a dead end.
  const stocked = new Set(products.map((product) => product.categoryId));
  const chips = categories
    .filter((category) => stocked.has(category.categoryId))
    .map((category) => ({ categoryId: category.categoryId, name: category.name }));

  return { products, categories: chips };
}

/** Stock per product, for refreshing the cart's ceilings. */
export function stockMap(products: PosProduct[]): Record<string, number> {
  return Object.fromEntries(products.map((product) => [product.productId, product.stock]));
}

export function usePosCatalog(outletId: string | null) {
  const catalogQuery = useCatalog({ outletId, size: CATALOG_PAGE_SIZE });
  const categories = useCategories({ is_active: true, size: CATALOG_PAGE_SIZE });

  const catalog = React.useMemo(
    () => buildCatalog(catalogQuery.data?.items ?? [], categories.data?.items ?? []),
    [catalogQuery.data, categories.data]
  );

  return {
    catalog,
    isPending: catalogQuery.isPending || categories.isPending,
    isError: catalogQuery.isError || categories.isError,
    refetch: () => {
      void catalogQuery.refetch();
      void categories.refetch();
    },
  };
}
