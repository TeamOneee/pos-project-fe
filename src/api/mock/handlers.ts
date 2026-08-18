/**
 * Mock request handlers — one per endpoint in contract 07.
 *
 * Responses are built in wire shape and wrapped in the contract's envelope, so
 * they go through exactly the same schema validation as live responses. A mock
 * that answered a shape the schemas reject is doing its job; one that bypasses
 * them is not.
 *
 * ROLE GATING follows the contract's "Required Roles" tables, with one
 * deliberate exception: §5.2 permits an OWNER to check out at a selected
 * outlet, and CLAUDE.md's Out-of-scope list forbids Owner checkout in this
 * product. The stricter rule wins, so `POST /checkout` here is CASHIER only —
 * building against the looser contract would let a screen exist that the
 * product does not have.
 *
 * The dashboard endpoints aggregate the seeded transactions rather than
 * returning canned figures, so a sale made in the POS moves the Owner's
 * dashboard exactly as §6.1 says it should.
 */

import { NOW, PASSWORDS } from '@/api/mock/dataset';
import {
  applyMovement,
  effectiveThreshold,
  ensureInventory,
  findCategory,
  findInventory,
  findOutlet,
  findProduct,
  findProductOutletPrice,
  findStaff,
  getDb,
  isLowStock,
  nextId,
  nextTransactionNumber,
  priceOf,
  requestHash,
  toWireMoney,
  type WireCategory,
  type WireInventory,
  type WireMovement,
  type WireProduct,
  type WireStaff,
  type WireTransaction,
} from '@/api/mock/db';
import type { HttpMethod } from '@/api/transport';
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
};

export type MockEnvelope = { status: number; body: unknown };

function ok(data: unknown, message: string, status = 200): MockEnvelope {
  return { status, body: { success: true, statusCode: status, message, data } };
}

/** §0: `204 No Content` is the one success with no body at all. */
function noContent(): MockEnvelope {
  return { status: 204, body: null };
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

/** A field-scoped error, in the `errors[]` shape §0 defines. */
function fieldError(field: string, message: string) {
  return [{ field, message }];
}

/* -------------------------------------------------------------------------- */
/* Session                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Who is signed in.
 *
 * The real API carries this in the JWT and reads it per request; the mock has
 * no headers to read, so it remembers the last successful login. Login still
 * mints a **decodable** token, because the app now reads its own session from
 * the claims (§0) rather than from any endpoint.
 */
let session: WireStaff | null = null;

export function clearMockSession(): void {
  session = null;
}

function requireUser(): WireStaff {
  if (!session) throw new MockHttpError(401, 'Autentikasi gagal');
  return session;
}

function requireRole(...roles: WireStaff['role'][]): WireStaff {
  const user = requireUser();
  if (!roles.includes(user.role)) throw new MockHttpError(403, 'Akses ditolak');
  return user;
}

/** An unsigned JWT with the claims §0 mandates. Decodable, never verifiable. */
function mintToken(user: WireStaff): string {
  const header = base64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({
      sub: user.user_id,
      merchant_id: user.merchant_id,
      role: user.role,
      outlet_id: user.outlet_id,
      exp: Math.floor(Date.now() / 1000) + 900,
    })
  );

  return `${header}.${payload}.mock`;
}

function base64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/* -------------------------------------------------------------------------- */
/* Reading input                                                               */
/* -------------------------------------------------------------------------- */

function readString(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key];
  return typeof value === 'string' ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readBoolean(value: string | undefined): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

/** §0: zero-based `page`, `size` defaulting to 20 and capped at 100. */
function paginate<T>(items: T[], query: Record<string, string>) {
  const size = Math.min(100, Math.max(1, Number(query.size) || 20));
  const page = Math.max(0, Number(query.page) || 0);
  const start = page * size;

  return {
    content: items.slice(start, start + size),
    page,
    size,
    total_elements: items.length,
    total_pages: Math.max(1, Math.ceil(items.length / size)),
  };
}

/* -------------------------------------------------------------------------- */
/* Views                                                                       */
/* -------------------------------------------------------------------------- */

function productView(product: WireProduct) {
  return {
    ...product,
    category_name: findCategory(product.category_id)?.name ?? null,
  };
}

function inventoryView(row: WireInventory) {
  const product = findProduct(row.product_id);
  const outlet = findOutlet(row.outlet_id);

  return {
    id: row.id,
    outlet_id: row.outlet_id,
    outlet_name: outlet?.name ?? '',
    product_id: row.product_id,
    product_name: product?.name ?? '',
    quantity: row.quantity,
    base_low_stock_threshold: product?.low_stock_threshold ?? 0,
    low_stock_threshold_override: row.low_stock_threshold_override,
    effective_low_stock_threshold: effectiveThreshold(row),
    is_low_stock: isLowStock(row),
    updated_at: row.updated_at,
  };
}

function movementView(movement: WireMovement) {
  return { ...movement };
}

/** §5.4 `CheckoutResult` — the shape checkout, detail and search all return. */
function transactionDetailView(transaction: WireTransaction) {
  const operator = findStaff(transaction.operator_user_id);

  return {
    transaction_id: transaction.transaction_id,
    merchant_id: transaction.merchant_id,
    transaction_number: transaction.transaction_number,
    status: transaction.status,
    outlet_id: transaction.outlet_id,
    operator: {
      user_id: transaction.operator_user_id,
      role: operator?.role ?? 'CASHIER',
      name: operator?.name ?? '',
    },
    items: transaction.items,
    subtotal: transaction.subtotal,
    total: transaction.total,
    payment: {
      method: transaction.payment_method,
      status: transaction.payment_status,
      paid_at: transaction.paid_at,
    },
    created_at: transaction.created_at,
  };
}

/** §5.4 `TransactionSummaryDto` — the list row, deliberately thinner. */
function transactionSummaryView(transaction: WireTransaction) {
  return {
    transaction_id: transaction.transaction_id,
    transaction_number: transaction.transaction_number,
    outlet_id: transaction.outlet_id,
    operator_name: findStaff(transaction.operator_user_id)?.name ?? '',
    total: transaction.total,
    status: transaction.status,
    created_at: transaction.created_at,
  };
}

/* -------------------------------------------------------------------------- */
/* Scoping                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * §5.2 (OD-003): a CASHIER sees only their own sales, and the restriction is
 * applied in the service rather than trusted from the query.
 */
function visibleTransactions(user: WireStaff): WireTransaction[] {
  const all = getDb().transactions;
  if (user.role === 'CASHIER') {
    return all.filter((transaction) => transaction.operator_user_id === user.user_id);
  }
  return all;
}

/** The outlet a request may act on, validated against the caller's scope. */
function resolveOutlet(user: WireStaff, requested: string | undefined): string {
  if (user.role === 'CASHIER') {
    if (!user.outlet_id) throw new MockHttpError(403, 'Akses ditolak');
    if (requested && requested !== user.outlet_id) throw new MockHttpError(403, 'Akses ditolak');
    return user.outlet_id;
  }

  if (!requested) throw new MockHttpError(400, 'Validasi gagal', fieldError('outlet_id', 'wajib'));
  const outlet = findOutlet(requested);
  if (!outlet) throw new MockHttpError(404, 'Data tidak ditemukan');
  return outlet.id;
}

/* -------------------------------------------------------------------------- */
/* Identity (§1)                                                               */
/* -------------------------------------------------------------------------- */

function register(context: MockContext): MockEnvelope {
  const email = readString(context.body, 'email')?.toLowerCase();
  const name = readString(context.body, 'name');
  const password = readString(context.body, 'password');
  const merchantName = readString(context.body, 'merchant_name');

  if (!email || !name || !password || !merchantName) {
    throw new MockHttpError(400, 'Validasi gagal');
  }

  if (getDb().staff.some((member) => member.email === email)) {
    throw new MockHttpError(409, 'Email sudah terdaftar', fieldError('email', 'sudah dipakai'));
  }

  const user: WireStaff = {
    user_id: nextId('usr'),
    merchant_id: getDb().merchant.id,
    outlet_id: null,
    name,
    email,
    role: 'OWNER',
    status: 'ACTIVE',
    created_at: NOW,
    updated_at: NOW,
  };

  getDb().staff.push(user);
  PASSWORDS[email] = password;

  // §1.2 returns no token: registering does not sign the new Owner in.
  return ok(
    { user_id: user.user_id, merchant_id: user.merchant_id, email: user.email, role: user.role },
    'Registrasi berhasil',
    201
  );
}

function login(context: MockContext): MockEnvelope {
  const email = readString(context.body, 'email')?.toLowerCase();
  const password = readString(context.body, 'password');

  const user = getDb().staff.find((member) => member.email === email);

  // §1.6: bad credentials and a deactivated account answer identically.
  if (!user || !password || PASSWORDS[user.email] !== password || user.status !== 'ACTIVE') {
    throw new MockHttpError(401, 'Autentikasi gagal');
  }

  session = user;

  return ok(
    {
      access_token: mintToken(user),
      expires_in: 900,
      role: user.role,
      merchant_id: user.merchant_id,
      outlet_id: user.outlet_id,
    },
    'Login berhasil'
  );
}

function createStaff(context: MockContext): MockEnvelope {
  requireRole('OWNER');

  const name = readString(context.body, 'name');
  const email = readString(context.body, 'email')?.toLowerCase();
  const password = readString(context.body, 'password');
  const role = readString(context.body, 'role');
  const outletId = readString(context.body, 'outlet_id') ?? null;

  if (!name || !email || !password || (role !== 'ADMIN' && role !== 'CASHIER')) {
    throw new MockHttpError(400, 'Validasi gagal');
  }

  // §1.1 rule 2, both directions.
  if (role === 'CASHIER' && !outletId) {
    throw new MockHttpError(400, 'Validasi gagal', fieldError('outlet_id', 'wajib untuk kasir'));
  }
  if (role === 'ADMIN' && outletId) {
    throw new MockHttpError(400, 'Validasi gagal', fieldError('outlet_id', 'dilarang untuk admin'));
  }
  if (outletId && !findOutlet(outletId)) throw new MockHttpError(404, 'Data tidak ditemukan');

  if (getDb().staff.some((member) => member.email === email)) {
    throw new MockHttpError(409, 'Email sudah terdaftar', fieldError('email', 'sudah dipakai'));
  }

  const member: WireStaff = {
    user_id: nextId('usr'),
    merchant_id: getDb().merchant.id,
    outlet_id: outletId,
    name,
    email,
    role,
    status: 'ACTIVE',
    created_at: NOW,
    updated_at: NOW,
  };

  getDb().staff.push(member);
  PASSWORDS[email] = password;

  return ok(member, 'Staf berhasil dibuat', 201);
}

function listStaff(context: MockContext): MockEnvelope {
  requireRole('OWNER');

  let rows = getDb().staff;
  if (context.query.role) rows = rows.filter((member) => member.role === context.query.role);
  if (context.query.status) rows = rows.filter((member) => member.status === context.query.status);

  return ok(paginate(rows, context.query), 'Daftar staf dimuat');
}

function updateStaff(context: MockContext): MockEnvelope {
  requireRole('OWNER');

  const member = findStaff(context.params.userId ?? '');
  if (!member) throw new MockHttpError(404, 'Data tidak ditemukan');
  // §1.2 note: the Owner is not editable through this endpoint.
  if (member.role === 'OWNER') throw new MockHttpError(403, 'Akses ditolak');

  const role = readString(context.body, 'role');
  const status = readString(context.body, 'status');
  const hasOutlet = 'outlet_id' in context.body;
  const outletId = hasOutlet
    ? ((context.body.outlet_id as string | null) ?? null)
    : member.outlet_id;
  const nextRole = role === 'ADMIN' || role === 'CASHIER' ? role : member.role;

  if (nextRole === 'CASHIER' && !outletId) {
    throw new MockHttpError(400, 'Validasi gagal', fieldError('outlet_id', 'wajib untuk kasir'));
  }
  if (nextRole === 'ADMIN' && outletId) {
    throw new MockHttpError(400, 'Validasi gagal', fieldError('outlet_id', 'dilarang untuk admin'));
  }

  member.role = nextRole;
  member.outlet_id = nextRole === 'ADMIN' ? null : outletId;
  if (status === 'ACTIVE' || status === 'INACTIVE') member.status = status;

  const newPassword = readString(context.body, 'new_password');
  if (newPassword) PASSWORDS[member.email] = newPassword;

  member.updated_at = NOW;
  return ok(member, 'Staf berhasil diperbarui');
}

/* -------------------------------------------------------------------------- */
/* Tenant (§2)                                                                 */
/* -------------------------------------------------------------------------- */

function getMerchant(): MockEnvelope {
  requireUser();
  return ok(getDb().merchant, 'Profil merchant dimuat');
}

function updateMerchant(context: MockContext): MockEnvelope {
  requireRole('OWNER');

  const name = readString(context.body, 'name');
  if (name !== undefined) {
    if (!name.trim()) throw new MockHttpError(400, 'Validasi gagal', fieldError('name', 'wajib'));
    getDb().merchant.name = name;
  }

  getDb().merchant.updated_at = NOW;
  return ok(getDb().merchant, 'Merchant berhasil diperbarui');
}

function createOutlet(context: MockContext): MockEnvelope {
  requireRole('OWNER');

  const name = readString(context.body, 'name');
  if (!name?.trim()) throw new MockHttpError(400, 'Validasi gagal', fieldError('name', 'wajib'));

  const outlet = {
    id: nextId('otl'),
    merchant_id: getDb().merchant.id,
    name,
    address: readString(context.body, 'address') ?? '',
    status: 'ACTIVE' as const,
    created_at: NOW,
    updated_at: NOW,
  };

  getDb().outlets.push(outlet);
  return ok(outlet, 'Outlet berhasil dibuat', 201);
}

function listOutlets(context: MockContext): MockEnvelope {
  requireRole('OWNER', 'ADMIN');

  let rows = getDb().outlets;
  if (context.query.status) rows = rows.filter((outlet) => outlet.status === context.query.status);

  return ok(paginate(rows, context.query), 'Daftar outlet dimuat');
}

function updateOutlet(context: MockContext): MockEnvelope {
  requireRole('OWNER');

  const outlet = findOutlet(context.params.id ?? '');
  if (!outlet) throw new MockHttpError(404, 'Data tidak ditemukan');

  const name = readString(context.body, 'name');
  const address = readString(context.body, 'address');
  const status = readString(context.body, 'status');

  if (name !== undefined) outlet.name = name;
  if (address !== undefined) outlet.address = address;
  if (status === 'ACTIVE' || status === 'INACTIVE') outlet.status = status;

  outlet.updated_at = NOW;
  return ok(outlet, 'Outlet berhasil diperbarui');
}

/* -------------------------------------------------------------------------- */
/* Catalog (§3)                                                                */
/* -------------------------------------------------------------------------- */

function createCategory(context: MockContext): MockEnvelope {
  requireRole('OWNER', 'ADMIN');

  const name = readString(context.body, 'name');
  if (!name?.trim()) throw new MockHttpError(400, 'Validasi gagal', fieldError('name', 'wajib'));

  if (getDb().categories.some((entry) => entry.name.toLowerCase() === name.toLowerCase())) {
    throw new MockHttpError(409, 'Validasi gagal', fieldError('name', 'nama sudah dipakai'));
  }

  const category: WireCategory = {
    id: nextId('cat'),
    merchant_id: getDb().merchant.id,
    name,
    is_active: true,
  };

  getDb().categories.push(category);
  return ok(category, 'Kategori berhasil dibuat', 201);
}

function listCategories(context: MockContext): MockEnvelope {
  const user = requireUser();

  let rows = getDb().categories;

  // §3.2: a CASHIER is forced to active categories in the service, not by query.
  if (user.role === 'CASHIER') {
    rows = rows.filter((category) => category.is_active);
  } else {
    const isActive = readBoolean(context.query.is_active);
    if (isActive !== undefined) rows = rows.filter((category) => category.is_active === isActive);
  }

  return ok(paginate(rows, context.query), 'Daftar kategori dimuat');
}

function updateCategory(context: MockContext): MockEnvelope {
  requireRole('OWNER', 'ADMIN');

  const category = findCategory(context.params.id ?? '');
  if (!category) throw new MockHttpError(404, 'Data tidak ditemukan');

  const name = readString(context.body, 'name');
  if (name !== undefined) {
    if (!name.trim()) throw new MockHttpError(400, 'Validasi gagal', fieldError('name', 'wajib'));
    const clash = getDb().categories.some(
      (entry) => entry.id !== category.id && entry.name.toLowerCase() === name.toLowerCase()
    );
    if (clash) {
      throw new MockHttpError(400, 'Validasi gagal', fieldError('name', 'nama sudah dipakai'));
    }
    category.name = name;
  }

  if (typeof context.body.is_active === 'boolean') category.is_active = context.body.is_active;

  return ok(category, 'Kategori berhasil diperbarui');
}

function createProduct(context: MockContext): MockEnvelope {
  requireRole('OWNER', 'ADMIN');

  const name = readString(context.body, 'name');
  const price = readString(context.body, 'price');
  const categoryId = readString(context.body, 'category_id');
  const threshold = readNumber(context.body.low_stock_threshold);

  if (!name?.trim()) throw new MockHttpError(400, 'Validasi gagal', fieldError('name', 'wajib'));
  if (!price || parseMoney(price) < 0) {
    throw new MockHttpError(400, 'Validasi gagal', fieldError('price', 'harga tidak valid'));
  }
  if (threshold === undefined || threshold < 0) {
    throw new MockHttpError(400, 'Validasi gagal', fieldError('low_stock_threshold', 'wajib >= 0'));
  }

  const category = categoryId ? findCategory(categoryId) : undefined;
  if (!category || !category.is_active) {
    throw new MockHttpError(
      400,
      'Validasi gagal',
      fieldError('category_id', 'kategori tidak aktif atau tidak ditemukan')
    );
  }

  const product: WireProduct = {
    id: nextId('prd'),
    merchant_id: getDb().merchant.id,
    category_id: category.id,
    name,
    price,
    low_stock_threshold: threshold,
    is_active: typeof context.body.is_active === 'boolean' ? context.body.is_active : true,
    created_at: NOW,
    updated_at: NOW,
  };

  getDb().products.push(product);
  return ok(productView(product), 'Produk berhasil dibuat', 201);
}

function listProducts(context: MockContext): MockEnvelope {
  requireRole('OWNER', 'ADMIN');

  let rows = getDb().products;

  const search = context.query.search?.trim().toLowerCase();
  if (search) rows = rows.filter((product) => product.name.toLowerCase().includes(search));
  if (context.query.category_id) {
    rows = rows.filter((product) => product.category_id === context.query.category_id);
  }

  const isActive = readBoolean(context.query.is_active);
  if (isActive !== undefined) rows = rows.filter((product) => product.is_active === isActive);

  const view = paginate(rows, context.query);
  return ok({ ...view, content: view.content.map(productView) }, 'Daftar produk dimuat');
}

function updateProduct(context: MockContext): MockEnvelope {
  requireRole('OWNER', 'ADMIN');

  const product = findProduct(context.params.id ?? '');
  if (!product) throw new MockHttpError(404, 'Data tidak ditemukan');

  const name = readString(context.body, 'name');
  if (name !== undefined) {
    if (!name.trim()) throw new MockHttpError(400, 'Validasi gagal', fieldError('name', 'wajib'));
    product.name = name;
  }

  const price = readString(context.body, 'price');
  if (price !== undefined) {
    if (parseMoney(price) < 0) {
      throw new MockHttpError(400, 'Validasi gagal', fieldError('price', 'harga tidak valid'));
    }
    product.price = price;
  }

  const categoryId = readString(context.body, 'category_id');
  if (categoryId !== undefined) {
    const category = findCategory(categoryId);
    if (!category || !category.is_active) {
      throw new MockHttpError(
        400,
        'Validasi gagal',
        fieldError('category_id', 'kategori tidak aktif atau tidak ditemukan')
      );
    }
    product.category_id = category.id;
  }

  const threshold = readNumber(context.body.low_stock_threshold);
  if (threshold !== undefined) {
    if (threshold < 0) {
      throw new MockHttpError(
        400,
        'Validasi gagal',
        fieldError('low_stock_threshold', 'wajib >= 0')
      );
    }
    product.low_stock_threshold = threshold;
  }

  if (typeof context.body.is_active === 'boolean') product.is_active = context.body.is_active;

  product.updated_at = NOW;
  return ok(productView(product), 'Produk berhasil diperbarui');
}

function putOutletPrice(context: MockContext): MockEnvelope {
  requireRole('OWNER', 'ADMIN');

  const product = findProduct(context.params.productId ?? '');
  const outlet = findOutlet(context.params.outletId ?? '');
  if (!product || !outlet) throw new MockHttpError(404, 'Data tidak ditemukan');

  const price = readString(context.body, 'price');
  if (!price) {
    throw new MockHttpError(400, 'Validasi gagal', fieldError('price', 'wajib'));
  }

  let parsedPrice: number;
  try {
    parsedPrice = parseMoney(price);
  } catch {
    throw new MockHttpError(400, 'Validasi gagal', fieldError('price', 'harga tidak valid'));
  }
  if (parsedPrice < 0) {
    throw new MockHttpError(400, 'Validasi gagal', fieldError('price', 'wajib >= 0'));
  }

  const state = getDb();
  let override = findProductOutletPrice(product.id, outlet.id);
  if (override) {
    override.price = toWireMoney(parsedPrice);
    override.updated_at = NOW;
  } else {
    override = {
      product_id: product.id,
      outlet_id: outlet.id,
      price: toWireMoney(parsedPrice),
      updated_at: NOW,
    };
    state.productOutletPrices.push(override);
  }

  return ok(override, 'Harga outlet berhasil disimpan');
}

function deleteOutletPrice(context: MockContext): MockEnvelope {
  requireRole('OWNER', 'ADMIN');

  const productId = context.params.productId ?? '';
  const outletId = context.params.outletId ?? '';
  const state = getDb();
  const index = state.productOutletPrices.findIndex(
    (entry) => entry.product_id === productId && entry.outlet_id === outletId
  );
  if (index < 0) throw new MockHttpError(404, 'Data tidak ditemukan');

  state.productOutletPrices.splice(index, 1);
  return noContent();
}

/**
 * §4.2 `GET /products/catalog` — the cashier's catalogue.
 *
 * The three visibility conditions are applied here, server-side, exactly as the
 * contract describes: the product is active, its category is active, and an
 * inventory row exists at the outlet.
 */
function listCatalog(context: MockContext): MockEnvelope {
  const user = requireRole('CASHIER', 'OWNER');

  const outletId =
    user.role === 'CASHIER'
      ? resolveOutlet(user, context.query.outlet_id)
      : context.query.outlet_id;

  if (!outletId) {
    throw new MockHttpError(400, 'Validasi gagal', fieldError('outlet_id', 'wajib'));
  }

  const outlet = findOutlet(outletId);
  if (!outlet || outlet.status !== 'ACTIVE') throw new MockHttpError(403, 'Akses ditolak');

  const search = context.query.search?.trim().toLowerCase();

  const rows = getDb()
    .products.filter((product) => {
      if (!product.is_active) return false;
      if (!findCategory(product.category_id)?.is_active) return false;
      if (!findInventory(outletId, product.id)) return false;
      if (context.query.category_id && product.category_id !== context.query.category_id) {
        return false;
      }
      if (search && !product.name.toLowerCase().includes(search)) return false;
      return true;
    })
    .map((product) => ({
      id: product.id,
      name: product.name,
      price: toWireMoney(priceOf(product, outletId)),
      category_id: product.category_id,
      stock_quantity: findInventory(outletId, product.id)?.quantity ?? 0,
    }));

  return ok(paginate(rows, context.query), 'Katalog kasir dimuat');
}

/* -------------------------------------------------------------------------- */
/* Inventory (§4)                                                              */
/* -------------------------------------------------------------------------- */

function inventoryRows(query: Record<string, string>): WireInventory[] {
  let rows = getDb().inventory;
  if (query.outlet_id) rows = rows.filter((row) => row.outlet_id === query.outlet_id);
  if (query.product_id) rows = rows.filter((row) => row.product_id === query.product_id);
  if (readBoolean(query.low_stock_only)) rows = rows.filter(isLowStock);
  return rows;
}

function listInventory(context: MockContext): MockEnvelope {
  requireRole('OWNER', 'ADMIN');

  const view = paginate(inventoryRows(context.query), context.query);
  return ok({ ...view, content: view.content.map(inventoryView) }, 'Daftar stok dimuat');
}

function adjustStock(context: MockContext): MockEnvelope {
  const user = requireRole('OWNER', 'ADMIN');

  const outletId = readString(context.body, 'outlet_id');
  const productId = readString(context.body, 'product_id');
  const delta = readNumber(context.body.delta);
  const reason = readString(context.body, 'reason');

  if (!reason?.trim()) {
    throw new MockHttpError(400, 'Validasi gagal', fieldError('reason', 'alasan wajib diisi'));
  }
  if (delta === undefined || delta === 0) {
    throw new MockHttpError(400, 'Validasi gagal', fieldError('delta', 'tidak boleh nol'));
  }

  const outlet = outletId ? findOutlet(outletId) : undefined;
  const product = productId ? findProduct(productId) : undefined;
  if (!outlet || !product) throw new MockHttpError(404, 'Data tidak ditemukan');
  // §2.2: an inactive outlet is read-only for business operations.
  if (outlet.status !== 'ACTIVE') throw new MockHttpError(403, 'Akses ditolak');

  const row = ensureInventory(outlet.id, product.id);
  if (row.quantity + delta < 0) {
    throw new MockHttpError(409, 'Validasi gagal', fieldError('delta', 'hasil menjadi negatif'));
  }

  const movement = applyMovement({
    outletId: outlet.id,
    productId: product.id,
    delta,
    type: 'ADJUSTMENT',
    reason,
    actorUserId: user.user_id,
    at: NOW,
  });

  return ok(
    {
      movement_id: movement.id,
      outlet_id: movement.outlet_id,
      product_id: movement.product_id,
      quantity_before: movement.quantity_before,
      quantity_after: movement.quantity_after,
      delta: movement.delta,
      reason,
      actor_user_id: movement.actor_user_id,
      created_at: movement.created_at,
    },
    'Adjustment stok berhasil',
    201
  );
}

function listMovements(context: MockContext): MockEnvelope {
  requireRole('OWNER', 'ADMIN');

  let rows = getDb().movements;
  if (context.query.outlet_id) {
    rows = rows.filter((row) => row.outlet_id === context.query.outlet_id);
  }
  if (context.query.product_id) {
    rows = rows.filter((row) => row.product_id === context.query.product_id);
  }
  if (context.query.type) rows = rows.filter((row) => row.type === context.query.type);

  const view = paginate(rows, context.query);
  return ok({ ...view, content: view.content.map(movementView) }, 'Riwayat stok dimuat');
}

function putThreshold(context: MockContext): MockEnvelope {
  requireRole('OWNER', 'ADMIN');

  const threshold = readNumber(context.body.threshold);
  if (threshold === undefined || threshold < 0) {
    throw new MockHttpError(400, 'Validasi gagal', fieldError('threshold', 'wajib >= 0'));
  }

  const product = findProduct(context.params.productId ?? '');
  const outlet = findOutlet(context.params.outletId ?? '');
  if (!product || !outlet) throw new MockHttpError(404, 'Data tidak ditemukan');

  // §4.2: the pairing is created at zero when it does not exist yet, so an
  // Admin can prepare thresholds before any stock arrives.
  const row = ensureInventory(outlet.id, product.id);
  row.low_stock_threshold_override = threshold;
  row.updated_at = NOW;

  return ok(
    {
      product_id: product.id,
      outlet_id: outlet.id,
      base_low_stock_threshold: product.low_stock_threshold,
      low_stock_threshold_override: row.low_stock_threshold_override,
      effective_low_stock_threshold: effectiveThreshold(row),
      updated_at: row.updated_at,
    },
    'Threshold berhasil disimpan'
  );
}

function deleteThreshold(context: MockContext): MockEnvelope {
  requireRole('OWNER', 'ADMIN');

  const row = findInventory(context.params.outletId ?? '', context.params.productId ?? '');
  if (!row) throw new MockHttpError(404, 'Data tidak ditemukan');

  row.low_stock_threshold_override = null;
  row.updated_at = NOW;

  return noContent();
}

/* -------------------------------------------------------------------------- */
/* Sales (§5)                                                                  */
/* -------------------------------------------------------------------------- */

function checkout(context: MockContext): MockEnvelope {
  // Contract §5.2 allows OWNER too; CLAUDE.md forbids Owner checkout, and the
  // stricter of the two wins. See the note at the top of this file.
  const user = requireRole('CASHIER');

  const requestId = readString(context.body, 'checkout_request_id');
  const outletId = readString(context.body, 'outlet_id');
  const method = readString(context.body, 'payment_method');
  const rawItems = Array.isArray(context.body.items) ? context.body.items : [];

  if (!requestId) {
    throw new MockHttpError(400, 'Validasi gagal', fieldError('checkout_request_id', 'wajib'));
  }
  if (method !== 'CASH' && method !== 'QRIS' && method !== 'TRANSFER') {
    throw new MockHttpError(400, 'Validasi gagal', fieldError('payment_method', 'tidak valid'));
  }
  if (rawItems.length === 0) {
    throw new MockHttpError(400, 'Validasi gagal', fieldError('items', 'minimal 1 item'));
  }

  const outlet = findOutlet(resolveOutlet(user, outletId));
  if (!outlet || outlet.status !== 'ACTIVE') throw new MockHttpError(403, 'Akses ditolak');

  const hash = requestHash({
    merchant_id: getDb().merchant.id,
    outlet_id: outlet.id,
    operator_user_id: user.user_id,
    items: rawItems,
    payment_method: method,
  });

  // §5.2 step 5: replay returns the original; a reused id with a different
  // payload is a conflict.
  const existing = getDb().transactions.find(
    (transaction) => transaction.checkout_request_id === requestId
  );
  if (existing) {
    if (existing.request_hash !== hash) {
      throw new MockHttpError(409, 'Konflik idempotency checkout');
    }
    return ok(transactionDetailView(existing), 'Checkout berhasil');
  }

  // Validate every line before touching stock: §5.2 guarantees all-or-nothing.
  const priced = rawItems.map((raw, index) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    const productId = typeof item.product_id === 'string' ? item.product_id : '';
    const quantity = readNumber(item.quantity) ?? 0;
    const field = `items[${index}].product_id`;

    const product = findProduct(productId);
    if (!product) throw new MockHttpError(404, 'Data tidak ditemukan');
    if (quantity <= 0) {
      throw new MockHttpError(400, 'Validasi gagal', fieldError(`items[${index}].quantity`, '> 0'));
    }
    if (!product.is_active) {
      throw new MockHttpError(409, 'Produk tidak aktif', fieldError(field, product.name));
    }
    if (!findCategory(product.category_id)?.is_active) {
      throw new MockHttpError(409, 'Kategori produk tidak aktif', fieldError(field, product.name));
    }

    const unitPrice = priceOf(product, outlet.id);

    const expected = typeof item.expected_unit_price === 'string' ? item.expected_unit_price : null;
    if (expected !== null && parseMoney(expected) !== unitPrice) {
      throw new MockHttpError(
        409,
        'Harga produk berubah',
        fieldError(field, `current_price=${toWireMoney(unitPrice)}`)
      );
    }

    const available = findInventory(outlet.id, product.id)?.quantity ?? 0;
    if (available < quantity) {
      throw new MockHttpError(
        409,
        'Stok tidak mencukupi',
        fieldError(field, `stock=${available}, requested=${quantity}`)
      );
    }

    return { product, quantity, unitPrice };
  });

  const items = priced.map((line) => ({
    product_id: line.product.id,
    name: line.product.name,
    unit_price: toWireMoney(line.unitPrice),
    quantity: line.quantity,
    subtotal: toWireMoney(line.unitPrice * line.quantity),
  }));

  const subtotal = priced.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  const transactionId = nextId('trx');
  for (const line of priced) {
    applyMovement({
      outletId: outlet.id,
      productId: line.product.id,
      delta: -line.quantity,
      type: 'SALE',
      reason: null,
      actorUserId: user.user_id,
      transactionId,
      at: NOW,
    });
  }

  const transaction: WireTransaction = {
    transaction_id: transactionId,
    merchant_id: getDb().merchant.id,
    outlet_id: outlet.id,
    operator_user_id: user.user_id,
    transaction_number: nextTransactionNumber(new Date(NOW)),
    status: 'COMPLETED',
    subtotal: toWireMoney(subtotal),
    // §5.1 (OD-004): total is subtotal. Nothing sits between them.
    total: toWireMoney(subtotal),
    payment_method: method,
    payment_status: 'CONFIRMED',
    paid_at: NOW,
    created_at: NOW,
    items,
    checkout_request_id: requestId,
    request_hash: hash,
  };

  getDb().transactions.unshift(transaction);

  // §5.2: 200 for a fresh sale as well as a replay — the two are deliberately
  // indistinguishable from the response alone.
  return ok(transactionDetailView(transaction), 'Checkout berhasil');
}

function listTransactions(context: MockContext): MockEnvelope {
  const user = requireRole('OWNER', 'CASHIER');

  let rows = visibleTransactions(user);

  if (user.role === 'CASHIER' && user.outlet_id) {
    rows = rows.filter((transaction) => transaction.outlet_id === user.outlet_id);
  } else if (context.query.outlet_id) {
    rows = rows.filter((transaction) => transaction.outlet_id === context.query.outlet_id);
  }

  rows = rows.filter((transaction) => withinRange(transaction.created_at, context.query));
  rows = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));

  const view = paginate(rows, context.query);
  return ok(
    { ...view, content: view.content.map(transactionSummaryView) },
    'Riwayat transaksi dimuat'
  );
}

function getTransaction(context: MockContext): MockEnvelope {
  const user = requireRole('OWNER', 'CASHIER');

  const transaction = visibleTransactions(user).find(
    (entry) => entry.transaction_id === context.params.id
  );
  if (!transaction) throw new MockHttpError(404, 'Data tidak ditemukan');

  return ok(transactionDetailView(transaction), 'Detail transaksi dimuat');
}

function searchTransactions(context: MockContext): MockEnvelope {
  const user = requireRole('OWNER', 'CASHIER');

  const number = context.query.transaction_number?.trim();
  if (!number) {
    throw new MockHttpError(400, 'Validasi gagal', fieldError('transaction_number', 'wajib'));
  }

  // §5.2: exact match, not a partial one.
  const transaction = visibleTransactions(user).find(
    (entry) => entry.transaction_number === number
  );
  if (!transaction) throw new MockHttpError(404, 'Data tidak ditemukan');

  return ok(transactionDetailView(transaction), 'Transaksi ditemukan');
}

function checkoutStatus(context: MockContext): MockEnvelope {
  const user = requireRole('OWNER', 'CASHIER');

  const requestId = context.query.checkout_request_id;
  const transaction = visibleTransactions(user).find(
    (entry) => entry.checkout_request_id === requestId
  );

  // 404 means "never happened", and the client may submit it again as new.
  if (!transaction) throw new MockHttpError(404, 'Data tidak ditemukan');

  return ok(transactionDetailView(transaction), 'Status checkout dimuat');
}

function getReceipt(context: MockContext): MockEnvelope {
  const user = requireRole('OWNER', 'CASHIER');

  const transaction = visibleTransactions(user).find(
    (entry) => entry.transaction_id === context.params.transactionId
  );
  if (!transaction) throw new MockHttpError(404, 'Data tidak ditemukan');

  const outlet = findOutlet(transaction.outlet_id);

  return ok(
    {
      ...transactionDetailView(transaction),
      merchant_name: getDb().merchant.name,
      outlet_name: outlet?.name ?? '',
      outlet_address: outlet?.address ?? null,
    },
    'Struk dimuat'
  );
}

/* -------------------------------------------------------------------------- */
/* Reporting (§6)                                                              */
/* -------------------------------------------------------------------------- */

/** Every dashboard response carries this (§6.4). Mock reads are always FRESH. */
function meta(periodStart?: string, periodEnd?: string) {
  return {
    data_updated_at: NOW,
    freshness_status: 'FRESH' as const,
    timezone: getDb().merchant.timezone,
    ...(periodStart ? { period_start: periodStart, period_end: periodEnd } : {}),
  };
}

function withinRange(iso: string, query: Record<string, string>): boolean {
  const at = Date.parse(iso);
  if (query.date_from && at < Date.parse(query.date_from)) return false;
  if (query.date_to && at > Date.parse(query.date_to)) return false;
  return true;
}

/** The `COMPLETED` transactions a reporting query is computed over. */
function reportingRows(query: Record<string, string>): WireTransaction[] {
  return getDb().transactions.filter((transaction) => {
    if (query.outlet_id && transaction.outlet_id !== query.outlet_id) return false;
    return withinRange(transaction.created_at, query);
  });
}

function requirePeriod(query: Record<string, string>): { from: string; to: string } {
  if (!query.date_from || !query.date_to) {
    throw new MockHttpError(400, 'Validasi gagal', fieldError('date_from', 'wajib'));
  }
  if (Date.parse(query.date_from) > Date.parse(query.date_to)) {
    throw new MockHttpError(400, 'Validasi gagal', fieldError('date_from', 'melebihi date_to'));
  }
  return { from: query.date_from, to: query.date_to };
}

function dashboardSummary(context: MockContext): MockEnvelope {
  requireRole('OWNER');
  const period = requirePeriod(context.query);

  const rows = reportingRows(context.query);
  const omzet = rows.reduce((sum, row) => sum + parseMoney(row.total), 0);
  const count = rows.length;

  return ok(
    {
      omzet: toWireMoney(omzet),
      transaction_count: count,
      average_transaction_value: toWireMoney(count > 0 ? Math.trunc(omzet / count) : 0),
      ...meta(period.from, period.to),
    },
    'Ringkasan dashboard'
  );
}

function dashboardOperations(context: MockContext): MockEnvelope {
  requireRole('OWNER', 'ADMIN');

  const outletId = context.query.outlet_id;
  const rows = outletId
    ? getDb().inventory.filter((row) => row.outlet_id === outletId)
    : getDb().inventory;

  return ok(
    {
      inventory_item_count: rows.length,
      low_stock_item_count: rows.filter((row) => isLowStock(row) && row.quantity > 0).length,
      out_of_stock_item_count: rows.filter((row) => row.quantity <= 0).length,
      active_product_count: getDb().products.filter((product) => product.is_active).length,
      inactive_product_count: getDb().products.filter((product) => !product.is_active).length,
      inactive_category_count: getDb().categories.filter((category) => !category.is_active).length,
      outlet_id: outletId ?? null,
      ...meta(),
    },
    'Ringkasan operasional'
  );
}

/** Groups sales into HOUR or DAY buckets, in the order the chart reads them. */
function bucketRows(rows: WireTransaction[], bucket: 'HOUR' | 'DAY') {
  const buckets = new Map<string, { omzet: number; count: number }>();

  for (const row of rows) {
    const at = new Date(row.created_at);
    const key =
      bucket === 'HOUR'
        ? new Date(at.getFullYear(), at.getMonth(), at.getDate(), at.getHours()).toISOString()
        : new Date(at.getFullYear(), at.getMonth(), at.getDate()).toISOString();

    const entry = buckets.get(key) ?? { omzet: 0, count: 0 };
    entry.omzet += parseMoney(row.total);
    entry.count += 1;
    buckets.set(key, entry);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => ({ bucketStart: key, omzet: entry.omzet, count: entry.count }));
}

function readBucket(query: Record<string, string>): 'HOUR' | 'DAY' {
  return query.bucket === 'HOUR' ? 'HOUR' : 'DAY';
}

function salesTrend(context: MockContext): MockEnvelope {
  requireRole('OWNER');
  const period = requirePeriod(context.query);
  const bucket = readBucket(context.query);

  const points = bucketRows(reportingRows(context.query), bucket).map((entry) => ({
    bucket_start: entry.bucketStart,
    omzet: toWireMoney(entry.omzet),
    transaction_count: entry.count,
  }));

  return ok({ bucket, points, ...meta(period.from, period.to) }, 'Tren penjualan');
}

function aovTrend(context: MockContext): MockEnvelope {
  requireRole('OWNER');
  const period = requirePeriod(context.query);
  const bucket = readBucket(context.query);

  const points = bucketRows(reportingRows(context.query), bucket).map((entry) => ({
    bucket_start: entry.bucketStart,
    average_transaction_value: toWireMoney(
      entry.count > 0 ? Math.trunc(entry.omzet / entry.count) : 0
    ),
  }));

  return ok({ bucket, points, ...meta(period.from, period.to) }, 'Tren AOV');
}

function timePattern(context: MockContext): MockEnvelope {
  requireRole('OWNER');
  const period = requirePeriod(context.query);

  const hours = new Map<number, { omzet: number; count: number }>();
  for (const row of reportingRows(context.query)) {
    const hour = new Date(row.created_at).getHours();
    const entry = hours.get(hour) ?? { omzet: 0, count: 0 };
    entry.omzet += parseMoney(row.total);
    entry.count += 1;
    hours.set(hour, entry);
  }

  const points = [...hours.entries()]
    .sort(([a], [b]) => a - b)
    .map(([hour, entry]) => ({
      hour_of_day: hour,
      omzet: toWireMoney(entry.omzet),
      transaction_count: entry.count,
    }));

  return ok({ points, ...meta(period.from, period.to) }, 'Pola waktu penjualan');
}

function topProducts(context: MockContext): MockEnvelope {
  requireRole('OWNER');
  const period = requirePeriod(context.query);

  const limit = Math.min(100, Math.max(1, Number(context.query.limit) || 10));

  const totals = new Map<string, { name: string; units: number; omzet: number }>();
  for (const row of reportingRows(context.query)) {
    for (const item of row.items) {
      const entry = totals.get(item.product_id) ?? { name: item.name, units: 0, omzet: 0 };
      entry.units += item.quantity;
      entry.omzet += parseMoney(item.subtotal);
      totals.set(item.product_id, entry);
    }
  }

  const ranked = [...totals.entries()].map(([productId, entry]) => ({
    product_id: productId,
    name: entry.name,
    units_sold: entry.units,
    omzet: toWireMoney(entry.omzet),
  }));

  const byOmzet = [...ranked].sort((a, b) => parseMoney(b.omzet) - parseMoney(a.omzet));

  return ok(
    {
      top_selling: byOmzet.slice(0, limit),
      least_selling: [...byOmzet].reverse().slice(0, limit),
      ...meta(period.from, period.to),
    },
    'Peringkat produk'
  );
}

function outletComparison(context: MockContext): MockEnvelope {
  requireRole('OWNER');
  const period = requirePeriod(context.query);

  // Merchant-wide by design — a comparison has no outlet filter.
  const rows = getDb().transactions.filter((row) => withinRange(row.created_at, context.query));

  const items = getDb().outlets.map((outlet) => {
    const own = rows.filter((row) => row.outlet_id === outlet.id);
    return {
      outlet_id: outlet.id,
      outlet_name: outlet.name,
      omzet: toWireMoney(own.reduce((sum, row) => sum + parseMoney(row.total), 0)),
      transaction_count: own.length,
    };
  });

  return ok({ items, ...meta(period.from, period.to) }, 'Perbandingan outlet');
}

function lowStockReport(context: MockContext): MockEnvelope {
  requireRole('OWNER', 'ADMIN');

  const rows = getDb()
    .inventory.filter((row) => {
      if (context.query.outlet_id && row.outlet_id !== context.query.outlet_id) return false;
      return isLowStock(row);
    })
    .map((row) => ({
      product_id: row.product_id,
      name: findProduct(row.product_id)?.name ?? '',
      outlet_id: row.outlet_id,
      outlet_name: findOutlet(row.outlet_id)?.name ?? '',
      quantity: row.quantity,
      base_low_stock_threshold: findProduct(row.product_id)?.low_stock_threshold ?? 0,
      low_stock_threshold_override: row.low_stock_threshold_override,
      effective_low_stock_threshold: effectiveThreshold(row),
    }));

  return ok({ items: rows, ...meta() }, 'Stok menipis');
}

/* -------------------------------------------------------------------------- */
/* Insight (§7)                                                                */
/* -------------------------------------------------------------------------- */

function getInsights(): MockEnvelope {
  requireRole('OWNER');

  const state = getDb();
  // §7.2: a merchant that has never triggered an analysis gets 404, which the
  // screen renders as an empty state rather than a failure.
  if (!state.analysisJob) throw new MockHttpError(404, 'Data tidak ditemukan');

  return ok(
    { analysis_job: state.analysisJob, insights: state.insights },
    'Insight terbaru per tipe'
  );
}

function triggerInsights(): MockEnvelope {
  requireRole('OWNER');

  const state = getDb();
  const today = NOW.slice(0, 10);

  // §7.1 rule 2: one analysis per merchant per local day. A second trigger the
  // same day returns the existing job with 200 rather than starting another.
  if (state.analysisJob?.analysis_date === today) {
    return ok(
      { job_id: state.analysisJob.id, status: state.analysisJob.status },
      'Analisis sudah dijadwalkan hari ini'
    );
  }

  state.analysisJob = {
    id: nextId('job'),
    status: 'PENDING',
    analysis_date: today,
    updated_at: NOW,
  };

  return ok(
    { job_id: state.analysisJob.id, status: state.analysisJob.status },
    'Analisis insight dijadwalkan',
    202
  );
}

/* -------------------------------------------------------------------------- */
/* Platform (§8)                                                               */
/* -------------------------------------------------------------------------- */

function health(): MockEnvelope {
  const pending = getDb().analysisJob?.status === 'PENDING' ? 1 : 0;
  return ok(
    { status: 'ok', database: 'ok', worker_backlog: { ai_job_pending: pending } },
    'Sistem sehat'
  );
}

/* -------------------------------------------------------------------------- */
/* Routing                                                                     */
/* -------------------------------------------------------------------------- */

type Route = {
  method: HttpMethod;
  template: string;
  handle: (context: MockContext) => MockEnvelope;
};

/**
 * Order matters: the literal paths under `/transactions` and `/products` have
 * to be tried before the parameterised ones, or `/transactions/search` would
 * be read as a transaction whose id is "search".
 */
const ROUTES: Route[] = [
  { method: 'POST', template: '/auth/register', handle: register },
  { method: 'POST', template: '/auth/login', handle: login },

  { method: 'POST', template: '/staff', handle: createStaff },
  { method: 'GET', template: '/staff', handle: listStaff },
  { method: 'PATCH', template: '/staff/:userId', handle: updateStaff },

  { method: 'GET', template: '/merchant', handle: getMerchant },
  { method: 'PATCH', template: '/merchant', handle: updateMerchant },

  { method: 'POST', template: '/outlets', handle: createOutlet },
  { method: 'GET', template: '/outlets', handle: listOutlets },
  { method: 'PATCH', template: '/outlets/:id', handle: updateOutlet },

  { method: 'POST', template: '/categories', handle: createCategory },
  { method: 'GET', template: '/categories', handle: listCategories },
  { method: 'PATCH', template: '/categories/:id', handle: updateCategory },

  { method: 'GET', template: '/products/catalog', handle: listCatalog },
  { method: 'POST', template: '/products', handle: createProduct },
  { method: 'GET', template: '/products', handle: listProducts },
  { method: 'PATCH', template: '/products/:id', handle: updateProduct },
  {
    method: 'PUT',
    template: '/products/:productId/outlet-prices/:outletId',
    handle: putOutletPrice,
  },
  {
    method: 'DELETE',
    template: '/products/:productId/outlet-prices/:outletId',
    handle: deleteOutletPrice,
  },

  { method: 'POST', template: '/inventory/adjustments', handle: adjustStock },
  { method: 'GET', template: '/inventory/movements', handle: listMovements },
  { method: 'GET', template: '/inventory', handle: listInventory },
  {
    method: 'PUT',
    template: '/inventory/:productId/outlets/:outletId/low-stock-threshold',
    handle: putThreshold,
  },
  {
    method: 'DELETE',
    template: '/inventory/:productId/outlets/:outletId/low-stock-threshold',
    handle: deleteThreshold,
  },

  { method: 'POST', template: '/checkout', handle: checkout },
  { method: 'GET', template: '/transactions/status', handle: checkoutStatus },
  { method: 'GET', template: '/transactions/search', handle: searchTransactions },
  { method: 'GET', template: '/transactions', handle: listTransactions },
  { method: 'GET', template: '/transactions/:id', handle: getTransaction },
  { method: 'GET', template: '/receipts/:transactionId', handle: getReceipt },

  { method: 'GET', template: '/dashboard/summary', handle: dashboardSummary },
  { method: 'GET', template: '/dashboard/operations', handle: dashboardOperations },
  { method: 'GET', template: '/dashboard/sales-trend', handle: salesTrend },
  { method: 'GET', template: '/dashboard/aov-trend', handle: aovTrend },
  { method: 'GET', template: '/dashboard/time-pattern', handle: timePattern },
  { method: 'GET', template: '/dashboard/top-products', handle: topProducts },
  { method: 'GET', template: '/dashboard/outlet-comparison', handle: outletComparison },
  { method: 'GET', template: '/dashboard/low-stock', handle: lowStockReport },

  { method: 'GET', template: '/insights', handle: getInsights },
  { method: 'POST', template: '/insights/trigger', handle: triggerInsights },

  { method: 'GET', template: '/health', handle: health },
];

function matchTemplate(template: string, path: string): Record<string, string> | null {
  const templateParts = template.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  if (templateParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};

  for (const [index, part] of templateParts.entries()) {
    const actual = pathParts[index] ?? '';
    if (part.startsWith(':')) {
      params[part.slice(1)] = decodeURIComponent(actual);
      continue;
    }
    if (part !== actual) return null;
  }

  return params;
}

export function dispatch(
  method: HttpMethod,
  path: string,
  query: Record<string, string>,
  body: Record<string, unknown>
): MockEnvelope {
  for (const route of ROUTES) {
    if (route.method !== method) continue;
    const params = matchTemplate(route.template, path);
    if (!params) continue;

    return route.handle({ path, params, query, body });
  }

  throw new MockHttpError(404, `No mock handler for ${method} ${path}`);
}
