/**
 * The application's routes, mapped to layouts and pages.
 *
 * The root index redirects to the signed-in role's landing route; the guard
 * decides that once the session is known.
 */

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
import PosPage from '@/pages/pos/index';
import TransactionsPage from '@/pages/transactions/index';
import TransactionDetailPage from '@/pages/transactions/[id]';
import UsersPage from '@/pages/admin/users';
import OutletsPage from '@/pages/admin/outlets';
import MerchantPage from '@/pages/admin/merchant';

import { useAuth } from '@/components/pages/auth/auth-provider';
import { landingRoute } from '@/lib/permissions';

export function Router() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/"
        element={
          <AppLayout>
            <LandingRedirect />
          </AppLayout>
        }
      />

      <Route
        path="/dashboard"
        element={
          <AppLayout>
            <DashboardPage />
          </AppLayout>
        }
      />
      <Route
        path="/analytics"
        element={
          <AppLayout>
            <AnalyticsPage />
          </AppLayout>
        }
      />
      <Route
        path="/ai-insights"
        element={
          <AppLayout>
            <AiInsightsPage />
          </AppLayout>
        }
      />

      <Route
        path="/products"
        element={
          <AppLayout>
            <ProductsPage />
          </AppLayout>
        }
      />
      <Route
        path="/categories"
        element={
          <AppLayout>
            <CategoriesPage />
          </AppLayout>
        }
      />
      <Route
        path="/inventory"
        element={
          <AppLayout>
            <InventoryPage />
          </AppLayout>
        }
      />
      <Route
        path="/inventory/low-stock"
        element={
          <AppLayout>
            <LowStockPage />
          </AppLayout>
        }
      />

      <Route
        path="/pos"
        element={
          <AppLayout>
            <PosPage />
          </AppLayout>
        }
      />

      <Route
        path="/transactions"
        element={
          <AppLayout>
            <TransactionsPage />
          </AppLayout>
        }
      />
      <Route
        path="/transactions/:id"
        element={
          <AppLayout>
            <TransactionDetailPage />
          </AppLayout>
        }
      />

      <Route
        path="/users"
        element={
          <AppLayout>
            <UsersPage />
          </AppLayout>
        }
      />
      <Route
        path="/outlets"
        element={
          <AppLayout>
            <OutletsPage />
          </AppLayout>
        }
      />
      <Route
        path="/merchant"
        element={
          <AppLayout>
            <MerchantPage />
          </AppLayout>
        }
      />

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
