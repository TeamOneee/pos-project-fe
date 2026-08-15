/** Every data hook, grouped by domain. Screens import from here. */

export { useLogin, useLogout, useRegister, useSession } from '@/hooks/use-auth';
export { useMerchant, useUpdateMerchant } from '@/hooks/use-merchant';
export {
  useCreateOutlet,
  useDeactivateOutlet,
  useOutlet,
  useOutlets,
  useUpdateOutlet,
} from '@/hooks/use-outlets';
export {
  useCreateUser,
  useDeactivateUser,
  useUpdateUser,
  useUser,
  useUsers,
} from '@/hooks/use-users';
export {
  useCategories,
  useCreateCategory,
  useDeactivateCategory,
  useUpdateCategory,
} from '@/hooks/use-categories';
export {
  useCreateProduct,
  useDeactivateProduct,
  useProduct,
  useProducts,
  useUpdateProduct,
} from '@/hooks/use-products';
export {
  useAdjustInventory,
  useBulkAdjustInventory,
  useInventory,
  useInventoryForProduct,
  useLowStock,
  useTransferStock,
} from '@/hooks/use-inventory';
export {
  useAddCartItem,
  useCart,
  useClearCart,
  useRemoveCartItem,
  useUpdateCartItem,
} from '@/hooks/use-cart';
export { useCheckout, useTransaction, useTransactions } from '@/hooks/use-transactions';
export { useAdminDashboard, useOwnerDashboard } from '@/hooks/use-dashboard';
export {
  useAovTrend,
  useProductPerformance,
  useSalesTrend,
  useTimePattern,
} from '@/hooks/use-analytics';
export { useAiInsight, useAnalyzeAiInsight } from '@/hooks/use-ai-insights';
