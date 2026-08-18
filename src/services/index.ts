/**
 * The per-module API clients — one file per module in the contract.
 *
 * Each client is a thin layer over `@/api`'s transport: it describes a request
 * and validates the wire payload with the module's zod schema. Hooks and
 * screens import from here, never from the transport directly.
 *
 * Module layout follows docs/07-iterasi-1-api-contract.md: identity (§1),
 * tenant (§2), catalog (§3), inventory (§4), sales (§5), reporting (§6) and
 * insight (§7), plus the platform health read (§8).
 */

export {
  authApi,
  staffSchema,
  type LoginInput,
  type LoginResult,
  type RegisterInput,
  type RegisterResult,
  type Staff,
} from '@/services/auth';

export {
  staffApi,
  type CreateStaffInput,
  type StaffFilters,
  type UpdateStaffInput,
} from '@/services/staff';

export {
  merchantApi,
  merchantSchema,
  type Merchant,
  type UpdateMerchantInput,
} from '@/services/merchant';

export {
  outletsApi,
  type CreateOutletInput,
  type Outlet,
  type UpdateOutletInput,
} from '@/services/outlets';

export {
  categoriesApi,
  type Category,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from '@/services/categories';

export {
  productsApi,
  type CreateProductInput,
  type Product,
  type ProductFilters,
  type ProductOutletPrice,
  type SetOutletPriceInput,
  type UpdateProductInput,
} from '@/services/products';

export { catalogApi, type CatalogFilters, type CatalogProduct } from '@/services/catalog';

export {
  inventoryApi,
  type AdjustmentResult,
  type AdjustStockInput,
  type InventoryFilters,
  type InventoryItem,
  type LowStockThresholdResult,
  type MovementFilters,
  type SetLowStockThresholdInput,
  type StockMovement,
} from '@/services/inventory';

export {
  mintCheckoutRequestId,
  transactionsApi,
  type CheckoutInput,
  type CheckoutItemInput,
  type Receipt,
  type TransactionDetail,
  type TransactionFilters,
  type TransactionItem,
  type TransactionSummary,
} from '@/services/transactions';

export {
  dashboardApi,
  type AovTrend,
  type DashboardMeta,
  type DashboardOperations,
  type DashboardSummary,
  type LowStockItem,
  type LowStockReport,
  type OutletComparison,
  type OutletComparisonItem,
  type PeriodQuery,
  type ProductRank,
  type SalesTrend,
  type TimePattern,
  type TopProducts,
  type TrendQuery,
} from '@/services/dashboard';

export {
  insightsApi,
  type AnalysisJob,
  type Insight,
  type InsightsResponse,
  type TriggerResult,
} from '@/services/insights';

export { healthApi, type Health } from '@/services/health';
