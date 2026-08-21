/**
 * One rule for "would a cashier be offered this product?", for the screens that need to say so.
 */

import type { Category } from '@/services/categories';
import type { Product } from '@/services/products';

/** Just enough of a product for the rule; the full row is welcome too. */
type ProductLike = Pick<Product, 'isActive' | 'categoryId'>;
type CategoryLike = Pick<Category, 'categoryId' | 'isActive'>;

/** The categories a product may be sold under, by id. */
export function activeCategoryIndex<T extends CategoryLike>(categories: T[]): Map<string, T> {
  return new Map(
    categories
      .filter((category) => category.isActive)
      .map((category) => [category.categoryId, category])
  );
}

/** Why the cashier would not be offered this product, or null when they would. */
export type CashierHiddenReason = 'product-inactive' | 'no-category' | 'category-inactive';

export function cashierHiddenReason(
  product: ProductLike,
  activeCategories: ReadonlyMap<string, CategoryLike>
): CashierHiddenReason | null {
  if (!product.isActive) return 'product-inactive';
  if (!product.categoryId) return 'no-category';
  if (!activeCategories.has(product.categoryId)) return 'category-inactive';
  return null;
}

export function isVisibleToCashier(
  product: ProductLike,
  activeCategories: ReadonlyMap<string, CategoryLike>
): boolean {
  return cashierHiddenReason(product, activeCategories) === null;
}

/**
 * True for the case S-11 badges: the product itself is active, so it stays in the catalog list at
 * full opacity, but its category is not and the cashier will never see it.
 */
export function isHiddenByCategory(
  product: ProductLike,
  activeCategories: ReadonlyMap<string, CategoryLike>
): boolean {
  const reason = cashierHiddenReason(product, activeCategories);
  return reason === 'category-inactive' || reason === 'no-category';
}
