/** The catalog screen's "invisible to the cashier" rule. */

import { describe, expect, it } from 'vitest';

import type { CatalogProduct } from '@/services/catalog';
import type { Category } from '@/services/categories';
import type { Product } from '@/services/products';
import {
  activeCategoryIndex,
  cashierHiddenReason,
  isHiddenByCategory,
} from '@/lib/catalog-visibility';
import { buildCatalog } from '@/lib/pos-catalog';

function category(categoryId: string, isActive: boolean): Category {
  return { categoryId, merchantId: 'mch_1', name: categoryId, isActive };
}

function product(productId: string, categoryId: string, isActive: boolean): Product {
  return {
    productId,
    merchantId: 'mch_1',
    categoryId,
    categoryName: categoryId,
    name: productId,
    price: 15000,
    lowStockThreshold: 10,
    isActive,
    createdAt: null,
    updatedAt: null,
  };
}

const CATEGORIES = [category('drinks', true), category('retired', false)];

const PRODUCTS = [
  product('sellable', 'drinks', true),
  product('orphaned', 'retired', true),
  // §3.4 makes `category_id` non-nullable, so "no category" is not a state a product can be in any
  // more — only an empty id could produce it.
  product('uncategorised', '', true),
  product('withdrawn', 'drinks', false),
];

describe('cashier visibility', () => {
  const index = activeCategoryIndex(CATEGORIES);

  it('names why each product would not be offered', () => {
    expect(cashierHiddenReason(PRODUCTS[0]!, index)).toBeNull();
    expect(cashierHiddenReason(PRODUCTS[1]!, index)).toBe('category-inactive');
    expect(cashierHiddenReason(PRODUCTS[2]!, index)).toBe('no-category');
    expect(cashierHiddenReason(PRODUCTS[3]!, index)).toBe('product-inactive');
  });

  it('badges exactly the active products a cashier will never see', () => {
    // The badge is for the surprising case: the product is active, so nobody deactivated it, yet it
    // is gone from the POS.
    const badged = PRODUCTS.filter(
      (entry) => entry.isActive && isHiddenByCategory(entry, index)
    ).map((entry) => entry.productId);

    expect(badged).toEqual(['orphaned', 'uncategorised']);
  });
});

describe('POS catalogue', () => {
  function row(productId: string, categoryId: string, stock = 5): CatalogProduct {
    return {
      productId,
      name: productId,
      price: 15000,
      categoryId,
      stockQuantity: stock,
    };
  }

  it('renders whatever the server said is sellable, without re-judging it', () => {
    // The server has already excluded the inactive product and the orphan; the client's job is to
    // show what arrived, not to filter it again.
    const catalog = buildCatalog([row('sellable', 'drinks')], CATEGORIES);

    expect(catalog.products.map((entry) => entry.productId)).toEqual(['sellable']);
    expect(catalog.products[0]?.categoryName).toBe('drinks');
    expect(catalog.products[0]?.stock).toBe(5);
  });

  it('drops a category chip that would lead to an empty grid', () => {
    const catalog = buildCatalog([row('sellable', 'drinks')], CATEGORIES);
    expect(catalog.categories.map((entry) => entry.categoryId)).toEqual(['drinks']);
  });

  it('still shows a row whose category is missing from the list', () => {
    // Not a filter: the server said it is sellable, so it sells — it just has no label to print.
    const catalog = buildCatalog([row('mystery', 'unknown-cat')], CATEGORIES);

    expect(catalog.products.map((entry) => entry.productId)).toEqual(['mystery']);
    expect(catalog.products[0]?.categoryName).toBe('');
  });
});
