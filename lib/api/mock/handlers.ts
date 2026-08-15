/**
 * Mock request handlers — one per endpoint in the contract.
 *
 * Responses are built in wire shape and wrapped in the contract's envelope, so
 * they go through exactly the same schema validation as live responses.
 *
 * ROLE GATING: this follows the role matrix in CLAUDE.md, which is
 * authoritative and is stricter than the contract's "Access:" lines in three
 * places — product and category writes are ADMIN only, transactions are closed
 * to ADMIN entirely, and checkout is CASHIER only. Building against the looser
 * contract would let screens exist that the product does not have.
 */


import {
  AI_INSIGHT,
  AOV_TREND,
  DASHBOARD_FIGURES,
  LAST_AI_ANALYSIS,
  OUTLET_PERFORMANCE,
  PASSWORDS,
  PERIOD_COMPARISON,
  SALES_TREND,
  TIME_PATTERN,
  TOP_BY_QUANTITY,
  TOP_BY_REVENUE,
  UNDERPERFORMERS,
  NOW,
} from '@/lib/api/mock/dataset';
import {
  ensureCart,
  ensureInventory,
  findCart,
  findInventory,
  findOutlet,
  findProduct,
  getDb,
  lowStockRows,
  nextId,
  outOfStockRows,
  priceOf,
  stockAt,
  stockRows,
  toWireMoney,
  type WireCart,
  type WireInventory,
  type WireProduct,
  type WireTransaction,
  type WireUser,
} from '@/lib/api/mock/db';
import type { HttpMethod } from '@/lib/api/transport';
import { parseMoney } from '@/lib/money';

/* -------------------------------------------------------------------------- */
/* Plumbing                                                                    */
/* -------------------------------------------------------------------------- */

export class MockHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly errors: unknown = null
  ) {
    super(message);
    this.name = 'MockHttpError';
  }
}

export type MockContext = {
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body: Record<string, unknown>;
  idempotencyKey: string | undefined;
};

export type MockEnvelope = { status: number; body: unknown };

function ok(data: unknown, message: string, status = 200): MockEnvelope {
  return { status, body: { success: true, statusCode: status, message, data } };
}

export function errorEnvelope(
  status: number,
  message: string,
  path: string,
  errors: unknown = null
): MockEnvelope {
  return {
    status,
    body: { success: false, statusCode: status, path, message, errors, timestamp: NOW },
  };
}

function requireUser(): WireUser {
  const user = getDb().session;
  if (!user) throw new MockHttpError(401, 'Unauthorized');
  return user;
}

function requireRole(...roles: WireUser['role'][]): WireUser {
  const user = requireUser();
  if (!roles.includes(user.role)) {
    throw new MockHttpError(403, `Only ${roles.join(' or ')} can access this endpoint`);
  }
  return user;
}

function readString(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key];
  return typeof value === 'string' ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function page<T>(items: T[], query: Record<string, string>) {
  const pageNumber = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Number(query.limit) || 10);
  const start = (pageNumber - 1) * limit;

  return {
    items: items.slice(start, start + limit),
    total: items.length,
    page: pageNumber,
    limit,
    total_pages: Math.max(1, Math.ceil(items.length / limit)),
  };
}

/* -------------------------------------------------------------------------- */
/* Views                                                                       */
/* -------------------------------------------------------------------------- */

function categoryBrief(categoryId: string | null) {
  const category = getDb().categories.find((entry) => entry.category_id === categoryId);
  return category ? { category_id: category.category_id, name: category.name } : null;
}

function productView(product: WireProduct) {
  return { ...product, category: categoryBrief(product.category_id) };
}

function productBrief(product: WireProduct) {
  return {
    product_id: product.product_id,
    name: product.name,
    sku: product.sku,
    price: product.price,
  };
}

function inventoryView(row: WireInventory) {
  const product = findProduct(row.product_id);
  return { ...row, product: product ? productBrief(product) : null };
}

function transactionView(transaction: WireTransaction) {
  const database = getDb();
  const outlet = database.outlets.find((entry) => entry.outlet_id === transaction.outlet_id);
  const cashier = database.users.find((entry) => entry.user_id === transaction.user_id);

  return {
    ...transaction,
    outlet: outlet ? { outlet_id: outlet.outlet_id, name: outlet.name } : null,
    cashier: cashier ? { user_id: cashier.user_id, name: cashier.name } : null,
  };
}

function transactionItemViews(transactionId: string) {
  return getDb()
    .transactionItems.filter((item) => item.transaction_id === transactionId)
    .map((item) => {
      const product = findProduct(item.product_id);
      return {
        ...item,
        product: product
          ? { product_id: product.product_id, name: product.name, sku: product.sku }
          : null,
      };
    });
}

function cartView(cart: WireCart) {
  const items = cart.items.map((item) => {
    const product = findProduct(item.product_id);
    const unitPrice = parseMoney(item.unit_price);

    return {
      cart_item_id: item.cart_item_id,
      cart_id: cart.cart_id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: toWireMoney(unitPrice * item.quantity),
      product: product ? productBrief(product) : null,
    };
  });

  const subtotal = items.reduce((total, item) => total + parseMoney(item.subtotal), 0);

  return {
    cart_id: cart.cart_id,
    outlet_id: cart.outlet_id,
    user_id: cart.user_id,
    created_at: cart.created_at,
    updated_at: cart.updated_at,
    items,
    subtotal: toWireMoney(subtotal),
    total_items: items.length,
  };
}

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
/* -------------------------------------------------------------------------- */

const authHandlers: Route[] = [
  {
    method: 'POST',
    template: '/auth/login',
    handle: ({ body }) => {
      const email = readString(body, 'email')?.toLowerCase() ?? '';
      const password = readString(body, 'password') ?? '';

      const user = getDb().users.find((entry) => entry.email.toLowerCase() === email);
      if (!user || PASSWORDS[user.email] !== password) {
        throw new MockHttpError(401, 'Invalid email or password');
      }
      if (user.status !== 'ACTIVE') {
        throw new MockHttpError(401, 'Account is inactive');
      }

      getDb().session = user;
      return ok({ access_token: `mock.${user.user_id}`, user }, 'Login successful');
    },
  },
  {
    method: 'POST',
    template: '/auth/register',
    handle: ({ body }) => {
      const merchantInput = (body.merchant ?? {}) as Record<string, unknown>;
      const userInput = (body.user ?? {}) as Record<string, unknown>;
      const email = readString(userInput, 'email') ?? '';

      const database = getDb();
      if (database.users.some((entry) => entry.email.toLowerCase() === email.toLowerCase())) {
        throw new MockHttpError(409, 'Email already registered', [
          { field: 'email', message: `Email ${email} is already used` },
        ]);
      }

      const merchant = {
        ...database.merchant,
        name: readString(merchantInput, 'name') ?? database.merchant.name,
      };
      const user: WireUser = {
        user_id: nextId('usr'),
        merchant_id: merchant.merchant_id,
        outlet_id: null,
        name: readString(userInput, 'name') ?? '',
        email,
        // The first user of a merchant is always the OWNER.
        role: 'OWNER',
        status: 'ACTIVE',
        created_at: NOW,
        updated_at: NOW,
      };

      database.users.push(user);
      database.session = user;
      PASSWORDS[email] = readString(userInput, 'password') ?? '';

      return ok(
        { merchant, user, access_token: `mock.${user.user_id}` },
        'Merchant and owner account created successfully',
        201
      );
    },
  },
  {
    method: 'POST',
    template: '/auth/logout',
    handle: () => {
      requireUser();
      getDb().session = null;
      return ok(null, 'Logout successful');
    },
  },
  {
    method: 'GET',
    template: '/auth/me',
    handle: () => ok(requireUser(), 'User data retrieved'),
  },
];

/* -------------------------------------------------------------------------- */
/* Merchant, outlets, users                                                    */
/* -------------------------------------------------------------------------- */

const merchantHandlers: Route[] = [
  {
    method: 'GET',
    template: '/merchants',
    handle: () => {
      requireRole('OWNER');
      return ok(getDb().merchant, 'Merchant data retrieved');
    },
  },
  {
    method: 'PUT',
    template: '/merchants',
    handle: ({ body }) => {
      requireRole('OWNER');
      const database = getDb();
      const name = readString(body, 'name');
      const threshold = readNumber(body.low_stock_threshold);

      if (name !== undefined) database.merchant.name = name;
      if (threshold !== undefined) database.merchant.low_stock_threshold = threshold;

      return ok(database.merchant, 'Merchant updated successfully');
    },
  },
];

const outletHandlers: Route[] = [
  {
    method: 'GET',
    template: '/outlets',
    handle: ({ query }) => {
      requireUser();
      const outlets = getDb().outlets.filter(
        (outlet) => !query.status || outlet.status === query.status
      );
      return ok(outlets, 'Outlets retrieved successfully');
    },
  },
  {
    method: 'POST',
    template: '/outlets',
    handle: ({ body }) => {
      requireRole('OWNER');
      const outlet = {
        outlet_id: nextId('otl'),
        merchant_id: getDb().merchant.merchant_id,
        name: readString(body, 'name') ?? '',
        address: readString(body, 'address') ?? '',
        status: (readString(body, 'status') as 'ACTIVE' | 'INACTIVE') ?? 'ACTIVE',
        created_at: NOW,
        updated_at: NOW,
      };
      getDb().outlets.push(outlet);
      return ok(outlet, 'Outlet created successfully', 201);
    },
  },
  {
    method: 'GET',
    template: '/outlets/:outletId',
    handle: ({ params }) => {
      requireUser();
      const outlet = findOutlet(params.outletId ?? '');
      if (!outlet) throw new MockHttpError(404, 'Outlet not found');
      return ok(outlet, 'Outlet data retrieved');
    },
  },
  {
    method: 'PUT',
    template: '/outlets/:outletId',
    handle: ({ params, body }) => {
      requireRole('OWNER');
      const outlet = findOutlet(params.outletId ?? '');
      if (!outlet) throw new MockHttpError(404, 'Outlet not found');

      const name = readString(body, 'name');
      const address = readString(body, 'address');
      const status = readString(body, 'status') as 'ACTIVE' | 'INACTIVE' | undefined;

      if (name !== undefined) outlet.name = name;
      if (address !== undefined) outlet.address = address;
      if (status !== undefined) outlet.status = status;
      outlet.updated_at = NOW;

      return ok(outlet, 'Outlet updated successfully');
    },
  },
  {
    method: 'DELETE',
    template: '/outlets/:outletId',
    handle: ({ params }) => {
      requireRole('OWNER');
      const outlet = findOutlet(params.outletId ?? '');
      if (!outlet) throw new MockHttpError(404, 'Outlet not found');

      // Soft delete: the outlet keeps its transaction history.
      outlet.status = 'INACTIVE';
      return ok(null, 'Outlet deactivated successfully');
    },
  },
];

const userHandlers: Route[] = [
  {
    method: 'GET',
    template: '/users',
    handle: ({ query }) => {
      requireRole('OWNER');
      const users = getDb().users.filter(
        (user) =>
          (!query.role || user.role === query.role) &&
          (!query.outlet_id || user.outlet_id === query.outlet_id) &&
          (!query.status || user.status === query.status)
      );
      return ok(users, 'Users retrieved successfully');
    },
  },
  {
    method: 'POST',
    template: '/users',
    handle: ({ body }) => {
      requireRole('OWNER');
      const database = getDb();
      const email = readString(body, 'email') ?? '';
      const role = readString(body, 'role') as WireUser['role'] | undefined;
      const outletId = readString(body, 'outlet_id') ?? null;

      if (database.users.some((entry) => entry.email.toLowerCase() === email.toLowerCase())) {
        throw new MockHttpError(409, 'Email already registered', [
          { field: 'email', message: `Email ${email} is already used` },
        ]);
      }
      if (role === 'CASHIER' && !outletId) {
        throw new MockHttpError(400, 'outlet_id is required for CASHIER role');
      }
      if (role === 'ADMIN' && outletId) {
        throw new MockHttpError(400, 'ADMIN role must have outlet_id = null');
      }
      if (role !== 'ADMIN' && role !== 'CASHIER') {
        throw new MockHttpError(400, 'role must be ADMIN or CASHIER');
      }

      const user: WireUser = {
        user_id: nextId('usr'),
        merchant_id: database.merchant.merchant_id,
        outlet_id: role === 'CASHIER' ? outletId : null,
        name: readString(body, 'name') ?? '',
        email,
        role,
        status: (readString(body, 'status') as 'ACTIVE' | 'INACTIVE') ?? 'ACTIVE',
        created_at: NOW,
        updated_at: NOW,
      };

      database.users.push(user);
      PASSWORDS[email] = readString(body, 'password') ?? 'password123';

      return ok(user, 'User created successfully', 201);
    },
  },
  {
    method: 'GET',
    template: '/users/:userId',
    handle: ({ params }) => {
      requireRole('OWNER');
      const user = getDb().users.find((entry) => entry.user_id === params.userId);
      if (!user) throw new MockHttpError(404, 'User not found');
      return ok(user, 'User data retrieved');
    },
  },
  {
    method: 'PUT',
    template: '/users/:userId',
    handle: ({ params, body }) => {
      requireRole('OWNER');
      const user = getDb().users.find((entry) => entry.user_id === params.userId);
      if (!user) throw new MockHttpError(404, 'User not found');

      const role = (readString(body, 'role') as WireUser['role'] | undefined) ?? user.role;
      const outletId =
        'outlet_id' in body ? ((readString(body, 'outlet_id') ?? null) as string | null) : user.outlet_id;

      if (role === 'CASHIER' && !outletId) {
        throw new MockHttpError(400, 'outlet_id is required for CASHIER role');
      }
      if (role === 'ADMIN' && outletId) {
        throw new MockHttpError(400, 'ADMIN role must have outlet_id = null');
      }

      const name = readString(body, 'name');
      const email = readString(body, 'email');
      const status = readString(body, 'status') as 'ACTIVE' | 'INACTIVE' | undefined;

      if (name !== undefined) user.name = name;
      if (email !== undefined) user.email = email;
      if (status !== undefined) user.status = status;
      user.role = role;
      user.outlet_id = outletId;
      user.updated_at = NOW;

      return ok(user, 'User updated successfully');
    },
  },
  {
    method: 'DELETE',
    template: '/users/:userId',
    handle: ({ params }) => {
      requireRole('OWNER');
      const user = getDb().users.find((entry) => entry.user_id === params.userId);
      if (!user) throw new MockHttpError(404, 'User not found');

      user.status = 'INACTIVE';
      return ok(null, 'User deactivated successfully');
    },
  },
];

/* -------------------------------------------------------------------------- */
/* Catalog                                                                     */
/* -------------------------------------------------------------------------- */

const categoryHandlers: Route[] = [
  {
    method: 'GET',
    template: '/categories',
    handle: () => {
      requireUser();
      return ok(getDb().categories, 'Categories retrieved successfully');
    },
  },
  {
    method: 'POST',
    template: '/categories',
    handle: ({ body }) => {
      // Owner is read-only on the catalog; only Admin manages it.
      requireRole('ADMIN');
      const category = {
        category_id: nextId('cat'),
        merchant_id: getDb().merchant.merchant_id,
        name: readString(body, 'name') ?? '',
        status: 'ACTIVE' as const,
        created_at: NOW,
        updated_at: NOW,
      };
      getDb().categories.push(category);
      return ok(category, 'Category created successfully', 201);
    },
  },
  {
    method: 'PUT',
    template: '/categories/:categoryId',
    handle: ({ params, body }) => {
      requireRole('ADMIN');
      const category = getDb().categories.find(
        (entry) => entry.category_id === params.categoryId
      );
      if (!category) throw new MockHttpError(404, 'Category not found');

      const name = readString(body, 'name');
      if (name !== undefined) category.name = name;
      category.updated_at = NOW;

      return ok(category, 'Category updated successfully');
    },
  },
  {
    method: 'DELETE',
    template: '/categories/:categoryId',
    handle: ({ params }) => {
      requireRole('ADMIN');
      const category = getDb().categories.find(
        (entry) => entry.category_id === params.categoryId
      );
      if (!category) throw new MockHttpError(404, 'Category not found');

      category.status = 'INACTIVE';
      return ok(null, 'Category deactivated successfully');
    },
  },
];

const productHandlers: Route[] = [
  {
    method: 'GET',
    template: '/products',
    handle: ({ query }) => {
      requireUser();
      const search = query.search?.toLowerCase();

      const products = getDb()
        .products.filter(
          (product) =>
            (!query.category_id || product.category_id === query.category_id) &&
            (!query.status || product.status === query.status) &&
            (!search ||
              product.name.toLowerCase().includes(search) ||
              product.sku.toLowerCase().includes(search))
        )
        .map(productView);

      return ok(page(products, query), 'Products retrieved successfully');
    },
  },
  {
    method: 'POST',
    template: '/products',
    handle: ({ body }) => {
      requireRole('ADMIN');
      const categoryId = readString(body, 'category_id') ?? '';
      const category = getDb().categories.find((entry) => entry.category_id === categoryId);

      if (!category || category.status !== 'ACTIVE') {
        throw new MockHttpError(400, 'Category is not active or does not belong to merchant');
      }

      const product: WireProduct = {
        product_id: nextId('prd'),
        merchant_id: getDb().merchant.merchant_id,
        category_id: categoryId,
        name: readString(body, 'name') ?? '',
        sku: readString(body, 'sku') ?? '',
        price: readString(body, 'price') ?? '0.00',
        status: (readString(body, 'status') as 'ACTIVE' | 'INACTIVE') ?? 'ACTIVE',
        created_at: NOW,
        updated_at: NOW,
      };

      getDb().products.push(product);
      // A new product starts at zero stock in every outlet.
      getDb().outlets.forEach((outlet) => ensureInventory(outlet.outlet_id, product.product_id));

      return ok(productView(product), 'Product created successfully', 201);
    },
  },
  {
    method: 'GET',
    template: '/products/:productId',
    handle: ({ params }) => {
      requireUser();
      const product = findProduct(params.productId ?? '');
      if (!product) throw new MockHttpError(404, 'Product not found');
      return ok(productView(product), 'Product data retrieved');
    },
  },
  {
    method: 'PUT',
    template: '/products/:productId',
    handle: ({ params, body }) => {
      requireRole('ADMIN');
      const product = findProduct(params.productId ?? '');
      if (!product) throw new MockHttpError(404, 'Product not found');

      const name = readString(body, 'name');
      const sku = readString(body, 'sku');
      const price = readString(body, 'price');
      const categoryId = readString(body, 'category_id');
      const status = readString(body, 'status') as 'ACTIVE' | 'INACTIVE' | undefined;

      if (name !== undefined) product.name = name;
      if (sku !== undefined) product.sku = sku;
      // Editing a price here is what makes an open cart fail with PRICE_CHANGED.
      if (price !== undefined) product.price = price;
      if (categoryId !== undefined) product.category_id = categoryId;
      if (status !== undefined) product.status = status;
      product.updated_at = NOW;

      return ok(productView(product), 'Product updated successfully');
    },
  },
  {
    method: 'DELETE',
    template: '/products/:productId',
    handle: ({ params }) => {
      requireRole('ADMIN');
      const product = findProduct(params.productId ?? '');
      if (!product) throw new MockHttpError(404, 'Product not found');

      product.status = 'INACTIVE';
      return ok(null, 'Product deactivated successfully');
    },
  },
];

/* -------------------------------------------------------------------------- */
/* Inventory                                                                   */
/* -------------------------------------------------------------------------- */

/** A cashier may only read the outlet they are assigned to. */
function assertOutletVisible(user: WireUser, outletId: string): void {
  if (user.role === 'CASHIER' && user.outlet_id !== outletId) {
    throw new MockHttpError(403, 'Cashier can only access their own outlet');
  }
}

const inventoryHandlers: Route[] = [
  {
    method: 'GET',
    template: '/inventory',
    handle: ({ query }) => {
      const user = requireUser();
      const outletId = query.outlet_id;
      if (!outletId) throw new MockHttpError(400, 'outlet_id is required');
      assertOutletVisible(user, outletId);

      const rows = getDb()
        .inventory.filter(
          (row) =>
            row.outlet_id === outletId && (!query.product_id || row.product_id === query.product_id)
        )
        .map(inventoryView);

      return ok(page(rows, query), 'Inventory retrieved successfully');
    },
  },
  {
    method: 'GET',
    template: '/inventory/low-stock',
    handle: ({ query }) => {
      requireRole('ADMIN', 'OWNER');
      const threshold = getDb().merchant.low_stock_threshold;

      const alerts = lowStockRows(query.outlet_id).map((row) => ({
        inventory_id: row.inventory.inventory_id,
        product_id: row.product.product_id,
        product_name: row.product.name,
        sku: row.product.sku,
        outlet_id: row.outlet.outlet_id,
        outlet_name: row.outlet.name,
        current_stock: row.inventory.quantity,
        threshold,
      }));

      return ok(alerts, 'Low stock alerts retrieved');
    },
  },
  {
    method: 'GET',
    template: '/inventory/outlet/:outletId/product/:productId',
    handle: ({ params }) => {
      const user = requireUser();
      const outletId = params.outletId ?? '';
      assertOutletVisible(user, outletId);

      const row = findInventory(outletId, params.productId ?? '');
      // The contract answers 200 with quantity 0 rather than a 404 here.
      if (!row) {
        return ok(
          { outlet_id: outletId, product_id: params.productId, quantity: 0 },
          'Inventory data retrieved'
        );
      }
      return ok(row, 'Inventory data retrieved');
    },
  },
  {
    method: 'PUT',
    template: '/inventory/bulk',
    handle: ({ body }) => {
      requireRole('ADMIN');
      const items = Array.isArray(body.items) ? (body.items as Record<string, unknown>[]) : [];
      const updated: WireInventory[] = [];

      items.forEach((item) => {
        const row = getDb().inventory.find(
          (entry) => entry.inventory_id === readString(item, 'inventory_id')
        );
        if (!row) return;

        const quantity = readNumber(item.quantity);
        if (quantity === undefined || quantity < 0) {
          throw new MockHttpError(400, 'quantity must be zero or greater');
        }
        if (!readString(item, 'reason')) {
          throw new MockHttpError(400, 'reason is required for manual stock adjustment');
        }

        row.quantity = quantity;
        row.updated_at = NOW;
        updated.push(row);
      });

      return ok(updated, 'Inventory updated');
    },
  },
  {
    method: 'POST',
    template: '/inventory/transfer',
    handle: ({ body }) => {
      requireRole('ADMIN');
      const productId = readString(body, 'product_id') ?? '';
      const fromOutletId = readString(body, 'from_outlet_id') ?? '';
      const toOutletId = readString(body, 'to_outlet_id') ?? '';
      const quantity = readNumber(body.quantity) ?? 0;

      const product = findProduct(productId);
      if (!product) throw new MockHttpError(404, 'Product not found');
      if (quantity <= 0) throw new MockHttpError(400, 'quantity must be greater than zero');
      if (!readString(body, 'reason')) {
        throw new MockHttpError(400, 'reason is required for stock transfer');
      }

      const from = ensureInventory(fromOutletId, productId);
      if (from.quantity < quantity) {
        throw new MockHttpError(400, 'Insufficient stock at source outlet', [
          {
            product_id: productId,
            product_name: product.name,
            requested: quantity,
            available: from.quantity,
          },
        ]);
      }

      const to = ensureInventory(toOutletId, productId);
      from.quantity -= quantity;
      to.quantity += quantity;
      from.updated_at = NOW;
      to.updated_at = NOW;

      return ok(
        { from_inventory: from, to_inventory: to, transferred_quantity: quantity },
        'Stock transferred successfully'
      );
    },
  },
  {
    method: 'PUT',
    template: '/inventory/:inventoryId',
    handle: ({ params, body }) => {
      // Owner is read-only on inventory — the contract says so too.
      requireRole('ADMIN');
      const row = getDb().inventory.find((entry) => entry.inventory_id === params.inventoryId);
      if (!row) throw new MockHttpError(404, 'Inventory not found');

      const quantity = readNumber(body.quantity);
      if (quantity === undefined || quantity < 0) {
        throw new MockHttpError(400, 'quantity must be zero or greater');
      }
      if (!readString(body, 'reason')) {
        throw new MockHttpError(400, 'reason is required for manual stock adjustment');
      }

      row.quantity = quantity;
      row.updated_at = NOW;

      return ok(row, 'Inventory updated successfully');
    },
  },
];

/* -------------------------------------------------------------------------- */
/* Cart                                                                        */
/* -------------------------------------------------------------------------- */

function requireCashier(): WireUser {
  const user = requireRole('CASHIER');
  if (!user.outlet_id) throw new MockHttpError(403, 'Cashier is not assigned to an outlet');
  return user;
}

const cartHandlers: Route[] = [
  {
    method: 'GET',
    template: '/cart',
    handle: () => {
      const user = requireCashier();
      const cart = findCart(user.user_id);
      if (!cart) throw new MockHttpError(404, 'Cart not found');
      return ok(cartView(cart), 'Cart details');
    },
  },
  {
    method: 'POST',
    template: '/cart/items',
    handle: ({ body }) => {
      const user = requireCashier();
      const productId = readString(body, 'product_id') ?? '';
      const quantity = readNumber(body.quantity) ?? 1;

      const product = findProduct(productId);
      if (!product || product.status !== 'ACTIVE') {
        throw new MockHttpError(404, 'Product not found');
      }

      const cart = ensureCart(user);
      const existing = cart.items.find((item) => item.product_id === productId);
      const requested = (existing?.quantity ?? 0) + quantity;
      const available = stockAt(user.outlet_id ?? '', productId);

      if (requested > available) {
        throw new MockHttpError(400, `Insufficient stock for product: ${product.name}`, [
          {
            product_id: productId,
            product_name: product.name,
            requested,
            available,
          },
        ]);
      }

      if (existing) {
        existing.quantity = requested;
      } else {
        cart.items.push({
          cart_item_id: nextId('cti'),
          cart_id: cart.cart_id,
          product_id: productId,
          quantity,
          // The price is captured now; a later edit is what triggers PRICE_CHANGED.
          unit_price: product.price,
        });
      }
      cart.updated_at = NOW;

      return ok(cartView(cart), 'Item added to cart');
    },
  },
  {
    method: 'PUT',
    template: '/cart/items/:cartItemId',
    handle: ({ params, body }) => {
      const user = requireCashier();
      const cart = findCart(user.user_id);
      const item = cart?.items.find((entry) => entry.cart_item_id === params.cartItemId);
      if (!cart || !item) throw new MockHttpError(404, 'Cart item not found');

      const quantity = readNumber(body.quantity) ?? 0;
      const product = findProduct(item.product_id);
      const available = stockAt(user.outlet_id ?? '', item.product_id);

      if (quantity > available) {
        throw new MockHttpError(400, `Insufficient stock for product: ${product?.name ?? ''}`, [
          {
            product_id: item.product_id,
            product_name: product?.name ?? '',
            requested: quantity,
            available,
          },
        ]);
      }

      if (quantity <= 0) {
        cart.items = cart.items.filter((entry) => entry.cart_item_id !== item.cart_item_id);
      } else {
        item.quantity = quantity;
      }
      cart.updated_at = NOW;

      return ok(cartView(cart), 'Cart item updated');
    },
  },
  {
    method: 'DELETE',
    template: '/cart/clear',
    handle: () => {
      const user = requireCashier();
      const cart = ensureCart(user);
      cart.items = [];
      cart.updated_at = NOW;
      return ok(cartView(cart), 'Cart cleared');
    },
  },
  {
    method: 'DELETE',
    template: '/cart/items/:cartItemId',
    handle: ({ params }) => {
      const user = requireCashier();
      const cart = findCart(user.user_id);
      if (!cart) throw new MockHttpError(404, 'Cart not found');

      cart.items = cart.items.filter((entry) => entry.cart_item_id !== params.cartItemId);
      cart.updated_at = NOW;

      return ok(cartView(cart), 'Item removed from cart');
    },
  },
];

/* -------------------------------------------------------------------------- */
/* Transactions                                                                */
/* -------------------------------------------------------------------------- */

type CheckoutLine = { productId: string; quantity: number; unitPrice: number };

type PaymentMethodValue = NonNullable<WireTransaction['payment']>['method'];

const PAYMENT_METHODS: PaymentMethodValue[] = ['CASH', 'QRIS', 'DEBIT', 'TRANSFER'];

/** Defaults to cash, which is what most UMKM counters take. */
function readPaymentMethod(body: Record<string, unknown>): PaymentMethodValue {
  const value = readString(body, 'payment_method');
  return PAYMENT_METHODS.find((method) => method === value) ?? 'CASH';
}

function transactionNumber(): string {
  const database = getDb();
  const sequence = database.transactions.length + 1;
  return `TRX-20260813-${String(sequence).padStart(3, '0')}`;
}

function checkoutResponse(transaction: WireTransaction) {
  return {
    transaction: transactionView(transaction),
    items: transactionItemViews(transaction.transaction_id),
    receipt: {
      receipt_number: transaction.transaction_number.replace('TRX-', 'RC-'),
      transaction_id: transaction.transaction_id,
      issued_at: transaction.created_at,
    },
  };
}

const transactionHandlers: Route[] = [
  {
    method: 'GET',
    template: '/transactions',
    handle: ({ query }) => {
      // Admin has no access to transactions at all (role matrix).
      const user = requireRole('OWNER', 'CASHIER');

      const outletFilter = user.role === 'CASHIER' ? user.outlet_id : query.outlet_id;

      const transactions = getDb()
        .transactions.filter((transaction) => {
          if (outletFilter && transaction.outlet_id !== outletFilter) return false;
          if (query.cashier_id && transaction.user_id !== query.cashier_id) return false;

          const date = transaction.created_at.slice(0, 10);
          if (query.start_date && date < query.start_date) return false;
          if (query.end_date && date > query.end_date) return false;
          return true;
        })
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(transactionView);

      return ok(page(transactions, query), 'Transactions retrieved successfully');
    },
  },
  {
    method: 'POST',
    template: '/transactions',
    handle: ({ body, idempotencyKey }) => {
      const user = requireCashier();
      const database = getDb();
      const outletId = user.outlet_id ?? '';

      // Idempotency first: a replayed request must never reach the stock check,
      // let alone create a second sale.
      if (idempotencyKey) {
        const existingId = database.idempotency.get(idempotencyKey);
        if (existingId) {
          const existing = database.transactions.find(
            (entry) => entry.transaction_id === existingId
          );
          if (existing) {
            return ok(
              checkoutResponse(existing),
              'Transaction already exists, returning existing data',
              200
            );
          }
        }
      }

      const cartId = readString(body, 'cart_id');
      const cart = cartId ? database.carts.find((entry) => entry.cart_id === cartId) : undefined;

      let lines: CheckoutLine[];

      if (cartId) {
        if (!cart || cart.user_id !== user.user_id) throw new MockHttpError(404, 'Cart not found');
        lines = cart.items.map((item) => ({
          productId: item.product_id,
          quantity: item.quantity,
          unitPrice: parseMoney(item.unit_price),
        }));

        // A price edited after the line was added invalidates the whole cart.
        const drifted = cart.items.flatMap((item) => {
          const product = findProduct(item.product_id);
          if (!product) return [];
          const cartPrice = parseMoney(item.unit_price);
          const currentPrice = priceOf(product);
          if (cartPrice === currentPrice) return [];

          return [
            {
              code: 'PRICE_CHANGED',
              product_id: product.product_id,
              product_name: product.name,
              cart_price: toWireMoney(cartPrice),
              current_price: toWireMoney(currentPrice),
            },
          ];
        });

        if (drifted.length > 0) throw new MockHttpError(409, 'Cart validation failed', drifted);
      } else {
        const items = Array.isArray(body.items) ? (body.items as Record<string, unknown>[]) : [];
        lines = items.flatMap((item) => {
          const productId = readString(item, 'product_id') ?? '';
          const product = findProduct(productId);
          if (!product) return [];
          return [
            {
              productId,
              quantity: readNumber(item.quantity) ?? 0,
              unitPrice: priceOf(product),
            },
          ];
        });
      }

      if (lines.length === 0) throw new MockHttpError(400, 'Transaction must have at least one item');

      const shortfalls = lines.flatMap((line) => {
        const available = stockAt(outletId, line.productId);
        if (line.quantity <= available) return [];
        const product = findProduct(line.productId);
        return [
          {
            product_id: line.productId,
            product_name: product?.name ?? '',
            requested: line.quantity,
            available,
          },
        ];
      });

      if (shortfalls.length > 0) {
        const first = findProduct(shortfalls[0]?.product_id ?? '');
        throw new MockHttpError(
          400,
          `Insufficient stock for product: ${first?.name ?? ''}`,
          shortfalls
        );
      }

      const subtotal = lines.reduce((total, line) => total + line.unitPrice * line.quantity, 0);
      const transactionId = nextId('trx');
      const createdAt = new Date().toISOString();

      const transaction: WireTransaction = {
        transaction_id: transactionId,
        outlet_id: outletId,
        user_id: user.user_id,
        transaction_number: transactionNumber(),
        subtotal: toWireMoney(subtotal),
        // Total equals subtotal. There is nothing else to add.
        total: toWireMoney(subtotal),
        status: 'COMPLETED',
        created_at: createdAt,
        payment: {
          method: readPaymentMethod(body),
          amount: toWireMoney(subtotal),
          paid_at: createdAt,
        },
      };

      database.transactions.push(transaction);

      lines.forEach((line, index) => {
        database.transactionItems.push({
          transaction_item_id: `txi_${transactionId}_${index + 1}`,
          transaction_id: transactionId,
          product_id: line.productId,
          quantity: line.quantity,
          unit_price: toWireMoney(line.unitPrice),
          subtotal: toWireMoney(line.unitPrice * line.quantity),
        });

        const row = ensureInventory(outletId, line.productId);
        row.quantity -= line.quantity;
        row.updated_at = createdAt;
      });

      if (cart) cart.items = [];
      if (idempotencyKey) database.idempotency.set(idempotencyKey, transactionId);

      return ok(checkoutResponse(transaction), 'Transaction completed successfully', 201);
    },
  },
  {
    method: 'POST',
    template: '/transactions/:transactionId/cancel',
    handle: () => {
      // Refund/void is out of MVP scope; the contract answers 501.
      throw new MockHttpError(501, 'Not implemented in MVP');
    },
  },
  {
    method: 'GET',
    template: '/transactions/:transactionId',
    handle: ({ params }) => {
      const user = requireRole('OWNER', 'CASHIER');
      const transaction = getDb().transactions.find(
        (entry) => entry.transaction_id === params.transactionId
      );
      if (!transaction) throw new MockHttpError(404, 'Transaction not found');
      assertOutletVisible(user, transaction.outlet_id);

      return ok(
        {
          transaction: transactionView(transaction),
          items: transactionItemViews(transaction.transaction_id),
        },
        'Transaction data retrieved'
      );
    },
  },
];

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                   */
/* -------------------------------------------------------------------------- */

function rankedProduct(
  entry: { product_id: string; total_quantity_sold: number; total_revenue: string },
  index: number
) {
  const product = findProduct(entry.product_id);
  return {
    product_id: entry.product_id,
    product_name: product?.name ?? '',
    sku: product?.sku ?? '',
    category_name: categoryBrief(product?.category_id ?? null)?.name ?? '',
    total_quantity_sold: entry.total_quantity_sold,
    total_revenue: entry.total_revenue,
    rank: index + 1,
  };
}

const dashboardHandlers: Route[] = [
  {
    method: 'GET',
    template: '/dashboard/owner',
    handle: () => {
      requireRole('OWNER');
      const database = getDb();

      const recent = [...database.transactions]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 5)
        .map((transaction) => {
          const view = transactionView(transaction);
          return {
            transaction_id: transaction.transaction_id,
            transaction_number: transaction.transaction_number,
            outlet_name: view.outlet?.name ?? '',
            cashier_name: view.cashier?.name ?? '',
            total: transaction.total,
            created_at: transaction.created_at,
          };
        });

      return ok(
        {
          summary: {
            total_revenue: DASHBOARD_FIGURES.totalRevenue,
            total_transactions: DASHBOARD_FIGURES.totalTransactions,
            total_orders: DASHBOARD_FIGURES.totalTransactions,
            average_order_value: DASHBOARD_FIGURES.averageOrderValue,
            total_products_sold: DASHBOARD_FIGURES.totalProductsSold,
            // The brief's literal counts, which read 12 employees and 156
            // products against the five users and twelve products it seeds.
            // See the note on DASHBOARD_FIGURES.
            total_outlets: DASHBOARD_FIGURES.totalOutlets,
            total_employees: DASHBOARD_FIGURES.totalEmployees,
            total_products: DASHBOARD_FIGURES.totalProducts,
            revenue_growth: DASHBOARD_FIGURES.revenueGrowth,
            transactions_growth: DASHBOARD_FIGURES.transactionsGrowth,
          },
          sales_trend: {
            labels: SALES_TREND.labels,
            datasets: { revenue: SALES_TREND.revenue, transactions: SALES_TREND.transactions },
            summary: {
              highest_revenue: SALES_TREND.highest,
              lowest_revenue: SALES_TREND.lowest,
              average_revenue: SALES_TREND.average,
              total_revenue: DASHBOARD_FIGURES.totalRevenue,
            },
          },
          outlet_performance: OUTLET_PERFORMANCE,
          top_products: {
            by_revenue: TOP_BY_REVENUE.map(rankedProduct),
            by_quantity: TOP_BY_QUANTITY.map(rankedProduct),
          },
          underperforming_products: UNDERPERFORMERS.map((entry) => {
            const product = findProduct(entry.product_id);
            return {
              product_id: entry.product_id,
              product_name: product?.name ?? '',
              sku: product?.sku ?? '',
              category_name: categoryBrief(product?.category_id ?? null)?.name ?? '',
              total_quantity_sold: entry.total_quantity_sold,
              total_revenue: entry.total_revenue,
              stock_level: entry.stock_level,
              days_without_sale: entry.days_without_sale,
              recommendation: entry.recommendation,
            };
          }),
          time_pattern: TIME_PATTERN,
          aov_trend: {
            labels: AOV_TREND.labels,
            values: AOV_TREND.values,
            current_aov: AOV_TREND.current,
            previous_aov: AOV_TREND.previous,
            growth_percentage: AOV_TREND.growth,
          },
          recent_transactions: recent,
          merchant_overview: {
            merchant_name: database.merchant.name,
            total_outlets_active: DASHBOARD_FIGURES.totalOutlets,
            total_employees_active: DASHBOARD_FIGURES.totalEmployees,
            total_products_active: DASHBOARD_FIGURES.totalProducts,
            total_categories: DASHBOARD_FIGURES.totalCategories,
            last_ai_analysis: LAST_AI_ANALYSIS,
            ai_available_today: true,
          },
          period_comparison: {
            current_period: PERIOD_COMPARISON.current,
            previous_period: PERIOD_COMPARISON.previous,
            changes: PERIOD_COMPARISON.changes,
          },
        },
        'Dashboard data retrieved successfully'
      );
    },
  },
  {
    method: 'GET',
    template: '/dashboard/admin',
    handle: ({ query }) => {
      requireRole('ADMIN');
      const database = getDb();
      const threshold = database.merchant.low_stock_threshold;
      const outletFilter = query.outlet_id;

      const rows = stockRows().filter((row) => !outletFilter || row.outlet.outlet_id === outletFilter);

      // Every figure below is computed from current stock, so an adjustment on
      // the inventory screen is reflected here immediately.
      const totalStockItems = rows.reduce((total, row) => total + row.inventory.quantity, 0);
      const totalStockValue = rows.reduce(
        (total, row) => total + row.inventory.quantity * priceOf(row.product),
        0
      );

      return ok(
        {
          summary: {
            total_outlets: database.outlets.filter((outlet) => outlet.status === 'ACTIVE').length,
            total_products: database.products.filter((product) => product.status === 'ACTIVE')
              .length,
            total_stock_value: toWireMoney(totalStockValue),
            total_stock_items: totalStockItems,
            low_stock_products_count: lowStockRows(outletFilter).length,
            out_of_stock_products_count: outOfStockRows(outletFilter).length,
          },
          low_stock_alerts: lowStockRows(outletFilter).map((row) => ({
            inventory_id: row.inventory.inventory_id,
            product_id: row.product.product_id,
            product_name: row.product.name,
            sku: row.product.sku,
            outlet_id: row.outlet.outlet_id,
            outlet_name: row.outlet.name,
            current_stock: row.inventory.quantity,
            threshold,
          })),
          out_of_stock_alerts: outOfStockRows(outletFilter).map((row) => ({
            product_id: row.product.product_id,
            product_name: row.product.name,
            sku: row.product.sku,
            outlet_id: row.outlet.outlet_id,
            outlet_name: row.outlet.name,
          })),
          outlet_quick_stats: database.outlets.map((outlet) => {
            const outletRows = stockRows().filter(
              (row) => row.outlet.outlet_id === outlet.outlet_id
            );
            return {
              outlet_id: outlet.outlet_id,
              outlet_name: outlet.name,
              total_products: outletRows.length,
              total_stock: outletRows.reduce((total, row) => total + row.inventory.quantity, 0),
              low_stock_count: lowStockRows(outlet.outlet_id).length,
              out_of_stock_count: outOfStockRows(outlet.outlet_id).length,
            };
          }),
        },
        'Admin inventory dashboard data'
      );
    },
  },
];

/* -------------------------------------------------------------------------- */
/* Analytics and AI                                                            */
/* -------------------------------------------------------------------------- */

const analyticsHandlers: Route[] = [
  {
    method: 'GET',
    template: '/analytics/sales-trend',
    handle: ({ query }) => {
      requireRole('OWNER');
      if (!query.start_date || !query.end_date) {
        throw new MockHttpError(400, 'start_date and end_date are required');
      }

      const trend = SALES_TREND.labels.map((date, index) => ({
        date,
        total_sales: SALES_TREND.revenue[index] ?? '0.00',
        transaction_count: SALES_TREND.transactions[index] ?? 0,
      }));

      const totalTransactions = SALES_TREND.transactions.reduce((sum, count) => sum + count, 0);

      return ok(
        {
          trend,
          summary: {
            total_revenue: DASHBOARD_FIGURES.totalRevenue,
            average_daily_revenue: SALES_TREND.average,
            total_transactions: totalTransactions,
            average_daily_transactions: Math.round(totalTransactions / trend.length),
          },
        },
        'Sales trend data retrieved'
      );
    },
  },
  {
    method: 'GET',
    template: '/analytics/time-pattern',
    handle: () => {
      requireRole('OWNER');
      const totalTransactions = TIME_PATTERN.hourly_distribution.reduce(
        (sum, point) => sum + point.transaction_count,
        0
      );

      return ok(
        {
          patterns: TIME_PATTERN.hourly_distribution,
          peak_hours: TIME_PATTERN.peak_hours,
          average_transactions_per_hour: Math.round(
            totalTransactions / TIME_PATTERN.hourly_distribution.length
          ),
        },
        'Time pattern data retrieved'
      );
    },
  },
  {
    method: 'GET',
    template: '/analytics/aov-trend',
    handle: () => {
      requireRole('OWNER');
      return ok(
        {
          trend: AOV_TREND.labels.map((label, index) => ({
            period: label,
            aov: AOV_TREND.values[index] ?? '0.00',
            transaction_count: AOV_TREND.transactionCounts[index] ?? 0,
          })),
          overall_aov: AOV_TREND.current,
          aov_change_percentage: AOV_TREND.growth,
        },
        'AOV trend data retrieved'
      );
    },
  },
  {
    method: 'GET',
    template: '/analytics/product-performance',
    handle: ({ query }) => {
      requireRole('OWNER');
      const source = query.sort_by === 'QUANTITY' ? TOP_BY_QUANTITY : TOP_BY_REVENUE;
      const limit = Number(query.limit) || 10;

      return ok(
        {
          top_sellers: source.slice(0, limit).map((entry, index) => {
            const ranked = rankedProduct(entry, index);
            return {
              product_id: ranked.product_id,
              product_name: ranked.product_name,
              sku: ranked.sku,
              category_name: ranked.category_name,
              total_sold: entry.total_quantity_sold,
              total_revenue: entry.total_revenue,
              rank: index + 1,
            };
          }),
          underperformers: UNDERPERFORMERS.map((entry, index) => {
            const product = findProduct(entry.product_id);
            return {
              product_id: entry.product_id,
              product_name: product?.name ?? '',
              sku: product?.sku ?? '',
              category_name: categoryBrief(product?.category_id ?? null)?.name ?? '',
              total_sold: entry.total_quantity_sold,
              total_revenue: entry.total_revenue,
              rank: index + 1,
              days_without_sale: entry.days_without_sale,
            };
          }),
        },
        'Product performance data retrieved'
      );
    },
  },
];

const aiHandlers: Route[] = [
  {
    method: 'GET',
    template: '/ai-insights',
    handle: () => {
      requireRole('OWNER');
      return ok(AI_INSIGHT, 'AI insight retrieved');
    },
  },
  {
    method: 'POST',
    template: '/ai-insights/analyze',
    handle: () => {
      requireRole('OWNER');
      const database = getDb();

      // A second trigger while one is in flight is a 409, not a new job.
      if (database.aiJob && Date.now() - database.aiJob.startedAt < 10_000) {
        throw new MockHttpError(409, 'AI analysis is already in progress');
      }

      database.aiJob = { jobId: nextId('job'), startedAt: Date.now() };

      return ok(
        {
          job_id: database.aiJob.jobId,
          status: 'PROCESSING',
          message: 'AI analysis is being processed. Results will be available shortly.',
        },
        'AI analysis started',
        202
      );
    },
  },
];

/* -------------------------------------------------------------------------- */
/* Routing                                                                     */
/* -------------------------------------------------------------------------- */

type Route = {
  method: HttpMethod;
  template: string;
  handle: (context: MockContext) => MockEnvelope;
};

/**
 * Order matters: literal segments must be registered before the parameterised
 * route that would otherwise swallow them ("/inventory/bulk" before
 * "/inventory/:inventoryId").
 */
const ROUTES: Route[] = [
  ...authHandlers,
  ...merchantHandlers,
  ...outletHandlers,
  ...userHandlers,
  ...categoryHandlers,
  ...productHandlers,
  ...inventoryHandlers,
  ...cartHandlers,
  ...transactionHandlers,
  ...dashboardHandlers,
  ...analyticsHandlers,
  ...aiHandlers,
];

function matchTemplate(template: string, path: string): Record<string, string> | null {
  const templateParts = template.split('/');
  const pathParts = path.split('/');
  if (templateParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};

  for (let index = 0; index < templateParts.length; index += 1) {
    const templatePart = templateParts[index] ?? '';
    const pathPart = pathParts[index] ?? '';

    if (templatePart.startsWith(':')) {
      params[templatePart.slice(1)] = decodeURIComponent(pathPart);
      continue;
    }
    if (templatePart !== pathPart) return null;
  }

  return params;
}

export function dispatch(
  method: HttpMethod,
  path: string,
  query: Record<string, string>,
  body: Record<string, unknown>,
  idempotencyKey: string | undefined
): MockEnvelope {
  for (const route of ROUTES) {
    if (route.method !== method) continue;
    const params = matchTemplate(route.template, path);
    if (!params) continue;

    return route.handle({ path, params, query, body, idempotencyKey });
  }

  throw new MockHttpError(404, `No mock handler for ${method} ${path}`);
}
