/** The authenticated layout: guards the route, then wraps content in the shell. */

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
