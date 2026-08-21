/** `/dashboard` resolves to whichever dashboard the signed-in role has. */

import { useAuth } from '@/components/pages/auth/auth-provider';
import AdminDashboardPage from '@/pages/dashboard/admin';
import OwnerDashboardPage from '@/pages/dashboard/owner';
import { can } from '@/lib/permissions';

export default function DashboardPage() {
  const { role } = useAuth();

  if (!role) return null;
  return can(role, 'stockDashboard') ? <AdminDashboardPage /> : <OwnerDashboardPage />;
}
