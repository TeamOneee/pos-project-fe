/**
 * What the POS is allowed to sell.
 *
 * The rule worth the most here: a product can be ACTIVE while its category is
 * not, and the backend returns it either way. It must not reach the grid or the
 * chip row.
 */

import { buildCatalog, stockMap } from '@/features/pos/pos-catalog';
import type { Category } from '@/lib/api/domains/categories';
import type { InventoryItem } from '@/lib/api/domains/inventory';
import type { Product } from '@/lib/api/domains/products';

function category(id: string, name: string, status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE'): Category {
  return {
    categoryId: id,
    merchantId: 'mrc_1',
    name,
    status,
    createdAt: null,
    updatedAt: null,
  };
}

function product(
  id: string,
  categoryId: string | null,
  overrides: Partial<Product> = {}
): Product {
  return {
    productId: id,
    merchantId: 'mrc_1',
    categoryId,
    name: `Produk ${id}`,
    sku: `SKU-${id}`,
    price: 15_000,
    status: 'ACTIVE',
    createdAt: null,
    updatedAt: null,
    category: null,
    ...overrides,
  };
}

function inventory(productId: string, quantity: number): InventoryItem {
  return {
    inventoryId: `inv_${productId}`,
    outletId: 'otl_a',
    productId,
    quantity,
    updatedAt: null,
    product: null,
  };
}

const MINUMAN = category('cat_minuman', 'Minuman');
const ROKOK = category('cat_rokok', 'Rokok', 'INACTIVE');

describe('a deactivated category hides its products', () => {
  it('keeps an active product out of the grid when its category is off', () => {
    const catalog = buildCatalog(
      [product('p1', MINUMAN.categoryId), product('p2', ROKOK.categoryId)],
      [MINUMAN, ROKOK],
      [inventory('p1', 10), inventory('p2', 10)]
    );

    expect(catalog.products.map((entry) => entry.productId)).toEqual(['p1']);
  });

  it('keeps it out of the chip row too', () => {
    const catalog = buildCatalog(
      [product('p1', MINUMAN.categoryId), product('p2', ROKOK.categoryId)],
      [MINUMAN, ROKOK],
      []
    );

    expect(catalog.categories.map((entry) => entry.name)).toEqual(['Minuman']);
  });

  it('drops a product whose category does not exist at all', () => {
    const catalog = buildCatalog([product('p1', 'cat_ghost')], [MINUMAN], []);
    expect(catalog.products).toHaveLength(0);
  });

  it('drops a product with no category', () => {
    const catalog = buildCatalog([product('p1', null)], [MINUMAN], []);
    expect(catalog.products).toHaveLength(0);
  });
});

describe('product status', () => {
  it('hides an inactive product even in an active category', () => {
    const catalog = buildCatalog(
      [
        product('p1', MINUMAN.categoryId),
        product('p2', MINUMAN.categoryId, { status: 'INACTIVE' }),
      ],
      [MINUMAN],
      []
    );

    expect(catalog.products.map((entry) => entry.productId)).toEqual(['p1']);
  });
});

describe('chips', () => {
  it('omits an active category with nothing to show', () => {
    const empty = category('cat_beku', 'Beku');
    const catalog = buildCatalog([product('p1', MINUMAN.categoryId)], [MINUMAN, empty], []);

    // A chip that filters to an empty grid is a dead end.
    expect(catalog.categories.map((entry) => entry.name)).toEqual(['Minuman']);
  });
});

describe('stock', () => {
  it('takes quantities from this outlet, defaulting to zero', () => {
    const catalog = buildCatalog(
      [product('p1', MINUMAN.categoryId), product('p2', MINUMAN.categoryId)],
      [MINUMAN],
      [inventory('p1', 7)]
    );

    expect(catalog.products.find((entry) => entry.productId === 'p1')?.stock).toBe(7);
    // No inventory row means none on hand, not unknown.
    expect(catalog.products.find((entry) => entry.productId === 'p2')?.stock).toBe(0);
  });

  it('exposes a lookup for refreshing cart ceilings', () => {
    const catalog = buildCatalog(
      [product('p1', MINUMAN.categoryId)],
      [MINUMAN],
      [inventory('p1', 3)]
    );

    expect(stockMap(catalog.products)).toEqual({ p1: 3 });
  });

  it('carries the category name onto each product', () => {
    const catalog = buildCatalog(
      [product('p1', MINUMAN.categoryId)],
      [MINUMAN],
      [inventory('p1', 1)]
    );

    expect(catalog.products[0]?.categoryName).toBe('Minuman');
  });
});
