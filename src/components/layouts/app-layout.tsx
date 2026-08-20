/**
 * The authenticated layout: guards the route, then wraps content in the shell.
 *
 * Rendered as a React Router layout route (`<Route element={<AppLayout />}>`),
 * so the shell — and with it the sidebar — stays mounted while the child route
 * swaps underneath. The shell scrolls its own `<main>` to the top on
 * navigation; the sidebar keeps whatever scroll it had.
 */

import { Outlet } from 'react-router-dom';

import { AppShell } from '@/components/layouts/app-shell';
import { RouteGuard } from '@/components/pages/auth/route-guard';

export function AppLayout() {
  return (
    <RouteGuard>
      <AppShell>
        <Outlet />
      </AppShell>
    </RouteGuard>
  );
}
