/**
 * The two screens agreeing.
 *
 * S-11 badges a product KATEGORI NONAKTIF and the POS refuses to sell it. Those
 * are the same judgement, and this file is the check that they stay the same one:
 * every case is asserted against both the badge predicate and the catalog builder
 * that feeds the cashier's grid.
 */

import { describe, expect, it } from 'vitest';

import type { Category } from '@/services/categories';
import type { Product } from '@/services/products';
import {
  activeCategoryIndex,
  cashierHiddenReason,
  isHiddenByCategory,
  isVisibleToCashier,
} from '@/lib/catalog-visibility';
import { buildCatalog } from '@/lib/pos-catalog';

function category(categoryId: string, status: Category['status']): Category {
  return {
    categoryId,
    merchantId: 'mch_1',
    name: categoryId,
    status,
    createdAt: null,
    updatedAt: null,
  };
}

function product(productId: string, categoryId: string | null, status: Product['status']): Product {
  return {
    productId,
    merchantId: 'mch_1',
    categoryId,
    name: productId,
    sku: productId.toUpperCase(),
    price: 15000,
    status,
    createdAt: null,
    updatedAt: null,
    category: categoryId ? { categoryId, name: categoryId } : null,
  };
}

const CATEGORIES = [category('drinks', 'ACTIVE'), category('retired', 'INACTIVE')];

const PRODUCTS = [
  product('sellable', 'drinks', 'ACTIVE'),
  product('orphaned', 'retired', 'ACTIVE'),
  product('uncategorised', null, 'ACTIVE'),
  product('withdrawn', 'drinks', 'INACTIVE'),
];

describe('cashier visibility', () => {
  const index = activeCategoryIndex(CATEGORIES);

  it('names why each product is or is not sellable', () => {
    expect(cashierHiddenReason(PRODUCTS[0]!, index)).toBeNull();
    expect(cashierHiddenReason(PRODUCTS[1]!, index)).toBe('category-inactive');
    expect(cashierHiddenReason(PRODUCTS[2]!, index)).toBe('no-category');
    expect(cashierHiddenReason(PRODUCTS[3]!, index)).toBe('product-inactive');
  });

  it('badges exactly the active products a cashier will never see', () => {
    // The badge is for the surprising case: the product is active, so nobody
    // deactivated it, yet it is gone from the POS.
    const badged = PRODUCTS.filter(
      (entry) => entry.status === 'ACTIVE' && isHiddenByCategory(entry, index)
    ).map((entry) => entry.productId);

    expect(badged).toEqual(['orphaned', 'uncategorised']);
  });

  it('hides from the POS exactly what it does not call visible', () => {
    const catalog = buildCatalog(PRODUCTS, CATEGORIES, []);
    const sellable = catalog.products.map((entry) => entry.productId);

    expect(sellable).toEqual(['sellable']);

    // The agreement, stated directly: the grid contains a product if and only if
    // the shared predicate says a cashier may be offered it.
    for (const entry of PRODUCTS) {
      expect(sellable.includes(entry.productId)).toBe(isVisibleToCashier(entry, index));
    }
  });

  it('drops a category chip once its products are gone', () => {
    const catalog = buildCatalog(PRODUCTS, CATEGORIES, []);
    expect(catalog.categories.map((entry) => entry.categoryId)).toEqual(['drinks']);
  });
});
