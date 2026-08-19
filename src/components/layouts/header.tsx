/**
 * The 64px header: a sidebar toggle on the left, the page title, and the
 * contextual controls on the right.
 *
 * The sidebar toggle exists only on desktop, where a sidebar is actually shown
 * — AppShell supplies it there and nowhere else. Collapsing the sidebar is how
 * a screen (the dashboard, say) gets the full width; the same button restores
 * the sidebar so navigation stays reachable.
 *
 * The controls slot is filled by screens through the shell context.
 */

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

export function Header({
  title,
  actions,
  sidebarCollapsed,
  onToggleSidebar,
}: {
  title: string;
  actions?: React.ReactNode;
  /** Present only on desktop; hidden when the sidebar is collapsed. */
  sidebarCollapsed?: boolean;
  /** Toggles the desktop sidebar. Absent below desktop, so no button renders. */
  onToggleSidebar?: () => void;
}) {
  return (
    <header className="flex h-16 items-center justify-between gap-md border-b border-border bg-surface px-lg">
      <div className="flex min-w-0 flex-row items-center gap-md">
        {onToggleSidebar && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={sidebarCollapsed ? 'Tampilkan menu samping' : 'Sembunyikan menu samping'}
            onClick={onToggleSidebar}
            className="shrink-0"
          >
            <Icon as={sidebarCollapsed ? PanelLeftOpen : PanelLeftClose} size={20} />
          </Button>
        )}

        <Text variant="h2" className="min-w-0 flex-1 truncate">
          {title}
        </Text>
      </div>

      <div className="flex items-center gap-sm">{actions}</div>
    </header>
  );
}
