/**
 * The 64px header: a sidebar toggle on the left, the page title, and the
 * contextual controls on the right.
 *
 * The sidebar toggle knows its own state and its own breakpoint (SidebarToggle),
 * so it renders on desktop and nowhere else. Collapsing the sidebar is how a
 * screen (the dashboard, say) gets the full width; the same button restores it
 * so navigation stays reachable. The till's bar carries the same component.
 *
 * The controls slot is filled by screens through the shell context.
 *
 * The account sits at the far right, past a divider, and stays there whatever a
 * screen puts in the slot beside it: it belongs to the session rather than to
 * the page, and it is the one control a user must never have to hunt for.
 */

import { AccountControls } from '@/components/layouts/account-controls';
import { SidebarToggle } from '@/components/layouts/sidebar-toggle';
import { Text } from '@/components/ui/text';

export function Header({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return (
    <header className="flex h-16 items-center justify-between gap-md border-b border-border bg-surface px-lg">
      <div className="flex min-w-0 flex-row items-center gap-md">
        <SidebarToggle />

        <Text variant="h2" className="min-w-0 flex-1 truncate">
          {title}
        </Text>
      </div>

      <div className="flex min-w-0 items-center gap-sm">
        {actions}
        {actions ? <div className="mx-xs h-6 w-px shrink-0 bg-border" aria-hidden="true" /> : null}
        <AccountControls />
      </div>
    </header>
  );
}
