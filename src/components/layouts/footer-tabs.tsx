/**
 * The mobile footer tab bar. Five items maximum, per the design brief.
 *
 * A role with more than five nav items gets its first four plus "Lainnya",
 * which opens the remainder in a dialog. The Owner is the only role this
 * affects.
 */

import { Menu } from 'lucide-react';
import * as React from 'react';
import { NavLink } from 'react-router-dom';

import { activeHref, navFor, type NavItem } from '@/components/layouts/nav-config';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { Role } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const MAX_TABS = 5;

export function FooterTabs({ role, pathname }: { role: Role; pathname: string }) {
  const [overflowOpen, setOverflowOpen] = React.useState(false);

  const items = navFor(role).flatMap((section) => section.items);
  const active = activeHref(items, pathname);

  const needsOverflow = items.length > MAX_TABS;
  const visible = needsOverflow ? items.slice(0, MAX_TABS - 1) : items;
  const overflow = needsOverflow ? items.slice(MAX_TABS - 1) : [];

  // An item hidden behind "Lainnya" still has to look selected when it is.
  const overflowActive = overflow.some((item) => item.href === active);

  return (
    <>
      <nav className="flex shrink-0 flex-row border-t border-border bg-surface">
        {visible.map((item) => (
          <TabLink key={item.href} item={item} active={active === item.href} />
        ))}

        {needsOverflow && (
          <button
            aria-label="Menu lainnya"
            aria-expanded={overflowOpen}
            onClick={() => setOverflowOpen(true)}
            className={cn(
              'flex min-h-touch flex-1 flex-col items-center justify-center gap-xs py-sm transition-colors hover:bg-subtle',
              overflowActive && 'bg-accent-subtle'
            )}
          >
            <Icon
              as={Menu}
              size={20}
              className={overflowActive ? 'text-accent' : 'text-fg-muted'}
            />
            <Text variant="caption" tone={overflowActive ? 'accent' : 'muted'} className="truncate">
              Lainnya
            </Text>
          </button>
        )}
      </nav>

      <Dialog open={overflowOpen} onOpenChange={setOverflowOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Menu lainnya</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-xs">
            {overflow.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.exact}
                onClick={() => setOverflowOpen(false)}
                className={cn(
                  'flex min-h-touch flex-row items-center gap-md rounded-md px-md py-sm transition-colors hover:bg-subtle',
                  active === item.href && 'bg-accent-subtle'
                )}
              >
                <Icon
                  as={item.icon}
                  size={18}
                  className={active === item.href ? 'text-accent' : 'text-fg-muted'}
                />
                <Text tone={active === item.href ? 'accent' : 'default'}>{item.label}</Text>
              </NavLink>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TabLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <NavLink
      to={item.href}
      end={item.exact}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-touch flex-1 flex-col items-center justify-center gap-xs py-sm transition-colors hover:bg-subtle',
        active && 'bg-accent-subtle'
      )}
    >
      <Icon as={item.icon} size={20} className={active ? 'text-accent' : 'text-fg-muted'} />
      <Text variant="caption" tone={active ? 'accent' : 'muted'} className="truncate">
        {item.label}
      </Text>
    </NavLink>
  );
}
