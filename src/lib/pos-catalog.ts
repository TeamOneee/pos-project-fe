/**
 * What the POS grid is allowed to sell.
 *
 * Three endpoints have to agree before a tile can render: the product must be
 * active, its category must be active, and its stock is whatever the cashier's
 * own outlet holds. Composing that here rather than in the grid keeps the
 * filtering testable and stops a component from ever having to ask "should this
 * product be here?".
 *
 * The deactivated-category rule matters: a product can be ACTIVE while the
 * category it belongs to is not, and the backend will happily return it. It
 * must not appear in the grid or the chip row. That rule is shared with the
 * catalog screen, which warns the Admin about the same products — see
 * lib/catalog-visibility.
 */

import * as React from 'react';

import { useCategories } from '@/hooks/use-categories';
import { useInventory } from '@/hooks/use-inventory';
import { useProducts } from '@/hooks/use-products';
import type { Category } from '@/services/categories';
import type { InventoryItem } from '@/services/inventory';
import type { Product } from '@/services/products';
import { activeCategoryIndex, isVisibleToCashier } from '@/lib/catalog-visibility';
import type { Rupiah } from '@/lib/money';

export type PosProduct = {
  productId: string;
  name: string;
  sku: string;
  /** Integer rupiah. */
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
 * The POS asks for every product in one page rather than paginating: the grid
 * is virtualised, the search is client-side, and a cashier scrolling into a
 * network round trip mid-sale is worse than one larger initial load.
 */
export const CATALOG_PAGE_SIZE = 500;

export function buildCatalog(
  products: Product[],
  categories: Category[],
  inventory: InventoryItem[]
): PosCatalog {
  const activeCategories = activeCategoryIndex(categories);

  const stockByProduct = new Map(inventory.map((row) => [row.productId, row.quantity]));

  const visible = products.flatMap<PosProduct>((product) => {
    // Inactive product, no category, or a deactivated one: not sellable here.
    // The catalog screen labels the same products from the same rule.
    if (!isVisibleToCashier(product, activeCategories)) return [];

    // Guaranteed present by the rule above; narrowing for the type checker.
    const category = activeCategories.get(product.categoryId ?? '');
    if (!category) return [];

    return [
      {
        productId: product.productId,
        name: product.name,
        sku: product.sku,
        price: product.price,
        categoryId: category.categoryId,
        categoryName: category.name,
        stock: stockByProduct.get(product.productId) ?? 0,
      },
    ];
  });

  // Only categories that can actually show something. A chip leading to an
  // empty grid is a dead end.
  const stocked = new Set(visible.map((product) => product.categoryId));
  const chips = [...activeCategories.values()]
    .filter((category) => stocked.has(category.categoryId))
    .map((category) => ({ categoryId: category.categoryId, name: category.name }));

  return { products: visible, categories: chips };
}

/** Stock per product, for refreshing the cart's ceilings. */
export function stockMap(products: PosProduct[]): Record<string, number> {
  return Object.fromEntries(products.map((product) => [product.productId, product.stock]));
}

export function usePosCatalog(outletId: string | null) {
  const products = useProducts({ status: 'ACTIVE', limit: CATALOG_PAGE_SIZE });
  const categories = useCategories();
  const inventory = useInventory({ outlet_id: outletId ?? undefined, limit: CATALOG_PAGE_SIZE });

  const catalog = React.useMemo(
    () =>
      buildCatalog(products.data?.items ?? [], categories.data ?? [], inventory.data?.items ?? []),
    [products.data, categories.data, inventory.data]
  );

  return {
    catalog,
    isPending: products.isPending || categories.isPending || inventory.isPending,
    isError: products.isError || categories.isError || inventory.isError,
    refetch: () => {
      void products.refetch();
      void inventory.refetch();
    },
  };
}
