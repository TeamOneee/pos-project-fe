/**
 * Analytics module — contract §4.11. Owner only; Admin has no access.
 *
 * Unlike the Owner dashboard, these are four independent endpoints, so each
 * chart owns its own query and can refetch on its own filter change.
 */

import { z } from 'zod';

import { request } from '@/api/client';
import { gapField, id, isoDate, money, percentage, type Interval, type Period } from '@/api/schema';

const salesTrendPointSchema = z
  .object({ date: isoDate, total_sales: money, transaction_count: z.number() })
  .transform((value) => ({
    date: value.date,
    totalSales: value.total_sales,
    transactionCount: value.transaction_count,
  }));

export type SalesTrendPoint = z.infer<typeof salesTrendPointSchema>;

const salesTrendSchema = z
  .object({
    trend: z.array(salesTrendPointSchema),
    summary: z.object({
      total_revenue: money,
      average_daily_revenue: money,
      total_transactions: z.number(),
      average_daily_transactions: z.number(),
    }),
  })
  .transform((value) => ({
    trend: value.trend,
    summary: {
      totalRevenue: value.summary.total_revenue,
      averageDailyRevenue: value.summary.average_daily_revenue,
      totalTransactions: value.summary.total_transactions,
      averageDailyTransactions: value.summary.average_daily_transactions,
    },
  }));

export type SalesTrend = z.infer<typeof salesTrendSchema>;

const timePatternSchema = z
  .object({
    patterns: z.array(
      z
        .object({ hour: z.number(), revenue: money, transaction_count: z.number() })
        .transform((value) => ({
          hour: value.hour,
          revenue: value.revenue,
          transactionCount: value.transaction_count,
        }))
    ),
    peak_hours: z.array(z.number()),
    average_transactions_per_hour: z.number(),
  })
  .transform((value) => ({
    patterns: value.patterns,
    peakHours: value.peak_hours,
    averageTransactionsPerHour: value.average_transactions_per_hour,
  }));

export type TimePattern = z.infer<typeof timePatternSchema>;

const aovTrendSchema = z
  .object({
    trend: z.array(
      z
        .object({ period: z.string(), aov: money, transaction_count: z.number() })
        .transform((value) => ({
          period: value.period,
          aov: value.aov,
          transactionCount: value.transaction_count,
        }))
    ),
    overall_aov: money,
    aov_change_percentage: percentage,
  })
  .transform((value) => ({
    trend: value.trend,
    overallAov: value.overall_aov,
    aovChangePercentage: value.aov_change_percentage,
  }));

export type AovTrend = z.infer<typeof aovTrendSchema>;

const sellerSchema = z
  .object({
    product_id: id,
    product_name: z.string(),
    sku: gapField(z.string(), ''),
    category_name: z.string(),
    total_sold: z.number(),
    total_revenue: money,
    rank: z.number(),
    days_without_sale: z.number().optional(),
  })
  .transform((value) => ({
    productId: value.product_id,
    productName: value.product_name,
    sku: value.sku,
    categoryName: value.category_name,
    totalSold: value.total_sold,
    totalRevenue: value.total_revenue,
    rank: value.rank,
    daysWithoutSale: value.days_without_sale ?? null,
  }));

export type ProductPerformanceRow = z.infer<typeof sellerSchema>;

const productPerformanceSchema = z
  .object({ top_sellers: z.array(sellerSchema), underperformers: z.array(sellerSchema) })
  .transform((value) => ({
    topSellers: value.top_sellers,
    underperformers: value.underperformers,
  }));

export type ProductPerformance = z.infer<typeof productPerformanceSchema>;

export type SalesTrendParams = {
  /** Both dates are required by the contract. */
  start_date: string;
  end_date: string;
  outlet_id?: string;
  interval?: Interval;
};

export type TimePatternParams = {
  outlet_id?: string;
  period?: Extract<Period, 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH'>;
};

export type AovTrendParams = {
  outlet_id?: string;
  period?: Exclude<Period, 'TODAY'>;
};

export type ProductPerformanceParams = {
  outlet_id?: string;
  period?: Extract<Period, 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_QUARTER'>;
  sort_by?: 'REVENUE' | 'QUANTITY';
  limit?: number;
};

export const analyticsApi = {
  salesTrend: (params: SalesTrendParams) =>
    request({
      method: 'GET',
      path: '/analytics/sales-trend',
      query: {
        start_date: params.start_date,
        end_date: params.end_date,
        outlet_id: params.outlet_id,
        interval: params.interval,
      },
      schema: salesTrendSchema,
    }),

  timePattern: (params: TimePatternParams = {}) =>
    request({
      method: 'GET',
      path: '/analytics/time-pattern',
      query: { outlet_id: params.outlet_id, period: params.period },
      schema: timePatternSchema,
    }),

  aovTrend: (params: AovTrendParams = {}) =>
    request({
      method: 'GET',
      path: '/analytics/aov-trend',
      query: { outlet_id: params.outlet_id, period: params.period },
      schema: aovTrendSchema,
    }),

  productPerformance: (params: ProductPerformanceParams = {}) =>
    request({
      method: 'GET',
      path: '/analytics/product-performance',
      query: {
        outlet_id: params.outlet_id,
        period: params.period,
        sort_by: params.sort_by,
        limit: params.limit,
      },
      schema: productPerformanceSchema,
    }),
};
