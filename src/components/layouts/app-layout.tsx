/**
 * The authenticated layout: guards the route, then wraps content in the shell.
 */

import { AppShell } from '@/components/layouts/app-shell';
import { RouteGuard } from '@/components/pages/auth/route-guard';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard>
      <AppShell>{children}</AppShell>
    </RouteGuard>
  );
}
