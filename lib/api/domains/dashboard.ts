/**
 * Dashboard module — contract §4.10.
 *
 * GET /dashboard/owner is deliberately one fat endpoint: the whole Owner
 * dashboard arrives in a single response, so it gets exactly one query and one
 * loading state. Do not split it into per-widget requests.
 *
 * GET /dashboard/admin is the operational stock view. Admin has no business
 * dashboard and Owner has no stock dashboard — see the role matrix.
 */

import { z } from 'zod';

import { request } from '@/lib/api/client';
import { lowStockAlertSchema } from '@/lib/api/domains/inventory';
import {
  gapField,
  id,
  isoDate,
  isoDateTime,
  money,
  percentage,
  type Period,
} from '@/lib/api/schema';

/* -------------------------------------------------------------------------- */
/* Owner dashboard                                                             */
/* -------------------------------------------------------------------------- */

const summarySchema = z
  .object({
    total_revenue: money,
    total_transactions: z.number(),
    total_orders: z.number(),
    average_order_value: money,
    total_products_sold: z.number(),
    total_outlets: z.number(),
    total_employees: z.number(),
    total_products: z.number(),
    revenue_growth: percentage,
    transactions_growth: percentage,
  })
  .transform((value) => ({
    totalRevenue: value.total_revenue,
    totalTransactions: value.total_transactions,
    totalOrders: value.total_orders,
    averageOrderValue: value.average_order_value,
    totalProductsSold: value.total_products_sold,
    totalOutlets: value.total_outlets,
    totalEmployees: value.total_employees,
    totalProducts: value.total_products,
    /** Percentages, not money: 12.5 renders as "12,5%". */
    revenueGrowth: value.revenue_growth,
    transactionsGrowth: value.transactions_growth,
  }));

const salesTrendSchema = z
  .object({
    labels: z.array(z.string()),
    datasets: z.object({ revenue: z.array(money), transactions: z.array(z.number()) }),
    summary: z.object({
      highest_revenue: money,
      lowest_revenue: money,
      average_revenue: money,
      total_revenue: money,
    }),
  })
  .transform((value) => ({
    labels: value.labels,
    revenue: value.datasets.revenue,
    transactions: value.datasets.transactions,
    summary: {
      highestRevenue: value.summary.highest_revenue,
      lowestRevenue: value.summary.lowest_revenue,
      averageRevenue: value.summary.average_revenue,
      totalRevenue: value.summary.total_revenue,
    },
  }));

const outletPerformanceSchema = z
  .object({
    outlet_id: id,
    outlet_name: z.string(),
    total_revenue: money,
    total_transactions: z.number(),
    average_order_value: money,
    total_products_sold: z.number(),
    contribution_percentage: percentage,
    revenue_growth: percentage,
  })
  .transform((value) => ({
    outletId: value.outlet_id,
    outletName: value.outlet_name,
    totalRevenue: value.total_revenue,
    totalTransactions: value.total_transactions,
    averageOrderValue: value.average_order_value,
    totalProductsSold: value.total_products_sold,
    contributionPercentage: value.contribution_percentage,
    revenueGrowth: value.revenue_growth,
  }));

const rankedProductSchema = z
  .object({
    product_id: id,
    product_name: z.string(),
    sku: gapField(z.string(), ''),
    category_name: z.string(),
    total_quantity_sold: z.number(),
    total_revenue: money,
    rank: z.number(),
  })
  .transform((value) => ({
    productId: value.product_id,
    productName: value.product_name,
    sku: value.sku,
    categoryName: value.category_name,
    totalQuantitySold: value.total_quantity_sold,
    totalRevenue: value.total_revenue,
    rank: value.rank,
  }));

export type RankedProduct = z.infer<typeof rankedProductSchema>;

/** An unrecognised recommendation must not take the dashboard down with it. */
const recommendationSchema = z
  .enum(['PROMOTION', 'DISCOUNT', 'BUNDLE', 'DISCONTINUE'])
  .catch('PROMOTION');

const underperformingSchema = z
  .object({
    product_id: id,
    product_name: z.string(),
    sku: gapField(z.string(), ''),
    category_name: z.string(),
    total_quantity_sold: z.number(),
    total_revenue: money,
    stock_level: z.number(),
    days_without_sale: z.number(),
    recommendation: recommendationSchema,
  })
  .transform((value) => ({
    productId: value.product_id,
    productName: value.product_name,
    sku: value.sku,
    categoryName: value.category_name,
    totalQuantitySold: value.total_quantity_sold,
    totalRevenue: value.total_revenue,
    stockLevel: value.stock_level,
    daysWithoutSale: value.days_without_sale,
    recommendation: value.recommendation,
  }));

const hourlyPointSchema = z
  .object({ hour: z.number(), revenue: money, transaction_count: z.number() })
  .transform((value) => ({
    hour: value.hour,
    revenue: value.revenue,
    transactionCount: value.transaction_count,
  }));

export type HourlyPoint = z.infer<typeof hourlyPointSchema>;

const timePatternSchema = z
  .object({
    hourly_distribution: z.array(hourlyPointSchema),
    peak_hours: z.array(z.number()),
    busiest_day: z.string(),
    quietest_day: z.string(),
    insights: z.array(z.string()),
  })
  .transform((value) => ({
    hourlyDistribution: value.hourly_distribution,
    peakHours: value.peak_hours,
    busiestDay: value.busiest_day,
    quietestDay: value.quietest_day,
    insights: value.insights,
  }));

const aovTrendSchema = z
  .object({
    labels: z.array(z.string()),
    values: z.array(money),
    current_aov: money,
    previous_aov: money,
    growth_percentage: percentage,
  })
  .transform((value) => ({
    labels: value.labels,
    values: value.values,
    currentAov: value.current_aov,
    previousAov: value.previous_aov,
    growthPercentage: value.growth_percentage,
  }));

const recentTransactionSchema = z
  .object({
    transaction_id: id,
    transaction_number: z.string(),
    outlet_name: z.string(),
    cashier_name: z.string(),
    total: money,
    created_at: isoDateTime,
  })
  .transform((value) => ({
    transactionId: value.transaction_id,
    transactionNumber: value.transaction_number,
    outletName: value.outlet_name,
    cashierName: value.cashier_name,
    total: value.total,
    createdAt: value.created_at,
  }));

const merchantOverviewSchema = z
  .object({
    merchant_name: z.string(),
    total_outlets_active: z.number(),
    total_employees_active: z.number(),
    total_products_active: z.number(),
    total_categories: z.number(),
    last_ai_analysis: isoDateTime.nullable().optional(),
    ai_available_today: z.boolean(),
  })
  .transform((value) => ({
    merchantName: value.merchant_name,
    totalOutletsActive: value.total_outlets_active,
    totalEmployeesActive: value.total_employees_active,
    totalProductsActive: value.total_products_active,
    totalCategories: value.total_categories,
    lastAiAnalysis: value.last_ai_analysis ?? null,
    /** Drives the "analyse now" button; AI is Owner-only and manual. */
    aiAvailableToday: value.ai_available_today,
  }));

const periodBoundsSchema = z
  .object({
    start_date: isoDate,
    end_date: isoDate,
    total_revenue: money,
    total_transactions: z.number(),
  })
  .transform((value) => ({
    startDate: value.start_date,
    endDate: value.end_date,
    totalRevenue: value.total_revenue,
    totalTransactions: value.total_transactions,
  }));

const periodComparisonSchema = z
  .object({
    current_period: periodBoundsSchema,
    previous_period: periodBoundsSchema,
    changes: z.object({
      revenue_percentage: percentage,
      transactions_percentage: percentage,
      aov_percentage: percentage,
    }),
  })
  .transform((value) => ({
    currentPeriod: value.current_period,
    previousPeriod: value.previous_period,
    changes: {
      revenuePercentage: value.changes.revenue_percentage,
      transactionsPercentage: value.changes.transactions_percentage,
      aovPercentage: value.changes.aov_percentage,
    },
  }));

export const ownerDashboardSchema = z
  .object({
    summary: summarySchema,
    sales_trend: salesTrendSchema,
    outlet_performance: z.array(outletPerformanceSchema),
    top_products: z.object({
      by_revenue: z.array(rankedProductSchema),
      by_quantity: z.array(rankedProductSchema),
    }),
    underperforming_products: z.array(underperformingSchema),
    time_pattern: timePatternSchema,
    aov_trend: aovTrendSchema,
    recent_transactions: z.array(recentTransactionSchema),
    merchant_overview: merchantOverviewSchema,
    period_comparison: periodComparisonSchema,
  })
  .transform((value) => ({
    summary: value.summary,
    salesTrend: value.sales_trend,
    outletPerformance: value.outlet_performance,
    topProducts: {
      byRevenue: value.top_products.by_revenue,
      byQuantity: value.top_products.by_quantity,
    },
    underperformingProducts: value.underperforming_products,
    timePattern: value.time_pattern,
    aovTrend: value.aov_trend,
    recentTransactions: value.recent_transactions,
    merchantOverview: value.merchant_overview,
    periodComparison: value.period_comparison,
  }));

export type OwnerDashboard = z.infer<typeof ownerDashboardSchema>;

/* -------------------------------------------------------------------------- */
/* Admin dashboard                                                             */
/* -------------------------------------------------------------------------- */

const outOfStockAlertSchema = z
  .object({
    product_id: id,
    product_name: z.string(),
    sku: gapField(z.string(), ''),
    outlet_id: id,
    outlet_name: z.string(),
  })
  .transform((value) => ({
    productId: value.product_id,
    productName: value.product_name,
    sku: value.sku,
    outletId: value.outlet_id,
    outletName: value.outlet_name,
  }));

export type OutOfStockAlert = z.infer<typeof outOfStockAlertSchema>;

const outletQuickStatsSchema = z
  .object({
    outlet_id: id,
    outlet_name: z.string(),
    total_products: z.number(),
    total_stock: z.number(),
    low_stock_count: z.number(),
    out_of_stock_count: z.number(),
  })
  .transform((value) => ({
    outletId: value.outlet_id,
    outletName: value.outlet_name,
    totalProducts: value.total_products,
    totalStock: value.total_stock,
    lowStockCount: value.low_stock_count,
    outOfStockCount: value.out_of_stock_count,
  }));

export const adminDashboardSchema = z
  .object({
    summary: z
      .object({
        total_outlets: z.number(),
        total_products: z.number(),
        total_stock_value: money,
        total_stock_items: z.number(),
        low_stock_products_count: z.number(),
        out_of_stock_products_count: z.number(),
      })
      .transform((value) => ({
        totalOutlets: value.total_outlets,
        totalProducts: value.total_products,
        /** Integer rupiah: quantity times price across every outlet. */
        totalStockValue: value.total_stock_value,
        totalStockItems: value.total_stock_items,
        lowStockProductsCount: value.low_stock_products_count,
        outOfStockProductsCount: value.out_of_stock_products_count,
      })),
    low_stock_alerts: z.array(lowStockAlertSchema),
    out_of_stock_alerts: z.array(outOfStockAlertSchema),
    outlet_quick_stats: z.array(outletQuickStatsSchema),
  })
  .transform((value) => ({
    summary: value.summary,
    lowStockAlerts: value.low_stock_alerts,
    outOfStockAlerts: value.out_of_stock_alerts,
    outletQuickStats: value.outlet_quick_stats,
  }));

export type AdminDashboard = z.infer<typeof adminDashboardSchema>;

/* -------------------------------------------------------------------------- */
/* Requests                                                                    */
/* -------------------------------------------------------------------------- */

export type OwnerDashboardParams = { period?: Period; outlet_id?: string };

export const dashboardApi = {
  /** The entire Owner dashboard in one response. One query, one loading state. */
  owner: (params: OwnerDashboardParams = {}) =>
    request({
      method: 'GET',
      path: '/dashboard/owner',
      query: { period: params.period, outlet_id: params.outlet_id },
      schema: ownerDashboardSchema,
    }),

  admin: (outletId?: string) =>
    request({
      method: 'GET',
      path: '/dashboard/admin',
      query: { outlet_id: outletId },
      schema: adminDashboardSchema,
    }),
};
