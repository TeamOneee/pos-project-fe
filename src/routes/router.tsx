/** The application's routes, mapped to layouts and pages. */

import { Navigate, Route, Routes } from 'react-router-dom';

import { AppLayout } from '@/components/layouts/app-layout';
import LoginPage from '@/pages/auth/login';
import RegisterPage from '@/pages/auth/register';
import DashboardPage from '@/pages/dashboard/index';
import AnalyticsPage from '@/pages/dashboard/analytics';
import AiInsightsPage from '@/pages/dashboard/ai-insights';
import ProductsPage from '@/pages/catalog/products';
import CategoriesPage from '@/pages/catalog/categories';
import InventoryPage from '@/pages/catalog/inventory';
import LowStockPage from '@/pages/catalog/low-stock';
import StockMovementsPage from '@/pages/catalog/stock-movements';
import PosPage from '@/pages/pos/index';
import TransactionsPage from '@/pages/transactions/index';
import TransactionDetailPage from '@/pages/transactions/[id]';
import UsersPage from '@/pages/owner/users';
import OutletsPage from '@/pages/owner/outlets';
import MerchantPage from '@/pages/owner/merchant';

import { useAuth } from '@/components/pages/auth/auth-provider';
import { landingRoute } from '@/lib/permissions';

export function Router() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* One layout route for every signed-in screen: the shell (and its
          sidebar scroll) survives navigation, and only `<main>` resets. */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<LandingRedirect />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/ai-insights" element={<AiInsightsPage />} />

        <Route path="/products" element={<ProductsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/inventory/low-stock" element={<LowStockPage />} />
        <Route path="/inventory/movements" element={<StockMovementsPage />} />

        <Route path="/pos" element={<PosPage />} />

        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/transactions/:id" element={<TransactionDetailPage />} />

        <Route path="/users" element={<UsersPage />} />
        <Route path="/outlets" element={<OutletsPage />} />
        <Route path="/merchant" element={<MerchantPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** Once the session is known, send the user to their own landing route. */
function LandingRedirect() {
  const { status, role } = useAuth();

  if (status === 'restoring' || !role) return null;
  return <Navigate to={landingRoute(role)} replace />;
}
