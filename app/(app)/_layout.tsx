import { Slot } from 'expo-router';

import { RouteGuard } from '@/components/auth/route-guard';
import { AppShell } from '@/components/shell/app-shell';

/**
 * Everything behind a session.
 *
 * The guard runs before the shell, so a forbidden route never renders a
 * sidebar around a 403 — it replaces the whole screen.
 */
export default function AppLayout() {
  return (
    <RouteGuard>
      <AppShell>
        <Slot />
      </AppShell>
    </RouteGuard>
  );
}
