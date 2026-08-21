/** The one control that hides and restores the desktop sidebar. */

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
