/**
 * `/dashboard` resolves to whichever dashboard the signed-in role has.
 *
 * The Owner gets the business dashboard (S-03) and the Admin the operational
 * stock dashboard (S-14). This is not route gating — the guard has already run
 * and a Cashier never reaches here — it is one path with two surfaces, so the
 * choice comes from the capability matrix rather than a role literal.
 */

import { useAuth } from '@/components/pages/auth/auth-provider';
import AdminDashboardPage from '@/pages/dashboard/admin';
import OwnerDashboardPage from '@/pages/dashboard/owner';
import { can } from '@/lib/permissions';

export default function DashboardPage() {
  const { role } = useAuth();

  if (!role) return null;
  return can(role, 'stockDashboard') ? <AdminDashboardPage /> : <OwnerDashboardPage />;
}
