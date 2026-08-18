/**
 * One rule for "would a cashier be offered this product?", for the screens that
 * need to say so.
 *
 * The rule has a non-obvious consequence: a product can be active while the
 * category it belongs to is not. Deactivating a category does not deactivate its
 * products — §3.2 says so explicitly, and `GET /products` keeps returning them —
 * but they are not sellable, and checkout rejects them with `CATEGORY_INACTIVE`.
 * S-11 has to warn the Admin that those products are effectively invisible.
 *
 * Scope note: this is now a **catalog-screen** rule only. The POS no longer
 * derives visibility at all — `GET /products/catalog` (§4.2) applies the same
 * three conditions server-side and returns only sellable rows. Keeping a second
 * copy of the rule for the till would just be a way for the two to disagree.
 */

import type { Category } from '@/services/categories';
import type { Product } from '@/services/products';

/** Just enough of a product for the rule; the full row is welcome too. */
type ProductLike = Pick<Product, 'isActive' | 'categoryId'>;
type CategoryLike = Pick<Category, 'categoryId' | 'isActive'>;

/**
 * The categories a product may be sold under, by id.
 *
 * A map rather than a set because callers also want the category itself, and
 * looking it up twice invites the two lookups to disagree.
 */
export function activeCategoryIndex<T extends CategoryLike>(categories: T[]): Map<string, T> {
  return new Map(
    categories
      .filter((category) => category.isActive)
      .map((category) => [category.categoryId, category])
  );
}

/**
 * Why the cashier would not be offered this product, or null when they would.
 *
 * Distinguishing the reasons matters: 'product-inactive' is a decision someone
 * made about this product, while 'category-inactive' is a side effect of a
 * decision about something else — which is the one the Admin needs told.
 */
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
 * True for the case S-11 badges: the product itself is active, so it stays in
 * the catalog list at full opacity, but its category is not and the cashier will
 * never see it.
 */
export function isHiddenByCategory(
  product: ProductLike,
  activeCategories: ReadonlyMap<string, CategoryLike>
): boolean {
  const reason = cashierHiddenReason(product, activeCategories);
  return reason === 'category-inactive' || reason === 'no-category';
}
