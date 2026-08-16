/**
 * The IndoMart Retail sample dataset.
 *
 * Everything here is in **wire shape**: snake_case keys, money as decimal
 * strings. That is deliberate — the mock returns the same payloads the backend
 * would, so mock mode exercises the real zod schemas and the real money
 * parsing rather than short-circuiting them.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SOURCE: `docs/design-brief.md` §6, "use these exact values so screens agree
 * with each other". Names, emails, SKUs, prices, stock at Outlet A, dashboard
 * figures, outlet performance, peak hours, the sample carts and the AI insight
 * are reproduced verbatim.
 *
 * Three things §6 leaves open or contradicts, resolved once, here:
 *
 *   • Stock at outlets B and C is unspecified — only Outlet A is given. The
 *     figures below are chosen to yield 8 low-stock and 3 out-of-stock rows,
 *     and Coca Cola at Outlet C is 45 because the AI insight text says so.
 *   • §6 puts Air Mineral out of stock at Outlet A; `api-contract.md` §4.10
 *     shows it out at Outlet B. The brief wins for sample data.
 *   • §6 lists five users but its dashboard reads `karyawan 12`, and lists
 *     twelve products but reads `produk 156`. Both literals are served as
 *     written — see DASHBOARD_FIGURES.
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
    address: 'Jl. Thamrin No. 8, Jakarta',
    status: 'ACTIVE' as const,
    ...stamps,
  },
];

/**
 * Five users, per §6. Outlet A has two cashiers and Outlet C has none — that
 * is what the brief specifies, so the transaction seeds cover A and B only.
 */
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
    name: 'Sari Dewi',
    email: 'sari@indomart.com',
    role: 'ADMIN' as const,
    status: 'ACTIVE' as const,
    ...stamps,
  },
  {
    user_id: 'usr_budi',
    merchant_id: MERCHANT.merchant_id,
    outlet_id: 'otl_a',
    name: 'Budi Santoso',
    email: 'budi@indomart.com',
    role: 'CASHIER' as const,
    status: 'ACTIVE' as const,
    ...stamps,
  },
  {
    user_id: 'usr_ani',
    merchant_id: MERCHANT.merchant_id,
    outlet_id: 'otl_a',
    name: 'Ani Wijaya',
    email: 'ani@indomart.com',
    role: 'CASHIER' as const,
    status: 'ACTIVE' as const,
    ...stamps,
  },
  {
    user_id: 'usr_rudi',
    merchant_id: MERCHANT.merchant_id,
    outlet_id: 'otl_b',
    name: 'Rudi Hartono',
    email: 'rudi@indomart.com',
    role: 'CASHIER' as const,
    status: 'ACTIVE' as const,
    ...stamps,
  },
];

/** Sign-in credentials for the seeded accounts. Anything else answers 401. */
export const PASSWORDS: Record<string, string> = {
  'owner@indomart.com': 'password123',
  'sari@indomart.com': 'password123',
  'budi@indomart.com': 'password123',
  'ani@indomart.com': 'password123',
  'rudi@indomart.com': 'password123',
};

/* -------------------------------------------------------------------------- */
/* Catalog                                                                     */
/* -------------------------------------------------------------------------- */

/** Kebutuhan Harian, Rokok and Beku carry no products — real empty states. */
export const CATEGORIES = [
  { category_id: 'cat_minuman', name: 'Minuman' },
  { category_id: 'cat_makanan_ringan', name: 'Makanan Ringan' },
  { category_id: 'cat_kopi', name: 'Kopi' },
  { category_id: 'cat_kebutuhan', name: 'Kebutuhan Harian' },
  { category_id: 'cat_perawatan', name: 'Perawatan Diri' },
  { category_id: 'cat_rokok', name: 'Rokok' },
  { category_id: 'cat_beku', name: 'Beku' },
  { category_id: 'cat_roti', name: 'Roti' },
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
};

const PRODUCT_SEEDS: ProductSeed[] = [
  {
    product_id: 'prd_cc1500',
    category_id: 'cat_minuman',
    name: 'Coca Cola 1.5L',
    sku: 'CC-1500',
    price: '15000.00',
  },
  {
    product_id: 'prd_sp1500',
    category_id: 'cat_minuman',
    name: 'Sprite 1.5L',
    sku: 'SP-1500',
    price: '15000.00',
  },
  {
    product_id: 'prd_mw600',
    category_id: 'cat_minuman',
    name: 'Air Mineral 600ml',
    sku: 'MW-600',
    price: '4000.00',
  },
  {
    product_id: 'prd_tb450',
    category_id: 'cat_minuman',
    name: 'Teh Botol 450ml',
    sku: 'TB-450',
    price: '5000.00',
  },
  {
    product_id: 'prd_ch068',
    category_id: 'cat_makanan_ringan',
    name: 'Chitato Sapi Panggang',
    sku: 'CH-068',
    price: '12500.00',
  },
  {
    product_id: 'prd_or133',
    category_id: 'cat_makanan_ringan',
    name: 'Oreo Original 133g',
    sku: 'OR-133',
    price: '10000.00',
  },
  {
    product_id: 'prd_ks250',
    category_id: 'cat_kopi',
    name: 'Kopi Susu Botol 250ml',
    sku: 'KS-250',
    price: '18000.00',
  },
  {
    product_id: 'prd_pcb001',
    category_id: 'cat_kopi',
    name: 'Premium Coffee Beans',
    sku: 'PCB-001',
    price: '35000.00',
  },
  {
    product_id: 'prd_im001',
    category_id: 'cat_makanan_ringan',
    name: 'Indomie Goreng',
    sku: 'IM-001',
    price: '3500.00',
  },
  {
    product_id: 'prd_sb100',
    category_id: 'cat_perawatan',
    name: 'Sabun Mandi Lifebuoy',
    sku: 'SB-100',
    price: '8500.00',
  },
  {
    product_id: 'prd_rt400',
    category_id: 'cat_roti',
    name: 'Roti Tawar Sari Roti',
    sku: 'RT-400',
    price: '17000.00',
  },
  {
    product_id: 'prd_su250',
    category_id: 'cat_minuman',
    name: 'Susu UHT Coklat 250ml',
    sku: 'SU-250',
    price: '6500.00',
  },
];

export const PRODUCTS = PRODUCT_SEEDS.map((seed) => ({
  product_id: seed.product_id,
  merchant_id: MERCHANT.merchant_id,
  category_id: seed.category_id,
  name: seed.name,
  // Product.sku is a known backend gap; the mock serves it.
  sku: seed.sku,
  price: seed.price,
  status: 'ACTIVE' as const,
  ...stamps,
}));

/* -------------------------------------------------------------------------- */
/* Inventory                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Stock per product, in outlet order [A, B, C].
 *
 * Outlet A is fixed by §6, including the two it flags: Coca Cola at 5
 * (menipis) and Air Mineral at 0 (habis). Outlets B and C are chosen to give
 * the alert screens real data against a threshold of 10 — 8 low-stock rows and
 * 3 out-of-stock rows in total.
 */
const STOCK: Record<string, [number, number, number]> = {
  //                    A    B    C
  prd_cc1500: /*  */ [5, 42, 45], // A low (§6) · C 45 per the AI insight text
  prd_sp1500: /*  */ [24, 9, 26], // B low
  prd_mw600: /*   */ [0, 55, 45], // A out (§6)
  prd_tb450: /*   */ [48, 60, 7], // C low
  prd_ch068: /*   */ [30, 8, 20], // B low
  prd_or133: /*   */ [18, 25, 6], // C low
  prd_ks250: /*   */ [12, 4, 15], // B low
  prd_pcb001: /*  */ [50, 12, 30], // 50 at A (§6), the underperformer
  prd_im001: /*   */ [120, 150, 95],
  prd_sb100: /*   */ [22, 0, 19], // B out
  prd_rt400: /*   */ [9, 14, 0], // A low (§6) · C out
  prd_su250: /*   */ [40, 21, 10], // C low
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
 * Ten seeded sales across Outlet A and Outlet B. Outlet C has no cashier in
 * §6, so it has no transactions here — its revenue lives in the static outlet
 * performance figures below.
 *
 * Totals are derived from the catalog rather than written out, so a price edit
 * can never leave a transaction inconsistent. The first three reproduce the
 * amounts §6 and the contract quote: 150.000, the 45.000 two-item cart, and
 * the 52.500 sample cart.
 */
export const TRANSACTION_SEEDS: TransactionSeed[] = [
  {
    transaction_id: 'trx_001',
    transaction_number: 'TRX-20260813-001',
    outlet_id: 'otl_a',
    user_id: 'usr_budi',
    created_at: '2026-08-13T14:30:00.000Z',
    payment_method: 'CASH',
    // 60.000 + 50.000 + 40.000 = 150.000
    lines: [
      ['prd_cc1500', 4],
      ['prd_ch068', 4],
      ['prd_or133', 4],
    ],
  },
  {
    transaction_id: 'trx_002',
    transaction_number: 'TRX-20260813-002',
    outlet_id: 'otl_a',
    user_id: 'usr_budi',
    created_at: '2026-08-13T14:35:00.000Z',
    payment_method: 'QRIS',
    // §6's two-item cart: 30.000 + 15.000 = 45.000
    lines: [
      ['prd_cc1500', 2],
      ['prd_sp1500', 1],
    ],
  },
  {
    transaction_id: 'trx_003',
    transaction_number: 'TRX-20260813-003',
    outlet_id: 'otl_a',
    user_id: 'usr_ani',
    created_at: '2026-08-13T13:05:00.000Z',
    payment_method: 'CASH',
    // §6's sample cart: 30.000 + 12.500 + 10.000 = 52.500
    lines: [
      ['prd_cc1500', 2],
      ['prd_ch068', 1],
      ['prd_or133', 1],
    ],
  },
  {
    transaction_id: 'trx_004',
    transaction_number: 'TRX-20260813-004',
    outlet_id: 'otl_b',
    user_id: 'usr_rudi',
    created_at: '2026-08-13T11:12:00.000Z',
    payment_method: 'CASH',
    lines: [
      ['prd_im001', 10],
      ['prd_mw600', 5],
    ],
  },
  {
    transaction_id: 'trx_005',
    transaction_number: 'TRX-20260813-005',
    outlet_id: 'otl_b',
    user_id: 'usr_rudi',
    created_at: '2026-08-13T12:48:00.000Z',
    payment_method: 'DEBIT',
    lines: [
      ['prd_ks250', 2],
      ['prd_su250', 3],
    ],
  },
  {
    transaction_id: 'trx_006',
    transaction_number: 'TRX-20260812-011',
    outlet_id: 'otl_a',
    user_id: 'usr_ani',
    created_at: '2026-08-12T19:22:00.000Z',
    payment_method: 'CASH',
    lines: [
      ['prd_sb100', 2],
      ['prd_rt400', 1],
    ],
  },
  {
    transaction_id: 'trx_007',
    transaction_number: 'TRX-20260812-012',
    outlet_id: 'otl_a',
    user_id: 'usr_budi',
    created_at: '2026-08-12T20:01:00.000Z',
    payment_method: 'TRANSFER',
    lines: [
      ['prd_tb450', 10],
      ['prd_im001', 6],
    ],
  },
  {
    transaction_id: 'trx_008',
    transaction_number: 'TRX-20260812-013',
    outlet_id: 'otl_b',
    user_id: 'usr_rudi',
    created_at: '2026-08-12T12:30:00.000Z',
    payment_method: 'CASH',
    lines: [
      ['prd_ch068', 5],
      ['prd_or133', 2],
    ],
  },
  {
    // A pending sale, so the status badge has something other than COMPLETED.
    transaction_id: 'trx_009',
    transaction_number: 'TRX-20260811-021',
    outlet_id: 'otl_a',
    user_id: 'usr_ani',
    created_at: '2026-08-11T09:15:00.000Z',
    status: 'PENDING',
    payment_method: 'TRANSFER',
    lines: [['prd_im001', 20]],
  },
  {
    transaction_id: 'trx_010',
    transaction_number: 'TRX-20260811-022',
    outlet_id: 'otl_b',
    user_id: 'usr_rudi',
    created_at: '2026-08-11T17:40:00.000Z',
    payment_method: 'QRIS',
    lines: [
      ['prd_pcb001', 1],
      ['prd_su250', 1],
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Owner dashboard figures                                                     */
/* -------------------------------------------------------------------------- */

/**
 * §6's "Dashboard figures (Bulan Ini)", verbatim.
 *
 * `totalEmployees` and `totalProducts` are the brief's own 12 and 156, which
 * do not match the five users and twelve products it lists in the same
 * section. Both are served as written, because §6 says to use these exact
 * values and the dashboard mockups were drawn from them. If the intent was for
 * the dashboard to count the seeded rows instead, change these two lines.
 */
export const DASHBOARD_FIGURES = {
  totalRevenue: '15750000.00',
  totalTransactions: 1250,
  averageOrderValue: '12600.00',
  totalProductsSold: 3420,
  totalOutlets: 3,
  totalEmployees: 12,
  totalProducts: 156,
  totalCategories: 8,
  revenueGrowth: 12.5,
  transactionsGrowth: 8.3,
  productsSoldGrowth: 5.1,
};

/** Seven days that sum to exactly 15.750.000. */
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
 * Per-outlet split from §6. Revenue sums to 15.750.000 and transactions to
 * 1250.
 *
 * Outlet B's average order value is the one figure that has to be adjusted:
 * 5.100.000 over 420 transactions is 12.142,857, and there is no such thing as
 * a fraction of a rupiah here. It is rounded to 12.143.
 */
export const OUTLET_PERFORMANCE = [
  {
    outlet_id: 'otl_a',
    outlet_name: 'Outlet A - Mall Central',
    total_revenue: '7250000.00',
    total_transactions: 580,
    average_order_value: '12500.00',
    total_products_sold: 1520,
    contribution_percentage: 46.0,
    revenue_growth: 15.2,
  },
  {
    outlet_id: 'otl_b',
    outlet_name: 'Outlet B - City Plaza',
    total_revenue: '5100000.00',
    total_transactions: 420,
    average_order_value: '12143.00',
    total_products_sold: 1100,
    contribution_percentage: 32.4,
    revenue_growth: 6.1,
  },
  {
    outlet_id: 'otl_c',
    outlet_name: 'Outlet C - Grand Square',
    total_revenue: '3400000.00',
    total_transactions: 250,
    average_order_value: '13600.00',
    total_products_sold: 800,
    contribution_percentage: 21.6,
    revenue_growth: -2.3,
  },
];

/** Quantity times catalog price, so every revenue figure here is consistent. */
export const TOP_BY_REVENUE = [
  { product_id: 'prd_cc1500', total_quantity_sold: 450, total_revenue: '6750000.00' },
  { product_id: 'prd_ch068', total_quantity_sold: 210, total_revenue: '2625000.00' },
  { product_id: 'prd_rt400', total_quantity_sold: 140, total_revenue: '2380000.00' },
  { product_id: 'prd_ks250', total_quantity_sold: 130, total_revenue: '2340000.00' },
  { product_id: 'prd_im001', total_quantity_sold: 620, total_revenue: '2170000.00' },
];

export const TOP_BY_QUANTITY = [
  { product_id: 'prd_im001', total_quantity_sold: 620, total_revenue: '2170000.00' },
  { product_id: 'prd_cc1500', total_quantity_sold: 450, total_revenue: '6750000.00' },
  { product_id: 'prd_mw600', total_quantity_sold: 380, total_revenue: '1520000.00' },
  { product_id: 'prd_tb450', total_quantity_sold: 300, total_revenue: '1500000.00' },
  { product_id: 'prd_ch068', total_quantity_sold: 210, total_revenue: '2625000.00' },
];

/** Premium Coffee Beans is §6's "kurang laku" line: 50 units, 5 sold. */
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
    product_id: 'prd_su250',
    total_quantity_sold: 12,
    total_revenue: '78000.00',
    stock_level: 71,
    days_without_sale: 9,
    recommendation: 'TRANSFER' as const,
  },
  {
    product_id: 'prd_sb100',
    total_quantity_sold: 15,
    total_revenue: '127500.00',
    stock_level: 41,
    days_without_sale: 18,
    recommendation: 'DISCOUNT' as const,
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
  // Indonesian, because these strings reach the screen as written.
  busiest_day: 'Sabtu',
  quietest_day: 'Senin',
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
  // Renders as ▲6,8% at one decimal, which is what §6 shows.
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

/** §6's AI insight, verbatim. */
export const AI_INSIGHT = {
  insight_id: 'ins_001',
  merchant_id: MERCHANT.merchant_id,
  title: 'Peringatan Stok: Coca Cola 1.5L',
  content:
    'Stok Coca Cola 1.5L di Outlet A diperkirakan habis dalam 2 hari berdasarkan kecepatan penjualan saat ini (rata-rata 12 unit/hari, sisa 5 unit). Pertimbangkan restock 50 unit. Outlet C memiliki kelebihan stok 45 unit dengan penjualan rendah — transfer antar outlet dapat menjadi opsi yang lebih hemat.',
  type: 'STOCK_WARNING' as const,
  status: 'READY' as const,
  created_at: '2026-08-13T08:00:00.000Z',
  updated_at: '2026-08-13T08:00:00.000Z',
};

export const LAST_AI_ANALYSIS = '2026-08-12T08:00:00.000Z';
