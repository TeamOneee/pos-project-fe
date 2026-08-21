/**
 * The one control that hides and restores the desktop sidebar.
 *
 * It reads the shell context itself rather than taking props, because it has to
 * sit in two different headers: the app header, and the till's own bar at /pos.
 * The till has no app header to inherit the button from, and without it a
 * Cashier — the one person who lives on that screen — was the only user who
 * could not reclaim the width.
 *
 * Renders nothing below desktop, where there is no sidebar to collapse.
 */

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import { useSetSidebarCollapsed, useSidebarCollapsed } from '@/components/layouts/shell-context';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useBreakpoint } from '@/hooks/use-breakpoint';

export function SidebarToggle() {
  const collapsed = useSidebarCollapsed();
  const setCollapsed = useSetSidebarCollapsed();
  const desktop = useBreakpoint() === 'desktop';

  if (!desktop) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={collapsed ? 'Tampilkan menu samping' : 'Sembunyikan menu samping'}
      onClick={() => setCollapsed(!collapsed)}
      className="shrink-0"
    >
      <Icon as={collapsed ? PanelLeftOpen : PanelLeftClose} size={20} />
    </Button>
  );
}
