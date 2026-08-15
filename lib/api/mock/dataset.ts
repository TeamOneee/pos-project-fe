/**
 * The IndoMart Retail sample dataset.
 *
 * Everything here is in **wire shape**: snake_case keys, money as decimal
 * strings. That is deliberate — the mock returns the same payloads the backend
 * would, so mock mode exercises the real zod schemas and the real money
 * parsing rather than short-circuiting them.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PROVENANCE — read before changing a number.
 *
 * The design brief (`docs/frontend-design-brief.md` §6) that pins these figures
 * down is not in the repo. The shape below comes from two sources:
 *
 *   • Entity counts — 3 outlets, 5 users, 8 categories, 12 products — as
 *     specified for §6.
 *   • Every name, SKU, price, stock level and dashboard figure that appears in
 *     `docs/api-contract.md`, reproduced exactly: Outlet A - Mall Central,
 *     Outlet B - City Plaza, Coca Cola 1.5L / CC-1500 @ 15000 with 5 units at
 *     Outlet A, Mineral Water 600ml / MW-600 out of stock at Outlet B,
 *     Premium Coffee Beans / PCB-001 with 50 units and 5 sold, revenue
 *     15.750.000, 1250 transactions, AOV 12.600, growth 12,5% / 8,3%.
 *
 * The remainder — the third outlet, two cashiers, five categories, nine
 * products and their stock levels — is filled in consistently with those
 * anchors. Reconcile against §6 when the brief lands; every figure lives in
 * this one file so that is a single edit.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const NOW = '2026-08-13T14:30:00.000Z';
const CREATED = '2026-08-01T09:00:00.000Z';

const stamps = { created_at: CREATED, updated_at: NOW };

/* -------------------------------------------------------------------------- */
/* Merchant, outlets, users                                                    */
/* -------------------------------------------------------------------------- */

export const MERCHANT = {
  merchant_id: 'mrc_indomart',
  name: 'IndoMart Retail',
  /** Stock at or below this is "low" everywhere in the app. */
  low_stock_threshold: 10,
  ...stamps,
};

export const OUTLETS = [
  {
    outlet_id: 'otl_a',
    merchant_id: MERCHANT.merchant_id,
    name: 'Outlet A - Mall Central',
    address: 'Jl. Sudirman No. 123, Jakarta',
    status: 'ACTIVE' as const,
    ...stamps,
  },
  {
    outlet_id: 'otl_b',
    merchant_id: MERCHANT.merchant_id,
    name: 'Outlet B - City Plaza',
    address: 'Jl. Gatot Subroto No. 45, Jakarta',
    status: 'ACTIVE' as const,
    ...stamps,
  },
  {
    outlet_id: 'otl_c',
    merchant_id: MERCHANT.merchant_id,
    name: 'Outlet C - Grand Square',
    address: 'Jl. Ahmad Yani No. 88, Bandung',
    status: 'ACTIVE' as const,
    ...stamps,
  },
];

export const USERS = [
  {
    user_id: 'usr_owner',
    merchant_id: MERCHANT.merchant_id,
    outlet_id: null,
    name: 'John Doe',
    email: 'owner@indomart.com',
    role: 'OWNER' as const,
    status: 'ACTIVE' as const,
    ...stamps,
  },
  {
    user_id: 'usr_admin',
    merchant_id: MERCHANT.merchant_id,
    outlet_id: null,
    name: 'Ani Wijaya',
    email: 'ani@example.com',
    role: 'ADMIN' as const,
    status: 'ACTIVE' as const,
    ...stamps,
  },
  {
    user_id: 'usr_cashier_a',
    merchant_id: MERCHANT.merchant_id,
    outlet_id: 'otl_a',
    name: 'Budi Santoso',
    email: 'budi@example.com',
    role: 'CASHIER' as const,
    status: 'ACTIVE' as const,
    ...stamps,
  },
  {
    user_id: 'usr_cashier_b',
    merchant_id: MERCHANT.merchant_id,
    outlet_id: 'otl_b',
    name: 'Siti Rahayu',
    email: 'siti@example.com',
    role: 'CASHIER' as const,
    status: 'ACTIVE' as const,
    ...stamps,
  },
  {
    user_id: 'usr_cashier_c',
    merchant_id: MERCHANT.merchant_id,
    outlet_id: 'otl_c',
    name: 'Dewi Lestari',
    email: 'dewi@example.com',
    role: 'CASHIER' as const,
    status: 'ACTIVE' as const,
    ...stamps,
  },
];

/** Sign-in credentials for the seeded accounts. Anything else answers 401. */
export const PASSWORDS: Record<string, string> = {
  'owner@indomart.com': 'SecurePassword123!',
  'ani@example.com': 'password123',
  'budi@example.com': 'password123',
  'siti@example.com': 'password123',
  'dewi@example.com': 'password123',
};

/* -------------------------------------------------------------------------- */
/* Catalog                                                                     */
/* -------------------------------------------------------------------------- */

export const CATEGORIES = [
  { category_id: 'cat_beverages', name: 'Beverages' },
  { category_id: 'cat_snacks', name: 'Snacks' },
  { category_id: 'cat_coffee', name: 'Coffee' },
  { category_id: 'cat_dairy', name: 'Dairy' },
  { category_id: 'cat_instant', name: 'Instant Food' },
  { category_id: 'cat_personal', name: 'Personal Care' },
  { category_id: 'cat_household', name: 'Household' },
  { category_id: 'cat_frozen', name: 'Frozen Food' },
].map((category) => ({
  ...category,
  merchant_id: MERCHANT.merchant_id,
  // Category.status is a known backend gap; the mock serves it.
  status: 'ACTIVE' as const,
  ...stamps,
}));

type ProductSeed = {
  product_id: string;
  category_id: string;
  name: string;
  sku: string;
  price: string;
  status?: 'ACTIVE' | 'INACTIVE';
};

const PRODUCT_SEEDS: ProductSeed[] = [
  { product_id: 'prd_cc1500', category_id: 'cat_beverages', name: 'Coca Cola 1.5L', sku: 'CC-1500', price: '15000.00' },
  { product_id: 'prd_sp1500', category_id: 'cat_beverages', name: 'Sprite 1.5L', sku: 'SP-1500', price: '15000.00' },
  { product_id: 'prd_mw600', category_id: 'cat_beverages', name: 'Mineral Water 600ml', sku: 'MW-600', price: '4000.00' },
  { product_id: 'prd_pcb001', category_id: 'cat_coffee', name: 'Premium Coffee Beans', sku: 'PCB-001', price: '35000.00' },
  { product_id: 'prd_ics010', category_id: 'cat_coffee', name: 'Instant Coffee Sachet', sku: 'ICS-010', price: '2500.00' },
  { product_id: 'prd_pc068', category_id: 'cat_snacks', name: 'Potato Chips 68g', sku: 'PC-068', price: '12000.00' },
  { product_id: 'prd_cw120', category_id: 'cat_snacks', name: 'Chocolate Wafer 120g', sku: 'CW-120', price: '9500.00' },
  { product_id: 'prd_um1000', category_id: 'cat_dairy', name: 'UHT Milk 1L', sku: 'UM-1000', price: '18500.00' },
  { product_id: 'prd_inc001', category_id: 'cat_instant', name: 'Instant Noodles Chicken', sku: 'INC-001', price: '3500.00' },
  { product_id: 'prd_bs250', category_id: 'cat_personal', name: 'Bath Soap 250ml', sku: 'BS-250', price: '22000.00' },
  // Discontinued line: gives the catalog screens a genuine INACTIVE row.
  { product_id: 'prd_ds800', category_id: 'cat_household', name: 'Dish Soap 800ml', sku: 'DS-800', price: '16500.00', status: 'INACTIVE' },
  { product_id: 'prd_fn500', category_id: 'cat_frozen', name: 'Frozen Nugget 500g', sku: 'FN-500', price: '42000.00' },
];

export const PRODUCTS = PRODUCT_SEEDS.map((seed) => ({
  product_id: seed.product_id,
  merchant_id: MERCHANT.merchant_id,
  category_id: seed.category_id,
  name: seed.name,
  // Product.sku is a known backend gap; the mock serves it.
  sku: seed.sku,
  price: seed.price,
  status: seed.status ?? ('ACTIVE' as const),
  ...stamps,
}));

/* -------------------------------------------------------------------------- */
/* Inventory                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Stock per product, in outlet order [A, B, C]. Tuned so the alert screens have
 * real data to show against a threshold of 10:
 *
 *   • 8 low-stock rows  (1..10 units)
 *   • 3 out-of-stock rows (0 units)
 *
 * Two of them are fixed by the contract's own examples: Coca Cola has 5 at
 * Outlet A, Mineral Water is out at Outlet B.
 */
const STOCK: Record<string, [number, number, number]> = {
  prd_cc1500: [5, 42, 30], //   A low
  prd_sp1500: [28, 9, 24], //   B low
  prd_mw600: [60, 0, 45], //    B out
  prd_pcb001: [50, 12, 8], //   C low — 50 at A matches the underperformer example
  prd_ics010: [120, 95, 0], //  C out
  prd_pc068: [34, 7, 18], //    B low
  prd_cw120: [22, 26, 6], //    C low
  prd_um1000: [15, 3, 20], //   B low
  prd_inc001: [200, 150, 175],
  prd_bs250: [0, 21, 4], //     A out, C low
  // Discontinued, so its empty shelf at Outlet A raises no alert — stock
  // warnings are for products still being sold.
  prd_ds800: [0, 14, 11],
  prd_fn500: [9, 25, 16], //    A low
};

export const INVENTORY = PRODUCTS.flatMap((product) =>
  OUTLETS.map((outlet, index) => ({
    inventory_id: `inv_${outlet.outlet_id}_${product.product_id}`,
    outlet_id: outlet.outlet_id,
    product_id: product.product_id,
    quantity: STOCK[product.product_id]?.[index] ?? 0,
    updated_at: NOW,
  }))
);

/* -------------------------------------------------------------------------- */
/* Transactions                                                                */
/* -------------------------------------------------------------------------- */

type TransactionSeed = {
  transaction_id: string;
  transaction_number: string;
  outlet_id: string;
  user_id: string;
  created_at: string;
  status?: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  payment_method: 'CASH' | 'QRIS' | 'DEBIT' | 'TRANSFER';
  /** [product_id, quantity]; totals are computed from the catalog price. */
  lines: [string, number][];
};

/**
 * Ten seeded sales. Totals are derived from the catalog rather than written
 * out, so a price edit can never leave a transaction inconsistent.
 *
 * The first two reproduce the contract's own examples exactly: TRX-…-001
 * totals 150.000 and TRX-…-002 totals 45.000.
 */
export const TRANSACTION_SEEDS: TransactionSeed[] = [
  {
    transaction_id: 'trx_001',
    transaction_number: 'TRX-20260813-001',
    outlet_id: 'otl_a',
    user_id: 'usr_cashier_a',
    created_at: '2026-08-13T14:30:00.000Z',
    payment_method: 'CASH',
    lines: [['prd_fn500', 3], ['prd_pc068', 2]], // 126.000 + 24.000 = 150.000
  },
  {
    transaction_id: 'trx_002',
    transaction_number: 'TRX-20260813-002',
    outlet_id: 'otl_a',
    user_id: 'usr_cashier_a',
    created_at: '2026-08-13T14:35:00.000Z',
    payment_method: 'QRIS',
    lines: [['prd_cc1500', 2], ['prd_sp1500', 1]], // 30.000 + 15.000 = 45.000
  },
  {
    transaction_id: 'trx_003',
    transaction_number: 'TRX-20260813-003',
    outlet_id: 'otl_b',
    user_id: 'usr_cashier_b',
    created_at: '2026-08-13T11:12:00.000Z',
    payment_method: 'CASH',
    lines: [['prd_inc001', 10], ['prd_mw600', 5]],
  },
  {
    transaction_id: 'trx_004',
    transaction_number: 'TRX-20260813-004',
    outlet_id: 'otl_b',
    user_id: 'usr_cashier_b',
    created_at: '2026-08-13T12:48:00.000Z',
    payment_method: 'DEBIT',
    lines: [['prd_um1000', 2], ['prd_cw120', 3]],
  },
  {
    transaction_id: 'trx_005',
    transaction_number: 'TRX-20260813-005',
    outlet_id: 'otl_c',
    user_id: 'usr_cashier_c',
    created_at: '2026-08-13T13:05:00.000Z',
    payment_method: 'QRIS',
    lines: [['prd_pcb001', 1], ['prd_ics010', 4]],
  },
  {
    transaction_id: 'trx_006',
    transaction_number: 'TRX-20260812-011',
    outlet_id: 'otl_a',
    user_id: 'usr_cashier_a',
    created_at: '2026-08-12T19:22:00.000Z',
    payment_method: 'CASH',
    lines: [['prd_bs250', 2]],
  },
  {
    transaction_id: 'trx_007',
    transaction_number: 'TRX-20260812-012',
    outlet_id: 'otl_c',
    user_id: 'usr_cashier_c',
    created_at: '2026-08-12T20:01:00.000Z',
    payment_method: 'TRANSFER',
    lines: [['prd_cc1500', 6], ['prd_mw600', 10]],
  },
  {
    transaction_id: 'trx_008',
    transaction_number: 'TRX-20260812-013',
    outlet_id: 'otl_b',
    user_id: 'usr_cashier_b',
    created_at: '2026-08-12T12:30:00.000Z',
    payment_method: 'CASH',
    lines: [['prd_pc068', 5], ['prd_cw120', 2]],
  },
  {
    // A pending sale, so the status badge has something other than COMPLETED.
    transaction_id: 'trx_009',
    transaction_number: 'TRX-20260811-021',
    outlet_id: 'otl_a',
    user_id: 'usr_cashier_a',
    created_at: '2026-08-11T09:15:00.000Z',
    status: 'PENDING',
    payment_method: 'TRANSFER',
    lines: [['prd_inc001', 20]],
  },
  {
    transaction_id: 'trx_010',
    transaction_number: 'TRX-20260811-022',
    outlet_id: 'otl_c',
    user_id: 'usr_cashier_c',
    created_at: '2026-08-11T17:40:00.000Z',
    payment_method: 'QRIS',
    lines: [['prd_fn500', 1], ['prd_um1000', 1]],
  },
];

/* -------------------------------------------------------------------------- */
/* Owner dashboard figures                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Headline figures, straight from the contract's §4.10 example. Entity counts
 * are computed from the dataset instead, so the dashboard can never disagree
 * with the outlet, user, product and category screens.
 */
export const DASHBOARD_FIGURES = {
  totalRevenue: '15750000.00',
  totalTransactions: 1250,
  averageOrderValue: '12600.00',
  totalProductsSold: 3420,
  revenueGrowth: 12.5,
  transactionsGrowth: 8.3,
};

/** Seven days that sum to exactly 15.750.000 — the contract's own series. */
export const SALES_TREND = {
  labels: [
    '2026-08-01',
    '2026-08-02',
    '2026-08-03',
    '2026-08-04',
    '2026-08-05',
    '2026-08-06',
    '2026-08-07',
  ],
  revenue: [
    '2100000.00',
    '1800000.00',
    '2250000.00',
    '1950000.00',
    '2400000.00',
    '2700000.00',
    '2550000.00',
  ],
  transactions: [180, 150, 190, 165, 210, 230, 220],
  highest: '2700000.00',
  lowest: '1800000.00',
  average: '2250000.00',
};

/**
 * Per-outlet split. Revenue sums to 15.750.000 and transactions to 1250, and
 * every AOV divides exactly — money must never carry a fraction of a rupiah.
 */
export const OUTLET_PERFORMANCE = [
  {
    outlet_id: 'otl_a',
    outlet_name: 'Outlet A - Mall Central',
    total_revenue: '7250000.00',
    total_transactions: 580,
    average_order_value: '12500.00',
    total_products_sold: 1520,
    contribution_percentage: 46.03,
    revenue_growth: 15.2,
  },
  {
    outlet_id: 'otl_b',
    outlet_name: 'Outlet B - City Plaza',
    total_revenue: '5040000.00',
    total_transactions: 420,
    average_order_value: '12000.00',
    total_products_sold: 1100,
    contribution_percentage: 32.0,
    revenue_growth: 9.4,
  },
  {
    outlet_id: 'otl_c',
    outlet_name: 'Outlet C - Grand Square',
    total_revenue: '3460000.00',
    total_transactions: 250,
    average_order_value: '13840.00',
    total_products_sold: 800,
    contribution_percentage: 21.97,
    revenue_growth: -2.8,
  },
];

/** Quantity times catalog price, so every revenue figure here is consistent. */
export const TOP_BY_REVENUE = [
  { product_id: 'prd_cc1500', total_quantity_sold: 450, total_revenue: '6750000.00' },
  { product_id: 'prd_fn500', total_quantity_sold: 95, total_revenue: '3990000.00' },
  { product_id: 'prd_bs250', total_quantity_sold: 120, total_revenue: '2640000.00' },
  { product_id: 'prd_pc068', total_quantity_sold: 210, total_revenue: '2520000.00' },
  { product_id: 'prd_um1000', total_quantity_sold: 130, total_revenue: '2405000.00' },
];

export const TOP_BY_QUANTITY = [
  { product_id: 'prd_inc001', total_quantity_sold: 620, total_revenue: '2170000.00' },
  { product_id: 'prd_ics010', total_quantity_sold: 540, total_revenue: '1350000.00' },
  { product_id: 'prd_cc1500', total_quantity_sold: 450, total_revenue: '6750000.00' },
  { product_id: 'prd_mw600', total_quantity_sold: 380, total_revenue: '1520000.00' },
  { product_id: 'prd_pc068', total_quantity_sold: 210, total_revenue: '2520000.00' },
];

/** Premium Coffee Beans reproduces the contract's underperformer exactly. */
export const UNDERPERFORMERS = [
  {
    product_id: 'prd_pcb001',
    total_quantity_sold: 5,
    total_revenue: '175000.00',
    stock_level: 50,
    days_without_sale: 14,
    recommendation: 'PROMOTION' as const,
  },
  {
    product_id: 'prd_ds800',
    total_quantity_sold: 8,
    total_revenue: '132000.00',
    stock_level: 25,
    days_without_sale: 21,
    recommendation: 'DISCONTINUE' as const,
  },
  {
    product_id: 'prd_cw120',
    total_quantity_sold: 18,
    total_revenue: '171000.00',
    stock_level: 54,
    days_without_sale: 6,
    recommendation: 'BUNDLE' as const,
  },
];

export const TIME_PATTERN = {
  hourly_distribution: [
    { hour: 8, revenue: '150000.00', transaction_count: 12 },
    { hour: 9, revenue: '250000.00', transaction_count: 20 },
    { hour: 10, revenue: '180000.00', transaction_count: 15 },
    { hour: 11, revenue: '320000.00', transaction_count: 26 },
    { hour: 12, revenue: '450000.00', transaction_count: 35 },
    { hour: 13, revenue: '430000.00', transaction_count: 33 },
    { hour: 14, revenue: '280000.00', transaction_count: 22 },
    { hour: 15, revenue: '260000.00', transaction_count: 21 },
    { hour: 16, revenue: '300000.00', transaction_count: 24 },
    { hour: 17, revenue: '350000.00', transaction_count: 28 },
    { hour: 18, revenue: '410000.00', transaction_count: 32 },
    { hour: 19, revenue: '500000.00', transaction_count: 38 },
    { hour: 20, revenue: '480000.00', transaction_count: 37 },
    { hour: 21, revenue: '220000.00', transaction_count: 18 },
  ],
  peak_hours: [12, 13, 19, 20],
  busiest_day: 'Saturday',
  quietest_day: 'Monday',
  insights: [
    'Penjualan tertinggi terjadi pada pukul 12.00-13.00 dan 19.00-20.00',
    'Sabtu mencatat volume transaksi tertinggi',
  ],
};

export const AOV_TREND = {
  labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
  values: ['11200.00', '11800.00', '12500.00', '12600.00'],
  current: '12600.00',
  previous: '11800.00',
  growth: 6.78,
  transactionCounts: [280, 310, 330, 330],
};

export const PERIOD_COMPARISON = {
  current: {
    start_date: '2026-08-01',
    end_date: '2026-08-11',
    total_revenue: '15750000.00',
    total_transactions: 1250,
  },
  previous: {
    start_date: '2026-07-21',
    end_date: '2026-07-31',
    total_revenue: '14000000.00',
    total_transactions: 1150,
  },
  changes: { revenue_percentage: 12.5, transactions_percentage: 8.7, aov_percentage: 6.78 },
};

export const AI_INSIGHT = {
  insight_id: 'ins_001',
  merchant_id: MERCHANT.merchant_id,
  title: 'Stok Menipis: Coca Cola 1.5L',
  content:
    'Stok Coca Cola 1.5L di Outlet A - Mall Central diperkirakan habis dalam 2 hari berdasarkan kecepatan penjualan saat ini. Pertimbangkan menambah 50 unit.',
  type: 'STOCK_WARNING' as const,
  status: 'READY' as const,
  created_at: '2026-08-13T08:00:00.000Z',
  updated_at: '2026-08-13T08:00:00.000Z',
};

export const LAST_AI_ANALYSIS = '2026-08-12T08:00:00.000Z';
