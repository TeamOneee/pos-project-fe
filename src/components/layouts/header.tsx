/**
 * The 64px header: a sidebar toggle on the left, the page title, and the contextual controls on the
 * right. The till at /pos renders it too, so both screens carry one header.
 */

import { AccountControls } from '@/components/layouts/account-controls';
import { SidebarToggle } from '@/components/layouts/sidebar-toggle';
import { useSidebarCollapsed } from '@/components/layouts/shell-context';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { cn } from '@/lib/utils';

export function Header({
  title,
  badge,
  actions,
  className,
}: {
  title: string;
  /** Sits beside the title: the till names its outlet there. */
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  const breakpoint = useBreakpoint();
  const collapsed = useSidebarCollapsed();
  // Sidebar already shows profile+logout on desktop, so header keeps it on tablet/mobile
  // and on desktop only when the sidebar is collapsed (otherwise there would be no way out).
  const showAccount = breakpoint !== 'desktop' || collapsed;

  return (
    <header
      className={cn(
        'flex h-16 items-center justify-between gap-md border-b border-border bg-surface px-lg',
        className
      )}
    >
      <div className="flex min-w-0 flex-row items-center gap-md">
        <SidebarToggle />

        <Text variant="h2" className="min-w-0 truncate">
          {title}
        </Text>

        {badge}
      </div>

      <div className="flex min-w-0 items-center gap-sm">
        {actions}
        {actions ? <div className="mx-xs h-6 w-px shrink-0 bg-border" aria-hidden="true" /> : null}
        {showAccount && <AccountControls />}
      </div>
    </header>
  );
}
