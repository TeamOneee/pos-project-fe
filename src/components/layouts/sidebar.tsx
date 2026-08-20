/**
 * The 248px desktop sidebar.
 *
 * Nothing here decides what to show — `navFor(role)` does, and it has already
 * been filtered through the role matrix.
 */

import { NavLink } from 'react-router-dom';

import { activeHref, navFor, type NavItem } from '@/components/layouts/nav-config';
import { UserChip } from '@/components/layouts/user-chip';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { Role } from '@/lib/permissions';
import { cn } from '@/lib/utils';

type SidebarProps = {
  role: Role;
  pathname: string;
  /** Shown at the top; falls back to the product name when unavailable. */
  merchantName: string | null;
};

export function Sidebar({ role, pathname, merchantName }: SidebarProps) {
  const sections = navFor(role);
  const active = activeHref(
    sections.flatMap((section) => section.items),
    pathname
  );

  return (
    <aside className="hidden h-full w-[248px] shrink-0 flex-col border-r border-border bg-surface desktop:flex">
      <div className="flex flex-col gap-xs px-lg py-lg">
        <Text variant="h3" className="truncate">
          {merchantName ?? 'POS'}
        </Text>
        <Text variant="caption" tone="subtle">
          Merchant
        </Text>
      </div>

      <nav className="scrollbar-none flex flex-1 flex-col gap-lg overflow-y-auto px-md">
        {sections.map((section, index) => (
          <div key={section.title ?? `section-${index}`} className="flex flex-col gap-xs">
            {section.title && (
              <Text variant="caption" tone="subtle" className="px-md uppercase">
                {section.title}
              </Text>
            )}
            {section.items.map((item) => (
              <SidebarLink key={item.href} item={item} active={active === item.href} />
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-md">
        <UserChip />
      </div>
    </aside>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <NavLink
      to={item.href}
      end={item.exact}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-touch flex-row items-center gap-md rounded-md px-md py-sm',
        active ? 'bg-accent-subtle' : 'hover:bg-subtle'
      )}
    >
      <Icon as={item.icon} size={18} className={active ? 'text-accent' : 'text-fg-muted'} />
      <Text
        variant={active ? 'body-strong' : 'body'}
        tone={active ? 'accent' : 'muted'}
        className="truncate"
      >
        {item.label}
      </Text>
    </NavLink>
  );
}
