/** The seed data mock mode starts from — IndoMart Retail, three outlets. */

export const NOW = '2026-08-13T14:30:00.000Z';
const CREATED = '2026-08-01T09:00:00.000Z';

const stamps = { created_at: CREATED, updated_at: NOW };

/* -------------------------------------------------------------------------- */
/* Merchant, outlets, staff                                                    */
/* -------------------------------------------------------------------------- */

export const MERCHANT = {
  id: 'mrc_indomart',
  owner_user_id: 'usr_owner',
  name: 'IndoMart Retail',
  /** §2.4: drives every report boundary and time bucket (BR-018). */
  timezone: 'Asia/Jakarta',
  status: 'ACTIVE' as const,
  ...stamps,
};

export const OUTLETS = [
  {
    id: 'otl_a',
    merchant_id: MERCHANT.id,
    name: 'Outlet A - Mall Central',
    address: 'Jl. Sudirman No. 123, Jakarta',
    status: 'ACTIVE' as const,
    ...stamps,
  },
  {
    id: 'otl_b',
    merchant_id: MERCHANT.id,
    name: 'Outlet B - City Plaza',
    address: 'Jl. Gatot Subroto No. 45, Jakarta',
    status: 'ACTIVE' as const,
    ...stamps,
  },
  {
    id: 'otl_c',
    merchant_id: MERCHANT.id,
    name: 'Outlet C - Grand Square',
    address: 'Jl. Thamrin No. 8, Jakarta',
    status: 'ACTIVE' as const,
    ...stamps,
  },
];

/**
 * Five accounts. Outlet A has two cashiers and Outlet C has none, so the transaction seeds cover A
 * and B only.
 */
export const STAFF = [
  {
    user_id: 'usr_owner',
    merchant_id: MERCHANT.id,
    outlet_id: null,
    name: 'John Doe',
    email: 'owner@indomart.com',
    role: 'OWNER' as const,
    status: 'ACTIVE' as const,
    ...stamps,
  },
  {
    user_id: 'usr_admin',
    merchant_id: MERCHANT.id,
    outlet_id: null,
    name: 'Sari Dewi',
    email: 'sari@indomart.com',
    role: 'ADMIN' as const,
    status: 'ACTIVE' as const,
    ...stamps,
  },
  {
    user_id: 'usr_budi',
    merchant_id: MERCHANT.id,
    outlet_id: 'otl_a',
    name: 'Budi Santoso',
    email: 'budi@indomart.com',
    role: 'CASHIER' as const,
    status: 'ACTIVE' as const,
    ...stamps,
  },
  {
    user_id: 'usr_ani',
    merchant_id: MERCHANT.id,
    outlet_id: 'otl_a',
    name: 'Ani Wijaya',
    email: 'ani@indomart.com',
    role: 'CASHIER' as const,
    status: 'ACTIVE' as const,
    ...stamps,
  },
  {
    user_id: 'usr_rudi',
    merchant_id: MERCHANT.id,
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

/** Kebutuhan Harian and Beku carry no products, so the catalog screens have real empty states. */
export const CATEGORIES = [
  { id: 'cat_minuman', name: 'Minuman', is_active: true },
  { id: 'cat_makanan_ringan', name: 'Makanan Ringan', is_active: true },
  { id: 'cat_kopi', name: 'Kopi', is_active: true },
  { id: 'cat_kebutuhan', name: 'Kebutuhan Harian', is_active: true },
  { id: 'cat_perawatan', name: 'Perawatan Diri', is_active: true },
  { id: 'cat_rokok', name: 'Rokok', is_active: false },
  { id: 'cat_beku', name: 'Beku', is_active: true },
  { id: 'cat_roti', name: 'Roti', is_active: true },
].map((category) => ({ ...category, merchant_id: MERCHANT.id }));

type ProductSeed = {
  id: string;
  category_id: string;
  name: string;
  price: string;
  /** §3.2 makes this required on create; it is the base for every outlet. */
  low_stock_threshold: number;
  is_active?: boolean;
};

const PRODUCT_SEEDS: ProductSeed[] = [
  {
    id: 'prd_cc1500',
    category_id: 'cat_minuman',
    name: 'Coca Cola 1.5L',
    price: '15000.00',
    low_stock_threshold: 10,
  },
  {
    id: 'prd_sp1500',
    category_id: 'cat_minuman',
    name: 'Sprite 1.5L',
    price: '15000.00',
    low_stock_threshold: 10,
  },
  {
    id: 'prd_mw600',
    category_id: 'cat_minuman',
    name: 'Air Mineral 600ml',
    price: '4000.00',
    low_stock_threshold: 20,
  },
  {
    id: 'prd_tb450',
    category_id: 'cat_minuman',
    name: 'Teh Botol 450ml',
    price: '5000.00',
    low_stock_threshold: 10,
  },
  {
    id: 'prd_ch068',
    category_id: 'cat_makanan_ringan',
    name: 'Chitato Sapi Panggang',
    price: '12500.00',
    low_stock_threshold: 10,
  },
  {
    id: 'prd_or133',
    category_id: 'cat_makanan_ringan',
    name: 'Oreo Original 133g',
    price: '10000.00',
    low_stock_threshold: 10,
  },
  {
    id: 'prd_ks250',
    category_id: 'cat_kopi',
    name: 'Kopi Susu Botol 250ml',
    price: '18000.00',
    low_stock_threshold: 10,
  },
  {
    id: 'prd_pcb001',
    category_id: 'cat_kopi',
    name: 'Premium Coffee Beans',
    price: '35000.00',
    low_stock_threshold: 5,
  },
  {
    id: 'prd_im001',
    category_id: 'cat_makanan_ringan',
    name: 'Indomie Goreng',
    price: '3500.00',
    low_stock_threshold: 50,
  },
  {
    id: 'prd_sb100',
    category_id: 'cat_perawatan',
    name: 'Sabun Mandi Lifebuoy',
    price: '8500.00',
    low_stock_threshold: 10,
  },
  {
    id: 'prd_rt400',
    category_id: 'cat_roti',
    name: 'Roti Tawar Sari Roti',
    price: '17000.00',
    low_stock_threshold: 10,
  },
  {
    id: 'prd_su250',
    category_id: 'cat_minuman',
    name: 'Susu UHT Coklat 250ml',
    price: '6500.00',
    low_stock_threshold: 10,
  },
  // Active product in an inactive category: visible to the Admin, invisible to the cashier, and
  // rejected at checkout with CATEGORY_INACTIVE (§3.2).
  {
    id: 'prd_rk016',
    category_id: 'cat_rokok',
    name: 'Rokok Kretek 16',
    price: '28000.00',
    low_stock_threshold: 10,
  },
  // Deactivated outright, so the products screen has both hidden reasons.
  {
    id: 'prd_old01',
    category_id: 'cat_perawatan',
    name: 'Sampo Sachet (lama)',
    price: '2000.00',
    low_stock_threshold: 10,
    is_active: false,
  },
];

export const PRODUCTS = PRODUCT_SEEDS.map((seed) => ({
  id: seed.id,
  merchant_id: MERCHANT.id,
  category_id: seed.category_id,
  name: seed.name,
  price: seed.price,
  low_stock_threshold: seed.low_stock_threshold,
  is_active: seed.is_active ?? true,
  ...stamps,
}));

/* -------------------------------------------------------------------------- */
/* Inventory                                                                   */
/* -------------------------------------------------------------------------- */

/** Stock per product, in outlet order [A, B, C]. */
const STOCK: Record<string, [number, number, number]> = {
  //                    A    B    C
  prd_cc1500: /*  */ [5, 42, 45], // A low
  prd_sp1500: /*  */ [24, 9, 26], // B low
  prd_mw600: /*   */ [0, 55, 45], // A out
  prd_tb450: /*   */ [48, 60, 7], // C low
  prd_ch068: /*   */ [30, 8, 20], // B low
  prd_or133: /*   */ [18, 25, 6], // C low
  prd_ks250: /*   */ [12, 4, 15], // B low
  prd_pcb001: /*  */ [50, 12, 30],
  prd_im001: /*   */ [120, 150, 95],
  prd_sb100: /*   */ [22, 0, 19], // B out
  prd_rt400: /*   */ [9, 14, 0], // A low · C out
  prd_su250: /*   */ [40, 21, 10], // C low
  prd_rk016: /*   */ [30, 30, 30],
  prd_old01: /*   */ [4, 0, 0],
};

/** Per-outlet threshold overrides (§4.2). */
const THRESHOLD_OVERRIDES: Record<string, number> = {
  'otl_c:prd_cc1500': 50,
  'otl_b:prd_im001': 20,
};

export const INVENTORY = PRODUCTS.flatMap((product) =>
  OUTLETS.map((outlet, index) => ({
    id: `inv_${outlet.id}_${product.id}`,
    merchant_id: MERCHANT.id,
    outlet_id: outlet.id,
    product_id: product.id,
    quantity: STOCK[product.id]?.[index] ?? 0,
    low_stock_threshold_override: THRESHOLD_OVERRIDES[`${outlet.id}:${product.id}`] ?? null,
    updated_at: NOW,
  }))
);

/* -------------------------------------------------------------------------- */
/* Transactions                                                                */
/* -------------------------------------------------------------------------- */

export type TransactionSeed = {
  transaction_id: string;
  transaction_number: string;
  outlet_id: string;
  operator_user_id: string;
  created_at: string;
  /** §5.1: CASH / QRIS / TRANSFER. There is no card member. */
  payment_method: 'CASH' | 'QRIS' | 'TRANSFER';
  /** [product_id, quantity]; totals are computed from the catalog price. */
  lines: [string, number][];
};

/**
 * Sales across Outlet A and Outlet B, spread over several days and hours so the trend, time-pattern
 * and outlet-comparison endpoints have a shape to report rather than a single spike.
 */
export const TRANSACTION_SEEDS: TransactionSeed[] = [
  {
    transaction_id: 'trx_001',
    transaction_number: 'TRX-20260813-001',
    outlet_id: 'otl_a',
    operator_user_id: 'usr_budi',
    created_at: '2026-08-13T14:30:00.000Z',
    payment_method: 'CASH',
    lines: [
      ['prd_cc1500', 4],
      ['prd_ks250', 2],
      ['prd_pcb001', 1],
    ],
  },
  {
    transaction_id: 'trx_002',
    transaction_number: 'TRX-20260813-002',
    outlet_id: 'otl_a',
    operator_user_id: 'usr_ani',
    created_at: '2026-08-13T12:05:00.000Z',
    payment_method: 'QRIS',
    lines: [
      ['prd_cc1500', 2],
      ['prd_or133', 1],
    ],
  },
  {
    transaction_id: 'trx_003',
    transaction_number: 'TRX-20260813-003',
    outlet_id: 'otl_b',
    operator_user_id: 'usr_rudi',
    created_at: '2026-08-13T09:15:00.000Z',
    payment_method: 'CASH',
    lines: [
      ['prd_im001', 5],
      ['prd_tb450', 3],
      ['prd_su250', 2],
    ],
  },
  {
    transaction_id: 'trx_004',
    transaction_number: 'TRX-20260812-004',
    outlet_id: 'otl_a',
    operator_user_id: 'usr_budi',
    created_at: '2026-08-12T18:40:00.000Z',
    payment_method: 'TRANSFER',
    lines: [
      ['prd_pcb001', 2],
      ['prd_ch068', 2],
    ],
  },
  {
    transaction_id: 'trx_005',
    transaction_number: 'TRX-20260812-005',
    outlet_id: 'otl_b',
    operator_user_id: 'usr_rudi',
    created_at: '2026-08-12T11:20:00.000Z',
    payment_method: 'CASH',
    lines: [
      ['prd_sp1500', 3],
      ['prd_or133', 2],
    ],
  },
  {
    transaction_id: 'trx_006',
    transaction_number: 'TRX-20260811-006',
    outlet_id: 'otl_a',
    operator_user_id: 'usr_ani',
    created_at: '2026-08-11T16:10:00.000Z',
    payment_method: 'QRIS',
    lines: [
      ['prd_rt400', 2],
      ['prd_su250', 4],
    ],
  },
  {
    transaction_id: 'trx_007',
    transaction_number: 'TRX-20260811-007',
    outlet_id: 'otl_b',
    operator_user_id: 'usr_rudi',
    created_at: '2026-08-11T08:45:00.000Z',
    payment_method: 'CASH',
    lines: [['prd_im001', 12]],
  },
  {
    transaction_id: 'trx_008',
    transaction_number: 'TRX-20260810-008',
    outlet_id: 'otl_a',
    operator_user_id: 'usr_budi',
    created_at: '2026-08-10T19:05:00.000Z',
    payment_method: 'CASH',
    lines: [
      ['prd_cc1500', 1],
      ['prd_ch068', 1],
      ['prd_sb100', 2],
    ],
  },
  {
    transaction_id: 'trx_009',
    transaction_number: 'TRX-20260809-009',
    outlet_id: 'otl_b',
    operator_user_id: 'usr_rudi',
    created_at: '2026-08-09T13:30:00.000Z',
    payment_method: 'QRIS',
    lines: [
      ['prd_ks250', 3],
      ['prd_tb450', 2],
    ],
  },
  {
    transaction_id: 'trx_010',
    transaction_number: 'TRX-20260808-010',
    outlet_id: 'otl_a',
    operator_user_id: 'usr_ani',
    created_at: '2026-08-08T10:00:00.000Z',
    payment_method: 'CASH',
    lines: [
      ['prd_mw600', 6],
      ['prd_or133', 3],
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Insight                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * One completed analysis, so `GET /insights` has something to return before the Owner triggers a
 * new one.
 */
export const ANALYSIS_JOB = {
  id: 'job_20260812',
  state: 'READY' as const,
  analysis_date: '2026-08-12',
  updated_at: '2026-08-12T08:02:00.000Z',
};

export const INSIGHTS = [
  {
    id: 'ins_sales_trend',
    type: 'SALES_TREND' as const,
    status: 'READY' as const,
    title: 'Penjualan naik 18% dibanding periode sebelumnya',
    content:
      'Omzet periode ini Rp4.500.000 dibanding Rp3.813.000 periode sebelumnya. Kenaikan terbesar datang dari Outlet A pada akhir pekan.',
    evidence_summary: {
      current_omzet: '4500000.00',
      previous_omzet: '3813000.00',
      delta_percent: 18.0,
    },
    period_start: '2026-07-14T00:00:00+07:00',
    period_end: '2026-08-12T23:59:59+07:00',
    generated_at: '2026-08-12T08:02:00.000Z',
  },
  {
    id: 'ins_top_products',
    type: 'TOP_PRODUCTS' as const,
    status: 'READY' as const,
    title: 'Kopi Susu Botol menyumbang omzet terbesar',
    content:
      'Kopi Susu Botol 250ml terjual 5 unit dengan omzet Rp90.000. Premium Coffee Beans bergerak lambat meski harganya tertinggi.',
    evidence_summary: {
      top_product: 'Kopi Susu Botol 250ml',
      units_sold: 5,
      omzet: '90000.00',
    },
    period_start: '2026-07-14T00:00:00+07:00',
    period_end: '2026-08-12T23:59:59+07:00',
    generated_at: '2026-08-12T08:02:00.000Z',
  },
  {
    id: 'ins_time_pattern',
    type: 'TIME_PATTERN' as const,
    status: 'READY' as const,
    title: 'Jam sibuk terjadi sore hari',
    content:
      'Omzet tertinggi konsisten pada jam 14.00–19.00. Pertimbangkan menambah kasir pada rentang tersebut.',
    evidence_summary: { peak_hours: [14, 16, 18] },
    period_start: '2026-07-14T00:00:00+07:00',
    period_end: '2026-08-12T23:59:59+07:00',
    generated_at: '2026-08-12T08:02:00.000Z',
  },
];
