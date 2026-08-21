/** Reporting module — contract §6.2. */

import { z } from 'zod';

import { request } from '@/api/client';
import {
  bucketSchema,
  dashboardMetaFields,
  id,
  money,
  moneyLenient,
  toDashboardMeta,
  type Bucket,
  type DashboardMeta,
} from '@/api/schema';

/* -------------------------------------------------------------------------- */
/* Shared query shapes                                                         */
/* -------------------------------------------------------------------------- */

/** Every Owner business endpoint takes at least this. */
export type PeriodQuery = {
  /** ISO-8601. Inclusive, and at most 366 days apart from `date_to`. */
  date_from: string;
  date_to: string;
  /** Optional selector; omitted means the whole merchant. */
  outlet_id?: string;
};

export type TrendQuery = PeriodQuery & { bucket?: Bucket };
export type TopProductsQuery = PeriodQuery & { limit?: number };

/** The current-state endpoints have no period at all. */
export type OutletQuery = { outlet_id?: string };

/* -------------------------------------------------------------------------- */
/* Schemas                                                                     */
/* -------------------------------------------------------------------------- */

/** §6.4 `DashboardSummary`. */
const summarySchema = z
  .object({
    omzet: money,
    transaction_count: z.number(),
    average_transaction_value: moneyLenient,
    ...dashboardMetaFields,
  })
  .transform((value) => ({
    /** Integer rupiah. Revenue over the period. */
    omzet: value.omzet,
    transactionCount: value.transaction_count,
    averageTransactionValue: value.average_transaction_value,
    meta: toDashboardMeta(value),
  }));

export type DashboardSummary = z.infer<typeof summarySchema>;

/** §6.2 `GET /dashboard/operations` — the Admin's landing figures. */
const operationsSchema = z
  .object({
    inventory_item_count: z.number(),
    low_stock_item_count: z.number(),
    out_of_stock_item_count: z.number(),
    active_product_count: z.number(),
    inactive_product_count: z.number(),
    inactive_category_count: z.number(),
    outlet_id: id.nullable(),
    ...dashboardMetaFields,
  })
  .transform((value) => ({
    inventoryItemCount: value.inventory_item_count,
    lowStockItemCount: value.low_stock_item_count,
    outOfStockItemCount: value.out_of_stock_item_count,
    activeProductCount: value.active_product_count,
    inactiveProductCount: value.inactive_product_count,
    inactiveCategoryCount: value.inactive_category_count,
    /** Null when the read spans every outlet in the merchant. */
    outletId: value.outlet_id,
    meta: toDashboardMeta(value),
  }));

export type DashboardOperations = z.infer<typeof operationsSchema>;

/** §6.4 `TrendPoint`, as sales-trend reports it. */
const salesTrendSchema = z
  .object({
    bucket: bucketSchema,
    points: z.array(
      z
        .object({
          bucket_start: z.string(),
          omzet: money,
          transaction_count: z.number(),
        })
        .transform((point) => ({
          bucketStart: point.bucket_start,
          omzet: point.omzet,
          transactionCount: point.transaction_count,
        }))
    ),
    ...dashboardMetaFields,
  })
  .transform((value) => ({
    bucket: value.bucket,
    points: value.points,
    meta: toDashboardMeta(value),
  }));

export type SalesTrend = z.infer<typeof salesTrendSchema>;
export type SalesTrendPoint = SalesTrend['points'][number];

/** §6.2 aov-trend. Same envelope, one measure per point. */
const aovTrendSchema = z
  .object({
    bucket: bucketSchema,
    points: z.array(
      z
        .object({
          bucket_start: z.string(),
          average_transaction_value: moneyLenient,
        })
        .transform((point) => ({
          bucketStart: point.bucket_start,
          averageTransactionValue: point.average_transaction_value,
        }))
    ),
    ...dashboardMetaFields,
  })
  .transform((value) => ({
    bucket: value.bucket,
    points: value.points,
    meta: toDashboardMeta(value),
  }));

export type AovTrend = z.infer<typeof aovTrendSchema>;
export type AovTrendPoint = AovTrend['points'][number];

/** §6.4 `TimePatternPoint`. Hours are 0–23 in the merchant's own timezone. */
const timePatternSchema = z
  .object({
    points: z.array(
      z
        .object({
          hour_of_day: z.number(),
          omzet: money,
          transaction_count: z.number(),
        })
        .transform((point) => ({
          hourOfDay: point.hour_of_day,
          omzet: point.omzet,
          transactionCount: point.transaction_count,
        }))
    ),
    ...dashboardMetaFields,
  })
  .transform((value) => ({ points: value.points, meta: toDashboardMeta(value) }));

export type TimePattern = z.infer<typeof timePatternSchema>;
export type TimePatternPoint = TimePattern['points'][number];

/** §6.4 `TopProductsResult` — best and worst sellers in one response. */
const productRankSchema = z
  .object({
    product_id: id,
    name: z.string(),
    units_sold: z.number(),
    omzet: money,
  })
  .transform((value) => ({
    productId: value.product_id,
    name: value.name,
    unitsSold: value.units_sold,
    omzet: value.omzet,
  }));

const topProductsSchema = z
  .object({
    top_selling: z.array(productRankSchema),
    least_selling: z.array(productRankSchema),
    ...dashboardMetaFields,
  })
  .transform((value) => ({
    topSelling: value.top_selling,
    leastSelling: value.least_selling,
    meta: toDashboardMeta(value),
  }));

export type TopProducts = z.infer<typeof topProductsSchema>;
export type ProductRank = z.infer<typeof productRankSchema>;

/** §6.4 `OutletComparisonItem`. */
const outletComparisonSchema = z
  .object({
    items: z.array(
      z
        .object({
          outlet_id: id,
          outlet_name: z.string(),
          omzet: money,
          transaction_count: z.number(),
        })
        .transform((item) => ({
          outletId: item.outlet_id,
          outletName: item.outlet_name,
          omzet: item.omzet,
          transactionCount: item.transaction_count,
        }))
    ),
    ...dashboardMetaFields,
  })
  .transform((value) => ({ items: value.items, meta: toDashboardMeta(value) }));

export type OutletComparison = z.infer<typeof outletComparisonSchema>;
export type OutletComparisonItem = OutletComparison['items'][number];

/** §6.4 `LowStockItem`. */
const lowStockSchema = z
  .object({
    items: z.array(
      z
        .object({
          product_id: id,
          name: z.string(),
          outlet_id: id,
          outlet_name: z.string(),
          quantity: z.number(),
          base_low_stock_threshold: z.number(),
          low_stock_threshold_override: z.number().nullable(),
          effective_low_stock_threshold: z.number(),
        })
        .transform((item) => ({
          productId: item.product_id,
          productName: item.name,
          outletId: item.outlet_id,
          outletName: item.outlet_name,
          quantity: item.quantity,
          baseLowStockThreshold: item.base_low_stock_threshold,
          lowStockThresholdOverride: item.low_stock_threshold_override,
          effectiveLowStockThreshold: item.effective_low_stock_threshold,
        }))
    ),
    ...dashboardMetaFields,
  })
  .transform((value) => ({ items: value.items, meta: toDashboardMeta(value) }));

export type LowStockReport = z.infer<typeof lowStockSchema>;
export type LowStockItem = LowStockReport['items'][number];

export type { DashboardMeta };

/* -------------------------------------------------------------------------- */
/* Client                                                                      */
/* -------------------------------------------------------------------------- */

export const dashboardApi = {
  /** OWNER only. 400 when `date_from` is after `date_to` or the span is too wide. */
  summary: (query: PeriodQuery) =>
    request({ method: 'GET', path: '/dashboard/summary', query, schema: summarySchema }),

  /** ADMIN and OWNER. Current state, so it has no period. */
  operations: (query: OutletQuery = {}) =>
    request({ method: 'GET', path: '/dashboard/operations', query, schema: operationsSchema }),

  salesTrend: (query: TrendQuery) =>
    request({ method: 'GET', path: '/dashboard/sales-trend', query, schema: salesTrendSchema }),

  aovTrend: (query: TrendQuery) =>
    request({ method: 'GET', path: '/dashboard/aov-trend', query, schema: aovTrendSchema }),

  timePattern: (query: PeriodQuery) =>
    request({ method: 'GET', path: '/dashboard/time-pattern', query, schema: timePatternSchema }),

  /** `limit` is 1–100 and defaults to 10 server-side. */
  topProducts: (query: TopProductsQuery) =>
    request({ method: 'GET', path: '/dashboard/top-products', query, schema: topProductsSchema }),

  /** Merchant-wide by design — there is no outlet filter on a comparison. */
  outletComparison: (query: Omit<PeriodQuery, 'outlet_id'>) =>
    request({
      method: 'GET',
      path: '/dashboard/outlet-comparison',
      query,
      schema: outletComparisonSchema,
    }),

  /** ADMIN and OWNER. The stock-alert list behind the Admin's landing screen. */
  lowStock: (query: OutletQuery = {}) =>
    request({ method: 'GET', path: '/dashboard/low-stock', query, schema: lowStockSchema }),
};
