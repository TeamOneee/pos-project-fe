/**
 * The per-module API clients — one file per module in the contract.
 *
 * Each client is a thin layer over `@/api`'s transport: it describes a request
 * and validates the wire payload with the module's zod schema. Hooks and
 * screens import from here, never from the transport directly.
 */

export {
  authApi,
  userSchema,
  merchantSchema,
  type LoginInput,
  type LoginResult,
  type RegisterInput,
  type RegisterResult,
  type User,
  type Merchant,
} from '@/services/auth';
export { aiInsightsApi, type AiInsight } from '@/services/ai-insights';
export { analyticsApi } from '@/services/analytics';
export { cartApi, type AddCartItemInput, type Cart, type CartItem } from '@/services/cart';
export { categoriesApi, type Category } from '@/services/categories';
export {
  dashboardApi,
  type AdminDashboard,
  type OwnerDashboard,
  type OwnerDashboardParams,
  type RankedProduct,
} from '@/services/dashboard';
export { inventoryApi, type InventoryItem, type LowStockAlert } from '@/services/inventory';
export { merchantsApi, type UpdateMerchantInput } from '@/services/merchants';
export { outletsApi, type Outlet } from '@/services/outlets';
export {
  productsApi,
  type CreateProductInput,
  type Product,
  type UpdateProductInput,
} from '@/services/products';
export {
  transactionsApi,
  type CheckoutInput,
  type CheckoutResult,
  type Transaction,
  type TransactionDetail,
  type TransactionItem,
} from '@/services/transactions';
export { usersApi } from '@/services/users';
