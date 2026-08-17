/**
 * One rule for "may a cashier be offered this product?", used by both screens
 * that care.
 *
 * The rule has a non-obvious consequence: a product can be ACTIVE while the
 * category it belongs to is not. Deactivating a category does not deactivate its
 * products — the backend keeps returning them and S-11 keeps listing them — but
 * they are not sellable, so the POS must not show them (S-16) and S-11 must warn
 * that they are effectively invisible to the cashier.
 *
 * Those are two screens making the same judgement, which is exactly how two
 * screens drift apart. So the judgement lives here: `buildCatalog` filters with
 * it and the products table labels with it, and a change to the rule reaches
 * both or neither.
 */

import type { Category } from '@/services/categories';
import type { Product } from '@/services/products';

/** Just enough of a product for the rule; the full row is welcome too. */
type ProductLike = Pick<Product, 'status' | 'categoryId'>;
type CategoryLike = Pick<Category, 'categoryId' | 'status'>;

/**
 * The categories a product may be sold under, by id.
 *
 * A map rather than a set because the POS also needs the category's name for
 * its chip row, and looking it up twice invites the two lookups to disagree.
 */
export function activeCategoryIndex<T extends CategoryLike>(categories: T[]): Map<string, T> {
  return new Map(
    categories
      .filter((category) => category.status === 'ACTIVE')
      .map((category) => [category.categoryId, category])
  );
}

/**
 * Why the cashier cannot be offered this product, or null when they can.
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
  if (product.status !== 'ACTIVE') return 'product-inactive';
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
